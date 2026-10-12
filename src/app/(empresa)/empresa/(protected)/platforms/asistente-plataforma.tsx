"use client";

/**
 * Asistente de plataforma nueva: Cliente → Repo → Vercel → Supabase → Accesos.
 * Todo viene precargado: el nombre sale del cliente o proyecto, se propone la cuenta con cupo y el repo y
 * los proyectos cuyo nombre coincide. Cada paso se puede saltar. Al guardar se abre la bóveda para los
 * accesos (la bóveda necesita la plataforma ya creada).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Asistente, btnAsistente } from "@/components/empresa/asistente/asistente";
import { AsistenteTokenGithub } from "@/components/empresa/github/asistente-token";
import { PlatformConfidentialVault } from "@/components/empresa/platform-confidential-vault";
import { accountKey, normalizePlatformEmail, PLAN_LABEL, SUPABASE_FREE_SLOTS, usageLabel } from "@/lib/platform-slots";
import type { ClientOption, GithubAccountInfo, ProviderAccount, SerializedPlatform } from "@/lib/platforms/tipos";
import type { GithubRepoItem, SupabaseProjectItem, VercelProjectItem } from "@/lib/platforms/externo";
import type { Inventarios } from "./modelo";
import { cargarLista, claveDeItem, SelectorRemoto, sugerido, type RemoteProvider } from "./remoto";
import { hostOf, inputCls, labelCls, pedirJson } from "./ui";

const PASOS = ["Cliente", "Repo", "Vercel", "Supabase", "Accesos"];
const OTRO = "__otro__";

type Draft = {
  clientId: string;
  projectId: string;
  name: string;
  nameTouched: boolean;
  githubAccountId: string;
  githubRepo: string | null;
  vercelEmail: string;
  vercelOtro: boolean;
  vercelProjectId: string | null;
  vercelProjectName: string | null;
  supabaseEmail: string;
  supabaseOtro: boolean;
  supabaseProjectRef: string | null;
  supabaseProjectName: string | null;
  supabaseSlot: number | null;
  accessUrl: string;
  accessTouched: boolean;
  brevoEmail: string;
  notes: string;
};

const VACIO: Draft = {
  clientId: "",
  projectId: "",
  name: "",
  nameTouched: false,
  githubAccountId: "",
  githubRepo: null,
  vercelEmail: "",
  vercelOtro: false,
  vercelProjectId: null,
  vercelProjectName: null,
  supabaseEmail: "",
  supabaseOtro: false,
  supabaseProjectRef: null,
  supabaseProjectName: null,
  supabaseSlot: null,
  accessUrl: "",
  accessTouched: false,
  brevoEmail: "",
  notes: "",
};

/** Cuenta propuesta: con cupo libre; primero Pro, luego la que más espacio tiene. Con token antes que sin. */
function cuentaConCupo(provider: "vercel" | "supabase", accounts: ProviderAccount[], inv: Inventarios): ProviderAccount | null {
  const list = accounts
    .filter((a) => a.provider === provider)
    .map((a) => ({ a, i: inv.byKey.get(accountKey(provider, a.email)) }))
    .filter(({ a, i }) => a.plan === "PRO" || (i ? i.available > 0 : true))
    .sort((x, y) => Number(y.a.hasToken) - Number(x.a.hasToken) || (y.i?.available ?? 0) - (x.i?.available ?? 0));
  return list[0]?.a ?? null;
}

