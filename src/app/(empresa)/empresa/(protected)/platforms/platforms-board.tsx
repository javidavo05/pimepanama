"use client";

/**
 * Platforms: dónde vive cada sistema de los clientes.
 *
 *   Plataformas — agrupadas por cliente, con búsqueda y filtros (sin cliente, cuenta llena, con problemas).
 *                 Cada fila dice lo esencial; al abrirla, el detalle con datos en vivo y la bóveda.
 *   Cuentas     — GitHub, Vercel y Supabase: token, plan y uso real por cuenta.
 *
 * Nada se consulta solo: lo vivo sale de la caché del servidor (30 min) y se pide al abrir o al actualizar.
 */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "@/components/empresa/link";
import { PageHeader, btn } from "@/components/empresa/page-header";
import { Icon, ICON } from "@/components/empresa/tasks/task-parts";
import { accountKey, normalizePlatformEmail, SUPABASE_FREE_SLOTS, usageLabel } from "@/lib/platform-slots";
import type { PlatformsData } from "@/lib/platforms/cargar";
import type { ProviderAccount, SerializedPlatform } from "@/lib/platforms/tipos";
import { AsistentePlataforma } from "./asistente-plataforma";
import { CuentasPanel } from "./cuentas-panel";
import { cuentaLlena, inventarios, problemasDe, puntaje, type Problema } from "./modelo";
import { PlataformaDetalle } from "./plataforma-detalle";
import { byName, Dot, hace, hostOf, LOCAL_ICON, pedirJson, supabaseEstado, vercelEstado, type Tone } from "./ui";

type Tab = "plataformas" | "cuentas";
type Filtro = "todas" | "sin-cliente" | "llena" | "problemas";

