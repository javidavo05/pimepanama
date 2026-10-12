"use client";

/**
 * Pestaña «Cuentas»: GitHub, Vercel y Supabase con su token, su plan y cuánto usan. Los tokens se agregan,
 * reemplazan y quitan desde aquí; nunca vuelven al navegador.
 */
import { useState } from "react";
import { accountKey, PLAN_CAPACITY, PLAN_LABEL, usageLabel, type EmailSlotInventory } from "@/lib/platform-slots";
import type { GithubAccountInfo, ProviderAccount } from "@/lib/platforms/tipos";
import { AsistenteTokenGithub } from "@/components/empresa/github/asistente-token";
import { Icon } from "@/components/empresa/tasks/task-parts";
import { AsistenteTokenPlataforma } from "./asistente-token";
import { cargarLista } from "./remoto";
import type { Inventarios } from "./modelo";
import { Badge, CopyButton, Dot, hace, LOCAL_ICON, pedirJson, type Tone } from "./ui";

const card = "bg-panel border border-line rounded-xl";
const smallBtn =
  "inline-flex items-center justify-center gap-2 min-h-11 sm:min-h-8 px-3 rounded-lg border border-line-mid text-xs font-semibold text-fg-mute hover:text-fg hover:border-line-loud transition-colors disabled:opacity-50";
const quietBtn = "inline-flex items-center justify-center gap-2 min-h-11 sm:min-h-8 px-3 rounded-lg text-xs font-semibold text-fg-dim hover:text-danger transition-colors disabled:opacity-50";

const STATUS_TONE: Record<EmailSlotInventory["status"], Tone> = { space: "ok", full: "warn", over: "danger", pro: "brand" };

function Uso({ inv }: { inv: EmailSlotInventory }) {
  const pct = inv.pro ? 0 : Math.min(100, (inv.used / inv.capacity) * 100);
  const tone = STATUS_TONE[inv.status];
  const bar = tone === "danger" ? "bg-danger" : tone === "warn" ? "bg-warn" : "bg-ok";
  const desglose = inv.liveUsed != null && inv.liveUsed !== inv.platforms.length ? ` · ${inv.platforms.length} registradas aquí` : "";
  return (
    <div className="min-w-0 space-y-1">
      <p className="text-sm text-fg-soft tabular-nums">
        <span className="font-semibold text-fg">{usageLabel(inv)}</span> {inv.used === 1 ? "proyecto" : "proyectos"}
        <span className="text-fg-dim">{desglose}</span>
      </p>
      {!inv.pro && (
        <div className="h-1 rounded-full bg-fill-3 overflow-hidden" aria-hidden>
          <div className={`h-full ${bar} origin-left`} style={{ transform: `scaleX(${pct / 100})` }} />
        </div>
      )}
      <p className={`text-xs ${inv.status === "over" ? "text-danger font-medium" : inv.status === "full" ? "text-warn" : "text-fg-dim"}`}>
        {inv.status === "pro"
          ? "Sin límite"
          : inv.status === "over"
            ? `Tiene ${inv.used - inv.capacity} de más: márcala Pro o mueve uno a otra cuenta`
            : inv.status === "full"
              ? "Llena: el próximo proyecto va en otra cuenta"
              : inv.available === 1
                ? "Le queda 1"
                : `Le quedan ${inv.available}`}
      </p>
    </div>
  );
}

function Cupos({ inv }: { inv: EmailSlotInventory }) {
  if (inv.pro || inv.provider !== "supabase") return null;
  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2" aria-label="Cupos">
      {Array.from({ length: PLAN_CAPACITY.supabase }, (_, i) => i + 1).map((n) => {
        const who = inv.bySlot.get(n)?.platformName ?? null;
        return (
          <li key={n} className={`flex items-center gap-2 min-w-0 px-3 min-h-8 rounded-md border text-xs ${who ? "border-line bg-fill text-fg-soft" : "border-ok/30 bg-ok/10 text-ok"}`}>
            <span className="tabular-nums text-fg-faint shrink-0">Cupo {n}</span>
            <span className="truncate">{who ?? "Libre"}</span>
          </li>
        );
      })}
      {inv.unassigned.length > 0 && (
        <li className="sm:col-span-2 text-xs text-warn">Sin número: {inv.unassigned.map((u) => u.platformName).join(", ")}</li>
      )}
    </ul>
  );
}

