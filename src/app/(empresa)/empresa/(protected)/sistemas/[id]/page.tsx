import { notFound } from "next/navigation";
import Link from "@/components/empresa/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { sistemaDelEquipo, credencialesDe } from "@/lib/pulso/datos";
import { getSiteUrl } from "@/lib/site-url";
import { EstadoSistemaPill, haceCuanto } from "@/components/empresa/sistemas/estado";
import { Copiar, ProbarAhora, RotarSecreto, SecretoOculto, SistemaForm } from "@/components/empresa/sistemas/formularios";
import { ZonaLinea } from "@/components/empresa/clientes/zona-linea";
import { activarSistemaAction, resolverIncidenteAction } from "../../acciones-sistemas";

export const metadata = { title: "Sistema — Pime Suite" };

const card = "bg-panel border border-line rounded-2xl p-4 sm:p-6 min-w-0";
const h2 = "text-fg text-base font-semibold tracking-tight";
const NIVEL: Record<string, [string, string]> = { grave: ["Grave", "bg-danger/10 text-danger"], error: ["Error", "bg-warn/10 text-warn"], aviso: ["Aviso", "bg-fill-2 text-fg-dim"] };

export default async function SistemaPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ nuevo?: string }> }) {
  const { id } = await params;
  const { nuevo } = await searchParams;
  const u = await getEmpresaUser();
  const s = await sistemaDelEquipo(u.id, id);
  if (!s) notFound();
  const [clientes, proyectos] = await Promise.all([
    prisma.client.findMany({ where: { userId: u.id, archivedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true, company: true } }),
    prisma.project.findMany({ where: { userId: u.id, clientId: { not: null } }, orderBy: { updatedAt: "desc" }, select: { id: true, name: true, clientId: true } }),
  ]);
  const cred = credencialesDe(s);
  const endpoint = `${getSiteUrl()}/api/pulso`;
  const envs = cred.secreto ? `PIME_PULSO_KEY=${cred.key}\nPIME_PULSO_SECRET=${cred.secreto}\nPIME_PULSO_URL=${endpoint}` : "";
  const abiertos = s.incidents.filter((i) => !i.resolvedAt);
  const cerrados = s.incidents.filter((i) => i.resolvedAt);
  const cliente = s.client.company || s.client.name;

  return (
    <ZonaLinea linea={s.client.brandLine}>
    <div className="max-w-6xl mx-auto space-y-6">
      <nav className="flex items-center gap-2 text-sm text-fg-dim min-w-0" aria-label="Ruta">
        <Link href="/empresa/sistemas" className="inline-flex items-center min-h-11 sm:min-h-8 shrink-0 hover:text-fg-mute">Sistemas</Link>
        <span aria-hidden>/</span><span className="text-fg-mute truncate">{s.name}</span>
      </nav>

      <header className={card}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <EstadoSistemaPill status={s.status} activo={s.active} />
            <h1 className="text-fg text-2xl font-semibold tracking-tight break-words">{s.name}</h1>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-fg-dim text-sm min-w-0">
              <li className="min-w-0"><Link href={`/empresa/clientes/${s.client.id}`} className="inline-flex items-center min-h-11 sm:min-h-8 text-brand-fg hover:underline">{cliente}</Link></li>
              {s.project && <li className="min-w-0"><Link href={`/empresa/proyectos/${s.project.id}`} className="inline-flex items-center min-h-11 sm:min-h-8 text-brand-fg hover:underline">{s.project.name}</Link></li>}
              {s.url && <li className="min-w-0"><a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center min-h-11 sm:min-h-8 hover:underline [overflow-wrap:anywhere]">{s.url.replace(/^https?:\/\//, "")}</a></li>}
            </ul>
            {s.statusDetail && s.status !== "ok" && <p className="text-sm text-fg-mute break-words">{s.statusDetail}</p>}
          </div>
          <form action={activarSistemaAction}><input type="hidden" name="id" value={s.id} /><button className="inline-flex items-center min-h-11 px-4 rounded-lg border border-line-mid text-sm font-semibold text-fg-mute hover:text-fg whitespace-nowrap">{s.active ? "Pausar el monitoreo" : "Reanudar el monitoreo"}</button></form>
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ["Último contacto", haceCuanto(s.lastSeenAt)],
            ["Última consulta", s.healthUrl ? `${haceCuanto(s.lastProbeAt)}${s.lastLatencyMs != null ? ` · ${s.lastLatencyMs} ms` : ""}` : "Sin dirección de salud"],
            ["Versión", s.appVersion ?? "—"],
            ["Errores abiertos", String(abiertos.length)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-fill px-4 py-3 min-w-0"><dt className="text-fg-dim text-xs">{k}</dt><dd className="text-fg font-semibold text-sm truncate">{v}</dd></div>
          ))}
        </dl>
      </header>

      {nuevo && (
        <section className={`${card} border-brand/40`}>
          <h2 className={h2}>Sistema conectado. Falta instalarlo</h2>
          <ol className="mt-3 list-decimal pl-5 space-y-2 text-sm text-fg-mute">
            <li>Descarga <b className="text-fg">pulso.ts</b> y cópialo al proyecto del sistema.</li>
            <li>Pon las tres variables de «Conexión» en Vercel (o donde corra el sistema) y despliega.</li>
            <li>Agrega la ruta de salud y el aviso de errores como dice el inicio del archivo.</li>
          </ol>
          <p className="mt-3 text-sm text-fg-dim">Cuando llegue el primer evento o responda la salud, el estado pasa a «En línea».</p>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-3 items-start">
        <div className="space-y-6 lg:col-span-2 min-w-0">
          <section className={card}>
            <h2 className={h2}>Errores</h2>
            {s.incidents.length === 0 ? (
              <p className="mt-3 text-sm text-fg-dim">Sin errores recibidos. Cada error que reporte el sistema aparece aquí, agrupado: el mismo problema repetido suma veces en vez de llenar la lista.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line">
                {[...abiertos, ...cerrados].map((i) => {
                  const [nv, tono] = NIVEL[i.severity] ?? NIVEL.error;
                  return (
                    <li key={i.id} className={`py-4 ${i.resolvedAt ? "opacity-60" : ""}`}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tono}`}>{nv}</span><span className="text-xs text-fg-dim">{i.count} {i.count === 1 ? "vez" : "veces"} · última {haceCuanto(i.lastSeenAt)}{i.resolvedAt ? " · cerrado" : ""}</span></div>
                          <p className="text-fg text-sm font-medium [overflow-wrap:anywhere]">{i.title}</p>
                          {i.detail && <details className="text-xs text-fg-dim"><summary className="cursor-pointer min-h-8 inline-flex items-center">Ver detalle</summary><pre className="mt-2 whitespace-pre-wrap [overflow-wrap:anywhere] font-mono bg-fill rounded-lg p-3">{i.detail}</pre></details>}
                        </div>
                        <form action={resolverIncidenteAction} className="shrink-0"><input type="hidden" name="id" value={i.id} /><button className="inline-flex items-center min-h-11 sm:min-h-8 px-3 rounded-lg border border-line-mid text-xs font-semibold text-fg-mute hover:text-fg">{i.resolvedAt ? "Reabrir" : "Marcar resuelto"}</button></form>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className={card}>
            <h2 className={h2}>Datos del sistema</h2>
            <div className="mt-4">
              <SistemaForm s={{ id: s.id, name: s.name, clientId: s.clientId, projectId: s.projectId, url: s.url, healthUrl: s.healthUrl, portalVisible: s.portalVisible }} clientes={clientes.map((c) => ({ id: c.id, nombre: c.company || c.name }))} proyectos={proyectos.map((p) => ({ id: p.id, nombre: p.name, clientId: p.clientId! }))} />
            </div>
          </section>
        </div>

        <aside className="space-y-6 min-w-0">
          <section className={card}>
            <h2 className={h2}>Conexión</h2>
            {cred.secreto ? (
              <div className="mt-4 space-y-4">
                <div><p className="text-fg-dim text-xs font-semibold uppercase tracking-widest mb-1.5">Key</p><div className="flex items-center gap-2 min-w-0"><code className="min-w-0 flex-1 truncate rounded-lg bg-fill px-3 py-2 font-mono text-xs text-fg">{cred.key}</code><Copiar texto={cred.key} /></div></div>
                <div><p className="text-fg-dim text-xs font-semibold uppercase tracking-widest mb-1.5">Secreto</p><SecretoOculto valor={cred.secreto} /></div>
                <div className="grid gap-2">
                  <Copiar texto={envs} etiqueta="Copiar las 3 variables" />
                  <a href="/api/empresa/pulso/paquete" className="inline-flex items-center justify-center min-h-11 rounded-lg bg-brand text-on-brand text-sm font-semibold hover:bg-brand-hi">Descargar pulso.ts</a>
                </div>
                <p className="text-xs text-fg-dim">El secreto no se guarda en la base: se calcula. Nunca lo pongas en el código ni en un aviso.</p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-warn">Falta la variable PIME_PULSO_SECRET en el servidor de Pime. Sin ella no se pueden recibir reportes.</p>
            )}
          </section>
          <section className={card}>
            <h2 className={h2}>Salud</h2>
            <p className="mt-2 text-sm text-fg-dim [overflow-wrap:anywhere]">{s.healthUrl ?? "Sin dirección de salud."}</p>
            <div className="mt-4"><ProbarAhora id={s.id} conSalud={!!s.healthUrl} /></div>
          </section>
          <section className={card}>
            <h2 className={h2}>Seguridad</h2>
            <p className="mt-2 text-sm text-fg-dim">Cambia el secreto si se filtró o si alguien que lo tenía dejó el equipo.</p>
            <div className="mt-4"><RotarSecreto id={s.id} /></div>
          </section>
        </aside>
      </div>
    </div>
    </ZonaLinea>
  );
}
