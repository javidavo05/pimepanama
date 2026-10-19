import Link from "@/components/empresa/link";
import { notFound } from "next/navigation";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { ListaFacturas, type FilaFactura } from "@/components/empresa/facturas/lista-facturas";
import type { FinancingPlan } from "@/lib/financing";
import { loadTaskWorkspace } from "@/lib/tasks";
import { TaskWorkspace } from "@/components/empresa/tasks/task-workspace";
import { ProjectTasks } from "@/components/empresa/tasks/project-tasks";
import { ProjectDetailClient, type Tab } from "./project-detail-client";
import { cargarFases, FasesPanel, OrdenesPanel } from "./fases-panel";
import { MeetingsPanel } from "./meetings-panel";
import { QueLeFalta } from "./que-le-falta";
import { ResumenCliente } from "./resumen-panel";
import { fichaCliente } from "@/lib/portal/ficha";
import { GastosPanel } from "./gastos-panel";
import { ZonaLinea } from "@/components/empresa/clientes/zona-linea";
import { DineroProyecto } from "@/components/empresa/cobrar/dinero-proyecto";
import { dineroDeProyecto } from "@/lib/motor/cobros";
import { VerificacionGithubCard } from "@/components/empresa/cobrar/verificacion-github";
import { EstadoSistemaCard } from "@/components/empresa/sistemas/estado-sistema-card";
import type { Revision } from "@/lib/motor/revision";
import { EnlazarReuniones } from "@/components/empresa/reuniones/enlazar-reunion";
import { leerVerificacion } from "@/lib/motor/verificar-github";
import { datosCompletitud } from "@/lib/proyectos/datos";
import { completitudProyecto } from "@/lib/proyectos/completitud";
import { proyectosCandidatos } from "@/lib/proyectos/candidatos";
import { MOTIVO_LABEL, sugerirProyecto } from "@/lib/proyectos/sugerir-proyecto";
import { dinero } from "@/lib/portal/datos";
import { formatoHoras } from "@/lib/portal/horas";
import { TICKET_ESTADO_LABEL, etiquetaTipoTicket, type TicketEstado } from "@/lib/portal/estados";
import { fechaCorta } from "@/lib/format-datetime";
import { estadoRepo } from "@/lib/github/estado-repo";

export const dynamic = "force-dynamic";

const card = "bg-panel border border-line rounded-2xl p-4 sm:p-6 min-w-0";
const h2 = "text-fg text-base font-semibold tracking-tight";
const enlace = "inline-flex items-center min-h-11 sm:min-h-8 text-sm text-brand-fg hover:underline shrink-0";

/** Una sección cuyo dato no cargó: lo dice y el resto del proyecto sigue. */
function NoCargo({ titulo }: { titulo: string }) {
  return (
    <section className={card} role="alert">
      <h2 className={h2}>{titulo}</h2>
      <p className="mt-2 text-sm text-danger">No se pudo cargar. Recarga la página; si sigue, revisa la conexión con la base.</p>
    </section>
  );
}

/**
 * Detalle del proyecto: «Qué le falta» arriba y el resto en pestañas.
 * ?tab=resumen|tareas|reuniones|fases|dinero|repo|tickets|clientes — Resumen por defecto.
 * ?orden=nueva&ticket=<id> (desde un ticket) abre Dinero con la orden de cambio a la vista.
 */