function EstadoToken({ a }: { a: ProviderAccount }) {
  if (!a.hasToken)
    return (
      <p className="flex items-center gap-2 text-xs text-fg-dim">
        <Dot tone="mute" /> Sin token: el uso sale de lo registrado aquí
      </p>
    );
  if (a.lastError)
    return (
      <p className="flex items-start gap-2 text-xs text-danger">
        <span className="mt-1">
          <Dot tone="danger" />
        </span>
        <span className="min-w-0">{a.lastError}</span>
      </p>
    );
  return (
    <p className="flex items-center gap-2 text-xs text-fg-dim">
      <Dot tone="ok" /> Conectada{a.fetchedAt ? ` · datos de ${hace(a.fetchedAt)}` : ""}
    </p>
  );
}

export function CuentasPanel({
  accounts,
  githubAccounts,
  inv,
  onRefresh,
  onPlan,
}: {
  accounts: ProviderAccount[];
  githubAccounts: GithubAccountInfo[];
  inv: Inventarios;
  /** Vuelve a leer los datos del servidor. */
  onRefresh: () => void;
  onPlan: (provider: "vercel" | "supabase", email: string, plan: "FREE" | "PRO") => Promise<void>;
}) {
  const [token, setToken] = useState<{ provider: "vercel" | "supabase"; correo: string | null } | null>(null);
  const [gh, setGh] = useState<{ cuenta: string | null } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function actualizar(provider: "github" | "vercel" | "supabase", id: string) {
    setBusy(`refresh:${id}`);
    setError(null);
    const r = await cargarLista(provider, id, true);
    if (!("items" in r)) setError(r.error);
    else if (r.error) setError(r.error);
    setBusy(null);
    onRefresh();
  }

  async function quitarToken(a: ProviderAccount) {
    if (!a.id) return;
    if (!window.confirm(`¿Quitar el token de ${a.email}? La cuenta y sus plataformas se quedan; solo deja de leerse en vivo.`)) return;
    setBusy(`quitar:${a.id}`);
    const r = await pedirJson(`/api/empresa/platforms/accounts/token?id=${encodeURIComponent(a.id)}`, { method: "DELETE" });
    if (r.error !== undefined) setError(r.error);
    setBusy(null);
    onRefresh();
  }

  async function quitarGithub(g: GithubAccountInfo) {
    if (!window.confirm(`¿Quitar la cuenta de GitHub ${g.login}? Los proyectos que leen su repo con ella pasan a usar otra cuenta con acceso, si hay.`)) return;
    setBusy(`gh:${g.id}`);
    const r = await pedirJson(`/api/empresa/github?login=${encodeURIComponent(g.login)}`, { method: "DELETE" });
    if (r.error !== undefined) setError(r.error);
    setBusy(null);
    onRefresh();
  }

  const section = (provider: "vercel" | "supabase") => {
    const list = accounts.filter((a) => a.provider === provider);
    const nombre = provider === "vercel" ? "Vercel" : "Supabase";
    return (
      <section className={card} aria-labelledby={`cuentas-${provider}`}>
        <header className="flex flex-wrap items-start justify-between gap-4 px-4 py-4 border-b border-line">
          <div className="min-w-0">
            <h2 id={`cuentas-${provider}`} className="text-fg text-base font-semibold">
              {nombre}
            </h2>
            <p className="text-fg-dim text-xs mt-1">
              {PLAN_LABEL[provider].FREE}: {PLAN_CAPACITY[provider]} proyectos por cuenta · Pro: sin límite
            </p>
          </div>
          <button type="button" className={smallBtn} onClick={() => setToken({ provider, correo: null })}>
            Conectar cuenta de {nombre}
          </button>
        </header>
        {list.length === 0 ? (
          <p className="px-4 py-6 text-sm text-fg-dim">
            Ninguna cuenta de {nombre} todavía. Conecta una con su token para ver sus proyectos reales y cuántos le quedan.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {list.map((a) => {
              const i = inv.byKey.get(accountKey(provider, a.email));
              const key = a.id ?? a.email;
              return (
                <li key={key} className="grid gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] lg:items-start">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="text-fg text-sm font-semibold truncate" title={a.email}>
                        {a.email}
                      </p>
                      <CopyButton value={a.email} label="correo" />
                    </div>
                    {a.label && <p className="text-fg-dim text-xs truncate">{a.label}</p>}
                    <EstadoToken a={a} />
                  </div>
                  <div className="min-w-0 space-y-2">
                    {i ? <Uso inv={i} /> : null}
                    {i ? <Cupos inv={i} /> : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={a.plan === "PRO"}
                      aria-label={`Plan Pro de ${a.email} en ${nombre}`}
                      disabled={busy != null}
                      onClick={() => void onPlan(provider, a.email, a.plan === "PRO" ? "FREE" : "PRO")}
                      className="inline-flex items-center gap-2 min-h-11 sm:min-h-8 px-2 text-xs text-fg-dim hover:text-fg disabled:opacity-50"
                      title={a.planSource === "api" ? `${nombre} dice que está en ${PLAN_LABEL[provider][a.plan]}` : "Plan marcado a mano"}
                    >
                      <Badge tone={a.plan === "PRO" ? "brand" : "mute"}>{PLAN_LABEL[provider][a.plan]}</Badge>
                      <span aria-hidden className={`flex w-8 h-5 p-1 rounded-full transition-colors ${a.plan === "PRO" ? "bg-brand" : "bg-fill-3"}`}>
                        <span className={`w-3 h-3 rounded-full bg-white shadow transition-transform ${a.plan === "PRO" ? "translate-x-3" : ""}`} />
                      </span>
                      Pro
                    </button>
                    <button type="button" className={smallBtn} onClick={() => setToken({ provider, correo: a.email })}>
                      {a.hasToken ? "Reemplazar token" : "Conectar token"}
                    </button>
                    {a.hasToken && a.id && (
                      <>
                        <button type="button" className={smallBtn} disabled={busy != null} onClick={() => void actualizar(provider, a.id!)}>
                          <Icon d={LOCAL_ICON.refresh} className="w-4 h-4" />
                          {busy === `refresh:${a.id}` ? "Actualizando…" : "Actualizar"}
                        </button>
                        <button type="button" className={quietBtn} disabled={busy != null} onClick={() => void quitarToken(a)}>
                          {busy === `quitar:${a.id}` ? "Quitando…" : "Quitar token"}
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    );
  };

  return (
    <div className="space-y-6">
      {error && (
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <section className={card} aria-labelledby="cuentas-github">
        <header className="flex flex-wrap items-start justify-between gap-4 px-4 py-4 border-b border-line">
          <div className="min-w-0">
            <h2 id="cuentas-github" className="text-fg text-base font-semibold">
              GitHub
            </h2>
            <p className="text-fg-dim text-xs mt-1">Las mismas cuentas que usa el portal de clientes para leer el avance. Solo lectura.</p>
          </div>
          <button type="button" className={smallBtn} onClick={() => setGh({ cuenta: null })}>
            Conectar cuenta de GitHub
          </button>
        </header>
        {githubAccounts.length === 0 ? (
          <p className="px-4 py-6 text-sm text-fg-dim">Ninguna cuenta de GitHub todavía. Conecta la cuenta donde vive el código: así eliges el repo de cada plataforma de una lista.</p>
        ) : (
          <ul className="divide-y divide-line">
            {githubAccounts.map((g) => (
              <li key={g.id} className="grid gap-4 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="min-w-0 space-y-1">
                  <p className="text-fg text-sm font-semibold truncate">{g.login}</p>
                  <p className="text-fg-dim text-xs">
                    {g.repos != null ? `${g.repos} ${g.repos === 1 ? "repo" : "repos"}` : "Repos sin leer todavía"}
                    {g.projects ? ` · ${g.projects} ${g.projects === 1 ? "proyecto del portal" : "proyectos del portal"}` : ""}
                    {g.source === "gh-cli" ? " · traída de Git PIME" : ""}
                  </p>
                  {g.error ? (
                    <p className="flex items-start gap-2 text-xs text-danger">
                      <span className="mt-1">
                        <Dot tone="danger" />
                      </span>
                      {g.error}
                    </p>
                  ) : (
                    <p className="flex items-center gap-2 text-xs text-fg-dim">
                      <Dot tone="ok" /> Conectada{g.checkedAt ? ` · revisada ${hace(g.checkedAt)}` : ""}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <button type="button" className={smallBtn} onClick={() => setGh({ cuenta: g.login })}>
                    Reemplazar token
                  </button>
                  <button type="button" className={smallBtn} disabled={busy != null} onClick={() => void actualizar("github", g.id)}>
                    <Icon d={LOCAL_ICON.refresh} className="w-4 h-4" />
                    {busy === `refresh:${g.id}` ? "Actualizando…" : "Actualizar"}
                  </button>
                  <button type="button" className={quietBtn} disabled={busy != null} onClick={() => void quitarGithub(g)}>
                    {busy === `gh:${g.id}` ? "Quitando…" : "Quitar"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {section("vercel")}
      {section("supabase")}

      <p className="text-xs text-fg-dim">
        Los datos en vivo se guardan 30 minutos. «Actualizar» los vuelve a pedir; nada se consulta solo en segundo plano.
      </p>

      {token && (
        <AsistenteTokenPlataforma
          abierto
          provider={token.provider}
          correo={token.correo}
          onCerrar={() => setToken(null)}
          onListo={onRefresh}
          onPlan={(email, plan) => onPlan(token.provider, email, plan)}
        />
      )}
      <AsistenteTokenGithub abierto={gh != null} cuenta={gh?.cuenta ?? null} onCerrar={() => setGh(null)} onListo={() => onRefresh()} />
    </div>
  );
}