export function AsistentePlataforma({
  abierto,
  onCerrar,
  clients,
  githubAccounts,
  accounts,
  inv,
  platforms,
  clienteInicial,
  onCreado,
  onRefresh,
}: {
  abierto: boolean;
  onCerrar: () => void;
  clients: ClientOption[];
  githubAccounts: GithubAccountInfo[];
  accounts: ProviderAccount[];
  inv: Inventarios;
  platforms: SerializedPlatform[];
  clienteInicial?: string | null;
  onCreado: (p: SerializedPlatform) => void;
  onRefresh: () => void;
}) {
  const [paso, setPaso] = useState(1);
  const [d, setD] = useState<Draft>(VACIO);
  const [creada, setCreada] = useState<SerializedPlatform | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ghAbierto, setGhAbierto] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const propuesto = useRef<Set<number>>(new Set());

  const set = (patch: Partial<Draft>) => setD((prev) => ({ ...prev, ...patch }));

  const cliente = clients.find((c) => c.id === d.clientId) ?? null;
  const proyecto = cliente?.projects.find((p) => p.id === d.projectId) ?? null;
  const nombres = useMemo(() => [d.name, proyecto?.name ?? "", cliente?.name ?? ""].filter(Boolean), [d.name, proyecto?.name, cliente?.name]);

  // Al abrir: cliente de la URL (desde la ficha) y su proyecto si tiene uno solo.
  useEffect(() => {
    if (!abierto) return;
    const c = clienteInicial ? clients.find((x) => x.id === clienteInicial) : undefined;
    const p = c?.projects.length === 1 ? c.projects[0] : undefined;
    setD({ ...VACIO, clientId: c?.id ?? "", projectId: p?.id ?? "", name: p?.name ?? c?.name ?? "" });
    setPaso(1);
    setCreada(null);
    setError(null);
    propuesto.current = new Set();
  }, [abierto, clienteInicial, clients]);

  function elegirCliente(clientId: string) {
    const c = clients.find((x) => x.id === clientId);
    const p = c?.projects.length === 1 ? c.projects[0] : undefined;
    setD((prev) => ({ ...prev, clientId, projectId: p?.id ?? "", name: prev.nameTouched ? prev.name : (p?.name ?? c?.name ?? "") }));
  }

  function elegirProyecto(projectId: string) {
    const p = cliente?.projects.find((x) => x.id === projectId);
    setD((prev) => ({ ...prev, projectId, name: prev.nameTouched ? prev.name : (p?.name ?? cliente?.name ?? prev.name) }));
  }

  /**
   * Al entrar a Repo, Vercel o Supabase por primera vez: busca en las listas reales de todas las cuentas con
   * token el repo o proyecto cuyo nombre coincide. Si no hay, propone la cuenta con cupo.
   */
  useEffect(() => {
    if (!abierto || paso < 2 || paso > 4 || propuesto.current.has(paso)) return;
    propuesto.current.add(paso);
    const provider: RemoteProvider = paso === 2 ? "github" : paso === 3 ? "vercel" : "supabase";
    const cuentas =
      provider === "github"
        ? githubAccounts.map((g) => ({ id: g.id, email: g.login }))
        : accounts.filter((a) => a.provider === provider && a.hasToken && a.id).map((a) => ({ id: a.id!, email: a.email }));

    const aplicarSinCoincidencia = () => {
      if (provider === "github") {
        if (githubAccounts[0]) set({ githubAccountId: githubAccounts[0].id });
      } else {
        const a = cuentaConCupo(provider, accounts, inv);
        if (a) aplicarCuenta(provider, a.email);
      }
    };

    if (!cuentas.length) {
      aplicarSinCoincidencia();
      return;
    }
    setBuscando(true);
    void Promise.all(cuentas.map(async (c) => ({ c, r: await cargarLista(provider, c.id) }))).then((res) => {
      setBuscando(false);
      let mejor: { c: { id: string; email: string }; key: string; item: GithubRepoItem | VercelProjectItem | SupabaseProjectItem } | null = null;
      const todos = res.flatMap(({ c, r }) => ("items" in r ? r.items.map((item) => ({ c, item })) : []));
      const hit = sugerido(provider, todos.map((t) => t.item) as never[], nombres);
      if (hit) {
        const t = todos.find((x) => x.item === hit)!;
        mejor = { c: t.c, key: claveDeItem(provider, hit), item: hit };
      }
      if (!mejor) {
        aplicarSinCoincidencia();
        return;
      }
      if (provider === "github") set({ githubAccountId: mejor.c.id, githubRepo: mejor.key });
      else {
        aplicarCuenta(provider, mejor.c.email);
        aplicarItem(provider, mejor.key, mejor.item as VercelProjectItem | SupabaseProjectItem);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, paso]);

  function aplicarCuenta(provider: "vercel" | "supabase", email: string, otro = false) {
    if (provider === "vercel") {
      set({ vercelEmail: email, vercelOtro: otro, vercelProjectId: null, vercelProjectName: null });
      return;
    }
    const i = inv.byKey.get(accountKey("supabase", email));
    // Supabase gratis: se propone el primer cupo libre. Correo nuevo: cupo 1.
    const slot = !email ? null : i ? (i.pro ? null : (i.freeSlots[0] ?? null)) : 1;
    set({ supabaseEmail: email, supabaseOtro: otro, supabaseProjectRef: null, supabaseProjectName: null, supabaseSlot: slot });
  }

  function aplicarItem(provider: "vercel" | "supabase", key: string | null, item: VercelProjectItem | SupabaseProjectItem | null) {
    if (provider === "vercel") {
      const v = item as VercelProjectItem | null;
      setD((prev) => ({
        ...prev,
        vercelProjectId: key,
        vercelProjectName: v?.name ?? null,
        accessUrl: prev.accessTouched || !v?.domain ? prev.accessUrl : `https://${v.domain}`,
      }));
    } else set({ supabaseProjectRef: key, supabaseProjectName: item?.name ?? null });
  }

  async function guardar() {
    setGuardando(true);
    setError(null);
    const body = {
      name: d.name.trim(),
      clientId: d.clientId || null,
      projectId: d.projectId || null,
      githubAccountId: d.githubRepo ? d.githubAccountId || null : null,
      githubRepo: d.githubRepo,
      githubEmail: d.githubRepo ? (githubAccounts.find((g) => g.id === d.githubAccountId)?.login ?? null) : null,
      vercelEmail: d.vercelEmail.trim() || null,
      vercelProjectId: d.vercelEmail ? d.vercelProjectId : null,
      vercelProjectName: d.vercelEmail ? d.vercelProjectName : null,
      supabaseEmail: d.supabaseEmail.trim() || null,
      supabaseProjectRef: d.supabaseEmail ? d.supabaseProjectRef : null,
      supabaseSlot: d.supabaseEmail ? d.supabaseSlot : null,
      accessUrl: d.accessUrl || null,
      brevoEmail: d.brevoEmail || null,
      notes: d.notes || null,
    };
    const r = await pedirJson<SerializedPlatform>("/api/empresa/platforms", { method: "POST", body: JSON.stringify(body) });
    setGuardando(false);
    if (r.error !== undefined) {
      setError(r.error);
      return;
    }
    setCreada(r.data);
    onCreado(r.data);
  }

  const knownEmails = useMemo(() => {
    const s = new Set<string>();
    for (const p of platforms) for (const e of [p.supabaseEmail, p.vercelEmail, p.brevoEmail]) if (e) s.add(normalizePlatformEmail(e));
    for (const a of accounts) s.add(a.email);
    return [...s].sort();
  }, [platforms, accounts]);

  const nombreCliente = cliente?.name ?? null;
  const guardarLabel = guardando ? "Guardando…" : nombreCliente ? `Guardar plataforma de ${nombreCliente}` : "Guardar plataforma";

  function saltar() {
    if (paso === 2) set({ githubRepo: null });
    if (paso === 3) set({ vercelEmail: "", vercelOtro: false, vercelProjectId: null, vercelProjectName: null });
    if (paso === 4) set({ supabaseEmail: "", supabaseOtro: false, supabaseProjectRef: null, supabaseSlot: null });
    setPaso((p) => p + 1);
  }

  const pie = creada ? (
    <button type="button" className={btnAsistente.principal} onClick={onCerrar}>
      Terminar
    </button>
  ) : (
    <>
      {paso > 1 && (
        <button type="button" className={btnAsistente.secundario} onClick={() => setPaso((p) => p - 1)}>
          Atrás
        </button>
      )}
      {paso >= 2 && paso <= 4 && (
        <button type="button" className={btnAsistente.secundario} onClick={saltar}>
          No aplica, saltar
        </button>
      )}
      {paso < 5 ? (
        <button type="button" className={btnAsistente.principal} disabled={paso === 1 && !d.name.trim()} onClick={() => setPaso((p) => p + 1)}>
          Siguiente: {PASOS[paso]}
        </button>
      ) : (
        <button type="button" className={`${btnAsistente.principal} min-w-0 text-center`} disabled={guardando || !d.name.trim()} onClick={() => void guardar()}>
          <span className="min-w-0 [overflow-wrap:anywhere]">{guardarLabel}</span>
        </button>
      )}
    </>
  );

  const cuentaSelect = (provider: "vercel" | "supabase") => {
    const email = normalizePlatformEmail(provider === "vercel" ? d.vercelEmail : d.supabaseEmail);
    const otro = provider === "vercel" ? d.vercelOtro : d.supabaseOtro;
    const list = accounts.filter((a) => a.provider === provider);
    const acc = list.find((a) => a.email === email) ?? null;
    const i = email ? inv.byKey.get(accountKey(provider, email)) : undefined;
    const nombre = provider === "vercel" ? "Vercel" : "Supabase";
    return (
      <div className="space-y-4">
        <div>
          <label htmlFor={`wz-${provider}-cuenta`} className={labelCls}>
            Cuenta de {nombre}
          </label>
          <select
            id={`wz-${provider}-cuenta`}
            value={otro ? OTRO : acc ? email : ""}
            onChange={(e) => (e.target.value === OTRO ? aplicarCuenta(provider, "", true) : aplicarCuenta(provider, e.target.value))}
            className={inputCls}
          >
            <option value="">{list.length ? "Elige una cuenta" : "Sin cuentas registradas"}</option>
            {list.map((a) => {
              const ii = inv.byKey.get(accountKey(provider, a.email));
              return (
                <option key={a.email} value={a.email}>
                  {a.email} · {ii ? usageLabel(ii) : PLAN_LABEL[provider][a.plan]}
                  {ii?.status === "full" || ii?.status === "over" ? " · llena" : ""}
                </option>
              );
            })}
            <option value={OTRO}>Otra cuenta (escribir el correo)</option>
          </select>
        </div>
        {otro && (
          <div>
            <label htmlFor={`wz-${provider}-correo`} className={labelCls}>
              Correo de la cuenta de {nombre}
            </label>
            <input
              id={`wz-${provider}-correo`}
              type="email"
              inputMode="email"
              list="wz-emails"
              autoFocus
              value={provider === "vercel" ? d.vercelEmail : d.supabaseEmail}
              onChange={(e) => aplicarCuenta(provider, e.target.value, true)}
              placeholder="cuenta@gmail.com"
              className={inputCls}
            />
          </div>
        )}
        {i && (i.status === "full" || i.status === "over") && (
          <p className="rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-sm text-warn">
            Esta cuenta ya usa {usageLabel(i)}. El proyecto nuevo no cabe en el plan {PLAN_LABEL[provider].FREE}: usa otra cuenta o márcala Pro en Cuentas.
          </p>
        )}
        {acc?.hasToken && acc.id ? (
          provider === "vercel" ? (
            <SelectorRemoto
              key={acc.id}
              id="wz-vercel-proyecto"
              provider="vercel"
              accountId={acc.id}
              value={d.vercelProjectId}
              nombres={nombres}
              onChange={(k, it) => aplicarItem("vercel", k, it)}
            />
          ) : (
            <SelectorRemoto
              key={acc.id}
              id="wz-supabase-proyecto"
              provider="supabase"
              accountId={acc.id}
              value={d.supabaseProjectRef}
              nombres={nombres}
              onChange={(k, it) => aplicarItem("supabase", k, it)}
            />
          )
        ) : email ? (
          <p className="rounded-lg border border-line bg-fill px-3 py-2 text-sm text-fg-dim">
            Esta cuenta no tiene token: se guarda solo el correo. Conecta su token en la pestaña Cuentas para elegir el proyecto de la lista real.
          </p>
        ) : null}
        {provider === "supabase" && email && !i?.pro && (
          <div>
            <p className={labelCls}>Cupo en esa cuenta</p>
            <div role="radiogroup" aria-label="Cupo en Supabase" className="grid grid-cols-2 gap-2">
              {Array.from({ length: SUPABASE_FREE_SLOTS }, (_, k) => k + 1).map((n) => {
                const other = i?.bySlot.get(n)?.platformName ?? null;
                const selected = d.supabaseSlot === n;
                return (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => set({ supabaseSlot: n })}
                    className={`min-h-11 px-3 rounded-lg border text-left text-sm transition-colors ${
                      selected ? (other ? "border-danger/50 bg-danger/10 text-fg" : "border-brand/50 bg-brand/10 text-fg") : "border-line-mid text-fg-soft hover:bg-fill-2"
                    }`}
                  >
                    <span className="tabular-nums font-medium">Cupo {n}</span>
                    <span className={`block text-xs truncate ${other ? (selected ? "text-danger" : "text-fg-faint") : "text-ok"}`}>{other ? `Ocupado por ${other}` : "Libre"}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const resumen: [string, string | null][] = [
    ["Cliente", nombreCliente ? `${nombreCliente}${proyecto ? ` · ${proyecto.name}` : ""}` : "Sin cliente"],
    ["Repo", d.githubRepo],
    ["Vercel", d.vercelEmail.trim() ? `${d.vercelProjectName ?? "sin proyecto elegido"} · ${d.vercelEmail.trim()}` : null],
    ["Supabase", d.supabaseEmail.trim() ? `${d.supabaseProjectName ?? "sin proyecto elegido"} · ${d.supabaseSlot ? `cupo ${d.supabaseSlot} · ` : ""}${d.supabaseEmail.trim()}` : null],
  ];

  return (
    <>
      <Asistente
        abierto={abierto}
        onCerrar={onCerrar}
        titulo={creada ? "Plataforma guardada" : paso === 1 ? "Plataforma nueva" : d.name || "Plataforma nueva"}
        paso={creada ? 5 : paso}
        pasos={PASOS}
        pie={pie}
      >
        <datalist id="wz-emails">
          {knownEmails.map((e) => (
            <option key={e} value={e} />
          ))}
        </datalist>

        {creada ? (
          <div className="space-y-6">
            <p className="text-fg-mute text-sm leading-relaxed">
              {creada.name} quedó guardada{nombreCliente ? ` en la ficha de ${nombreCliente}` : ""}. Si tienes contraseñas o llaves de este sistema, guárdalas ahora en la bóveda: van cifradas.
            </p>
            <PlatformConfidentialVault platformId={creada.id} hasConfidential={creada.hasConfidential} onUpdated={(has) => onCreado({ ...creada, hasConfidential: has })} />
          </div>
        ) : paso === 1 ? (
          <div className="space-y-4">
            <p className="text-fg-dim text-sm">Cada plataforma es de un cliente y aparece en su ficha. Si es un sistema interno, déjala sin cliente.</p>
            <div>
              <label htmlFor="wz-cliente" className={labelCls}>
                Cliente
              </label>
              <select id="wz-cliente" value={d.clientId} onChange={(e) => elegirCliente(e.target.value)} className={inputCls}>
                <option value="">Sin cliente (sistema interno)</option>
                {clients
                  .filter((c) => !c.archived)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
              {clients.length === 0 && <p className="text-xs text-fg-dim mt-1">Todavía no tienes clientes. Puedes guardarla sin cliente y asignarla después.</p>}
            </div>
            {cliente && (
              <div>
                <label htmlFor="wz-proyecto" className={labelCls}>
                  Proyecto
                </label>
                <select id="wz-proyecto" value={d.projectId} onChange={(e) => elegirProyecto(e.target.value)} className={inputCls} disabled={!cliente.projects.length}>
                  <option value="">{cliente.projects.length ? "Sin proyecto" : "Este cliente no tiene proyectos"}</option>
                  {cliente.projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label htmlFor="wz-nombre" className={labelCls}>
                Nombre de la plataforma
              </label>
              <input
                id="wz-nombre"
                value={d.name}
                onChange={(e) => set({ name: e.target.value, nameTouched: true })}
                placeholder="Ej. Portal de reservas"
                className={inputCls}
                maxLength={120}
              />
              <p className="text-xs text-fg-dim mt-1">Con este nombre se buscan el repo y los proyectos de Vercel y Supabase.</p>
            </div>
          </div>
        ) : paso === 2 ? (
          <div className="space-y-4">
            {githubAccounts.length === 0 ? (
              <div className="rounded-xl border border-line bg-fill px-4 py-4 space-y-2">
                <p className="text-fg text-sm font-semibold">Sin cuentas de GitHub conectadas</p>
                <p className="text-fg-dim text-sm">Conecta la cuenta donde vive el código y elige el repo de la lista. Si no aplica, salta este paso.</p>
                <button type="button" className={btnAsistente.secundario} onClick={() => setGhAbierto(true)}>
                  Conectar cuenta de GitHub
                </button>
              </div>
            ) : (
              <>
                <div>
                  <label htmlFor="wz-gh-cuenta" className={labelCls}>
                    Cuenta de GitHub
                  </label>
                  <select id="wz-gh-cuenta" value={d.githubAccountId} onChange={(e) => set({ githubAccountId: e.target.value, githubRepo: null })} className={inputCls}>
                    {!d.githubAccountId && <option value="">Elige una cuenta</option>}
                    {githubAccounts.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.login}
                        {g.error ? " · token con problemas" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                {buscando && !d.githubAccountId ? (
                  <p className="text-sm text-fg-dim" aria-busy="true">
                    Buscando el repo en tus cuentas…
                  </p>
                ) : d.githubAccountId ? (
                  <SelectorRemoto
                    key={d.githubAccountId}
                    id="wz-gh-repo"
                    provider="github"
                    accountId={d.githubAccountId}
                    value={d.githubRepo}
                    nombres={nombres}
                    onChange={(k) => set({ githubRepo: k })}
                  />
                ) : null}
              </>
            )}
          </div>
        ) : paso === 3 || paso === 4 ? (
          <div className="space-y-4">
            {buscando && <p className="text-sm text-fg-dim" aria-busy="true">Buscando {paso === 3 ? "el proyecto de Vercel" : "el proyecto de Supabase"} en tus cuentas…</p>}
            {cuentaSelect(paso === 3 ? "vercel" : "supabase")}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label htmlFor="wz-acceso" className={labelCls}>
                Enlace de la plataforma
              </label>
              <input
                id="wz-acceso"
                type="url"
                inputMode="url"
                value={d.accessUrl}
                onChange={(e) => set({ accessUrl: e.target.value, accessTouched: true })}
                placeholder="https://…"
                className={inputCls}
              />
              {d.accessUrl && !d.accessTouched && <p className="text-xs text-fg-dim mt-1">Sale del dominio de Vercel: {hostOf(d.accessUrl)}</p>}
            </div>
            <div>
              <label htmlFor="wz-brevo" className={labelCls}>
                Cuenta de Brevo (correos del sistema)
              </label>
              <input id="wz-brevo" type="email" inputMode="email" list="wz-emails" value={d.brevoEmail} onChange={(e) => set({ brevoEmail: e.target.value })} placeholder="Si no usa Brevo, déjalo vacío" className={inputCls} />
            </div>
            <div>
              <label htmlFor="wz-notas" className={labelCls}>
                Notas
              </label>
              <textarea id="wz-notas" rows={3} value={d.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Lo que conviene recordar de este sistema" className={`${inputCls} py-2 resize-y`} />
            </div>
            <dl className="rounded-xl bg-fill px-4 py-3 space-y-1 text-sm">
              {resumen.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[72px_minmax(0,1fr)] gap-2">
                  <dt className="text-fg-dim">{k}</dt>
                  <dd className={`min-w-0 [overflow-wrap:anywhere] ${v ? "text-fg-soft" : "text-fg-faint"}`}>{v ?? "No aplica"}</dd>
                </div>
              ))}
            </dl>
            <p className="text-xs text-fg-dim">Las contraseñas no van aquí: al guardar se abre la bóveda cifrada.</p>
            {error && (
              <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}
          </div>
        )}
      </Asistente>
      <AsistenteTokenGithub abierto={ghAbierto} onCerrar={() => setGhAbierto(false)} onListo={() => onRefresh()} />
    </>
  );
}
