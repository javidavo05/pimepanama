import { notFound } from "next/navigation";
import Link from "@/components/empresa/link";
import { PageHeader, btn } from "@/components/empresa/page-header";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { fechaCorta } from "@/lib/format-datetime";
import { getSiteUrl } from "@/lib/site-url";
import { getEmailLogoUrl } from "@/lib/company-logo";
import { correoHtml, cuerpoHtml, primerNombre, rellenarTexto, DATOS_EJEMPLO } from "@/lib/crm/correo";
import { elegirDestinatarios, normalizarFiltro, type Destinatario } from "@/lib/crm/campanas";
import { datosDelSegmento } from "@/lib/crm/campanas-servidor";
import { borrarCampanaAction } from "../../acciones-campanas";
import { ConfirmarBoton } from "../confirmar-boton";
import { EstadoCampana, porcentaje } from "../estado-campana";
import { EnviarCampana } from "./enviar-campana";

export const metadata = { title: "Campaña — Pime Suite" };
export const dynamic = "force-dynamic";
// El envío corre en el server action de esta página: hasta el máximo de Vercel.
export const maxDuration = 300;

const ESTADO_ENVIO: Record<string, { label: string; clase: string }> = {
  pendiente: { label: "Pendiente", clase: "text-fg-dim" },
  enviado: { label: "Enviado", clase: "text-fg-soft" },
  abierto: { label: "Abierto", clase: "text-ok" },
  fallo: { label: "No salió", clase: "text-danger" },
};
const MOSTRAR = 200;