export default async function ProyectoDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; orden?: string; ticket?: string }>;
}) {
  const [{ id }, { tab, orden, ticket }] = await Promise.all([params, searchParams]);
  const user = await getEmpresaUser();

  // Lo secundario falla por su cuenta (.catch → null): su pestaña lo dice y el resto del proyecto se ve.
  const [project, allClients, workspace, fases, datos, tickets, horas, plataformas, sinProyecto, candidatos, cuentasGithub, tokenPropio, gastos, plata] = await Promise.all([
    prisma.project.findFirst({
      where: { id, userId: user.id },
      include: {
        client: { select: { id: true, name: true, company: true } },
        githubAccount: { select: { login: true } },
        clients: { include: { client: { select: { id: true, name: true, company: true } } } },
        deliverables: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
        phases: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true, name: true } },
        meetings: {
          select: {
            id: true, title: true, status: true, meetingDate: true,
            durationMs: true, contextSummary: true,
            actionItems: { select: { taskId: true } },
          },
          orderBy: { meetingDate: "desc" },
        },
        contracts: { orderBy: { createdAt: "desc" } },
        documents: {
          select: { id: true, type: true, number: true, status: true, total: true, issueDate: true, clientName: true, linkedDocumentId: true, paymentSchedules: true },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    prisma.client.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
    loadTaskWorkspace(user.id, id),
    cargarFases(id, user.id).catch(() => null),
    datosCompletitud(user.id, [id]).catch(() => null),
    prisma.ticket.findMany({
      where: { userId: user.id, projectId: id },
      orderBy: { updatedAt: "desc" },
      take: 30,
      select: { id: true, number: true, title: true, status: true, kind: true, priority: true, updatedAt: true, lastClientActivityAt: true, lastPimeActivityAt: true },
    }).catch(() => null),
    prisma.timeEntry.findMany({
      where: { userId: user.id, projectId: id },
      orderBy: { workDate: "desc" },
      take: 20,
      select: { id: true, workDate: true, billedMinutes: true, amount: true, note: true, invoiceId: true, ticket: { select: { number: true } } },
    }).catch(() => null),
    prisma.platform.findMany({
      where: { userId: user.id, projectId: id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, accessUrl: true, githubRepo: true, vercelProjectId: true, vercelProjectName: true, vercelEmail: true, supabaseProjectRef: true, supabaseEmail: true },
    }).catch(() => null),
    prisma.meeting.findMany({
      where: { userId: user.id, projectId: null },
      orderBy: { meetingDate: "desc" },
      take: 50,
      select: { id: true, title: true, clientId: true, manualContext: true, meetingDate: true },
    }).catch(() => null),
    proyectosCandidatos(user.id).catch(() => []),
    // Para el panel del repo: ¿hay con qué leer GitHub? (cuentas guardadas o el token propio)
    prisma.githubAccount.count({ where: { userId: user.id } }).catch(() => 0),
    prisma.empresaUser.findUnique({ where: { id: user.id }, select: { githubTokenEnc: true } }).catch(() => null),
    prisma.expense.findMany({
      where: { userId: user.id, projectId: id },
      select: { id: true, title: true, vendor: true, amount: true, status: true, isRecurring: true, paidAt: true, dueDate: true, createdAt: true, category: true },
    }).catch(() => null),
    // Para el Resumen: la misma cuenta que la pestaña Dinero (presupuesto, cobrado, por cobrar).
    dineroDeProyecto(user.id, id).catch(() => null),
  ]);

  if (!project) notFound();

  // Los clientes del proyecto viven en ProjectClient; `client` es el espejo
  // legacy del principal y solo se usa como respaldo si la tabla está vacía.
  const projectClients = project.clients.length > 0
    ? project.clients.map((pc) => pc.client)
    : project.client
      ? [project.client]
      : [];

  // El mapa del repo no viaja al navegador entero: el panel recibe solo su resumen (estadoRepo).
  const { repoSnapshot: _mapa, ...sinMapa } = project;
  void _mapa;
  const repoInicial = estadoRepo(project, cuentasGithub > 0 || Boolean(tokenPropio?.githubTokenEnc));
  const serialized = {
    ...sinMapa,
    totalBudget: project.totalBudget != null ? Number(project.totalBudget) : null,
    // Decimal no viaja al navegador: el mantenimiento mensual (fase 4 CRM) va como número.
    mantenimientoMonto: project.mantenimientoMonto != null ? Number(project.mantenimientoMonto) : null,
    startDate: project.startDate?.toISOString() ?? null,
    endDate: project.endDate?.toISOString() ?? null,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    hasProposal: project.proposalContent != null,
    financingPlan: (project.financingPlan as FinancingPlan | null) ?? null,
    clients: projectClients,
    meetings: project.meetings.map((m) => ({
      id: m.id,
      title: m.title,
      status: m.status,
      meetingDate: m.meetingDate.toISOString(),
      durationMs: m.durationMs,
      contextSummary: m.contextSummary,
      actionItemCount: m.actionItems.length,
      openItemCount: m.actionItems.filter((i) => !i.taskId).length,
    })),
    deliverables: project.deliverables.map((d) => ({
      ...d,
      dueDate: d.dueDate?.toISOString() ?? null,
      completedAt: d.completedAt?.toISOString() ?? null,
      createdAt: d.createdAt.toISOString(),
    })),
    contracts: project.contracts.map((c) => ({
      ...c,
      value: c.value != null ? Number(c.value) : null,
      signedAt: c.signedAt?.toISOString() ?? null,
      startsAt: c.startsAt?.toISOString() ?? null,
      endsAt: c.endsAt?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })),
    documents: project.documents.map((d) => ({
      ...d,
      total: d.total != null ? Number(d.total) : null,
      issueDate: d.issueDate.toISOString(),
      paymentSchedules: d.paymentSchedules.map((s) => ({
        ...s,
        amount: Number(s.amount),
        dueDate: s.dueDate.toISOString(),
        paidAt: s.paidAt?.toISOString() ?? null,
        createdAt: s.createdAt.toISOString(),
      })),
    })),
  };

  // El Resumen es de toda la relación con el cliente principal: todos sus proyectos, facturas, pagos y reuniones.
  const clientePrincipal = projectClients[0]?.id ?? null;
  const [lineaCliente, ficha, reunionesCliente] = await Promise.all([
    prisma.client.findFirst({ where: { id: { in: projectClients.map((c) => c.id) }, brandLine: "premium" }, select: { brandLine: true } }),
    clientePrincipal ? fichaCliente(user.id, clientePrincipal).catch(() => null) : null,
    clientePrincipal
      ? prisma.meeting.findMany({
          where: { userId: user.id, OR: [{ clientId: clientePrincipal }, { projectId: id }, { project: { OR: [{ clientId: clientePrincipal }, { clients: { some: { clientId: clientePrincipal } } }] } }] },
          orderBy: { meetingDate: "desc" },
          take: 100,
          select: { id: true, title: true, meetingDate: true, contextSummary: true, projectId: true },
        }).catch(() => null)
      : [],
  ]);

  // «Qué le falta» y el punto de aviso de cada pestaña con algo pendiente.
  const d = datos?.get(id);
  const completitud = d ? completitudProyecto(d) : null;
  const alertas: Partial<Record<Tab, boolean>> = {};
  for (const r of completitud?.faltan ?? []) alertas[r.accion?.tipo === "pestana" ? r.accion.tab : "repo"] = true;

  // Reuniones sin proyecto que parecen de este (por cliente, título o notas), primero; el resto, a elegir.
  const sugeridas: { id: string; title: string; fecha: string; motivo: string | null }[] = [];
  const otras: typeof sugeridas = [];
  for (const m of sinProyecto ?? []) {
    const s = sugerirProyecto(m, candidatos);
    const fila = { id: m.id, title: m.title, fecha: fechaCorta(m.meetingDate.toISOString()), motivo: s ? MOTIVO_LABEL[s.motivo] : null };
    (s?.projectId === id ? sugeridas : otras).push(fila);
  }

  const clienteId = projectClients[0]?.id ?? null;
  // Facturas: las del proyecto y, debajo, las demás de sus clientes, todas con su PDF para descargar.
  const facturasRows = await prisma.document.findMany({
    where: { userId: user.id, type: "FACTURA", OR: [{ projectId: project.id }, ...(projectClients.length ? [{ clientId: { in: projectClients.map((c) => c.id) } }] : [])] },
    orderBy: { issueDate: "desc" },
    select: { id: true, number: true, title: true, status: true, total: true, amountPaid: true, issueDate: true, projectId: true, project: { select: { name: true } }, payments: { where: { status: "confirmado" }, orderBy: [{ paidAt: "asc" }, { createdAt: "asc" }], select: { id: true, amount: true, paidAt: true } } },
  });
  const filaFactura = (d: (typeof facturasRows)[number]): FilaFactura => ({ id: d.id, number: d.number, title: d.title, status: d.status, total: Number(d.total ?? 0), falta: d.status === "PAID" ? 0 : Math.max(0, Number(d.total ?? 0) - Number(d.amountPaid ?? 0)), issueDate: d.issueDate, proyecto: d.projectId && d.projectId !== project.id ? d.project?.name ?? null : null, pagos: d.payments.map((p) => ({ id: p.id, monto: Number(p.amount), fecha: p.paidAt })) });
  const facturasDelProyecto = facturasRows.filter((d) => d.projectId === project.id).map(filaFactura);
  const otrasFacturas = facturasRows.filter((d) => d.projectId !== project.id).map(filaFactura);
  const ticketsAbiertos = (tickets ?? []).filter((t) => t.status !== "resuelto" && t.status !== "cerrado").length;
  const horasTotal = (horas ?? []).reduce((a, h) => a + Number(h.amount), 0);
  const minutosTotal = (horas ?? []).reduce((a, h) => a + h.billedMinutes, 0);
  const repo = project.repoOwner && project.repoName ? `${project.repoOwner}/${project.repoName}` : null;
  const interno = !!d?.interno;
  // Atajos de gasto: lo que usan sus plataformas y todavía no tiene un gasto con ese nombre.
  const yaAnotados = new Set((gastos ?? []).map((g) => g.title.toLowerCase()));
  const atajos = [
    (plataformas ?? []).some((p) => p.vercelProjectId || p.vercelEmail) ? "Vercel" : null,
    (plataformas ?? []).some((p) => p.supabaseProjectRef || p.supabaseEmail) ? "Supabase" : null,
  ].filter((x): x is string => !!x && ![...yaAnotados].some((t) => t.includes(x.toLowerCase())));
  const gastosPanel = gastos
    ? <GastosPanel projectId={project.id} principal={interno} atajos={atajos} gastos={gastos.map((g) => ({ ...g, amount: Number(g.amount) }))} />
    : <NoCargo titulo="Gastos del proyecto" />;
  const initialTab = orden === "nueva" || ticket ? "dinero" : (tab ?? "resumen");

  return (
    <ZonaLinea linea={lineaCliente?.brandLine}>
    <div className="max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4 text-sm min-w-0">
        <Link
          href="/empresa/proyectos"
          className="inline-flex items-center min-h-11 sm:min-h-8 shrink-0 text-fg-dim hover:text-fg-mute transition-colors"
        >
          Proyectos
        </Link>
        <span className="text-fg-faint">/</span>
        <span className="text-fg-dim truncate min-w-0 max-w-xs">{project.name}</span>
      </div>

      <TaskWorkspace tasks={workspace.tasks} projects={workspace.projects}>
        <ProjectDetailClient
          project={serialized}
          allClients={allClients}
          initialTab={initialTab}
          alertas={alertas}
          repoInicial={repoInicial}
          counts={{ reuniones: project.meetings.length, tickets: ticketsAbiertos }}
          queLeFalta={d ? <QueLeFalta projectId={project.id} datos={d} /> : <div className="mb-6"><NoCargo titulo="Qué le falta" /></div>}
          presupuesto={plata?.presupuesto ?? null}
          resumenPanel={
            !clientePrincipal ? (
              <section className={card}>
                <h2 className={h2}>Sin cliente</h2>
                <p className="mt-2 text-sm text-fg-dim">Asígnale un cliente al proyecto y aquí aparece todo lo que ha hecho con Pime: sus proyectos, fases, facturas, pagos y reuniones.</p>
              </section>
            ) : interno ? (
              <section className={card}>
                <h2 className={h2}>Producto interno</h2>
                <p className="mt-2 text-sm text-fg-dim">Este proyecto es de Pime Panamá: no se cobra. Su dinero son sus gastos, en la pestaña Dinero.</p>
              </section>
            ) : ficha && reunionesCliente ? (
              <ResumenCliente f={ficha} reuniones={reunionesCliente} projectId={project.id} />
            ) : <NoCargo titulo="Todo con el cliente" />
          }
          tasksPanel={<ProjectTasks projectId={project.id} />}
          reunionesPanel={
            <div className="space-y-6">
              <MeetingsPanel projectId={project.id} meetings={serialized.meetings} />
              {sinProyecto ? <EnlazarReuniones projectId={project.id} sugeridas={sugeridas} otras={otras} /> : <NoCargo titulo="Reuniones sin proyecto" />}
            </div>
          }
          fasesPanel={fases ? <FasesPanel p={fases} /> : <NoCargo titulo="Fases, avance y cobro" />}
          dineroPanel={
            // Un producto de la empresa interna no se cobra: su dinero son sus gastos.
            interno ? gastosPanel : (
              <>
                <DineroProyecto userId={user.id} projectId={project.id} clienteId={clienteId} clientes={allClients.filter((c) => !c.archivedAt && !c.internal).map((c) => ({ id: c.id, nombre: c.company || c.name }))} />
                {gastosPanel}
              </>
            )
          }
          facturasCount={facturasDelProyecto.length}
          facturasPanel={
            <div className="space-y-6">
              <section className={card}>
                <h2 className={h2}>Facturas de este proyecto{facturasDelProyecto.length ? ` · ${facturasDelProyecto.length}` : ""}</h2>
                <ListaFacturas facturas={facturasDelProyecto} vacio="Este proyecto todavía no tiene facturas. Cada pago que registres en sus fases sale con su factura." />
              </section>
              {otrasFacturas.length > 0 && (
                <section className={card}>
                  <h2 className={h2}>Otras facturas de {projectClients.length === 1 ? (projectClients[0].company || projectClients[0].name) : "sus clientes"} · {otrasFacturas.length}</h2>
                  <ListaFacturas facturas={otrasFacturas} />
                </section>
              )}
            </div>
          }
          ordenesPanel={fases ? <OrdenesPanel p={fases} ordenNueva={orden === "nueva"} ticketId={ticket} /> : <NoCargo titulo="Órdenes de cambio" />}
          horasPanel={
            horas ? (
              <section className={card}>
                <div className="flex items-center justify-between gap-3">
                  <h2 className={h2}>Horas</h2>
                  {clienteId && <Link href={`/empresa/clientes/${clienteId}?tab=facturas`} className={enlace}>Registrar horas</Link>}
                </div>
                {horas.length ? (
                  <>
                    <p className="mt-1 text-fg-dim text-sm tabular-nums">{formatoHoras(minutosTotal)} · {dinero(horasTotal)}{horas.length === 20 ? " (las últimas 20)" : ""}</p>
                    <ul className="mt-3 space-y-2 text-xs text-fg-dim">
                      {horas.map((h) => (
                        <li key={h.id} className="flex justify-between gap-3">
                          <span className="min-w-0 truncate">{fechaCorta(h.workDate.toISOString())} · {h.ticket?.number ?? "General"}{h.note ? ` · ${h.note}` : ""}</span>
                          <span className="font-mono shrink-0">{dinero(Number(h.amount))}{h.invoiceId ? " · facturada" : ""}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-fg-dim">Sin horas en este proyecto. Se registran desde un ticket o desde la ficha del cliente, y se cobran con «Facturar horas».</p>
                )}
              </section>
            ) : <NoCargo titulo="Horas" />
          }
          sistemaCard={<EstadoSistemaCard projectId={project.id} revision={(project.revision as unknown as Revision | null) ?? null} revisadoAt={project.revisadoAt} />}
          repoExtra={
            <>
              {repo && (
                <div id="verificar-github" tabIndex={-1} className="scroll-mt-4 outline-none">
                  <VerificacionGithubCard projectId={project.id} repo={repo} {...leerVerificacion(project.githubCheck)} checkAt={project.githubCheckAt} />
                </div>
              )}
              {plataformas ? (
                <section className={card}>
                  <div className="flex items-center justify-between gap-3">
                    <h2 className={h2}>Plataformas</h2>
                    <Link href={`/empresa/platforms?nueva=1&proyecto=${project.id}`} className={enlace}>+ Plataforma</Link>
                  </div>
                  {plataformas.length ? (
                    <ul className="mt-3 divide-y divide-line">
                      {plataformas.map((pl) => (
                        <li key={pl.id}>
                          <Link href={`/empresa/platforms?abrir=${pl.id}`} className="flex items-center gap-3 py-3 min-h-12 hover:bg-fill -mx-2 px-2 rounded-lg">
                            <span className="min-w-0 flex-1">
                              <span className="block text-fg text-sm font-medium [overflow-wrap:anywhere]">{pl.name}</span>
                              <span className="block text-fg-dim text-xs [overflow-wrap:anywhere]">
                                {[pl.githubRepo ?? "sin repo", pl.vercelProjectId ? `Vercel ${pl.vercelProjectName ?? "enlazado"}` : "sin Vercel", pl.supabaseProjectRef ? `Supabase ${pl.supabaseProjectRef}` : "sin Supabase"].join(" · ")}
                              </span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-fg-dim">Sin plataforma. Registra dónde vive el sistema —repo, Vercel y Supabase— y Pime vigila cuentas, cupos y accesos.</p>
                  )}
                </section>
              ) : <NoCargo titulo="Plataformas" />}
            </>
          }
          ticketsPanel={
            tickets ? (
              <section className={`${card} max-w-4xl`}>
                <div className="flex items-center justify-between gap-3">
                  <h2 className={h2}>Tickets</h2>
                  <Link href={`/empresa/tickets/nuevo?projectId=${project.id}${clienteId ? `&clientId=${clienteId}` : ""}`} className={enlace}>+ Ticket</Link>
                </div>
                {tickets.length ? (
                  <ul className="mt-3 divide-y divide-line">
                    {tickets.map((t) => (
                      <li key={t.id}>
                        <Link href={`/empresa/tickets/${t.id}`} className="flex items-center gap-3 py-3 min-h-12 hover:bg-fill -mx-2 px-2 rounded-lg">
                          <span className="min-w-0 flex-1">
                            <span className="block text-fg text-sm font-medium truncate">{t.title}</span>
                            <span className="block text-fg-dim text-xs">{t.number} · {etiquetaTipoTicket(t.kind)}{t.priority === "alta" || t.priority === "urgente" ? ` · ${t.priority}` : ""} · {fechaCorta(t.updatedAt.toISOString())}{t.lastClientActivityAt && (!t.lastPimeActivityAt || t.lastClientActivityAt > t.lastPimeActivityAt) ? " · el cliente escribió" : ""}</span>
                          </span>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${t.status === "abierto" ? "bg-warn/10 text-warn" : t.status === "resuelto" || t.status === "cerrado" ? "bg-fill-2 text-fg-dim" : "bg-brand/10 text-brand-fg"}`}>{TICKET_ESTADO_LABEL[t.status as TicketEstado] ?? t.status}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-fg-dim">{interno ? "Sin tickets. Anota aquí los errores, mejoras y tareas de este producto para llevarlos en orden." : "Sin tickets de este proyecto. Cuando el cliente pida algo desde su cuenta, o lo abras tú, aparece aquí."}</p>
                )}
              </section>
            ) : <NoCargo titulo="Tickets" />
          }
        />
      </TaskWorkspace>
    </div>
    </ZonaLinea>
  );
}
