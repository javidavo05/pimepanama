import Link from "@/components/empresa/link";
import { notFound } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { equipoDeLaEmpresa } from "@/lib/auth/equipo-lista";
import { asegurarEtapas } from "@/lib/crm/embudo-datos";
import { PREFIJO_HISTORIA, cierreVencido, fechaInput, fechaLegible, usd } from "@/lib/crm/embudo";
import { PageHeader } from "@/components/empresa/page-header";
import { FormularioOportunidad } from "../formulario-oportunidad";
import { CerrarOportunidad, CotizacionOportunidad } from "./acciones-oportunidad";

export const metadata = { title: "Oportunidad — Pime Suite" };
export const dynamic = "force-dynamic";

const ESTADO_DOC: Record<string, string> = { DRAFT: "Borrador", SENT: "Enviada", ACCEPTED: "Aceptada", REJECTED: "Rechazada", PAID: "Pagada", CANCELLED: "Anulada" };

export default async function OportunidadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await getEmpresaUser();
  const op = await prisma.oportunidad.findFirst({
    where: { id, userId: u.id },
    include: {
      etapa: true,
      client: { select: { id: true, name: true, company: true, email: true } },
      lead: { select: { id: true, name: true, company: true, email: true, status: true } },
      cotizacion: { select: { id: true, number: true, total: true, status: true } },
      project: { select: { id: true, name: true } },
    },
  });
  if (!op) notFound();

  const duenos: Prisma.DocumentWhereInput[] = [];
  if (op.clientId) duenos.push({ clientId: op.clientId });
  if (op.leadId) duenos.push({ leadId: op.leadId });
  const historiaDe: Prisma.InteraccionWhereInput[] = [];
  if (op.leadId) historiaDe.push({ leadId: op.leadId });
  if (op.clientId) historiaDe.push({ clientId: op.clientId });

  const [etapas, equipo, cotizaciones, historia] = await Promise.all([
    asegurarEtapas(u.id),
    equipoDeLaEmpresa(u.id).catch(() => []),
    duenos.length
      ? prisma.document.findMany({ where: { userId: u.id, type: "COTIZACION", OR: duenos }, orderBy: { issueDate: "desc" }, take: 20, select: { id: true, number: true, total: true, status: true } })
      : [],
    historiaDe.length
      ? prisma.interaccion.findMany({
          where: { userId: u.id, OR: historiaDe, tipo: "nota", resumen: { startsWith: `${PREFIJO_HISTORIA}${op.titulo}»` }, ocurrioAt: { gte: new Date(op.createdAt.getTime() - 60_000) } },
          orderBy: { ocurrioAt: "desc" },
          take: 20,
          select: { id: true, resumen: true, ocurrioAt: true, autor: { select: { fullName: true, email: true } } },
        })
      : [],
  ]);

  const abiertas = etapas.filter((e) => e.tipo === "abierta");
  const cerrada = op.estado !== "abierta";
  const quien = op.client ?? op.lead;
  const vencido = cierreVencido(op.cierreEsperado, op.estado);
  const ponderado = Number(op.valor) * (op.probabilidad / 100);
  const recortar = (s: string) => s.slice(`${PREFIJO_HISTORIA}${op.titulo}»: `.length) || s;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        className="mb-6"
        eyebrow={<Link href="/empresa/ventas" className="mb-2 inline-flex min-h-11 items-center text-sm text-fg-dim hover:text-fg-mute sm:min-h-8">← Ventas</Link>}
        title={<span className="[overflow-wrap:anywhere]">{op.titulo}</span>}
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${op.estado === "ganada" ? "border-ok/30 text-ok" : op.estado === "perdida" ? "border-danger/30 text-danger" : "border-line-mid text-fg-mute"}`}>{op.etapa.nombre}</span>
            <span className="tabular-nums">{usd(op.valor)}</span>
            {!cerrada && <span>· {op.probabilidad} % · pronóstico {usd(ponderado)}</span>}
            {op.cierreEsperado && !cerrada && <span className={vencido ? "font-semibold text-danger" : ""}>· {vencido ? "venció el" : "cierra el"} {fechaLegible(op.cierreEsperado)}</span>}
            {op.cerradaAt && <span>· cerrada el {fechaLegible(op.cerradaAt)}</span>}
          </span>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          <section className="rounded-xl border border-line bg-panel p-4 sm:p-6">
            <h2 className="mb-1 text-sm font-semibold text-fg">Datos de la oportunidad</h2>
            <p className="mb-4 text-xs text-fg-dim">{cerrada ? "Está cerrada: puedes corregir título, valor, responsable, fuente y notas." : "Cambiar la etapa aquí o en el tablero queda en la historia."}</p>
            <FormularioOportunidad
              etapas={abiertas.map((e) => ({ id: e.id, nombre: e.nombre, probabilidad: e.probabilidad }))}
              equipo={equipo}
              yo={u.miembro.id}
              cerrada={cerrada}
              inicial={{
                id: op.id,
                titulo: op.titulo,
                valor: Number(op.valor).toFixed(2),
                etapaId: op.etapaId,
                probabilidad: op.probabilidad,
                cierreEsperado: fechaInput(op.cierreEsperado),
                responsableId: op.responsableId ?? "",
                fuente: op.fuente ?? "",
                notas: op.notas ?? "",
              }}
            />
          </section>

          <section className="rounded-xl border border-line bg-panel p-4 sm:p-6">
            <h2 className="mb-1 text-sm font-semibold text-fg">Historia</h2>
            <p className="mb-4 text-xs text-fg-dim">Cambios de etapa, valor y cierre. También aparecen como notas en {op.client ? "la ficha del cliente" : "el lead"}.</p>
            {historia.length === 0 ? (
              <p className="text-sm text-fg-faint">Sin movimientos todavía.</p>
            ) : (
              <ol className="space-y-3 border-l border-line pl-4">
                {historia.map((h) => (
                  <li key={h.id} className="relative">
                    <span aria-hidden className="absolute -left-[1.3rem] top-1.5 h-2 w-2 rounded-full bg-line-loud" />
                    <p className="text-sm text-fg-mute [overflow-wrap:anywhere]">{recortar(h.resumen)}</p>
                    <p className="text-xs text-fg-faint">{fechaLegible(h.ocurrioAt)}{h.autor ? ` · ${h.autor.fullName || h.autor.email}` : ""}</p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <aside className="min-w-0 space-y-6">
          <section className="rounded-xl border border-line bg-panel p-4">
            <h2 className="mb-3 text-sm font-semibold text-fg">{op.client ? "Cliente" : op.lead ? "Lead" : "Sin cliente"}</h2>
            {quien ? (
              <Link href={op.client ? `/empresa/clientes/${op.client.id}` : `/empresa/leads/${op.lead!.id}`} className="block min-h-11 rounded-lg hover:bg-fill">
                <p className="text-sm font-semibold text-fg [overflow-wrap:anywhere]">{quien.name}</p>
                {quien.company && <p className="text-xs text-fg-dim [overflow-wrap:anywhere]">{quien.company}</p>}
                {quien.email && <p className="text-xs text-fg-faint [overflow-wrap:anywhere]">{quien.email}</p>}
              </Link>
            ) : (
              <p className="text-sm text-fg-dim">Esta oportunidad perdió su lead o cliente.</p>
            )}
            {op.client && op.lead && <Link href={`/empresa/leads/${op.lead.id}`} className="mt-2 inline-flex min-h-11 items-center text-xs font-semibold text-brand-fg sm:min-h-8">Ver el lead original</Link>}
            {op.project && (
              <Link href={`/empresa/proyectos/${op.project.id}`} className="mt-3 flex min-h-11 items-center justify-between gap-2 rounded-lg border border-ok/25 bg-ok/5 px-3 text-sm text-ok">
                <span className="truncate">Proyecto: {op.project.name}</span><span aria-hidden>→</span>
              </Link>
            )}
          </section>

          <section className="rounded-xl border border-line bg-panel p-4">
            <h2 className="mb-1 text-sm font-semibold text-fg">Cotización</h2>
            <p className="mb-3 text-xs text-fg-dim">Al ganar, sus líneas se vuelven las fases del proyecto.</p>
            <CotizacionOportunidad
              id={op.id}
              actual={op.cotizacion ? { id: op.cotizacion.id, etiqueta: `${op.cotizacion.number ?? "Cotización"} · ${usd(op.cotizacion.total)} · ${ESTADO_DOC[op.cotizacion.status] ?? op.cotizacion.status}` } : null}
              opciones={cotizaciones.map((c) => ({ id: c.id, etiqueta: `${c.number ?? "Sin número"} · ${usd(c.total)} · ${ESTADO_DOC[c.status] ?? c.status}` }))}
              puedeCrear={!!quien}
            />
          </section>

          <section className="rounded-xl border border-line bg-panel p-4">
            <h2 className="mb-1 text-sm font-semibold text-fg">Cerrar el negocio</h2>
            <CerrarOportunidad
              id={op.id}
              estado={op.estado}
              motivoPerdida={op.motivoPerdida}
              esLead={!op.clientId && !!op.leadId}
              tieneCotizacion={!!op.cotizacion}
              tieneProyecto={!!op.projectId}
            />
          </section>
        </aside>
      </div>
    </div>
  );
}
