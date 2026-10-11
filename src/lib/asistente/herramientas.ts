/**
 * Herramientas del asistente (prompt maestro §4.2). Las de lectura responden al momento. Las de escritura
 * («proponer_*») NO escriben: dejan una AssistantAction «propuesta» que la persona confirma en pantalla.
 */
import type OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { mejores } from "./buscar";
import { datosHoy } from "@/lib/motor/hoy";
import { dineroDeProyecto } from "@/lib/motor/cobros";
import { saldoCliente } from "@/lib/portal/saldo";
import { avanceDeProyecto } from "@/lib/portal/avance";
import { fasesVigentes } from "@/lib/portal/datos";

type Def = OpenAI.Chat.Completions.ChatCompletionTool;
const def = (name: string, description: string, properties: Record<string, unknown>, required: string[] = []): Def => ({
  type: "function",
  function: { name, description, parameters: { type: "object", properties, required, additionalProperties: false } },
});

export const HERRAMIENTAS: Def[] = [
  def("buscar_cliente", "Busca clientes por nombre aproximado, empresa, contacto o correo. Úsala SIEMPRE antes de actuar sobre un cliente nombrado.", { texto: { type: "string" } }, ["texto"]),
  def("resumen_cliente", "Saldo (vencido, por cobrar, pagado), proyectos y tickets abiertos de un cliente.", { clienteId: { type: "string" } }, ["clienteId"]),
  def("buscar_proyecto", "Busca proyectos por nombre aproximado, opcionalmente de un cliente.", { texto: { type: "string" }, clienteId: { type: "string" } }, ["texto"]),
  def("estado_proyecto", "Fases, avance, dinero y actividad verificada en GitHub de un proyecto.", { proyectoId: { type: "string" } }, ["proyectoId"]),
  def("dinero_y_agenda", "Lo de hoy: dinero vencido (rojo), por cobrar (azul), lo que entró este mes (verde), facturas vencidas, agenda, sistemas con problemas y decisiones pendientes.", {}),
  def("proponer_factura", "Propone una factura en borrador para un cliente por un concepto y monto. Con proyectoId queda dentro de ese proyecto; sin él es una factura aparte del cliente. No la envía a nadie.", { clienteId: { type: "string" }, concepto: { type: "string" }, monto: { type: "number" }, proyectoId: { type: "string" } }, ["clienteId", "concepto", "monto"]),
  def("proponer_tarea", "Propone una tarea, opcionalmente en un proyecto y con fecha de vencimiento (YYYY-MM-DD).", { titulo: { type: "string" }, proyectoId: { type: "string" }, vence: { type: "string" }, detalle: { type: "string" } }, ["titulo"]),
  def("proponer_nota", "Propone una nota interna en la línea de tiempo de un proyecto (no la ve el cliente).", { proyectoId: { type: "string" }, texto: { type: "string" } }, ["proyectoId", "texto"]),
  def("proponer_pago", "Propone registrar un pago recibido de un cliente. fecha YYYY-MM-DD; metodo: transferencia, yappy, tarjeta, efectivo, cheque u otro. facturaId opcional.", { clienteId: { type: "string" }, monto: { type: "number" }, fecha: { type: "string" }, metodo: { type: "string" }, referencia: { type: "string" }, facturaId: { type: "string" } }, ["clienteId", "monto", "fecha", "metodo"]),
];

const usd = (n: number) => `USD ${n.toFixed(2)}`;
const nombre = (c: { name: string; company: string | null }) => c.company || c.name;

export type Propuesta = { id: string; kind: string; summary: string };