export default async function CampanaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await getEmpresaUser();
  const c = await prisma.campana.findFirst({ where: { id, userId: u.id }, select: { id: true, nombre: true, asunto: true, cuerpo: true, filtro: true, estado: true, enviados: true, abiertos: true, enviadaAt: true, createdAt: true } });
  if (!c) notFound();
  const borrador = c.estado === "borrador";
  const miNombre = u.miembro.fullName || u.miembro.email;

  const [segmento, conteo, envios] = await Promise.all([
    borrador ? datosDelSegmento(u.id) : Promise.resolve(null),
    borrador ? Promise.resolve([] as { estado: string; _count: { _all: number } }[]) : prisma.campanaEnvio.groupBy({ by: ["estado"], where: { campanaId: c.id }, _count: { _all: true } }),
    borrador ? Promise.resolve([]) : prisma.campanaEnvio.findMany({ where: { campanaId: c.id }, orderBy: [{ abiertoAt: { sort: "desc", nulls: "last" } }, { email: "asc" }], take: MOSTRAR, select: { id: true, email: true, nombre: true, estado: true, error: true, abiertoAt: true, client: { select: { company: true, name: true } } } }),
  ]);
  const destinatarios: Destinatario[] = segmento ? elegirDestinatarios(segmento.clientes, normalizarFiltro(c.filtro), segmento.bajas).destinatarios : [];
  const cuenta = (e: string) => conteo.find((x) => x.estado === e)?._count._all ?? 0;
  const total = conteo.reduce((s, x) => s + x._count._all, 0);
  const faltan = cuenta("pendiente");
  const fallos = cuenta("fallo");

  const e0 = envios[0] as (typeof envios)[number] | undefined;
  const p0 = destinatarios[0]
    ? { nombre: destinatarios[0].nombre, empresa: destinatarios[0].empresa }
    : e0 ? { nombre: e0.nombre ?? "", empresa: e0.client?.company || e0.client?.name || "" } : null;
  const datos = p0
    ? { nombre: primerNombre(p0.nombre), contacto: p0.nombre, empresa: p0.empresa, mi_nombre: miNombre }
    : { ...DATOS_EJEMPLO, mi_nombre: miNombre };
  const html = correoHtml({ cuerpo: cuerpoHtml(c.cuerpo, datos), logoUrl: getEmailLogoUrl(), siteUrl: getSiteUrl(), bajaUrl: "#" });

  return (
    <div className="max-w-6xl mx-auto grid gap-6">
      <PageHeader
        eyebrow={<Link href="/empresa/campanas" className="inline-flex items-center min-h-11 text-sm text-fg-dim hover:text-fg">← Campañas</Link>}
        title={<span className="[overflow-wrap:anywhere]">{c.nombre}</span>}
        description={<span className="inline-flex flex-wrap items-center gap-2"><EstadoCampana estado={c.estado} /> {c.enviadaAt ? `Terminó de enviarse el ${fechaCorta(c.enviadaAt)}` : `Creada el ${fechaCorta(c.createdAt)}`}</span>}
        actions={borrador ? <Link href={`/empresa/campanas/nueva?id=${c.id}`} className={btn.secondary}>Editar</Link> : undefined}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="grid gap-4 content-start min-w-0">
          {borrador ? (
            <div className="rounded-xl border border-line bg-panel p-4 grid gap-4">
              <div>
                <h2 className="text-fg font-semibold">Revisa y envía</h2>
                <p className="text-fg-dim text-sm">
                  {destinatarios.length
                    ? `Le llega a ${destinatarios.length} ${destinatarios.length === 1 ? "contacto" : "contactos"} con los filtros de hoy. Quien se dio de baja y los clientes internos o archivados ya quedaron fuera.`
                    : "Con estos filtros no le llega a nadie. Edita la campaña y quita algún filtro."}
                </p>
              </div>
              <EnviarCampana id={c.id} total={destinatarios.length} faltan={0} empezada={false} />
              <div className="border-t border-line pt-2">
                <ConfirmarBoton accion={borrarCampanaAction} id={c.id} etiqueta="Borrar borrador" confirmar="Sí, borrar la campaña" />
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-line bg-panel p-4 grid gap-4">
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div><dt className="text-fg-faint text-xs">Enviados</dt><dd className="text-fg text-xl font-semibold tabular-nums">{c.enviados}</dd></div>
                <div><dt className="text-fg-faint text-xs">Abiertos</dt><dd className="text-fg text-xl font-semibold tabular-nums">{c.abiertos}</dd></div>
                <div><dt className="text-fg-faint text-xs">Apertura</dt><dd className="text-fg text-xl font-semibold tabular-nums">{porcentaje(c.abiertos, c.enviados)}</dd></div>
                <div><dt className="text-fg-faint text-xs">No salieron</dt><dd className={`text-xl font-semibold tabular-nums ${fallos ? "text-danger" : "text-fg"}`}>{fallos}</dd></div>
              </dl>
              <p className="text-fg-faint text-xs">«Abiertos» cuenta a quien cargó las imágenes del correo: algunos programas las bloquean, así que la cifra real suele ser mayor.</p>
              {faltan > 0 && <EnviarCampana id={c.id} total={total} faltan={faltan} empezada />}
            </div>
          )}

          {!borrador && (
            <div className="rounded-xl border border-line bg-panel">
              <p className="p-4 border-b border-line text-fg font-semibold">Destinatarios ({total})</p>
              {envios.length === 0 ? (
                <p className="p-4 text-fg-dim text-sm">Se está armando la lista. Recarga en unos segundos.</p>
              ) : (
                <ul className="divide-y divide-line max-h-[480px] overflow-y-auto">
                  {envios.map((e) => {
                    const st = ESTADO_ENVIO[e.estado] ?? ESTADO_ENVIO.pendiente;
                    return (
                      <li key={e.id} className="px-4 py-2 grid gap-1 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-4 text-sm">
                        <span className="min-w-0 [overflow-wrap:anywhere]"><span className="text-fg">{e.nombre || e.email}</span> <span className="text-fg-faint">· {e.email}</span>{e.error && <span className="block text-danger text-xs">{e.error}</span>}</span>
                        <span className={`text-xs font-semibold ${st.clase}`}>{st.label}{e.abiertoAt ? ` · ${fechaCorta(e.abiertoAt)}` : ""}</span>
                      </li>
                    );
                  })}
                  {total > MOSTRAR && <li className="px-4 py-3 text-fg-faint text-xs">Se muestran {MOSTRAR} de {total}.</li>}
                </ul>
              )}
            </div>
          )}

          {borrador && destinatarios.length > 0 && (
            <div className="rounded-xl border border-line bg-panel">
              <p className="p-4 border-b border-line text-fg font-semibold">Le llega a</p>
              <ul className="divide-y divide-line max-h-80 overflow-y-auto">
                {destinatarios.slice(0, MOSTRAR).map((d) => (
                  <li key={d.email} className="px-4 py-2 text-sm min-w-0 [overflow-wrap:anywhere]"><span className="text-fg">{d.nombre}</span> <span className="text-fg-faint">· {d.empresa} · {d.email}</span></li>
                ))}
                {destinatarios.length > MOSTRAR && <li className="px-4 py-3 text-fg-faint text-xs">y {destinatarios.length - MOSTRAR} más.</li>}
              </ul>
            </div>
          )}
        </section>

        <section className="grid gap-2 content-start min-w-0">
          <h2 className="text-fg font-semibold">Vista previa</h2>
          <div className="rounded-xl border border-line bg-fill overflow-hidden">
            <p className="px-4 py-3 border-b border-line text-sm text-fg [overflow-wrap:anywhere]"><span className="text-fg-dim">Asunto: </span>{rellenarTexto(c.asunto, datos)}</p>
            <iframe title="Vista previa del correo" srcDoc={html} sandbox="" className="block w-full h-[560px] bg-white" />
          </div>
          <p className="text-fg-faint text-xs [overflow-wrap:anywhere]">Se ve con los datos de {datos.contacto || "la primera persona"} ({datos.empresa}).</p>
        </section>
      </div>
    </div>
  );
}
