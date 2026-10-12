"use client";

/** Detalle de una plataforma al abrir su fila: cliente, repo, Vercel, Supabase, enlaces y bóveda; y su edición. */
import { useCallback, useEffect, useState } from "react";
import Link from "@/components/empresa/link";
import { PlatformConfidentialVault } from "@/components/empresa/platform-confidential-vault";
import { Icon, ICON } from "@/components/empresa/tasks/task-parts";
import { accountKey, normalizePlatformEmail, PLAN_LABEL, SUPABASE_FREE_SLOTS, usageLabel } from "@/lib/platform-slots";
import { clienteInequivoco } from "@/lib/platforms/enlazar";
import type { GithubCommit, SupabaseProjectItem, VercelProjectItem } from "@/lib/platforms/externo";
import type { ClientOption, GithubAccountInfo, PlatformLiveSummary, ProviderAccount, SerializedPlatform } from "@/lib/platforms/tipos";
import type { Inventarios, Problema } from "./modelo";
import { SelectorRemoto } from "./remoto";
import { Badge, CopyButton, ErrorBar, hace, hostOf, hrefOf, inputCls, labelCls, linkBtn, LOCAL_ICON, pedirJson, sectionTitle, supabaseEstado, vercelEstado } from "./ui";

type LiveDetalle = {
  github: { commit: GithubCommit | null; error: string | null; fetchedAt: string | null } | null;
  vercel: { project: VercelProjectItem | null; error: string | null; fetchedAt: string | null } | null;
  supabase: { project: SupabaseProjectItem | null; error: string | null; fetchedAt: string | null } | null;
};

type Ctx = {
  clients: ClientOption[];
  githubAccounts: GithubAccountInfo[];
  accounts: ProviderAccount[];
  inv: Inventarios;
  knownEmails: string[];
};

function Fila({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[80px_minmax(0,1fr)] gap-x-3 gap-y-1 py-2 border-b border-line last:border-b-0">
      <dt className="text-fg-dim text-xs pt-1">{label}</dt>
      <dd className="min-w-0 text-sm">{children}</dd>
    </div>
  );
}