export function PlatformsBoard({
  data,
  abrir,
  nueva,
  clienteNueva,
  proyectoNueva,
  tabInicial,
}: {
  data: PlatformsData;
  abrir?: string | null;
  nueva?: boolean;
  clienteNueva?: string | null;
  proyectoNueva?: string | null;
  tabInicial?: Tab;
}) {
  const router = useRouter();
  const [platforms, setPlatforms] = useState(data.platforms);
  const [accounts, setAccounts] = useState(data.accounts);
  const [tab, setTab] = useState<Tab>(tabInicial ?? "plataformas");
  // ?abrir=<id> (desde la ficha del cliente): se muestra esa plataforma sola y abierta, sin desplazar la página.
  const [query, setQuery] = useState(() => (abrir ? (data.platforms.find((p) => p.id === abrir)?.name ?? "") : ""));
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [expandedId, setExpandedId] = useState<string | null>(abrir ?? null);
  const [wizard, setWizard] = useState(!!nueva);
  const [error, setError] = useState<string | null>(null);

  // Lo que manda el servidor (router.refresh) es la verdad.
  useEffect(() => setPlatforms(data.platforms), [data.platforms]);
  useEffect(() => setAccounts(data.accounts), [data.accounts]);

  const inv = useMemo(() => inventarios(platforms, accounts), [platforms, accounts]);
  const accountByKey = useMemo(() => new Map(accounts.map((a) => [accountKey(a.provider, a.email), a])), [accounts]);
  const clientById = useMemo(() => new Map(data.clients.map((c) => [c.id, c])), [data.clients]);

  const problemas = useMemo(() => {
    const m = new Map<string, Problema[]>();
    for (const p of platforms) m.set(p.id, problemasDe(p, inv, accountByKey, data.live[p.id]));
    return m;
  }, [platforms, inv, accountByKey, data.live]);

  const counts = useMemo(
    () => ({
      todas: platforms.length,
      "sin-cliente": platforms.filter((p) => !p.clientId).length,
      llena: platforms.filter((p) => cuentaLlena(p, inv)).length,
      problemas: platforms.filter((p) => (problemas.get(p.id)?.length ?? 0) > 0).length,
    }),
    [platforms, inv, problemas]
  );

  const cuentasConProblema =
    accounts.filter((a) => (a.hasToken && a.lastError) || inv.byKey.get(accountKey(a.provider, a.email))?.status === "over").length +
    data.githubAccounts.filter((g) => g.error).length;

  const knownEmails = useMemo(() => {
    const s = new Set<string>();
    for (const p of platforms) for (const e of [p.supabaseEmail, p.vercelEmail, p.githubEmail, p.brevoEmail]) if (e) s.add(normalizePlatformEmail(e));
    for (const a of accounts) s.add(a.email);
    return [...s].sort();
  }, [platforms, accounts]);

  /** Plataformas visibles, agrupadas por cliente (los sin cliente al final). */
  const grupos = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = platforms.filter((p) =>
      filtro === "sin-cliente" ? !p.clientId : filtro === "llena" ? cuentaLlena(p, inv) : filtro === "problemas" ? (problemas.get(p.id)?.length ?? 0) > 0 : true
    );
    if (q) {
      list = list
        .map((p) => {
          const c = p.clientId ? clientById.get(p.clientId) : undefined;
          const proj = c?.projects.find((x) => x.id === p.projectId)?.name;
          return { p, s: puntaje(p, q, [c?.name ?? "", proj ?? ""]) };
        })
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s)
        .map((x) => x.p);
    } else list = [...list].sort(byName);

    const map = new Map<string, SerializedPlatform[]>();
    for (const p of list) {
      const k = p.clientId && clientById.has(p.clientId) ? p.clientId : "";
      map.set(k, [...(map.get(k) ?? []), p]);
    }
    return [...map.entries()]
      .map(([id, items]) => ({ id, nombre: id ? clientById.get(id)!.name : "Sin cliente", archived: id ? clientById.get(id)!.archived : false, items }))
      .sort((a, b) => (a.id === "" ? 1 : b.id === "" ? -1 : a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" })));
  }, [platforms, filtro, query, inv, problemas, clientById]);

  const visibles = grupos.reduce((s, g) => s + g.items.length, 0);

  async function setPlan(provider: "vercel" | "supabase", email: string, plan: "FREE" | "PRO") {
    const key = accountKey(provider, email);
    const prev = accounts;
    setAccounts((list) => {
      const found = list.some((a) => accountKey(a.provider, a.email) === key);
      const base: ProviderAccount = { id: null, provider, email: normalizePlatformEmail(email), plan, planSource: "manual", hasToken: false, label: null, lastError: null, lastCheckedAt: null, liveUsed: null, fetchedAt: null };
      return found ? list.map((a) => (accountKey(a.provider, a.email) === key ? { ...a, plan, planSource: "manual" } : a)) : [...list, base];
    });
    const r = await pedirJson("/api/empresa/platforms/accounts", { method: "PUT", body: JSON.stringify({ provider, email, plan }) });
    if (r.error !== undefined) {
      setAccounts(prev);
      setError(`No se pudo cambiar el plan: ${r.error}`);
    } else router.refresh();
  }

  const filtros: { key: Filtro; label: string; tone?: Tone }[] = [
    { key: "todas", label: "Todas" },
    { key: "sin-cliente", label: "Sin cliente" },
    { key: "llena", label: "Cuenta llena" },
    { key: "problemas", label: "Con problemas", tone: "danger" },
  ];

  return (
    <div>
      <PageHeader
        className="mb-6"
        title="Accesos y cuentas"
        description={
          <>
            Dónde vive cada sistema de tus clientes: repo, hosting, base de datos y accesos.{" "}
            <Link href="/empresa/platforms/credenciales" className="inline-flex items-center min-h-11 lg:min-h-8 font-medium text-brand-fg hover:underline">
              Pegar credenciales de un sistema →
            </Link>
          </>
        }
        actions={
          <>
            <Link href="/empresa/sistemas" className={btn.secondary}>
              Estado de los sistemas
            </Link>
            <button type="button" onClick={() => setWizard(true)} className={btn.primary}>
              <Icon d={ICON.plus} />
              Nueva plataforma
            </button>
          </>
        }
      />

      {error && (
        <div role="alert" className="mb-4 flex items-center justify-between gap-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Cerrar aviso" className="w-8 h-8 inline-flex items-center justify-center shrink-0">
            <Icon d={ICON.close} />
          </button>
        </div>
      )}

      <div role="tablist" aria-label="Vistas de Platforms" className="flex gap-6 border-b border-line mb-4">
        {(
          [
            { key: "plataformas", label: "Plataformas", count: platforms.length, alert: 0 },
            { key: "cuentas", label: "Cuentas", count: accounts.length + data.githubAccounts.length, alert: cuentasConProblema },
          ] as { key: Tab; label: string; count: number; alert: number }[]
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px flex items-center gap-2 min-h-11 border-b-2 text-sm font-medium transition-colors ${
              tab === t.key ? "border-brand text-fg" : "border-transparent text-fg-dim hover:text-fg-mute"
            }`}
          >
            {t.label}
            <span className="text-xs text-fg-faint tabular-nums">{t.count}</span>
            {t.alert > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-danger tabular-nums" title={`${t.alert} con problemas`}>
                <Dot tone="danger" />
                {t.alert}
                <span className="sr-only">con problemas</span>
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "cuentas" ? (
        <CuentasPanel accounts={accounts} githubAccounts={data.githubAccounts} inv={inv} onRefresh={() => router.refresh()} onPlan={setPlan} />
      ) : (
        <>
          <div className="space-y-3 mb-4">
            <div className="relative">
              <Icon d={LOCAL_ICON.search} className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-fg-ghost pointer-events-none" />
              <label htmlFor="platform-search" className="sr-only">
                Buscar plataforma
              </label>
              <input
                id="platform-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setQuery("")}
                placeholder="Buscar por plataforma, cliente, dominio, repo o correo…"
                autoComplete="off"
                className="w-full bg-panel border border-line-mid rounded-lg pl-8 pr-4 min-h-11 text-base text-fg placeholder:text-fg-ghost focus:outline-none focus:border-brand/40 transition-colors"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 xl:flex xl:flex-wrap" role="group" aria-label="Filtrar plataformas">
              {filtros.map((f) => {
                const n = counts[f.key];
                const on = filtro === f.key;
                const alert = f.tone === "danger" && n > 0;
                return (
                  <button
                    key={f.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setFiltro(f.key)}
                    className={`inline-flex items-center justify-center xl:justify-start gap-2 min-h-11 sm:min-h-8 px-3 rounded-full whitespace-nowrap border text-xs font-medium transition-colors ${
                      on ? "border-brand/50 bg-brand/10 text-fg" : "border-line-mid text-fg-dim hover:text-fg"
                    }`}
                  >
                    {alert && <Dot tone="danger" />}
                    {f.label}
                    <span className={`tabular-nums ${alert ? "text-danger" : "text-fg-faint"}`}>{n}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {platforms.length === 0 ? (
            <div className="bg-panel border border-line rounded-xl px-6 py-12 text-center">
              <p className="text-fg-mute font-medium">Todavía no hay plataformas</p>
              <p className="text-fg-dim text-sm mt-1 max-w-md mx-auto">
                Registra cada sistema con su cliente, su repo, su hosting y su base. Con las cuentas conectadas, Pime lo llena desde las listas reales.
              </p>
              <button type="button" onClick={() => setWizard(true)} className={`${btn.primary} mt-6`}>
                Registrar la primera plataforma
              </button>
            </div>
          ) : visibles === 0 ? (
            <div className="bg-panel border border-line rounded-xl px-6 py-12 text-center">
              <p className="text-fg-mute font-medium">
                {query.trim()
                  ? `Nada coincide con «${query.trim()}»`
                  : filtro === "sin-cliente"
                    ? "Todas las plataformas tienen cliente"
                    : filtro === "llena"
                      ? "Ninguna cuenta está llena"
                      : "Ninguna plataforma tiene problemas"}
              </p>
              <p className="text-fg-dim text-sm mt-1">
                {query.trim() ? "Se busca en el nombre, el cliente, los dominios, el repo y los correos." : "Nada que hacer aquí por ahora."}
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setFiltro("todas");
                }}
                className={`${btn.secondary} mt-6`}
              >
                Ver las {platforms.length} plataformas
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div aria-hidden className="hidden lg:grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_32px] gap-4 px-4 -mb-4 text-xs uppercase tracking-wider text-fg-faint">
                <span>Plataforma</span>
                <span>GitHub</span>
                <span>Vercel</span>
                <span>Supabase</span>
                <span />
              </div>
              {grupos.map((g) => (
                <section key={g.id || "sin"} aria-labelledby={`grupo-${g.id || "sin"}`}>
                  <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-2 px-1">
                    <h2 id={`grupo-${g.id || "sin"}`} className="min-w-0 text-fg text-sm font-semibold [overflow-wrap:anywhere]">
                      {g.id ? (
                        <Link href={`/empresa/clientes/${g.id}`} className="inline-flex items-center min-h-11 -my-3 lg:min-h-8 lg:-my-2 hover:underline">
                          {g.nombre}
                        </Link>
                      ) : (
                        g.nombre
                      )}
                      <span className="ml-2 text-xs font-normal text-fg-faint tabular-nums">{g.items.length}</span>
                      {g.archived && <span className="ml-2 text-xs font-normal text-fg-faint">archivado</span>}
                    </h2>
                    {!g.id && <p className="text-xs text-fg-dim">Asígnalas a su cliente para verlas en su ficha.</p>}
                  </header>
                  <div className="bg-panel border border-line rounded-xl overflow-hidden">
                    {g.items.map((p) => {
                      const open = expandedId === p.id;
                      return (
                        <div key={p.id} className="border-b border-line last:border-b-0">
                          <Fila
                            p={p}
                            open={open}
                            onToggle={() => setExpandedId((cur) => (cur === p.id ? null : p.id))}
                            projectName={p.clientId ? clientById.get(p.clientId)?.projects.find((x) => x.id === p.projectId)?.name ?? null : null}
                            problemas={problemas.get(p.id) ?? []}
                            inv={inv}
                            live={data.live[p.id]}
                          />
                          {open && (
                            <div className="px-4 pb-4 pt-2 bg-fill">
                              <PlataformaDetalle
                                p={p}
                                live={data.live[p.id]}
                                problemas={problemas.get(p.id) ?? []}
                                ctx={{ clients: data.clients, githubAccounts: data.githubAccounts, accounts, inv, knownEmails }}
                                onSaved={(u) => {
                                  setPlatforms((list) => list.map((x) => (x.id === u.id ? u : x)));
                                  router.refresh();
                                }}
                                onDeleted={(id) => {
                                  setPlatforms((list) => list.filter((x) => x.id !== id));
                                  setExpandedId(null);
                                  router.refresh();
                                }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      )}

      <AsistentePlataforma
        abierto={wizard}
        onCerrar={() => {
          setWizard(false);
          router.refresh();
        }}
        clients={data.clients}
        githubAccounts={data.githubAccounts}
        accounts={accounts}
        inv={inv}
        platforms={platforms}
        clienteInicial={clienteNueva}
        proyectoInicial={proyectoNueva}
        onRefresh={() => router.refresh()}
        onCreado={(p) => {
          setPlatforms((list) => (list.some((x) => x.id === p.id) ? list.map((x) => (x.id === p.id ? p : x)) : [...list, p]));
          setTab("plataformas");
          setFiltro("todas");
          setQuery("");
          setExpandedId(p.id);
        }}
      />
    </div>
  );
}

// ─── Fila ───────────────────────────────────────────────────────────────────

type Servicio = { label: string; main: string | null; sub: string | null; tone: Tone; linked: boolean };

function servicios(p: SerializedPlatform, inv: ReturnType<typeof inventarios>, live: PlatformsData["live"][string] | undefined): Servicio[] {
  const v = vercelEstado(live?.vercelState);
  const s = supabaseEstado(live?.supabaseStatus);
  const vInv = p.vercelEmail ? inv.byKey.get(accountKey("vercel", p.vercelEmail)) : undefined;
  const sInv = p.supabaseEmail ? inv.byKey.get(accountKey("supabase", p.supabaseEmail)) : undefined;
  const slot = sInv && !sInv.pro ? sInv.platforms.find((r) => r.platformId === p.id)?.slot ?? null : null;
  const accTone = (st: string | undefined): Tone => (st === "over" ? "danger" : st === "full" ? "warn" : "ok");

  return [
    {
      label: "GitHub",
      main: p.githubRepo ? p.githubRepo.split("/").pop()! : p.githubEmail,
      sub: p.githubRepo ? (live?.githubPushedAt ? `push ${hace(live.githubPushedAt)}` : p.githubRepo.split("/")[0]) : p.githubEmail ? "sin repo elegido" : null,
      tone: p.githubRepo ? "ok" : "mute",
      linked: !!(p.githubRepo || p.githubEmail),
    },
    {
      label: "Vercel",
      main: p.vercelProjectName ?? p.vercelEmail,
      sub: v ? `${v.label}${live?.vercelDeployedAt ? ` · ${hace(live.vercelDeployedAt)}` : ""}` : vInv ? `cuenta ${usageLabel(vInv)}` : null,
      tone: v ? v.tone : p.vercelEmail ? accTone(vInv?.status) : "mute",
      linked: !!p.vercelEmail,
    },
    {
      label: "Supabase",
      main: p.supabaseEmail,
      sub: s ? `${s.label}${slot ? ` · cupo ${slot} de ${SUPABASE_FREE_SLOTS}` : ""}` : sInv?.pro ? "cuenta Pro" : slot ? `cupo ${slot} de ${SUPABASE_FREE_SLOTS}` : p.supabaseEmail ? "sin número de cupo" : null,
      tone: s ? s.tone : p.supabaseEmail ? (slot ? accTone(sInv?.status) : "warn") : "mute",
      linked: !!p.supabaseEmail,
    },
  ];
}

function Fila({
  p,
  open,
  onToggle,
  projectName,
  problemas,
  inv,
  live,
}: {
  p: SerializedPlatform;
  open: boolean;
  onToggle: () => void;
  projectName: string | null;
  problemas: Problema[];
  inv: ReturnType<typeof inventarios>;
  live: PlatformsData["live"][string] | undefined;
}) {
  const host = hostOf(p.accessUrl ?? p.linkUrl);
  const svc = servicios(p, inv, live);
  const grave = problemas.some((x) => x.grave);
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className={`w-full text-left px-4 py-3 grid grid-cols-[minmax(0,1fr)_32px] lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_32px] gap-x-4 gap-y-2 items-center transition-colors ${
        open ? "bg-fill" : "hover:bg-fill"
      }`}
    >
      <div className="min-w-0">
        <p className="text-fg text-sm font-medium flex items-center gap-2 min-w-0">
          <span className="truncate">{p.name}</span>
          {p.hasConfidential && (
            <span title="Tiene información confidencial" className="text-fg-faint shrink-0">
              <Icon d={LOCAL_ICON.lock} className="w-4 h-4" />
              <span className="sr-only">Tiene información confidencial</span>
            </span>
          )}
          {problemas.length > 0 && (
            <span className={`inline-flex items-center gap-1 shrink-0 text-xs ${grave ? "text-danger" : "text-warn"}`} title={problemas.map((x) => x.texto).join("\n")}>
              <Icon d={LOCAL_ICON.alert} className="w-4 h-4" />
              <span className="sr-only">{problemas.length === 1 ? "1 problema" : `${problemas.length} problemas`}</span>
            </span>
          )}
        </p>
        <p className="text-fg-faint text-xs truncate">{[host ?? "Sin enlace", projectName].filter(Boolean).join(" · ")}</p>
      </div>
      <Icon d={ICON.chevronDown} className={`w-4 h-4 text-fg-ghost justify-self-end lg:order-last transition-transform ${open ? "rotate-180" : ""}`} />

      {/* Teléfono y tablet: un renglón con el estado de los tres servicios. */}
      <ul className="col-span-2 flex flex-wrap gap-x-4 gap-y-1 lg:hidden" aria-label="Servicios">
        {svc.map((s) => (
          <li key={s.label} className={`flex items-center gap-2 text-xs min-w-0 ${s.linked ? "text-fg-dim" : "text-fg-faint"}`}>
            <Dot tone={s.tone} />
            <span>{s.label}</span>
            {s.linked && s.sub && <span className="truncate max-w-[10rem] text-fg-faint">{s.sub}</span>}
            {!s.linked && <span className="sr-only">sin conectar</span>}
          </li>
        ))}
      </ul>

      {/* Computadora: una columna por servicio. */}
      {svc.map((s) => (
        <div key={s.label} className="hidden lg:block min-w-0">
          {s.linked ? (
            <>
              <p className="text-fg-soft text-sm truncate" title={s.main ?? undefined}>
                {s.main}
              </p>
              {s.sub && (
                <p className="flex items-center gap-2 text-xs text-fg-faint min-w-0">
                  <Dot tone={s.tone} />
                  <span className="truncate">{s.sub}</span>
                </p>
              )}
            </>
          ) : (
            <span className="text-fg-ghost text-sm">—</span>
          )}
        </div>
      ))}
    </button>
  );
}