export async function ejecutarHerramienta(userId: string, nombreHerr: string, args: Record<string, unknown>, pedido: string, propuestas: Propuesta[]): Promise<unknown> {
  const s = (k: string) => (typeof args[k] === "string" ? (args[k] as string).trim() : "");
  switch (nombreHerr) {
    case "buscar_cliente": {
      const cs = await prisma.client.findMany({ where: { userId, archivedAt: null }, select: { id: true, name: true, company: true, email: true, brandLine: true } });
      const r = mejores(s("texto"), cs, (c) => [c.company ?? "", c.name, c.email ?? ""]);
      return r.length ? r.map((x) => ({ clienteId: x.item.id, nombre: nombre(x.item), contacto: x.item.company ? x.item.name : null, linea: x.item.brandLine, coincidencia: Math.round(x.puntaje * 100) })) : { resultado: "No encontré ningún cliente parecido." };
    }
    case "resumen_cliente": {
      const c = await prisma.client.findFirst({ where: { id: s("clienteId"), userId }, select: { id: true, name: true, company: true, brandLine: true, hourlyRate: true, documents: { where: { type: "FACTURA" }, select: { id: true, number: true, status: true, total: true, amountPaid: true, dueDate: true } }, payments: { select: { documentId: true, amount: true, status: true } }, projects: { where: { status: { not: "CANCELLED" } }, select: { id: true, name: true, status: true } }, tickets: { where: { status: { notIn: ["resuelto", "cerrado"] } }, select: { number: true, title: true } } } });
      if (!c) return { error: "No encontré ese cliente." };
      const saldo = saldoCliente(c.documents, c.payments);
      const hoy = new Date();
      const vencidas = c.documents.filter((d) => d.status !== "PAID" && d.status !== "DRAFT" && d.status !== "CANCELLED" && d.dueDate && d.dueDate < hoy).map((d) => d.number);
      return { cliente: nombre(c), linea: c.brandLine, facturado: usd(saldo.facturado), pagado: usd(saldo.pagado), porCobrar: usd(saldo.pendiente), facturasVencidas: vencidas, proyectos: c.projects.map((p) => ({ proyectoId: p.id, nombre: p.name, estado: p.status })), ticketsAbiertos: c.tickets };
    }
    case "buscar_proyecto": {
      const ps = await prisma.project.findMany({ where: { userId, status: { not: "CANCELLED" }, ...(s("clienteId") ? { OR: [{ clientId: s("clienteId") }, { clients: { some: { clientId: s("clienteId") } } }] } : {}) }, select: { id: true, name: true, status: true, client: { select: { name: true, company: true } } } });
      const r = s("texto") ? mejores(s("texto"), ps, (p) => [p.name, p.client ? nombre(p.client) : ""], 0.5) : ps.map((item) => ({ item, puntaje: 1 }));
      return r.length ? r.map((x) => ({ proyectoId: x.item.id, nombre: x.item.name, cliente: x.item.client ? nombre(x.item.client) : null, estado: x.item.status })) : { resultado: "No encontré ningún proyecto parecido." };
    }
    case "estado_proyecto": {
      const p = await prisma.project.findFirst({ where: { id: s("proyectoId"), userId }, select: { id: true, name: true, status: true, githubCheck: true, githubCheckAt: true, repoOwner: true, repoName: true, phases: { where: fasesVigentes, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, status: true, progress: true, price: true } } } });
      if (!p) return { error: "No encontré ese proyecto." };
      const dinero = await dineroDeProyecto(userId, p.id);
      const g = p.githubCheck as { commits7?: number; commits30?: number; ultimoCommit?: { mensaje: string; fecha: string } | null } | null;
      return { proyecto: p.name, estado: p.status, avance: `${Math.round(avanceDeProyecto(p.phases))} %`, fases: p.phases.map((f) => ({ nombre: f.name, estado: f.status, avance: Number(f.progress), precio: usd(Number(f.price)) })), dinero: dinero && { presupuesto: usd(dinero.presupuesto), facturado: usd(dinero.facturado), cobrado: usd(dinero.cobrado), porCobrar: usd(dinero.porCobrar) }, github: p.repoName ? (g ? { verificado: p.githubCheckAt, commits7: g.commits7, commits30: g.commits30, ultimoCambio: g.ultimoCommit } : "Ligado pero sin verificar todavía") : "Sin repositorio" };
    }
    case "dinero_y_agenda": {
      const d = await datosHoy(userId);
      return { dinero: { vencido: usd(d.dinero.vencido), porCobrar: usd(d.dinero.porCobrar), entroEsteMes: usd(d.dinero.entroMes), entroMesPasado: usd(d.dinero.entroMesPasado) }, vencidas: d.vencidas.map((v) => `${v.cliente}: ${usd(v.falta)} (${v.numero}, ${v.dias} días)`), agendaDeHoy: d.agenda.map((a) => `${a.hora ? a.hora.toLocaleTimeString("es-PA", { hour: "numeric", minute: "2-digit", timeZone: "America/Panama" }) : "Hoy"} · ${a.titulo}${a.detalle ? ` (${a.detalle})` : ""}`), tareasAtrasadas: d.tareasAtrasadas, sistemasConProblemas: d.sistemas.map((x) => `${x.nombre} (${x.cliente})`), decisiones: d.decisiones.map((x) => x.titulo) };
    }
  }

  // Escritura: solo propuestas.
  const crear = async (kind: string, payload: Record<string, unknown>, summary: string) => {
    const a = await prisma.assistantAction.create({ data: { userId, kind, payload: payload as object, summary, request: pedido.slice(0, 2000) } });
    propuestas.push({ id: a.id, kind, summary });
    return { propuesta: a.id, resumen: summary, estado: "Espera que la persona toque Confirmar en pantalla. No digas que ya está hecho." };
  };
  if (nombreHerr === "proponer_factura") {
    const c = await prisma.client.findFirst({ where: { id: s("clienteId"), userId }, select: { id: true, name: true, company: true } });
    if (!c) return { error: "No encontré ese cliente. Búscalo primero con buscar_cliente." };
    const monto = Math.round(Number(args.monto) * 100) / 100;
    if (!(monto > 0)) return { error: "El monto tiene que ser mayor que cero." };
    const proj = s("proyectoId") ? await prisma.project.findFirst({ where: { id: s("proyectoId"), userId }, select: { id: true, name: true } }) : null;
    if (s("proyectoId") && !proj) return { error: "No encontré ese proyecto." };
    return crear("factura", { clienteId: c.id, concepto: s("concepto"), monto, proyectoId: proj?.id ?? null }, `Factura en borrador · ${nombre(c)} · ${s("concepto")} · ${usd(monto)} · ${proj ? `proyecto ${proj.name}` : "aparte, sin proyecto"}`);
  }
  if (nombreHerr === "proponer_tarea") {
    const proj = s("proyectoId") ? await prisma.project.findFirst({ where: { id: s("proyectoId"), userId }, select: { id: true, name: true } }) : null;
    const vence = /^\d{4}-\d{2}-\d{2}$/.test(s("vence")) ? s("vence") : null;
    return crear("tarea", { titulo: s("titulo"), proyectoId: proj?.id ?? null, vence, detalle: s("detalle") || null }, `Tarea · ${s("titulo")}${proj ? ` · ${proj.name}` : ""}${vence ? ` · vence ${vence}` : ""}`);
  }
  if (nombreHerr === "proponer_nota") {
    const proj = await prisma.project.findFirst({ where: { id: s("proyectoId"), userId }, select: { id: true, name: true } });
    if (!proj) return { error: "No encontré ese proyecto." };
    return crear("nota", { proyectoId: proj.id, texto: s("texto") }, `Nota interna en ${proj.name}: ${s("texto").slice(0, 120)}`);
  }
  if (nombreHerr === "proponer_pago") {
    const c = await prisma.client.findFirst({ where: { id: s("clienteId"), userId }, select: { id: true, name: true, company: true } });
    if (!c) return { error: "No encontré ese cliente." };
    const monto = Math.round(Number(args.monto) * 100) / 100;
    if (!(monto > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(s("fecha"))) return { error: "Falta el monto o la fecha (YYYY-MM-DD)." };
    const metodo = ["transferencia", "yappy", "tarjeta", "efectivo", "cheque", "otro"].includes(s("metodo").toLowerCase()) ? s("metodo").toLowerCase() : "otro";
    const fac = s("facturaId") ? await prisma.document.findFirst({ where: { id: s("facturaId"), userId, clientId: c.id, type: "FACTURA" }, select: { id: true, number: true } }) : null;
    return crear("pago", { clienteId: c.id, monto, fecha: s("fecha"), metodo, referencia: s("referencia") || null, facturaId: fac?.id ?? null }, `Pago recibido · ${nombre(c)} · ${usd(monto)} · ${s("fecha")} · ${metodo}${fac ? ` · ${fac.number}` : ""}`);
  }
  return { error: `No conozco la herramienta ${nombreHerr}.` };
}