function Externo({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={hrefOf(href)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 max-w-full min-h-11 -my-3 lg:min-h-8 lg:-my-2 text-brand-fg hover:underline min-w-0">
      <span className="truncate">{children}</span>
      <Icon d={LOCAL_ICON.external} className="w-4 h-4 shrink-0" />
    </a>
  );
}

function Nada({ children }: { children: React.ReactNode }) {
  return <span className="text-fg-faint">{children}</span>;
}

function Cargando() {
  return <span className="block h-4 w-40 max-w-full rounded bg-fill-3 animate-pulse" aria-label="Cargando" />;
}

export function PlataformaDetalle({
  p,
  live,
  problemas,
  ctx,
  onSaved,
  onDeleted,
}: {
  p: SerializedPlatform;
  live: PlatformLiveSummary | undefined;
  problemas: Problema[];
  ctx: Ctx;
  onSaved: (p: SerializedPlatform) => void;
  onDeleted: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [detalle, setDetalle] = useState<{ status: "idle" | "loading" | "ready" | "error"; data?: LiveDetalle; error?: string }>({ status: "idle" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tieneVivo = !!((p.githubAccountId && p.githubRepo) || p.vercelProjectId || p.supabaseProjectRef);

  const cargarVivo = useCallback(
    async (refresh = false) => {
      if (!tieneVivo) return;
      setDetalle((d) => ({ ...d, status: "loading" }));
      const r = await pedirJson<LiveDetalle>(`/api/empresa/platforms/${p.id}/live${refresh ? "?refresh=1" : ""}`);
      setDetalle(r.error !== undefined ? { status: "error", error: r.error } : { status: "ready", data: r.data });
    },
    [p.id, tieneVivo]
  );

  useEffect(() => {
    void cargarVivo();
    // Al cambiar el repo o los proyectos, se vuelve a leer.
  }, [cargarVivo, p.githubRepo, p.vercelProjectId, p.supabaseProjectRef]);

  async function patch(body: Partial<SerializedPlatform>) {
    setBusy(true);
    setError(null);
    const r = await pedirJson<SerializedPlatform>(`/api/empresa/platforms/${p.id}`, { method: "PATCH", body: JSON.stringify(body) });
    setBusy(false);
    if (r.error !== undefined) {
      setError(r.error);
      return false;
    }
    onSaved(r.data);
    return true;
  }

  async function eliminar() {
    if (!window.confirm(`¿Eliminar ${p.name}? Se borran sus datos y su información confidencial. No se toca nada en GitHub, Vercel ni Supabase.`)) return;
    setBusy(true);
    const r = await pedirJson(`/api/empresa/platforms/${p.id}`, { method: "DELETE" });
    setBusy(false);
    if (r.error !== undefined) setError(r.error);
    else onDeleted(p.id);
  }

  const cliente = ctx.clients.find((c) => c.id === p.clientId) ?? null;
  const proyecto = cliente?.projects.find((x) => x.id === p.projectId) ?? null;
  const sugerencia = !cliente ? clienteInequivoco(p.name, ctx.clients.filter((c) => !c.archived)) : null;
  const gh = ctx.githubAccounts.find((g) => g.id === p.githubAccountId) ?? null;

  const vInv = p.vercelEmail ? ctx.inv.byKey.get(accountKey("vercel", p.vercelEmail)) : undefined;
  const sInv = p.supabaseEmail ? ctx.inv.byKey.get(accountKey("supabase", p.supabaseEmail)) : undefined;
  const sSlot = sInv && !sInv.pro ? sInv.platforms.find((r) => r.platformId === p.id)?.slot ?? null : null;

  const d = detalle.data;
  const loading = detalle.status === "loading" && !d;
  const vProj = d?.vercel?.project;
  const sProj = d?.supabase?.project;
  const vState = vercelEstado(vProj?.deployState ?? live?.vercelState);
  const sState = supabaseEstado(sProj?.status ?? live?.supabaseStatus);

  if (editing) {
    return (
      <EditForm
        p={p}
        ctx={ctx}
        busy={busy}
        error={error}
        onCancel={() => {
          setEditing(false);
          setError(null);
        }}
        onSave={async (body) => {
          if (await patch(body)) setEditing(false);
        }}
        onDelete={() => void eliminar()}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4 min-w-0">
        {error && <ErrorBar message={error} onClose={() => setError(null)} />}
        {problemas.length > 0 && (
          <ul className="rounded-lg border border-warn/30 bg-warn/10 px-4 py-2 space-y-1 text-sm">
            {problemas.map((x) => (
              <li key={x.texto} className={`flex items-start gap-2 ${x.grave ? "text-danger" : "text-warn"}`}>
                <Icon d={LOCAL_ICON.alert} className="w-4 h-4 mt-1 shrink-0" />
                <span className="min-w-0">{x.texto}</span>
              </li>
            ))}
          </ul>
        )}

        <section>
          <h3 className={`${sectionTitle} mb-1`}>Cliente</h3>
          {cliente ? (
            <dl>
              <Fila label="Cliente">
                <Link href={`/empresa/clientes/${cliente.id}`} className="inline-flex items-center min-h-11 -my-3 lg:min-h-8 lg:-my-2 text-brand-fg hover:underline [overflow-wrap:anywhere]">
                  {cliente.name}
                </Link>
                {cliente.archived && <span className="text-fg-faint text-xs"> · archivado</span>}
              </Fila>
              <Fila label="Proyecto">
                {proyecto ? (
                  <Link href={`/empresa/proyectos/${proyecto.id}`} className="inline-flex items-center min-h-11 -my-3 lg:min-h-8 lg:-my-2 text-brand-fg hover:underline [overflow-wrap:anywhere]">
                    {proyecto.name}
                  </Link>
                ) : (
                  <Nada>Sin proyecto</Nada>
                )}
              </Fila>
            </dl>
          ) : (
            <div className="rounded-lg border border-line bg-panel px-3 py-3 space-y-2">
              <p className="text-sm text-fg-mute">Sin cliente: no aparece en ninguna ficha.</p>
              <div className="flex flex-wrap items-center gap-2">
                {sugerencia && (
                  <button type="button" disabled={busy} onClick={() => void patch({ clientId: sugerencia.id })} className="inline-flex items-center gap-2 min-h-11 sm:min-h-10 px-4 rounded-lg border border-brand/40 bg-brand/10 text-brand-fg hover:bg-brand/20 text-sm font-semibold text-left disabled:opacity-50">
                    Asignar a {sugerencia.name}
                  </button>
                )}
                <label htmlFor={`asignar-${p.id}`} className="sr-only">
                  Asignar a un cliente
                </label>
                <select
                  id={`asignar-${p.id}`}
                  value=""
                  disabled={busy || ctx.clients.length === 0}
                  onChange={(e) => e.target.value && void patch({ clientId: e.target.value })}
                  className={`${inputCls} sm:w-auto sm:min-w-[14rem] flex-1`}
                >
                  <option value="">{ctx.clients.length ? (sugerencia ? "Otro cliente…" : "Asignar a un cliente…") : "No hay clientes"}</option>
                  {ctx.clients
                    .filter((c) => !c.archived)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className={sectionTitle}>Sistema</h3>
            {tieneVivo && (
              <button type="button" onClick={() => void cargarVivo(true)} disabled={detalle.status === "loading"} className={`${linkBtn} text-xs`}>
                <Icon d={LOCAL_ICON.refresh} className="w-4 h-4" />
                {detalle.status === "loading" ? "Actualizando…" : "Actualizar en vivo"}
              </button>
            )}
          </div>
          {detalle.status === "error" && <p className="text-xs text-danger mb-1">{detalle.error}</p>}
          <dl>
            <Fila label="GitHub">
              {p.githubRepo ? (
                <div className="space-y-1 min-w-0">
                  <Externo href={`https://github.com/${p.githubRepo}`}>{p.githubRepo}</Externo>
                  {loading ? (
                    <Cargando />
                  ) : d?.github?.commit ? (
                    <p className="text-xs text-fg-dim [overflow-wrap:anywhere]">
                      «{d.github.commit.message}» · {hace(d.github.commit.date)}
                    </p>
                  ) : d?.github?.error ? (
                    <p className="text-xs text-danger">{d.github.error}</p>
                  ) : live?.githubPushedAt ? (
                    <p className="text-xs text-fg-dim">Último push {hace(live.githubPushedAt)}</p>
                  ) : null}
                  <p className="text-xs text-fg-faint">{gh ? `Cuenta ${gh.login}` : "Sin cuenta conectada: no se lee en vivo"}</p>
                </div>
              ) : p.githubEmail ? (
                <span className="text-fg-soft [overflow-wrap:anywhere]">{p.githubEmail}</span>
              ) : (
                <Nada>Sin repo</Nada>
              )}
            </Fila>
            <Fila label="Vercel">
              {p.vercelEmail ? (
                <div className="space-y-1 min-w-0">
                  <p className="flex flex-wrap items-center gap-2 min-w-0">
                    <span className="text-fg-soft truncate">{p.vercelProjectName ?? "Proyecto sin elegir"}</span>
                    {vState && <Badge tone={vState.tone}>{vState.label}</Badge>}
                  </p>
                  {loading && p.vercelProjectId ? (
                    <Cargando />
                  ) : (
                    (vProj?.domain ?? live?.vercelDomain) && (
                      <p className="text-xs">
                        <Externo href={(vProj?.domain ?? live?.vercelDomain)!}>{vProj?.domain ?? live?.vercelDomain}</Externo>
                        {(vProj?.deployedAt ?? live?.vercelDeployedAt) && <span className="text-fg-dim"> · deploy {hace(vProj?.deployedAt ?? live?.vercelDeployedAt)}</span>}
                      </p>
                    )
                  )}
                  {d?.vercel?.error && <p className="text-xs text-danger">{d.vercel.error}</p>}
                  <p className="flex items-center gap-1 text-xs text-fg-faint min-w-0">
                    <span className="truncate">{p.vercelEmail}</span>
                    {vInv && <span className="shrink-0 tabular-nums">· {usageLabel(vInv)}</span>}
                  </p>
                </div>
              ) : (
                <Nada>No usa Vercel</Nada>
              )}
            </Fila>
            <Fila label="Supabase">
              {p.supabaseEmail ? (
                <div className="space-y-1 min-w-0">
                  <p className="flex flex-wrap items-center gap-2 min-w-0">
                    <span className="text-fg-soft truncate">{sProj?.name ?? (p.supabaseProjectRef ? p.supabaseProjectRef : "Proyecto sin elegir")}</span>
                    {sState && <Badge tone={sState.tone}>{sState.label}</Badge>}
                  </p>
                  {loading && p.supabaseProjectRef ? (
                    <Cargando />
                  ) : (
                    p.supabaseProjectRef && (
                      <p className="text-xs">
                        <Externo href={`https://supabase.com/dashboard/project/${p.supabaseProjectRef}`}>Abrir en Supabase</Externo>
                        {(sProj?.region ?? live?.supabaseRegion) && <span className="text-fg-dim"> · {sProj?.region ?? live?.supabaseRegion}</span>}
                      </p>
                    )
                  )}
                  {d?.supabase?.error && <p className="text-xs text-danger">{d.supabase.error}</p>}
                  <p className="flex items-center gap-1 text-xs text-fg-faint min-w-0">
                    <span className="truncate">{p.supabaseEmail}</span>
                    <span className="shrink-0 tabular-nums">
                      {sInv?.pro ? "· Pro" : sSlot ? `· cupo ${sSlot} de ${SUPABASE_FREE_SLOTS}` : "· sin número de cupo"}
                    </span>
                  </p>
                </div>
              ) : (
                <Nada>No usa Supabase</Nada>
              )}
            </Fila>
          </dl>
        </section>

        <section>
          <h3 className={`${sectionTitle} mb-1`}>Enlaces y correos</h3>
          <dl>
            <Fila label="Enlace">
              {p.accessUrl ? (
                <span className="flex items-center gap-1 min-w-0">
                  <Externo href={p.accessUrl}>{hostOf(p.accessUrl)}</Externo>
                  <CopyButton value={p.accessUrl} label="enlace" />
                </span>
              ) : (
                <Nada>Sin enlace</Nada>
              )}
            </Fila>
            {p.linkUrl && p.linkUrl !== p.accessUrl && (
              <Fila label="Otro enlace">
                <span className="flex items-center gap-1 min-w-0">
                  <Externo href={p.linkUrl}>{hostOf(p.linkUrl)}</Externo>
                  <CopyButton value={p.linkUrl} label="enlace" />
                </span>
              </Fila>
            )}
            <Fila label="Brevo">{p.brevoEmail ? <span className="text-fg-soft [overflow-wrap:anywhere]">{p.brevoEmail}</span> : <Nada>No usa Brevo</Nada>}</Fila>
          </dl>
        </section>

        {p.notes && (
          <section>
            <h3 className={`${sectionTitle} mb-1`}>Notas</h3>
            <p className="text-sm text-fg-soft whitespace-pre-line leading-relaxed [overflow-wrap:anywhere]">{p.notes}</p>
          </section>
        )}

        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-2 px-4 min-h-11 border border-line-mid text-fg-soft hover:text-fg text-sm font-semibold rounded-lg transition-colors"
        >
          <Icon d={ICON.pencil} />
          Editar datos
        </button>
      </div>
      <PlatformConfidentialVault platformId={p.id} hasConfidential={p.hasConfidential} onUpdated={(has) => onSaved({ ...p, hasConfidential: has })} />
    </div>
  );
}

// ─── Edición ────────────────────────────────────────────────────────────────

function EditForm({
  p,
  ctx,
  busy,
  error,
  onSave,
  onCancel,
  onDelete,
}: {
  p: SerializedPlatform;
  ctx: Ctx;
  busy: boolean;
  error: string | null;
  onSave: (body: Partial<SerializedPlatform>) => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const [d, setD] = useState<SerializedPlatform>(p);
  const set = (patch: Partial<SerializedPlatform>) => setD((prev) => ({ ...prev, ...patch }));
  const cliente = ctx.clients.find((c) => c.id === d.clientId) ?? null;
  const nombres = [d.name, cliente?.name ?? ""];

  const tokenAcc = (provider: "vercel" | "supabase", email: string | null) =>
    email ? ctx.accounts.find((a) => a.provider === provider && a.email === normalizePlatformEmail(email) && a.hasToken && a.id) ?? null : null;
  const vAcc = tokenAcc("vercel", d.vercelEmail);
  const sAcc = tokenAcc("supabase", d.supabaseEmail);
  const sInv = d.supabaseEmail ? ctx.inv.byKey.get(accountKey("supabase", d.supabaseEmail)) : undefined;

  const text = (key: "name" | "accessUrl" | "linkUrl" | "brevoEmail" | "githubEmail" | "vercelEmail" | "supabaseEmail", label: string, placeholder: string, kind: "text" | "email" | "url" = "text") => (
    <div className="min-w-0">
      <label htmlFor={`ed-${p.id}-${key}`} className={labelCls}>
        {label}
      </label>
      <input
        id={`ed-${p.id}-${key}`}
        type={kind}
        inputMode={kind === "text" ? undefined : kind}
        list={kind === "email" ? `ed-${p.id}-emails` : undefined}
        value={(d[key] as string | null) ?? ""}
        onChange={(e) => {
          const v = e.target.value || null;
          // Cambiar de cuenta suelta el proyecto elegido en la anterior.
          if (key === "vercelEmail") set({ vercelEmail: v, ...(v !== p.vercelEmail ? { vercelProjectId: null, vercelProjectName: null } : { vercelProjectId: p.vercelProjectId, vercelProjectName: p.vercelProjectName }) });
          else if (key === "supabaseEmail") set({ supabaseEmail: v, supabaseProjectRef: v !== p.supabaseEmail ? null : p.supabaseProjectRef });
          else set({ [key]: v } as Partial<SerializedPlatform>);
        }}
        placeholder={placeholder}
        className={inputCls}
      />
    </div>
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const { hasConfidential: _h, id: _i, sortOrder: _s, ...body } = d;
        void _h;
        void _i;
        void _s;
        onSave(body);
      }}
      className="space-y-6"
    >
      <datalist id={`ed-${p.id}-emails`}>
        {ctx.knownEmails.map((e) => (
          <option key={e} value={e} />
        ))}
      </datalist>

      <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <legend className={`${sectionTitle} mb-2`}>Plataforma y cliente</legend>
        {text("name", "Nombre", "Nombre del sistema")}
        <div className="min-w-0">
          <label htmlFor={`ed-${p.id}-cliente`} className={labelCls}>
            Cliente
          </label>
          <select id={`ed-${p.id}-cliente`} value={d.clientId ?? ""} onChange={(e) => set({ clientId: e.target.value || null, projectId: null })} className={inputCls}>
            <option value="">Sin cliente (sistema interno)</option>
            {ctx.clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.archived ? " (archivado)" : ""}
              </option>
            ))}
          </select>
        </div>
        {cliente && (
          <div className="min-w-0 md:col-start-2">
            <label htmlFor={`ed-${p.id}-proyecto`} className={labelCls}>
              Proyecto
            </label>
            <select id={`ed-${p.id}-proyecto`} value={d.projectId ?? ""} disabled={!cliente.projects.length} onChange={(e) => set({ projectId: e.target.value || null })} className={inputCls}>
              <option value="">{cliente.projects.length ? "Sin proyecto" : "Este cliente no tiene proyectos"}</option>
              {cliente.projects.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </fieldset>

      <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <legend className={`${sectionTitle} mb-2`}>GitHub</legend>
        {ctx.githubAccounts.length ? (
          <>
            <div className="min-w-0">
              <label htmlFor={`ed-${p.id}-gh`} className={labelCls}>
                Cuenta de GitHub
              </label>
              <select id={`ed-${p.id}-gh`} value={d.githubAccountId ?? ""} onChange={(e) => set({ githubAccountId: e.target.value || null, githubRepo: e.target.value ? d.githubRepo : null })} className={inputCls}>
                <option value="">Sin cuenta</option>
                {ctx.githubAccounts.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.login}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-0">
              {d.githubAccountId ? (
                <SelectorRemoto
                  key={d.githubAccountId}
                  id={`ed-${p.id}-repo`}
                  provider="github"
                  accountId={d.githubAccountId}
                  value={d.githubRepo}
                  nombres={nombres}
                  autoProponer={!p.githubRepo}
                  onChange={(k) => set({ githubRepo: k, githubEmail: k ? (ctx.githubAccounts.find((g) => g.id === d.githubAccountId)?.login ?? d.githubEmail) : d.githubEmail })}
                />
              ) : (
                text("githubEmail", "Cuenta de GitHub (texto)", "cuenta o correo")
              )}
            </div>
          </>
        ) : (
          text("githubEmail", "Cuenta de GitHub", "cuenta@gmail.com", "email")
        )}
      </fieldset>

      <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <legend className={`${sectionTitle} mb-2`}>Vercel</legend>
        {text("vercelEmail", "Correo de la cuenta", "cuenta@gmail.com", "email")}
        <div className="min-w-0">
          {vAcc?.id ? (
            <SelectorRemoto
              key={vAcc.id}
              id={`ed-${p.id}-vercel`}
              provider="vercel"
              accountId={vAcc.id}
              value={d.vercelProjectId}
              nombres={nombres}
              autoProponer={!p.vercelProjectId}
              onChange={(k, it) => set({ vercelProjectId: k, vercelProjectName: it?.name ?? null })}
            />
          ) : d.vercelEmail ? (
            <p className="text-xs text-fg-dim md:pt-6">Esta cuenta no tiene token: conéctalo en Cuentas para elegir el proyecto de la lista real.</p>
          ) : null}
        </div>
      </fieldset>

      <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <legend className={`${sectionTitle} mb-2`}>Supabase</legend>
        {text("supabaseEmail", "Correo de la cuenta", "cuenta@gmail.com", "email")}
        <div className="min-w-0">
          {sAcc?.id ? (
            <SelectorRemoto
              key={sAcc.id}
              id={`ed-${p.id}-supabase`}
              provider="supabase"
              accountId={sAcc.id}
              value={d.supabaseProjectRef}
              nombres={nombres}
              autoProponer={!p.supabaseProjectRef}
              onChange={(k) => set({ supabaseProjectRef: k })}
            />
          ) : d.supabaseEmail ? (
            <p className="text-xs text-fg-dim md:pt-6">Esta cuenta no tiene token: conéctalo en Cuentas para elegir el proyecto de la lista real.</p>
          ) : null}
        </div>
        {d.supabaseEmail && !sInv?.pro && (
          <div className="md:col-span-2">
            <p className={labelCls}>Cupo en esa cuenta ({PLAN_LABEL.supabase.FREE}: {SUPABASE_FREE_SLOTS})</p>
            <div role="radiogroup" aria-label="Cupo en Supabase" className="grid grid-cols-2 gap-2 md:max-w-md">
              {Array.from({ length: SUPABASE_FREE_SLOTS }, (_, k) => k + 1).map((n) => {
                const ref = sInv?.bySlot.get(n);
                const other = ref && ref.platformId !== p.id ? ref.platformName : null;
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
      </fieldset>

      <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <legend className={`${sectionTitle} mb-2`}>Enlaces y correos</legend>
        {text("accessUrl", "Enlace de la plataforma", "https://…", "url")}
        {text("linkUrl", "Otro enlace (panel, staging…)", "https://…", "url")}
        {text("brevoEmail", "Cuenta de Brevo", "cuenta@gmail.com", "email")}
        <div className="md:col-span-2">
          <label htmlFor={`ed-${p.id}-notes`} className={labelCls}>
            Notas
          </label>
          <textarea id={`ed-${p.id}-notes`} rows={3} value={d.notes ?? ""} onChange={(e) => set({ notes: e.target.value || null })} placeholder="Lo que conviene recordar de este sistema" className={`${inputCls} py-2 resize-y`} />
        </div>
      </fieldset>

      {error && <ErrorBar message={error} />}

      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={busy || !d.name.trim()} className="px-4 min-h-11 bg-brand hover:bg-brand-hi text-on-brand text-sm font-semibold rounded-lg transition-colors disabled:opacity-50">
          {busy ? "Guardando…" : "Guardar cambios"}
        </button>
        <button type="button" onClick={onCancel} className="px-4 min-h-11 text-fg-dim hover:text-fg text-sm rounded-lg">
          Cancelar
        </button>
        <button type="button" onClick={onDelete} disabled={busy} className="ml-auto inline-flex items-center gap-2 px-4 min-h-11 text-danger hover:bg-danger/10 text-sm rounded-lg transition-colors disabled:opacity-50">
          <Icon d={ICON.trash} />
          Eliminar plataforma
        </button>
      </div>
    </form>
  );
}
