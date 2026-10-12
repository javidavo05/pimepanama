/**
 * Todo lo que el asistente puede cambiar en el sistema, en un solo motor (pedido del 2026-10-12).
 * Cada operación tiene dos partes:
 *   preparar → valida contra la base, arma el resumen y dice qué mueve (para requiereConfirmacion)
 *   ejecutar → hace el cambio con el motor de siempre (registrarPago, crearCobro…) y anota los pasos
 *              para deshacerlo (pasos.ts)
 * El nombre de la operación es el de la herramienta y el kind de AssistantAction.
 */
import type OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { crearCobro, type Equipo } from "@/lib/motor/cobros";
import { registrarPago, recalcularFactura, avanceDeFaseEvento } from "@/lib/portal/empresa";
import { registrarEvento } from "@/lib/portal/eventos";
import { unirClienteAProyecto } from "@/lib/motor/enlaces";
import { facturarPagosSinFactura, nacioPorPago } from "@/lib/motor/pagos";
import { isFinancingPlan, type FinancingPlan, type InstallmentFrequency } from "@/lib/financing";
import { FASE_ESTADOS, FASE_COBRO, PAGO_METODOS, TICKET_ESTADOS, TICKET_PRIORIDADES, TICKET_TIPOS, TICKET_TIPOS_INTERNOS, PROYECTO_TIPOS, esUno } from "@/lib/portal/estados";
import type { Evaluable } from "./reglas";
import { antesDe, borrarFacturaConPasos, filaParaGuardar, type Paso } from "./pasos";

export type U = Equipo & { id: string; fullName?: string | null };
export type Args = Record<string, unknown>;
export type Prep = { resumen: string; evalua: Evaluable; payload: Args; aviso?: string };
export type Hecho = { pasos: Paso[]; resultType: string; resultId: string; href: string | null; datos?: Args };
type Op = { def: OpenAI.Chat.Completions.ChatCompletionTool; preparar: (u: U, a: Args) => Promise<Prep | { error: string }>; ejecutar: (u: U, p: Args) => Promise<Hecho> };

// ─── Utilidades ──────────────────────────────────────────────────────────────

const r2 = (n: number) => Math.round(n * 100) / 100;
export const usd = (n: number) => `USD ${r2(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const nombreDe = (c: { name: string; company: string | null } | null | undefined) => (c ? c.company || c.name : "sin cliente");
const s = (a: Args, k: string) => (typeof a[k] === "string" ? (a[k] as string).trim() : "");
const tiene = (a: Args, k: string) => a[k] !== undefined && a[k] !== null && a[k] !== "";
const num = (a: Args, k: string) => (tiene(a, k) && Number.isFinite(Number(a[k])) ? r2(Number(a[k])) : null);
const esFecha = (f: string) => /^\d{4}-\d{2}-\d{2}$/.test(f) && !Number.isNaN(Date.parse(`${f}T12:00:00Z`));
const fechaUTC = (f: string) => new Date(`${f}T12:00:00Z`);
export const hoyPanama = () => new Date(Date.now() - 5 * 3600_000).toISOString().slice(0, 10);
const fechaCorta = (f: string | Date) => new Date(typeof f === "string" ? `${f.slice(0, 10)}T12:00:00Z` : f).toLocaleDateString("es-PA", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const ESTADO_FASE: Record<string, string> = { pendiente: "pendiente", en_curso: "en curso", en_revision: "en revisión", hecha: "hecha" };

const P = (properties: Record<string, unknown>) => properties;
const STR = { type: "string" };
const NUM = { type: "number" };
const BOOL = { type: "boolean" };
const def = (name: string, description: string, properties: Record<string, unknown>, required: string[] = []): OpenAI.Chat.Completions.ChatCompletionTool => ({
  type: "function",
  function: { name, description, parameters: { type: "object", properties, required, additionalProperties: false } },
});

async function clienteDe(u: U, id: string) {
  return id ? prisma.client.findFirst({ where: { id, userId: u.id }, select: { id: true, name: true, company: true, internal: true } }) : null;
}
async function proyectoDe(u: U, id: string) {
  return id ? prisma.project.findFirst({ where: { id, userId: u.id }, select: { id: true, name: true, clientId: true, status: true, financingPlan: true, client: { select: { id: true, name: true, company: true } }, clients: { select: { client: { select: { id: true, name: true, company: true } } }, take: 1 } } }) : null;
}
const clienteDelProyecto = (p: NonNullable<Awaited<ReturnType<typeof proyectoDe>>>) => p.client ?? p.clients[0]?.client ?? null;
async function faseDe(u: U, id: string) {
  return id ? prisma.projectPhase.findFirst({ where: { id, project: { userId: u.id } }, include: { invoice: { select: { id: true, number: true, status: true, content: true, total: true } }, project: { select: { id: true, name: true, clientId: true, client: { select: { id: true, name: true, company: true } }, clients: { select: { client: { select: { id: true, name: true, company: true } } }, take: 1 } } } } }) : null;
}
async function facturaDe(u: U, id: string) {
  return id ? prisma.document.findFirst({ where: { id, userId: u.id, type: "FACTURA" }, select: { id: true, number: true, status: true, total: true, subtotal: true, taxAmount: true, amountPaid: true, content: true, title: true, dueDate: true, clientId: true, projectId: true, client: { select: { name: true, company: true } } } }) : null;
}

/** Ajusta el monto de una factura de una sola línea (o la primera línea) y recalcula su estado. */
async function ajustarMontoFactura(documentId: string, monto: number): Promise<Paso> {
  const d = await prisma.document.findUniqueOrThrow({ where: { id: documentId }, select: { content: true, subtotal: true, taxAmount: true, total: true, status: true, amountPaid: true } });
  const content = (d.content ?? {}) as { lineItems?: { unitPrice?: number; quantity?: number; taxPercent?: number }[] } & Record<string, unknown>;
  const lineas = [...(content.lineItems ?? [])];
  const tasa = Number(lineas[0]?.taxPercent ?? 0) || 0;
  const otras = lineas.slice(1).reduce((a, l) => a + Number(l.unitPrice ?? 0) * Number(l.quantity ?? 1), 0);
  if (lineas[0]) lineas[0] = { ...lineas[0], unitPrice: r2(monto), quantity: 1 };
  const subtotal = r2(monto + otras);
  const taxAmount = r2((subtotal * tasa) / 100);
  const paso: Paso = { t: "editar", m: "document", id: documentId, antes: antesDe(d as unknown as Record<string, unknown>, ["content", "subtotal", "taxAmount", "total", "status", "amountPaid"]) };
  await prisma.document.update({ where: { id: documentId }, data: { content: { ...content, lineItems: lineas } as object, subtotal, taxAmount, total: r2(subtotal + taxAmount) } });
  await recalcularFactura(documentId);
  return paso;
}

function partes(pares: [string, unknown][]) {
  return pares.filter(([, v]) => v !== undefined && v !== null && v !== "").map(([k, v]) => `${k} ${v}`).join(" · ");
}

// ─── Operaciones ─────────────────────────────────────────────────────────────

export const OPERACIONES: Record<string, Op> = {
  // Clientes
  cliente_crear: {
    def: def("cliente_crear", "Crea un cliente nuevo. Antes busca con buscar_cliente para no duplicarlo.", P({ nombre: STR, empresa: STR, correo: STR, telefono: STR, ruc: STR, linea: { type: "string", enum: ["normal", "premium"] }, notas: STR }), ["nombre"]),
    async preparar(u, a) {
      if (!s(a, "nombre")) return { error: "Falta el nombre del cliente." };
      const igual = await prisma.client.findFirst({ where: { userId: u.id, archivedAt: null, OR: [{ name: { equals: s(a, "nombre"), mode: "insensitive" } }, ...(s(a, "empresa") ? [{ company: { equals: s(a, "empresa"), mode: "insensitive" as const } }] : [])] }, select: { id: true, name: true, company: true } });
      if (igual) return { error: `Ya existe ${nombreDe(igual)} (clienteId ${igual.id}). Usa ese.` };
      return { resumen: `Cliente nuevo · ${s(a, "empresa") || s(a, "nombre")}${s(a, "empresa") ? ` (${s(a, "nombre")})` : ""}${a.linea === "premium" ? " · premium" : ""}`, evalua: {}, payload: { nombre: s(a, "nombre"), empresa: s(a, "empresa") || null, correo: s(a, "correo").toLowerCase() || null, telefono: s(a, "telefono") || null, ruc: s(a, "ruc") || null, linea: a.linea === "premium" ? "premium" : "normal", notas: s(a, "notas") || null } };
    },
    async ejecutar(u, p) {
      const c = await prisma.client.create({ data: { userId: u.id, name: String(p.nombre).slice(0, 200), company: (p.empresa as string) || null, email: (p.correo as string) || null, phone: (p.telefono as string) || null, ruc: (p.ruc as string) || null, brandLine: String(p.linea), notes: (p.notas as string) || null } });
      return { pasos: [{ t: "crear", m: "client", id: c.id }], resultType: "cliente", resultId: c.id, href: `/empresa/clientes/${c.id}`, datos: { clienteId: c.id } };
    },
  },
  cliente_editar: {
    def: def("cliente_editar", "Cambia datos de un cliente: nombre de contacto, empresa, correo, teléfono, RUC, dirección, línea (normal o premium), tarifa por hora o notas.", P({ clienteId: STR, nombre: STR, empresa: STR, correo: STR, telefono: STR, ruc: STR, direccion: STR, linea: { type: "string", enum: ["normal", "premium"] }, tarifaHora: NUM, notas: STR }), ["clienteId"]),
    async preparar(u, a) {
      const c = await clienteDe(u, s(a, "clienteId"));
      if (!c) return { error: "No encontré ese cliente." };
      const data: Args = {};
      const mapa: [string, string][] = [["nombre", "name"], ["empresa", "company"], ["correo", "email"], ["telefono", "phone"], ["ruc", "ruc"], ["direccion", "address"], ["linea", "brandLine"], ["notas", "notes"]];
      for (const [k, campo] of mapa) if (tiene(a, k)) data[campo] = k === "correo" ? s(a, k).toLowerCase() : s(a, k);
      if (num(a, "tarifaHora") !== null) data.hourlyRate = num(a, "tarifaHora");
      if (!Object.keys(data).length) return { error: "No me dijiste qué cambiar." };
      return { resumen: `${nombreDe(c)} · ${Object.entries(data).map(([k, v]) => `${k} → ${v}`).join(" · ")}`, evalua: {}, payload: { clienteId: c.id, data } };
    },
    async ejecutar(u, p) {
      const data = p.data as Args;
      const antes = await prisma.client.findFirstOrThrow({ where: { id: String(p.clienteId), userId: u.id } });
      await prisma.client.update({ where: { id: antes.id }, data });
      return { pasos: [{ t: "editar", m: "client", id: antes.id, antes: antesDe(antes as unknown as Args, Object.keys(data)) }], resultType: "cliente", resultId: antes.id, href: `/empresa/clientes/${antes.id}` };
    },
  },
  cliente_archivar: {
    def: def("cliente_archivar", "Archiva un cliente (sale de las listas, no se borra nada). archivar=false lo devuelve.", P({ clienteId: STR, archivar: BOOL }), ["clienteId"]),
    async preparar(u, a) {
      const c = await clienteDe(u, s(a, "clienteId"));
      if (!c) return { error: "No encontré ese cliente." };
      const archivar = a.archivar !== false;
      return { resumen: `${archivar ? "Archivar" : "Sacar del archivo"} a ${nombreDe(c)}`, evalua: {}, payload: { clienteId: c.id, archivar } };
    },
    async ejecutar(u, p) {
      const c = await prisma.client.findFirstOrThrow({ where: { id: String(p.clienteId), userId: u.id }, select: { id: true, archivedAt: true } });
      await prisma.client.update({ where: { id: c.id }, data: { archivedAt: p.archivar ? new Date() : null } });
      return { pasos: [{ t: "editar", m: "client", id: c.id, antes: { archivedAt: c.archivedAt?.toISOString() ?? null } }], resultType: "cliente", resultId: c.id, href: `/empresa/clientes/${c.id}` };
    },
  },

  // Proyectos
  proyecto_crear: {
    def: def("proyecto_crear", "Crea un proyecto. clienteId es el cliente principal; clientesExtra suma otros clientes. Fechas YYYY-MM-DD.", P({ nombre: STR, clienteId: STR, clientesExtra: { type: "array", items: STR }, presupuesto: NUM, inicio: STR, fin: STR, descripcion: STR, tipo: { type: "string", enum: ["nuevo", "modificacion", "soporte"] } }), ["nombre"]),
    async preparar(u, a) {
      if (!s(a, "nombre")) return { error: "Falta el nombre del proyecto." };
      const c = s(a, "clienteId") ? await clienteDe(u, s(a, "clienteId")) : null;
      if (s(a, "clienteId") && !c) return { error: "No encontré ese cliente." };
      const extra = Array.isArray(a.clientesExtra) ? (a.clientesExtra as unknown[]).map(String) : [];
      const extras = extra.length ? await prisma.client.findMany({ where: { id: { in: extra }, userId: u.id }, select: { id: true } }) : [];
      const igual = await prisma.project.findFirst({ where: { userId: u.id, status: { not: "CANCELLED" }, name: { equals: s(a, "nombre"), mode: "insensitive" }, ...(c ? { OR: [{ clientId: c.id }, { clients: { some: { clientId: c.id } } }] } : {}) }, select: { id: true } });
      if (igual) return { error: `Ya existe un proyecto con ese nombre (proyectoId ${igual.id}). Usa ese.` };
      for (const k of ["inicio", "fin"]) if (s(a, k) && !esFecha(s(a, k))) return { error: `La fecha ${k} va como YYYY-MM-DD.` };
      return {
        resumen: `Proyecto nuevo «${s(a, "nombre")}»${c ? ` de ${nombreDe(c)}` : ""}${num(a, "presupuesto") ? ` · presupuesto ${usd(num(a, "presupuesto")!)}` : ""}`,
        evalua: {},
        payload: { nombre: s(a, "nombre"), clienteId: c?.id ?? null, extras: extras.map((x) => x.id), presupuesto: num(a, "presupuesto"), inicio: s(a, "inicio") || null, fin: s(a, "fin") || null, descripcion: s(a, "descripcion") || null, tipo: esUno(PROYECTO_TIPOS, s(a, "tipo")) ? s(a, "tipo") : "nuevo" },
      };
    },
    async ejecutar(u, p) {
      const pr = await prisma.project.create({ data: { userId: u.id, name: String(p.nombre).slice(0, 200), clientId: (p.clienteId as string) || null, status: "ACTIVE", kind: String(p.tipo), description: (p.descripcion as string) || null, totalBudget: (p.presupuesto as number) ?? null, startDate: p.inicio ? fechaUTC(String(p.inicio)) : null, endDate: p.fin ? fechaUTC(String(p.fin)) : null } });
      for (const cid of [p.clienteId, ...((p.extras as string[]) ?? [])].filter(Boolean) as string[]) await unirClienteAProyecto(u.id, pr.id, cid);
      return { pasos: [{ t: "crear", m: "project", id: pr.id }], resultType: "proyecto", resultId: pr.id, href: `/empresa/proyectos/${pr.id}`, datos: { proyectoId: pr.id } };
    },
  },
  proyecto_editar: {
    def: def("proyecto_editar", "Cambia un proyecto: nombre, estado (activo, pausado, completado, cancelado), presupuesto, fechas (YYYY-MM-DD), descripción, cliente principal (clienteId) o la lista completa de clientes (clientes).", P({ proyectoId: STR, nombre: STR, estado: { type: "string", enum: ["activo", "pausado", "completado", "cancelado"] }, presupuesto: NUM, inicio: STR, fin: STR, descripcion: STR, clienteId: STR, clientes: { type: "array", items: STR } }), ["proyectoId"]),
    async preparar(u, a) {
      const pr = await proyectoDe(u, s(a, "proyectoId"));
      if (!pr) return { error: "No encontré ese proyecto." };
      const data: Args = {};
      const ESTADOS: Record<string, string> = { activo: "ACTIVE", pausado: "PAUSED", completado: "COMPLETED", cancelado: "CANCELLED" };
      if (s(a, "nombre")) data.name = s(a, "nombre");
      if (ESTADOS[s(a, "estado")]) data.status = ESTADOS[s(a, "estado")];
      if (num(a, "presupuesto") !== null) data.totalBudget = num(a, "presupuesto");
      for (const [k, campo] of [["inicio", "startDate"], ["fin", "endDate"]] as const) if (s(a, k)) { if (!esFecha(s(a, k))) return { error: `La fecha ${k} va como YYYY-MM-DD.` }; data[campo] = `${s(a, k)}T12:00:00.000Z`; }
      if (tiene(a, "descripcion")) data.description = s(a, "descripcion");
      if (s(a, "clienteId")) { if (!(await clienteDe(u, s(a, "clienteId")))) return { error: "No encontré ese cliente." }; data.clientId = s(a, "clienteId"); }
      const clientes = Array.isArray(a.clientes) ? (await prisma.client.findMany({ where: { id: { in: (a.clientes as unknown[]).map(String) }, userId: u.id }, select: { id: true } })).map((c) => c.id) : null;
      if (!Object.keys(data).length && !clientes) return { error: "No me dijiste qué cambiar." };
      const resumen = `${pr.name} · ${[...Object.entries(data).map(([k, v]) => `${k} → ${String(v).replace("T12:00:00.000Z", "")}`), ...(clientes ? [`clientes → ${clientes.length}`] : [])].join(" · ")}`;
      return { resumen, evalua: { destruye: data.status === "CANCELLED" }, payload: { proyectoId: pr.id, data, clientes } };
    },
    async ejecutar(u, p) {
      const data = p.data as Args;
      const antes = await prisma.project.findFirstOrThrow({ where: { id: String(p.proyectoId), userId: u.id }, include: { clients: { select: { clientId: true, projectId: true, createdAt: true } } } });
      const pasos: Paso[] = [];
      if (Object.keys(data).length) {
        await prisma.project.update({ where: { id: antes.id }, data });
        pasos.push({ t: "editar", m: "project", id: antes.id, antes: antesDe(antes as unknown as Args, Object.keys(data)) });
      }
      const quiere = new Set([...(((p.clientes as string[] | null) ?? antes.clients.map((c) => c.clientId))), ...(data.clientId ? [String(data.clientId)] : [])]);
      for (const cid of quiere) if (!antes.clients.some((c) => c.clientId === cid)) { await prisma.projectClient.create({ data: { projectId: antes.id, clientId: cid } }); pasos.push({ t: "unir", projectId: antes.id, clientId: cid }); }
      if (p.clientes) for (const c of antes.clients) if (!quiere.has(c.clientId)) { await prisma.projectClient.delete({ where: { projectId_clientId: { projectId: antes.id, clientId: c.clientId } } }); pasos.push({ t: "borrar", m: "projectClient", fila: filaParaGuardar(c as unknown as Args) }); }
      return { pasos, resultType: "proyecto", resultId: antes.id, href: `/empresa/proyectos/${antes.id}` };
    },
  },
  proyecto_ligar_repo: {
    def: def("proyecto_ligar_repo", "Liga el repositorio de GitHub de un proyecto (owner/nombre o la dirección del repo).", P({ proyectoId: STR, repo: STR, rama: STR }), ["proyectoId", "repo"]),
    async preparar(u, a) {
      const pr = await proyectoDe(u, s(a, "proyectoId"));
      if (!pr) return { error: "No encontré ese proyecto." };
      const m = s(a, "repo").replace(/\.git$/, "").match(/(?:github\.com[/:])?([\w.-]+)\/([\w.-]+)\/?$/);
      if (!m) return { error: "El repo va como owner/nombre." };
      return { resumen: `${pr.name} · repo ${m[1]}/${m[2]}${s(a, "rama") ? ` (${s(a, "rama")})` : ""}`, evalua: {}, payload: { proyectoId: pr.id, owner: m[1], nombre: m[2], rama: s(a, "rama") || null } };
    },
    async ejecutar(u, p) {
      const antes = await prisma.project.findFirstOrThrow({ where: { id: String(p.proyectoId), userId: u.id } });
      await prisma.project.update({ where: { id: antes.id }, data: { repoOwner: String(p.owner), repoName: String(p.nombre), ...(p.rama ? { repoBranch: String(p.rama) } : {}) } });
      return { pasos: [{ t: "editar", m: "project", id: antes.id, antes: antesDe(antes as unknown as Args, ["repoOwner", "repoName", "repoBranch"]) }], resultType: "proyecto", resultId: antes.id, href: `/empresa/proyectos/${antes.id}` };
    },
  },
  proyecto_ligar_contrato: {
    def: def("proyecto_ligar_contrato", "Liga un contrato (contratoId, de resumen_cliente) a un proyecto.", P({ proyectoId: STR, contratoId: STR }), ["proyectoId", "contratoId"]),
    async preparar(u, a) {
      const [pr, k] = await Promise.all([proyectoDe(u, s(a, "proyectoId")), prisma.contract.findFirst({ where: { id: s(a, "contratoId"), userId: u.id }, select: { id: true, title: true } })]);
      if (!pr || !k) return { error: "No encontré ese proyecto o ese contrato." };
      return { resumen: `Contrato «${k.title}» → proyecto ${pr.name}`, evalua: {}, payload: { proyectoId: pr.id, contratoId: k.id } };
    },
    async ejecutar(u, p) {
      const k = await prisma.contract.findFirstOrThrow({ where: { id: String(p.contratoId), userId: u.id }, select: { id: true, projectId: true } });
      await prisma.contract.update({ where: { id: k.id }, data: { projectId: String(p.proyectoId) } });
      return { pasos: [{ t: "editar", m: "contract", id: k.id, antes: { projectId: k.projectId } }], resultType: "proyecto", resultId: String(p.proyectoId), href: `/empresa/proyectos/${p.proyectoId}` };
    },
  },

  // Fases
  fase_crear: {
    def: def("fase_crear", "Crea una fase en un proyecto, fuera del contrato salvo que digan lo contrario. estado: pendiente, en_curso, en_revision o hecha («inició» = en_curso). avance 0-100. Los pagos de la fase se registran aparte con pago_registrar y su faseId.", P({ proyectoId: STR, nombre: STR, precio: NUM, estado: { type: "string", enum: [...FASE_ESTADOS] }, avance: NUM, descripcion: STR }), ["proyectoId", "nombre", "precio"]),
    async preparar(u, a) {
      const pr = await proyectoDe(u, s(a, "proyectoId"));
      if (!pr) return { error: "No encontré ese proyecto." };
      const precio = num(a, "precio");
      if (!s(a, "nombre") || precio === null || precio < 0) return { error: "Falta el nombre de la fase o su precio." };
      const igual = await prisma.projectPhase.findFirst({ where: { projectId: pr.id, name: { equals: s(a, "nombre"), mode: "insensitive" } }, select: { id: true } });
      if (igual) return { error: `Ese proyecto ya tiene una fase «${s(a, "nombre")}» (faseId ${igual.id}). Edítala con fase_editar.` };
      const estado = esUno(FASE_ESTADOS, s(a, "estado")) ? s(a, "estado") : "pendiente";
      return { resumen: `Fase «${s(a, "nombre")}» · ${usd(precio)} · ${ESTADO_FASE[estado]} · ${pr.name} (${nombreDe(clienteDelProyecto(pr))})`, evalua: { monto: precio }, payload: { proyectoId: pr.id, nombre: s(a, "nombre"), precio, estado, avance: num(a, "avance"), descripcion: s(a, "descripcion") || null } };
    },
    async ejecutar(u, p) {
      const ultima = await prisma.projectPhase.aggregate({ where: { projectId: String(p.proyectoId) }, _max: { sortOrder: true } });
      const estado = String(p.estado);
      const avance = estado === "hecha" ? 100 : Math.max(0, Math.min(100, Number(p.avance ?? 0)));
      const f = await prisma.projectPhase.create({ data: { projectId: String(p.proyectoId), name: String(p.nombre).slice(0, 200), description: (p.descripcion as string) || null, price: Number(p.precio), status: estado, progress: avance, startedAt: estado === "pendiente" ? null : new Date(), completedAt: estado === "hecha" ? new Date() : null, sortOrder: (ultima._max.sortOrder ?? -1) + 1 } });
      return { pasos: [{ t: "crear", m: "projectPhase", id: f.id }], resultType: "fase", resultId: f.id, href: `/empresa/proyectos/${p.proyectoId}?tab=fases`, datos: { faseId: f.id } };
    },
  },
  fase_editar: {
    def: def("fase_editar", "Cambia una fase: nombre, precio, estado (pendiente, en_curso, en_revision, hecha), avance 0-100, descripción o cuándo se cobra (al_aprobar, al_iniciar, al_entregar, sin_cobro). Si la fase tiene factura, su monto sigue al precio.", P({ faseId: STR, nombre: STR, precio: NUM, estado: { type: "string", enum: [...FASE_ESTADOS] }, avance: NUM, descripcion: STR, cobro: { type: "string", enum: [...FASE_COBRO] } }), ["faseId"]),
    async preparar(u, a) {
      const f = await faseDe(u, s(a, "faseId"));
      if (!f) return { error: "No encontré esa fase. Búscala con ver_fases." };
      const cambios: Args = {};
      if (s(a, "nombre")) cambios.name = s(a, "nombre");
      if (tiene(a, "descripcion")) cambios.description = s(a, "descripcion");
      if (esUno(FASE_COBRO, s(a, "cobro"))) cambios.billingPoint = s(a, "cobro");
      const precio = num(a, "precio");
      if (precio !== null && Math.abs(precio - Number(f.price)) > 0.004) cambios.price = precio;
      const estado = esUno(FASE_ESTADOS, s(a, "estado")) ? s(a, "estado") : null;
      const avance = num(a, "avance");
      if (!Object.keys(cambios).length && !estado && avance === null) return { error: "No me dijiste qué cambiar." };
      const fac = f.invoice && f.invoice.status !== "CANCELLED" ? f.invoice : null;
      const tocaEmitida = !!(cambios.price !== undefined && fac && fac.status !== "DRAFT" && !nacioPorPago(fac.content));
      const resumen = `Fase «${f.name}» (${f.project.name}) · ${partes([["nombre →", cambios.name], ["precio", cambios.price !== undefined ? `${usd(Number(f.price))} → ${usd(precio!)}` : null], ["estado →", estado ? ESTADO_FASE[estado] : null], ["avance →", avance !== null ? `${avance} %` : null], ["cobro →", cambios.billingPoint], ["descripción →", cambios.description]])}${cambios.price !== undefined && fac ? ` · la factura ${fac.number} pasa a ${usd(precio!)}` : ""}`;
      return { resumen, evalua: { monto: cambios.price !== undefined ? precio! - Number(f.price) : 0, facturaEmitida: tocaEmitida }, payload: { faseId: f.id, cambios, estado, avance, facturaId: cambios.price !== undefined && fac ? fac.id : null } };
    },
    async ejecutar(u, p) {
      const f = await prisma.projectPhase.findFirstOrThrow({ where: { id: String(p.faseId), project: { userId: u.id } } });
      const pasos: Paso[] = [];
      const cambios = p.cambios as Args;
      const campos = [...Object.keys(cambios), ...(p.estado || p.avance !== null ? ["status", "progress", "startedAt", "completedAt"] : [])];
      pasos.push({ t: "editar", m: "projectPhase", id: f.id, antes: antesDe(f as unknown as Args, campos) });
      if (Object.keys(cambios).length) await prisma.projectPhase.update({ where: { id: f.id }, data: cambios });
      if (p.estado || p.avance !== null) await avanceDeFaseEvento(u, f.id, { status: (p.estado as string) || undefined, progress: p.avance !== null && p.avance !== undefined ? Number(p.avance) : undefined });
      if (p.facturaId && cambios.price !== undefined) pasos.push(await ajustarMontoFactura(String(p.facturaId), Number(cambios.price)));
      return { pasos, resultType: "fase", resultId: f.id, href: `/empresa/proyectos/${f.projectId}?tab=fases` };
    },
  },
  fase_mover: {
    def: def("fase_mover", "Mueve una fase de lugar dentro de su proyecto. posicion empieza en 1.", P({ faseId: STR, posicion: NUM }), ["faseId", "posicion"]),
    async preparar(u, a) {
      const f = await faseDe(u, s(a, "faseId"));
      const pos = num(a, "posicion");
      if (!f || !pos || pos < 1) return { error: "Necesito la fase y la posición (desde 1)." };
      const n = await prisma.projectPhase.count({ where: { projectId: f.projectId } });
      return { resumen: `Fase «${f.name}» al lugar ${Math.min(Math.round(pos), n)} de ${n} · ${f.project.name}`, evalua: {}, payload: { faseId: f.id, posicion: Math.round(pos) } };
    },
    async ejecutar(u, p) {
      const f = await prisma.projectPhase.findFirstOrThrow({ where: { id: String(p.faseId), project: { userId: u.id } }, select: { id: true, projectId: true } });
      const todas = await prisma.projectPhase.findMany({ where: { projectId: f.projectId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true, sortOrder: true } });
      const resto = todas.filter((x) => x.id !== f.id);
      resto.splice(Math.min(Number(p.posicion) - 1, resto.length), 0, todas.find((x) => x.id === f.id)!);
      const pasos: Paso[] = [];
      for (const [i, x] of resto.entries()) if (x.sortOrder !== i) { pasos.push({ t: "editar", m: "projectPhase", id: x.id, antes: { sortOrder: x.sortOrder } }); await prisma.projectPhase.update({ where: { id: x.id }, data: { sortOrder: i } }); }
      return { pasos, resultType: "fase", resultId: f.id, href: `/empresa/proyectos/${f.projectId}?tab=fases` };
    },
  },
  fase_borrar: {
    def: def("fase_borrar", "Borra una fase. Siempre pide confirmación.", P({ faseId: STR }), ["faseId"]),
    async preparar(u, a) {
      const f = await faseDe(u, s(a, "faseId"));
      if (!f) return { error: "No encontré esa fase." };
      if (f.invoice && f.invoice.status !== "CANCELLED") return { error: `La fase tiene la factura ${f.invoice.number}. Anúlala o borra sus pagos primero.` };
      return { resumen: `Borrar la fase «${f.name}» (${usd(Number(f.price))}) de ${f.project.name}`, evalua: { destruye: true }, payload: { faseId: f.id } };
    },
    async ejecutar(u, p) {
      const f = await prisma.projectPhase.findFirstOrThrow({ where: { id: String(p.faseId), project: { userId: u.id } } });
      const pagos = await prisma.payment.findMany({ where: { phaseId: f.id }, select: { id: true } });
      await prisma.projectPhase.delete({ where: { id: f.id } });
      return { pasos: [...pagos.map((x) => ({ t: "editar" as const, m: "payment" as const, id: x.id, antes: { phaseId: f.id } })), { t: "borrar" as const, m: "projectPhase" as const, fila: filaParaGuardar(f as unknown as Args) }], resultType: "fase", resultId: f.id, href: `/empresa/proyectos/${f.projectId}?tab=fases` };
    },
  },

  // Pagos
  pago_registrar: {
    def: def("pago_registrar", "Registra un pago recibido. Con faseId se abona a esa fase; con proyectoId, al proyecto; sin ninguno, es un pago aparte del cliente. Siempre queda con su factura emitida en la cuenta del cliente (la de la fase, una abierta del proyecto o una nueva por el monto); no se le envía nada. fecha YYYY-MM-DD (sin fecha = hoy). metodo: transferencia, yappy, tarjeta, efectivo, cheque u otro (si no lo dicen, otro). No repite un pago igual (mismo cliente, fecha y monto) salvo repetir=true.", P({ clienteId: STR, monto: NUM, fecha: STR, metodo: { type: "string", enum: [...PAGO_METODOS] }, referencia: STR, faseId: STR, proyectoId: STR, facturaId: STR, conItbms: BOOL, repetir: BOOL }), ["monto"]),
    async preparar(u, a) {
      const monto = num(a, "monto");
      if (!monto || monto <= 0) return { error: "Falta el monto del pago." };
      const fecha = s(a, "fecha") || hoyPanama();
      if (!esFecha(fecha)) return { error: "La fecha va como YYYY-MM-DD." };
      const fase = s(a, "faseId") ? await faseDe(u, s(a, "faseId")) : null;
      if (s(a, "faseId") && !fase) return { error: "No encontré esa fase. Búscala con ver_fases." };
      const pr = !fase && s(a, "proyectoId") ? await proyectoDe(u, s(a, "proyectoId")) : null;
      if (s(a, "proyectoId") && !fase && !pr) return { error: "No encontré ese proyecto." };
      const delProyecto = fase ? fase.project.client ?? fase.project.clients[0]?.client ?? null : pr ? clienteDelProyecto(pr) : null;
      const c = s(a, "clienteId") ? await clienteDe(u, s(a, "clienteId")) : delProyecto ? await clienteDe(u, delProyecto.id) : null;
      if (!c) return { error: "Necesito el cliente del pago (búscalo con buscar_cliente)." };
      const fac = s(a, "facturaId") ? await prisma.document.findFirst({ where: { id: s(a, "facturaId"), userId: u.id, clientId: c.id, type: "FACTURA", status: { not: "CANCELLED" } }, select: { id: true, number: true } }) : null;
      if (s(a, "facturaId") && !fac) return { error: "Esa factura no es de este cliente o está anulada." };
      if (a.repetir !== true) {
        const igual = await prisma.payment.findFirst({ where: { userId: u.id, clientId: c.id, paidAt: fechaUTC(fecha), amount: monto, status: { not: "rechazado" } }, select: { id: true } });
        if (igual) return { error: `Ya hay un pago de ${usd(monto)} del ${fechaCorta(fecha)} de ${nombreDe(c)} (pagoId ${igual.id}). No lo repetí.` };
      }
      if (fase && !fac) {
        const ya = await prisma.payment.aggregate({ where: { OR: [{ phaseId: fase.id }, ...(fase.invoiceId ? [{ documentId: fase.invoiceId }] : [])], status: "confirmado" }, _sum: { amount: true } });
        const tope = fase.invoice && fase.invoice.status !== "CANCELLED" ? Number(fase.invoice.total ?? fase.price) : Number(fase.price);
        if (Number(ya._sum.amount ?? 0) + monto > tope + 0.005) return { error: `Con este pago la fase «${fase.name}» quedaría pagada de más: precio ${usd(tope)}, ya pagado ${usd(Number(ya._sum.amount ?? 0))}. Revisa el monto o cambia el precio de la fase.` };
      }
      const metodo = esUno(PAGO_METODOS, s(a, "metodo")) ? s(a, "metodo") : "otro";
      const destino = fac ? `factura ${fac.number}` : fase ? `fase «${fase.name}» (${fase.project.name})` : pr ? `proyecto ${pr.name}` : "aparte";
      const factura = fac ? "" : fase ? (fase.invoice && fase.invoice.status !== "CANCELLED" ? ` · a su factura ${fase.invoice.number}` : ` · emite la factura de la fase por ${usd(Number(fase.price))}`) : pr ? " · a una factura abierta del proyecto o una nueva" : ` · factura por ${usd(monto)}`;
      return { resumen: `Pago · ${nombreDe(c)} · ${usd(monto)} · ${fechaCorta(fecha)} · ${destino}${factura}`, evalua: { monto }, payload: { clienteId: c.id, monto, fecha, metodo, referencia: s(a, "referencia") || null, faseId: fase?.id ?? null, proyectoId: fase?.projectId ?? pr?.id ?? null, facturaId: fac?.id ?? null, conItbms: a.conItbms === true } };
    },
    async ejecutar(u, p) {
      // Si la factura de la fase estaba en borrador, se emite; deshacer la devuelve a borrador.
      const fase = p.faseId ? await prisma.projectPhase.findFirst({ where: { id: String(p.faseId) }, select: { invoice: { select: { id: true, status: true } } } }) : null;
      const borrador = p.facturaId ? await prisma.document.findFirst({ where: { id: String(p.facturaId), status: "DRAFT" }, select: { id: true } }) : fase?.invoice?.status === "DRAFT" ? fase.invoice : null;
      const pg = await registrarPago(u, { clientId: String(p.clienteId), documentId: (p.facturaId as string) || null, phaseId: (p.faseId as string) || null, projectId: (p.proyectoId as string) || null, monto: Number(p.monto), fecha: String(p.fecha), metodo: String(p.metodo), referencia: (p.referencia as string) || null, nota: "Registrado con el asistente", conItbms: p.conItbms === true });
      const doc = await prisma.document.findUnique({ where: { id: pg.documentId! }, select: { id: true, number: true, status: true } });
      const pasos: Paso[] = [...(borrador ? [{ t: "editar" as const, m: "document" as const, id: borrador.id, antes: { status: "DRAFT" } }] : []), { t: "pago", id: pg.id }];
      return { pasos, resultType: "pago", resultId: pg.id, href: `/empresa/facturas/${pg.documentId}`, datos: { pagoId: pg.id, facturaId: doc?.id, factura: doc?.number, facturaNueva: pg.facturaCreada, estadoFactura: doc?.status } };
    },
  },
  pago_editar: {
    def: def("pago_editar", "Corrige un pago: monto, fecha (YYYY-MM-DD), método o referencia. Busca el pagoId con ver_pagos.", P({ pagoId: STR, monto: NUM, fecha: STR, metodo: { type: "string", enum: [...PAGO_METODOS] }, referencia: STR }), ["pagoId"]),
    async preparar(u, a) {
      const pg = await prisma.payment.findFirst({ where: { id: s(a, "pagoId"), userId: u.id }, select: { id: true, amount: true, paidAt: true, client: { select: { name: true, company: true } } } });
      if (!pg) return { error: "No encontré ese pago. Búscalo con ver_pagos." };
      const data: Args = {};
      const monto = num(a, "monto");
      if (monto !== null && monto > 0 && Math.abs(monto - Number(pg.amount)) > 0.004) data.amount = monto;
      if (s(a, "fecha")) { if (!esFecha(s(a, "fecha"))) return { error: "La fecha va como YYYY-MM-DD." }; data.paidAt = `${s(a, "fecha")}T12:00:00.000Z`; }
      if (esUno(PAGO_METODOS, s(a, "metodo"))) data.method = s(a, "metodo");
      if (tiene(a, "referencia")) data.reference = s(a, "referencia");
      if (!Object.keys(data).length) return { error: "No me dijiste qué cambiar." };
      return { resumen: `Pago de ${nombreDe(pg.client)} del ${fechaCorta(pg.paidAt)} · ${partes([["monto", data.amount !== undefined ? `${usd(Number(pg.amount))} → ${usd(monto!)}` : null], ["fecha →", s(a, "fecha") ? fechaCorta(s(a, "fecha")) : null], ["método →", data.method], ["referencia →", data.reference]])}`, evalua: { monto: data.amount !== undefined ? monto! - Number(pg.amount) : 0 }, payload: { pagoId: pg.id, data } };
    },
    async ejecutar(u, p) {
      const pg = await prisma.payment.findFirstOrThrow({ where: { id: String(p.pagoId), userId: u.id } });
      const data = p.data as Args;
      const pasos: Paso[] = [];
      if (pg.documentId) pasos.push({ t: "recalc", id: pg.documentId });
      pasos.push({ t: "editar", m: "payment", id: pg.id, antes: antesDe(pg as unknown as Args, Object.keys(data)) });
      await prisma.payment.update({ where: { id: pg.id }, data });
      if (pg.documentId) {
        // La factura suelta que nació por este pago sigue su monto.
        const d = await prisma.document.findUnique({ where: { id: pg.documentId }, select: { content: true, phasesInvoiced: { select: { id: true }, take: 1 }, _count: { select: { payments: true } } } });
        if (data.amount !== undefined && d && nacioPorPago(d.content) && !d.phasesInvoiced.length && d._count.payments === 1) pasos.push(await ajustarMontoFactura(pg.documentId, Number(data.amount)));
        else await recalcularFactura(pg.documentId);
      }
      return { pasos, resultType: "pago", resultId: pg.id, href: pg.documentId ? `/empresa/facturas/${pg.documentId}` : pg.clientId ? `/empresa/clientes/${pg.clientId}` : null };
    },
  },
  pago_mover: {
    def: def("pago_mover", "Pasa un pago a otra fase (faseId), a otro proyecto (proyectoId) o lo deja aparte (aparte=true). Su factura se ajusta sola.", P({ pagoId: STR, faseId: STR, proyectoId: STR, aparte: BOOL }), ["pagoId"]),
    async preparar(u, a) {
      const pg = await prisma.payment.findFirst({ where: { id: s(a, "pagoId"), userId: u.id }, select: { id: true, amount: true, paidAt: true, clientId: true, client: { select: { name: true, company: true } } } });
      if (!pg) return { error: "No encontré ese pago." };
      const fase = s(a, "faseId") ? await faseDe(u, s(a, "faseId")) : null;
      const pr = !fase && s(a, "proyectoId") ? await proyectoDe(u, s(a, "proyectoId")) : null;
      if (!fase && !pr && a.aparte !== true) return { error: "Dime a qué fase o proyecto va, o aparte=true." };
      if ((s(a, "faseId") && !fase) || (s(a, "proyectoId") && !fase && !pr)) return { error: "No encontré esa fase o ese proyecto." };
      return { resumen: `Pago de ${nombreDe(pg.client)} · ${usd(Number(pg.amount))} del ${fechaCorta(pg.paidAt)} → ${fase ? `fase «${fase.name}» (${fase.project.name})` : pr ? `proyecto ${pr.name}` : "aparte"}`, evalua: { monto: 0 }, payload: { pagoId: pg.id, faseId: fase?.id ?? null, proyectoId: fase?.projectId ?? pr?.id ?? null } };
    },
    async ejecutar(u, p) {
      const pg = await prisma.payment.findFirstOrThrow({ where: { id: String(p.pagoId), userId: u.id } });
      const { facturaParaPago } = await import("@/lib/motor/pagos");
      const viejo = pg.documentId;
      await prisma.payment.update({ where: { id: pg.id }, data: { documentId: null } });
      let viejaPasos: Paso[] = [];
      if (viejo) {
        const d = await prisma.document.findUnique({ where: { id: viejo }, select: { content: true, _count: { select: { payments: true } } } });
        if (d && nacioPorPago(d.content) && d._count.payments === 0) viejaPasos = await borrarFacturaConPasos(u.id, viejo);
        else await recalcularFactura(viejo);
      }
      const f = await facturaParaPago(u, { clientId: pg.clientId!, projectId: (p.proyectoId as string) || null, phaseId: (p.faseId as string) || null, monto: Number(pg.amount), fecha: pg.paidAt.toISOString().slice(0, 10) });
      await prisma.payment.update({ where: { id: pg.id }, data: { documentId: f.id, phaseId: (p.faseId as string) || null, projectId: (p.proyectoId as string) || null } });
      await recalcularFactura(f.id);
      // Se deshace al revés: se recrea la factura vieja (si se borró), se devuelve el pago, se borra la nueva
      // (si nació aquí) y se recalcula la vieja.
      const pasos: Paso[] = [
        ...(viejo ? [{ t: "recalc" as const, id: viejo }] : []),
        f.creada ? { t: "crear", m: "document", id: f.id } : { t: "recalc", id: f.id },
        { t: "editar", m: "payment", id: pg.id, antes: { documentId: viejo, phaseId: pg.phaseId, projectId: pg.projectId } },
        ...viejaPasos,
      ];
      return { pasos, resultType: "pago", resultId: pg.id, href: `/empresa/facturas/${f.id}`, datos: { facturaId: f.id, facturaNueva: f.creada } };
    },
  },
  pago_borrar: {
    def: def("pago_borrar", "Borra un pago registrado por error. Siempre pide confirmación. Si su factura nació solo por ese pago, se borra también.", P({ pagoId: STR }), ["pagoId"]),
    async preparar(u, a) {
      const pg = await prisma.payment.findFirst({ where: { id: s(a, "pagoId"), userId: u.id }, select: { id: true, amount: true, paidAt: true, client: { select: { name: true, company: true } }, document: { select: { number: true } } } });
      if (!pg) return { error: "No encontré ese pago." };
      return { resumen: `Borrar el pago de ${nombreDe(pg.client)} · ${usd(Number(pg.amount))} del ${fechaCorta(pg.paidAt)}${pg.document ? ` (factura ${pg.document.number})` : ""}`, evalua: { destruye: true }, payload: { pagoId: pg.id } };
    },
    async ejecutar(u, p) {
      const pg = await prisma.payment.findFirstOrThrow({ where: { id: String(p.pagoId), userId: u.id } });
      const fila = filaParaGuardar(pg as unknown as Args);
      await prisma.payment.delete({ where: { id: pg.id } });
      let facturaPasos: Paso[] = [];
      if (pg.documentId) {
        const d = await prisma.document.findUnique({ where: { id: pg.documentId }, select: { content: true, _count: { select: { payments: true } } } });
        if (d && nacioPorPago(d.content) && d._count.payments === 0) facturaPasos = await borrarFacturaConPasos(u.id, pg.documentId);
        else await recalcularFactura(pg.documentId);
      }
      if (pg.clientId) await registrarEvento({ userId: u.id, clientId: pg.clientId, entityType: "pago", kind: "pago_deshecho", title: "Pago registrado por error, borrado", visibility: "interno", actorType: "pime" });
      // Al deshacer: factura (si se borró), luego el pago, luego recalcular.
      return { pasos: [...(pg.documentId ? [{ t: "recalc" as const, id: pg.documentId }] : []), { t: "borrar", m: "payment", fila }, ...facturaPasos], resultType: "pago", resultId: pg.id, href: pg.clientId ? `/empresa/clientes/${pg.clientId}` : null };
    },
  },
  facturar_pagos: {
    def: def("facturar_pagos", "Emite la factura de pagos ya registrados que no tienen factura (pagos viejos). Usa ver_pagos para los pagoIds.", P({ pagoIds: { type: "array", items: STR } }), ["pagoIds"]),
    async preparar(u, a) {
      const ids = Array.isArray(a.pagoIds) ? (a.pagoIds as unknown[]).map(String) : [];
      const pagos = await prisma.payment.findMany({ where: { id: { in: ids }, userId: u.id, documentId: null, status: "confirmado" }, select: { id: true, amount: true } });
      if (!pagos.length) return { error: "Esos pagos ya tienen factura o no existen." };
      const total = pagos.reduce((x, p) => x + Number(p.amount), 0);
      return { resumen: `Facturar ${pagos.length} ${pagos.length === 1 ? "pago" : "pagos"} sin factura · ${usd(total)}`, evalua: { monto: total, registros: pagos.length }, payload: { pagoIds: pagos.map((p) => p.id) } };
    },
    async ejecutar(u, p) {
      const r = await facturarPagosSinFactura(u, p.pagoIds as string[]);
      const pasos: Paso[] = [];
      for (const x of r) { if (x.creada && !pasos.some((y) => y.t === "crear" && y.id === x.facturaId)) pasos.push({ t: "crear", m: "document", id: x.facturaId }); }
      for (const x of r) pasos.push({ t: "editar", m: "payment", id: x.pagoId, antes: { documentId: null } });
      return { pasos, resultType: "factura", resultId: r[0]?.facturaId ?? "", href: r[0] ? `/empresa/facturas/${r[0].facturaId}` : null, datos: { facturas: [...new Set(r.map((x) => x.facturaId))] } };
    },
  },

  // Facturas
  factura_crear: {
    def: def("factura_crear", "Crea una factura por un concepto y monto. Con proyectoId queda en ese proyecto; sin él, aparte. emitir=true (por defecto) la deja emitida en la cuenta del cliente; emitir=false la deja en borrador. No la envía a nadie. conItbms solo si lleva ITBMS encima.", P({ clienteId: STR, concepto: STR, monto: NUM, proyectoId: STR, emitir: BOOL, conItbms: BOOL }), ["clienteId", "concepto", "monto"]),
    async preparar(u, a) {
      const c = await clienteDe(u, s(a, "clienteId"));
      if (!c) return { error: "No encontré ese cliente." };
      const monto = num(a, "monto");
      if (!monto || monto <= 0 || !s(a, "concepto")) return { error: "Falta el concepto o el monto." };
      const pr = s(a, "proyectoId") ? await proyectoDe(u, s(a, "proyectoId")) : null;
      if (s(a, "proyectoId") && !pr) return { error: "No encontré ese proyecto." };
      const emitir = a.emitir !== false;
      return { resumen: `Factura ${emitir ? "emitida" : "en borrador"} · ${nombreDe(c)} · ${s(a, "concepto")} · ${usd(monto)}${a.conItbms === true ? " + ITBMS" : ""} · ${pr ? `proyecto ${pr.name}` : "aparte"}`, evalua: { monto }, payload: { clienteId: c.id, concepto: s(a, "concepto"), monto, proyectoId: pr?.id ?? null, emitir, conItbms: a.conItbms === true } };
    },
    async ejecutar(u, p) {
      const r = await crearCobro(u, { tipo: "monto", clientId: String(p.clienteId), projectId: (p.proyectoId as string) || null, concepto: String(p.concepto), monto: Number(p.monto), sinImpuesto: p.conItbms !== true, emitida: p.emitir ? {} : undefined });
      return { pasos: [{ t: "crear", m: "document", id: r.id }], resultType: "factura", resultId: r.id, href: `/empresa/facturas/${r.id}`, datos: { facturaId: r.id, numero: r.number } };
    },
  },
  factura_emitir: {
    def: def("factura_emitir", "Emite una factura en borrador: queda en la cuenta del cliente para descargar. No se envía nada.", P({ facturaId: STR }), ["facturaId"]),
    async preparar(u, a) {
      const f = await facturaDe(u, s(a, "facturaId"));
      if (!f) return { error: "No encontré esa factura." };
      if (f.status !== "DRAFT") return { error: `La factura ${f.number} ya está emitida.` };
      return { resumen: `Emitir la factura ${f.number} · ${nombreDe(f.client)} · ${usd(Number(f.total ?? 0))}`, evalua: { monto: Number(f.total ?? 0) }, payload: { facturaId: f.id } };
    },
    async ejecutar(u, p) {
      const f = await prisma.document.findFirstOrThrow({ where: { id: String(p.facturaId), userId: u.id }, select: { id: true, status: true, amountPaid: true } });
      await prisma.document.update({ where: { id: f.id }, data: { status: "SENT" } });
      await recalcularFactura(f.id);
      return { pasos: [{ t: "editar", m: "document", id: f.id, antes: { status: f.status, amountPaid: f.amountPaid === null ? null : String(f.amountPaid) } }], resultType: "factura", resultId: f.id, href: `/empresa/facturas/${f.id}` };
    },
  },
  factura_editar: {
    def: def("factura_editar", "Cambia una factura: concepto, monto o vencimiento (YYYY-MM-DD). Si ya está emitida, pide confirmación.", P({ facturaId: STR, concepto: STR, monto: NUM, vence: STR }), ["facturaId"]),
    async preparar(u, a) {
      const f = await facturaDe(u, s(a, "facturaId"));
      if (!f) return { error: "No encontré esa factura." };
      if (f.status === "CANCELLED") return { error: "Esa factura está anulada." };
      const monto = num(a, "monto");
      if (s(a, "vence") && !esFecha(s(a, "vence"))) return { error: "La fecha va como YYYY-MM-DD." };
      if (!s(a, "concepto") && monto === null && !s(a, "vence")) return { error: "No me dijiste qué cambiar." };
      return { resumen: `Factura ${f.number} (${nombreDe(f.client)}) · ${partes([["concepto →", s(a, "concepto")], ["monto", monto !== null ? `${usd(Number(f.total ?? 0))} → ${usd(monto)}` : null], ["vence →", s(a, "vence") ? fechaCorta(s(a, "vence")) : null]])}`, evalua: { monto: monto !== null ? monto - Number(f.total ?? 0) : 0, facturaEmitida: f.status !== "DRAFT" }, payload: { facturaId: f.id, concepto: s(a, "concepto") || null, monto, vence: s(a, "vence") || null } };
    },
    async ejecutar(u, p) {
      const f = await prisma.document.findFirstOrThrow({ where: { id: String(p.facturaId), userId: u.id } });
      const pasos: Paso[] = [{ t: "editar", m: "document", id: f.id, antes: antesDe(f as unknown as Args, ["title", "dueDate", "content"]) }];
      if (p.concepto || p.vence) {
        const content = (f.content ?? {}) as { lineItems?: { description?: string }[] } & Args;
        const lineas = [...(content.lineItems ?? [])];
        if (p.concepto && lineas[0]) lineas[0] = { ...lineas[0], description: String(p.concepto) };
        await prisma.document.update({ where: { id: f.id }, data: { ...(p.concepto ? { title: String(p.concepto), content: { ...content, lineItems: lineas } as object } : {}), ...(p.vence ? { dueDate: fechaUTC(String(p.vence)) } : {}) } });
      }
      if (p.monto !== null && p.monto !== undefined) pasos.push(await ajustarMontoFactura(f.id, Number(p.monto)));
      return { pasos, resultType: "factura", resultId: f.id, href: `/empresa/facturas/${f.id}` };
    },
  },
  factura_anular: {
    def: def("factura_anular", "Anula una factura. Siempre pide confirmación. Si tiene pagos, primero hay que moverlos o borrarlos.", P({ facturaId: STR }), ["facturaId"]),
    async preparar(u, a) {
      const f = await facturaDe(u, s(a, "facturaId"));
      if (!f) return { error: "No encontré esa factura." };
      if (f.status === "CANCELLED") return { error: "Ya está anulada." };
      const pagos = await prisma.payment.count({ where: { documentId: f.id, status: "confirmado" } });
      if (pagos) return { error: `La factura ${f.number} tiene ${pagos} ${pagos === 1 ? "pago" : "pagos"}. Muévelos (pago_mover) o bórralos antes de anularla.` };
      return { resumen: `Anular la factura ${f.number} · ${nombreDe(f.client)} · ${usd(Number(f.total ?? 0))}`, evalua: { destruye: true }, payload: { facturaId: f.id } };
    },
    async ejecutar(u, p) {
      const f = await prisma.document.findFirstOrThrow({ where: { id: String(p.facturaId), userId: u.id }, select: { id: true, status: true } });
      await prisma.document.update({ where: { id: f.id }, data: { status: "CANCELLED" } });
      return { pasos: [{ t: "editar", m: "document", id: f.id, antes: { status: f.status } }], resultType: "factura", resultId: f.id, href: `/empresa/facturas/${f.id}` };
    },
  },
  facturar_fase: {
    def: def("facturar_fase", "Emite la factura de una fase por su precio (emitir=false la deja en borrador). No se envía nada.", P({ faseId: STR, emitir: BOOL, conItbms: BOOL }), ["faseId"]),
    async preparar(u, a) {
      const f = await faseDe(u, s(a, "faseId"));
      if (!f) return { error: "No encontré esa fase." };
      if (f.invoice && f.invoice.status !== "CANCELLED") return { error: `La fase ya tiene la factura ${f.invoice.number}.` };
      if (!(Number(f.price) > 0)) return { error: "La fase no tiene precio." };
      return { resumen: `Factura ${a.emitir === false ? "en borrador" : "emitida"} de la fase «${f.name}» · ${f.project.name} · ${usd(Number(f.price))}`, evalua: { monto: Number(f.price) }, payload: { faseId: f.id, emitir: a.emitir !== false, conItbms: a.conItbms === true } };
    },
    async ejecutar(u, p) {
      const f = await prisma.projectPhase.findFirstOrThrow({ where: { id: String(p.faseId), project: { userId: u.id } }, select: { id: true, invoiceId: true, projectId: true } });
      const pasos: Paso[] = [];
      if (f.invoiceId) { pasos.push({ t: "editar", m: "projectPhase", id: f.id, antes: { invoiceId: f.invoiceId } }); await prisma.projectPhase.update({ where: { id: f.id }, data: { invoiceId: null } }); }
      const r = await crearCobro(u, { tipo: "fase", faseId: f.id, sinImpuesto: p.conItbms !== true, emitida: p.emitir ? {} : undefined });
      pasos.push({ t: "crear", m: "document", id: r.id });
      return { pasos, resultType: "factura", resultId: r.id, href: `/empresa/facturas/${r.id}`, datos: { facturaId: r.id, numero: r.number } };
    },
  },
  facturar_plan: {
    def: def("facturar_plan", "Emite la factura del plan de pagos de un proyecto, con sus cuotas (emitir=false la deja en borrador).", P({ proyectoId: STR, emitir: BOOL }), ["proyectoId"]),
    async preparar(u, a) {
      const pr = await proyectoDe(u, s(a, "proyectoId"));
      if (!pr || !isFinancingPlan(pr.financingPlan)) return { error: "Ese proyecto no tiene plan de pagos. Defínelo con plan_definir." };
      const ya = await prisma.document.count({ where: { projectId: pr.id, type: "FACTURA", status: { not: "CANCELLED" }, paymentSchedules: { some: {} } } });
      if (ya) return { error: "El plan de ese proyecto ya está facturado." };
      const plan = pr.financingPlan as FinancingPlan;
      return { resumen: `Factura ${a.emitir === false ? "en borrador" : "emitida"} del plan de ${pr.name} · ${usd(plan.total)} · ${plan.installments} cuotas${plan.downPayment ? ` + abono ${usd(plan.downPayment)}` : ""}`, evalua: { monto: plan.total, registros: plan.installments + 1 }, payload: { proyectoId: pr.id, emitir: a.emitir !== false } };
    },
    async ejecutar(u, p) {
      const r = await crearCobro(u, { tipo: "plan", projectId: String(p.proyectoId) });
      if (p.emitir) await prisma.document.update({ where: { id: r.id }, data: { status: "SENT" } });
      return { pasos: [{ t: "crear", m: "document", id: r.id }], resultType: "factura", resultId: r.id, href: `/empresa/facturas/${r.id}`, datos: { facturaId: r.id, numero: r.number } };
    },
  },

  // Plan de pagos
  plan_definir: {
    def: def("plan_definir", "Crea o cambia el plan de pagos de un proyecto (antes de facturarlo): total, abono inicial, número de cuotas, frecuencia (mensual, quincenal, semanal) y fecha de la primera cuota (YYYY-MM-DD). Si el plan ya está facturado, cambia las cuotas con cuota_editar.", P({ proyectoId: STR, total: NUM, abono: NUM, cuotas: NUM, frecuencia: { type: "string", enum: ["mensual", "quincenal", "semanal"] }, primeraFecha: STR }), ["proyectoId"]),
    async preparar(u, a) {
      const pr = await proyectoDe(u, s(a, "proyectoId"));
      if (!pr) return { error: "No encontré ese proyecto." };
      const facturado = await prisma.document.findFirst({ where: { projectId: pr.id, type: "FACTURA", status: { not: "CANCELLED" }, paymentSchedules: { some: {} } }, select: { number: true } });
      if (facturado) return { error: `El plan ya está facturado (${facturado.number}). Cambia sus cuotas con cuota_editar o cuota_agregar (usa ver_cuotas).` };
      const antes = isFinancingPlan(pr.financingPlan) ? (pr.financingPlan as FinancingPlan) : null;
      const FREC: Record<string, InstallmentFrequency> = { mensual: "MONTHLY", quincenal: "BIWEEKLY", semanal: "WEEKLY" };
      const plan: FinancingPlan = {
        total: num(a, "total") ?? antes?.total ?? 0,
        downPayment: num(a, "abono") ?? antes?.downPayment ?? 0,
        installments: Math.round(num(a, "cuotas") ?? antes?.installments ?? 0),
        frequency: FREC[s(a, "frecuencia")] ?? antes?.frequency ?? "MONTHLY",
        firstDueDate: s(a, "primeraFecha") || antes?.firstDueDate || hoyPanama(),
      };
      if (!(plan.total > 0) || plan.installments < 1 || plan.downPayment < 0 || plan.downPayment >= plan.total || !esFecha(plan.firstDueDate)) return { error: "El plan necesita total, número de cuotas (1 o más), abono menor que el total y fecha YYYY-MM-DD." };
      return { resumen: `Plan de ${pr.name} · ${usd(plan.total)} · ${plan.downPayment ? `abono ${usd(plan.downPayment)} + ` : ""}${plan.installments} cuotas ${s(a, "frecuencia") || { MONTHLY: "mensual", BIWEEKLY: "quincenal", WEEKLY: "semanal" }[plan.frequency]}es desde ${fechaCorta(plan.firstDueDate)}`, evalua: { monto: plan.total - (antes?.total ?? 0) }, payload: { proyectoId: pr.id, plan } };
    },
    async ejecutar(u, p) {
      const pr = await prisma.project.findFirstOrThrow({ where: { id: String(p.proyectoId), userId: u.id }, select: { id: true, financingPlan: true } });
      await prisma.project.update({ where: { id: pr.id }, data: { financingPlan: p.plan as object } });
      return { pasos: [{ t: "editar", m: "project", id: pr.id, antes: { financingPlan: pr.financingPlan ?? null } }], resultType: "proyecto", resultId: pr.id, href: `/empresa/proyectos/${pr.id}` };
    },
  },
  cuota_editar: {
    def: def("cuota_editar", "Cambia una cuota de un plan ya facturado: monto, fecha (YYYY-MM-DD) o descripción. Busca cuotaId con ver_cuotas.", P({ cuotaId: STR, monto: NUM, fecha: STR, descripcion: STR }), ["cuotaId"]),
    async preparar(u, a) {
      const q = await prisma.paymentSchedule.findFirst({ where: { id: s(a, "cuotaId"), userId: u.id }, include: { document: { select: { id: true, number: true, _count: { select: { payments: true } }, paymentSchedules: { where: { status: "PAID" }, select: { id: true } } } } } });
      if (!q) return { error: "No encontré esa cuota." };
      const monto = num(a, "monto");
      if (s(a, "fecha") && !esFecha(s(a, "fecha"))) return { error: "La fecha va como YYYY-MM-DD." };
      const data: Args = {};
      if (monto !== null && monto > 0) data.amount = monto;
      if (s(a, "fecha")) data.dueDate = `${s(a, "fecha")}T12:00:00.000Z`;
      if (s(a, "descripcion")) data.description = s(a, "descripcion");
      if (!Object.keys(data).length) return { error: "No me dijiste qué cambiar." };
      const conPagos = q.document._count.payments > 0 || q.document.paymentSchedules.length > 0;
      return { resumen: `Cuota «${q.description}» de ${q.document.number} · ${partes([["monto", monto !== null ? `${usd(Number(q.amount))} → ${usd(monto)}` : null], ["fecha →", s(a, "fecha") ? fechaCorta(s(a, "fecha")) : null], ["descripción →", data.description]])}`, evalua: { monto: monto !== null ? monto - Number(q.amount) : 0, planConPagos: conPagos }, payload: { cuotaId: q.id, data } };
    },
    async ejecutar(u, p) {
      const q = await prisma.paymentSchedule.findFirstOrThrow({ where: { id: String(p.cuotaId), userId: u.id } });
      const data = p.data as Args;
      await prisma.paymentSchedule.update({ where: { id: q.id }, data });
      return { pasos: [{ t: "editar", m: "paymentSchedule", id: q.id, antes: antesDe(q as unknown as Args, Object.keys(data)) }], resultType: "factura", resultId: q.documentId, href: `/empresa/facturas/${q.documentId}` };
    },
  },
  cuota_agregar: {
    def: def("cuota_agregar", "Agrega una cuota al plan de una factura: monto, fecha (YYYY-MM-DD) y descripción.", P({ facturaId: STR, monto: NUM, fecha: STR, descripcion: STR }), ["facturaId", "monto", "fecha"]),
    async preparar(u, a) {
      const f = await prisma.document.findFirst({ where: { id: s(a, "facturaId"), userId: u.id, type: "FACTURA" }, select: { id: true, number: true, _count: { select: { payments: true } }, paymentSchedules: { select: { status: true } } } });
      const monto = num(a, "monto");
      if (!f || !monto || monto <= 0 || !esFecha(s(a, "fecha"))) return { error: "Necesito la factura, el monto y la fecha (YYYY-MM-DD)." };
      const conPagos = f._count.payments > 0 || f.paymentSchedules.some((q) => q.status === "PAID");
      return { resumen: `Cuota nueva en ${f.number} · ${usd(monto)} · ${fechaCorta(s(a, "fecha"))}`, evalua: { monto, planConPagos: conPagos }, payload: { facturaId: f.id, monto, fecha: s(a, "fecha"), descripcion: s(a, "descripcion") || `Cuota ${f.paymentSchedules.length + 1}` } };
    },
    async ejecutar(u, p) {
      const q = await prisma.paymentSchedule.create({ data: { userId: u.id, documentId: String(p.facturaId), amount: Number(p.monto), dueDate: fechaUTC(String(p.fecha)), description: String(p.descripcion) } });
      return { pasos: [{ t: "crear", m: "paymentSchedule", id: q.id }], resultType: "factura", resultId: String(p.facturaId), href: `/empresa/facturas/${p.facturaId}` };
    },
  },
  cuota_borrar: {
    def: def("cuota_borrar", "Quita una cuota de un plan. Siempre pide confirmación.", P({ cuotaId: STR }), ["cuotaId"]),
    async preparar(u, a) {
      const q = await prisma.paymentSchedule.findFirst({ where: { id: s(a, "cuotaId"), userId: u.id }, include: { document: { select: { number: true } } } });
      if (!q) return { error: "No encontré esa cuota." };
      return { resumen: `Quitar la cuota «${q.description}» (${usd(Number(q.amount))}) de ${q.document.number}`, evalua: { destruye: true }, payload: { cuotaId: q.id } };
    },
    async ejecutar(u, p) {
      const q = await prisma.paymentSchedule.findFirstOrThrow({ where: { id: String(p.cuotaId), userId: u.id } });
      await prisma.task.updateMany({ where: { paymentScheduleId: q.id }, data: { paymentScheduleId: null } });
      await prisma.paymentSchedule.delete({ where: { id: q.id } });
      return { pasos: [{ t: "borrar", m: "paymentSchedule", fila: filaParaGuardar(q as unknown as Args) }], resultType: "factura", resultId: q.documentId, href: `/empresa/facturas/${q.documentId}` };
    },
  },

  // Tareas
  tarea_crear: {
    def: def("tarea_crear", "Crea una tarea, opcionalmente en un proyecto, con vencimiento (YYYY-MM-DD) y prioridad (baja, media, alta).", P({ titulo: STR, proyectoId: STR, vence: STR, detalle: STR, prioridad: { type: "string", enum: ["baja", "media", "alta"] } }), ["titulo"]),
    async preparar(u, a) {
      if (!s(a, "titulo")) return { error: "Falta el título de la tarea." };
      const pr = s(a, "proyectoId") ? await proyectoDe(u, s(a, "proyectoId")) : null;
      const vence = esFecha(s(a, "vence")) ? s(a, "vence") : null;
      return { resumen: `Tarea · ${s(a, "titulo")}${pr ? ` · ${pr.name}` : ""}${vence ? ` · vence ${fechaCorta(vence)}` : ""}`, evalua: {}, payload: { titulo: s(a, "titulo"), proyectoId: pr?.id ?? null, vence, detalle: s(a, "detalle") || null, prioridad: { baja: "LOW", media: "MEDIUM", alta: "HIGH" }[s(a, "prioridad")] ?? "MEDIUM" } };
    },
    async ejecutar(u, p) {
      const t = await prisma.task.create({ data: { userId: u.id, title: String(p.titulo).slice(0, 300), description: (p.detalle as string) || null, projectId: (p.proyectoId as string) || null, dueDate: p.vence ? new Date(`${p.vence}T17:00:00Z`) : null, allDay: !!p.vence, priority: p.prioridad as "LOW" | "MEDIUM" | "HIGH" } });
      return { pasos: [{ t: "crear", m: "task", id: t.id }], resultType: "tarea", resultId: t.id, href: p.proyectoId ? `/empresa/proyectos/${p.proyectoId}?tab=tareas` : "/empresa/tareas", datos: { tareaId: t.id } };
    },
  },
  tarea_editar: {
    def: def("tarea_editar", "Cambia una tarea: título, vencimiento (YYYY-MM-DD), detalle, proyecto o prioridad. Busca tareaId con ver_tareas.", P({ tareaId: STR, titulo: STR, vence: STR, detalle: STR, proyectoId: STR, prioridad: { type: "string", enum: ["baja", "media", "alta"] } }), ["tareaId"]),
    async preparar(u, a) {
      const t = await prisma.task.findFirst({ where: { id: s(a, "tareaId"), userId: u.id }, select: { id: true, title: true } });
      if (!t) return { error: "No encontré esa tarea." };
      const data: Args = {};
      if (s(a, "titulo")) data.title = s(a, "titulo");
      if (s(a, "vence")) { if (!esFecha(s(a, "vence"))) return { error: "La fecha va como YYYY-MM-DD." }; data.dueDate = `${s(a, "vence")}T17:00:00.000Z`; data.allDay = true; }
      if (tiene(a, "detalle")) data.description = s(a, "detalle");
      if (s(a, "proyectoId")) { if (!(await proyectoDe(u, s(a, "proyectoId")))) return { error: "No encontré ese proyecto." }; data.projectId = s(a, "proyectoId"); }
      const pri = ({ baja: "LOW", media: "MEDIUM", alta: "HIGH" } as Record<string, string>)[s(a, "prioridad")];
      if (pri) data.priority = pri;
      if (!Object.keys(data).length) return { error: "No me dijiste qué cambiar." };
      return { resumen: `Tarea «${t.title}» · ${partes([["título →", data.title], ["vence →", s(a, "vence") ? fechaCorta(s(a, "vence")) : null], ["prioridad →", s(a, "prioridad")], ["detalle →", data.description], ["proyecto", data.projectId ? "cambiado" : null]])}`, evalua: {}, payload: { tareaId: t.id, data } };
    },
    async ejecutar(u, p) {
      const t = await prisma.task.findFirstOrThrow({ where: { id: String(p.tareaId), userId: u.id } });
      const data = p.data as Args;
      await prisma.task.update({ where: { id: t.id }, data });
      return { pasos: [{ t: "editar", m: "task", id: t.id, antes: antesDe(t as unknown as Args, Object.keys(data)) }], resultType: "tarea", resultId: t.id, href: t.projectId ? `/empresa/proyectos/${t.projectId}?tab=tareas` : "/empresa/tareas" };
    },
  },
  tarea_completar: {
    def: def("tarea_completar", "Marca una tarea como hecha (hecha=false la reabre).", P({ tareaId: STR, hecha: BOOL }), ["tareaId"]),
    async preparar(u, a) {
      const t = await prisma.task.findFirst({ where: { id: s(a, "tareaId"), userId: u.id }, select: { id: true, title: true } });
      if (!t) return { error: "No encontré esa tarea." };
      const hecha = a.hecha !== false;
      return { resumen: `${hecha ? "Hecha" : "Reabierta"} · ${t.title}`, evalua: {}, payload: { tareaId: t.id, hecha } };
    },
    async ejecutar(u, p) {
      const t = await prisma.task.findFirstOrThrow({ where: { id: String(p.tareaId), userId: u.id } });
      await prisma.task.update({ where: { id: t.id }, data: { completed: !!p.hecha, completedAt: p.hecha ? new Date() : null } });
      return { pasos: [{ t: "editar", m: "task", id: t.id, antes: antesDe(t as unknown as Args, ["completed", "completedAt"]) }], resultType: "tarea", resultId: t.id, href: t.projectId ? `/empresa/proyectos/${t.projectId}?tab=tareas` : "/empresa/tareas" };
    },
  },
  tarea_borrar: {
    def: def("tarea_borrar", "Borra una tarea. Siempre pide confirmación.", P({ tareaId: STR }), ["tareaId"]),
    async preparar(u, a) {
      const t = await prisma.task.findFirst({ where: { id: s(a, "tareaId"), userId: u.id }, select: { id: true, title: true, _count: { select: { subtasks: true } } } });
      if (!t) return { error: "No encontré esa tarea." };
      if (t._count.subtasks) return { error: "Esa tarea tiene subtareas; bórrala desde Tareas." };
      return { resumen: `Borrar la tarea «${t.title}»`, evalua: { destruye: true }, payload: { tareaId: t.id } };
    },
    async ejecutar(u, p) {
      const t = await prisma.task.findFirstOrThrow({ where: { id: String(p.tareaId), userId: u.id } });
      await prisma.task.delete({ where: { id: t.id } });
      return { pasos: [{ t: "borrar", m: "task", fila: filaParaGuardar(t as unknown as Args) }], resultType: "tarea", resultId: t.id, href: "/empresa/tareas" };
    },
  },

  // Tickets
  ticket_crear: {
    def: def("ticket_crear", "Abre un ticket de un cliente. tipo: soporte, cambio, nuevo o incidente (empresa interna: bug, mejora, tarea, incidente). prioridad: baja, normal, alta, urgente. No se avisa al cliente por correo.", P({ clienteId: STR, titulo: STR, detalle: STR, tipo: STR, prioridad: { type: "string", enum: [...TICKET_PRIORIDADES] }, proyectoId: STR }), ["clienteId", "titulo"]),
    async preparar(u, a) {
      const c = await clienteDe(u, s(a, "clienteId"));
      if (!c || !s(a, "titulo")) return { error: "Necesito el cliente y el título del ticket." };
      const tipos = c.internal ? TICKET_TIPOS_INTERNOS : TICKET_TIPOS;
      const tipo = (tipos as readonly string[]).includes(s(a, "tipo")) ? s(a, "tipo") : tipos[0];
      const prioridad = esUno(TICKET_PRIORIDADES, s(a, "prioridad")) ? s(a, "prioridad") : "normal";
      const pr = s(a, "proyectoId") ? await prisma.project.findFirst({ where: { id: s(a, "proyectoId"), userId: u.id, OR: [{ clientId: c.id }, { clients: { some: { clientId: c.id } } }] }, select: { id: true, name: true } }) : null;
      return { resumen: `Ticket · ${nombreDe(c)} · ${s(a, "titulo")} · ${tipo} · ${prioridad}${pr ? ` · ${pr.name}` : ""}`, evalua: {}, payload: { clienteId: c.id, titulo: s(a, "titulo").slice(0, 160), detalle: s(a, "detalle") || null, tipo, prioridad, proyectoId: pr?.id ?? null, interno: c.internal } };
    },
    async ejecutar(u, p) {
      const t = await prisma.ticket.create({ data: { userId: u.id, clientId: String(p.clienteId), projectId: (p.proyectoId as string) || null, kind: String(p.tipo), priority: String(p.prioridad), title: String(p.titulo), source: "empresa", openedByEmpresaUserId: u.id, status: "en_revision", lastPimeActivityAt: new Date(), messages: p.detalle ? { create: { authorType: "pime", empresaUserId: u.id, body: String(p.detalle), internal: true } } : undefined } });
      await registrarEvento({ userId: u.id, clientId: String(p.clienteId), projectId: (p.proyectoId as string) || null, entityType: "ticket", entityId: t.id, kind: "ticket_abierto", title: `Abrimos el ticket ${t.number}: ${p.titulo}`, visibility: p.interno ? "interno" : "cliente", actorEmpresaUserId: u.id });
      return { pasos: [{ t: "crear", m: "ticket", id: t.id }], resultType: "ticket", resultId: t.id, href: `/empresa/tickets/${t.id}`, datos: { ticketId: t.id, numero: t.number } };
    },
  },
  ticket_cambiar: {
    def: def("ticket_cambiar", "Cambia el estado (abierto, en_revision, esperando_cliente, en_progreso, resuelto, cerrado) o la prioridad (baja, normal, alta, urgente) de un ticket. No avisa al cliente.", P({ ticketId: STR, estado: { type: "string", enum: [...TICKET_ESTADOS] }, prioridad: { type: "string", enum: [...TICKET_PRIORIDADES] } }), ["ticketId"]),
    async preparar(u, a) {
      const t = await prisma.ticket.findFirst({ where: { id: s(a, "ticketId"), userId: u.id }, select: { id: true, number: true, title: true } });
      if (!t) return { error: "No encontré ese ticket. Búscalo con ver_tickets." };
      const estado = esUno(TICKET_ESTADOS, s(a, "estado")) ? s(a, "estado") : null;
      const prioridad = esUno(TICKET_PRIORIDADES, s(a, "prioridad")) ? s(a, "prioridad") : null;
      if (!estado && !prioridad) return { error: "Dime el estado o la prioridad." };
      return { resumen: `${t.number} · ${t.title} · ${partes([["estado →", estado?.replace("_", " ")], ["prioridad →", prioridad]])}`, evalua: {}, payload: { ticketId: t.id, estado, prioridad } };
    },
    async ejecutar(u, p) {
      const t = await prisma.ticket.findFirstOrThrow({ where: { id: String(p.ticketId), userId: u.id } });
      const ahora = new Date();
      await prisma.ticket.update({ where: { id: t.id }, data: { ...(p.estado ? { status: String(p.estado), resolvedAt: p.estado === "resuelto" ? ahora : t.resolvedAt, closedAt: p.estado === "cerrado" ? ahora : t.closedAt } : {}), ...(p.prioridad ? { priority: String(p.prioridad) } : {}) } });
      return { pasos: [{ t: "editar", m: "ticket", id: t.id, antes: antesDe(t as unknown as Args, ["status", "priority", "resolvedAt", "closedAt"]) }], resultType: "ticket", resultId: t.id, href: `/empresa/tickets/${t.id}` };
    },
  },
  ticket_nota: {
    def: def("ticket_nota", "Deja una respuesta interna en un ticket (solo la ve el equipo).", P({ ticketId: STR, texto: STR }), ["ticketId", "texto"]),
    async preparar(u, a) {
      const t = await prisma.ticket.findFirst({ where: { id: s(a, "ticketId"), userId: u.id }, select: { id: true, number: true } });
      if (!t || !s(a, "texto")) return { error: "Necesito el ticket y el texto." };
      return { resumen: `Nota interna en ${t.number}: ${s(a, "texto").slice(0, 120)}`, evalua: {}, payload: { ticketId: t.id, texto: s(a, "texto").slice(0, 8000) } };
    },
    async ejecutar(u, p) {
      const m = await prisma.ticketMessage.create({ data: { ticketId: String(p.ticketId), authorType: "pime", empresaUserId: u.id, body: String(p.texto), internal: true } });
      return { pasos: [{ t: "crear", m: "ticketMessage", id: m.id }], resultType: "ticket", resultId: String(p.ticketId), href: `/empresa/tickets/${p.ticketId}` };
    },
  },

  // Gastos
  gasto_crear: {
    def: def("gasto_crear", "Registra un gasto: título, monto, categoría (HOSTING, SAAS, SALARIOS, SERVICIOS, MARKETING, IMPUESTOS, COMISIONES, SOFTWARE, OTRO), fecha (YYYY-MM-DD), pagado (true si ya se pagó), proyectoId, proveedor y si es recurrente.", P({ titulo: STR, monto: NUM, categoria: { type: "string", enum: ["HOSTING", "SAAS", "SALARIOS", "SERVICIOS", "MARKETING", "IMPUESTOS", "COMISIONES", "SOFTWARE", "OTRO"] }, fecha: STR, pagado: BOOL, proyectoId: STR, proveedor: STR, recurrente: BOOL }), ["titulo", "monto"]),
    async preparar(u, a) {
      const monto = num(a, "monto");
      if (!s(a, "titulo") || !monto || monto <= 0) return { error: "Falta el título o el monto del gasto." };
      const pr = s(a, "proyectoId") ? await proyectoDe(u, s(a, "proyectoId")) : null;
      const fecha = esFecha(s(a, "fecha")) ? s(a, "fecha") : hoyPanama();
      return { resumen: `Gasto · ${s(a, "titulo")} · ${usd(monto)} · ${a.pagado === true ? "pagado" : "por pagar"} · ${fechaCorta(fecha)}${pr ? ` · ${pr.name}` : ""}`, evalua: { monto }, payload: { titulo: s(a, "titulo"), monto, categoria: s(a, "categoria") || "OTRO", fecha, pagado: a.pagado === true, proyectoId: pr?.id ?? null, proveedor: s(a, "proveedor") || null, recurrente: a.recurrente === true } };
    },
    async ejecutar(u, p) {
      const g = await prisma.expense.create({ data: { userId: u.id, title: String(p.titulo).slice(0, 200), amount: Number(p.monto), category: p.categoria as "OTRO", dueDate: fechaUTC(String(p.fecha)), status: p.pagado ? "PAID" : "PENDING", paidAt: p.pagado ? fechaUTC(String(p.fecha)) : null, projectId: (p.proyectoId as string) || null, vendor: (p.proveedor as string) || null, isRecurring: !!p.recurrente } });
      return { pasos: [{ t: "crear", m: "expense", id: g.id }], resultType: "gasto", resultId: g.id, href: "/empresa/gastos", datos: { gastoId: g.id } };
    },
  },
  gasto_editar: {
    def: def("gasto_editar", "Cambia un gasto: título, monto, categoría, fecha, pagado, proveedor o proyecto (proyectoId; para ligarlo a un proyecto). Busca gastoId con ver_gastos.", P({ gastoId: STR, titulo: STR, monto: NUM, categoria: STR, fecha: STR, pagado: BOOL, proveedor: STR, proyectoId: STR }), ["gastoId"]),
    async preparar(u, a) {
      const g = await prisma.expense.findFirst({ where: { id: s(a, "gastoId"), userId: u.id }, select: { id: true, title: true, amount: true } });
      if (!g) return { error: "No encontré ese gasto." };
      const data: Args = {};
      if (s(a, "titulo")) data.title = s(a, "titulo");
      const monto = num(a, "monto");
      if (monto !== null && monto > 0) data.amount = monto;
      if (["HOSTING", "SAAS", "SALARIOS", "SERVICIOS", "MARKETING", "IMPUESTOS", "COMISIONES", "SOFTWARE", "OTRO"].includes(s(a, "categoria"))) data.category = s(a, "categoria");
      if (s(a, "fecha")) { if (!esFecha(s(a, "fecha"))) return { error: "La fecha va como YYYY-MM-DD." }; data.dueDate = `${s(a, "fecha")}T12:00:00.000Z`; }
      if (typeof a.pagado === "boolean") { data.status = a.pagado ? "PAID" : "PENDING"; data.paidAt = a.pagado ? new Date().toISOString() : null; }
      if (tiene(a, "proveedor")) data.vendor = s(a, "proveedor");
      if (s(a, "proyectoId")) { const pr = await proyectoDe(u, s(a, "proyectoId")); if (!pr) return { error: "No encontré ese proyecto." }; data.projectId = pr.id; }
      if (!Object.keys(data).length) return { error: "No me dijiste qué cambiar." };
      return { resumen: `Gasto «${g.title}» · ${partes([["título →", data.title], ["monto", monto !== null ? `${usd(Number(g.amount))} → ${usd(monto)}` : null], ["categoría →", data.category], ["fecha →", s(a, "fecha") ? fechaCorta(s(a, "fecha")) : null], ["estado →", data.status === "PAID" ? "pagado" : data.status ? "por pagar" : null], ["proveedor →", data.vendor], ["proyecto", data.projectId ? "ligado" : null]])}`, evalua: { monto: monto !== null ? monto - Number(g.amount) : 0 }, payload: { gastoId: g.id, data } };
    },
    async ejecutar(u, p) {
      const g = await prisma.expense.findFirstOrThrow({ where: { id: String(p.gastoId), userId: u.id } });
      const data = p.data as Args;
      await prisma.expense.update({ where: { id: g.id }, data });
      return { pasos: [{ t: "editar", m: "expense", id: g.id, antes: antesDe(g as unknown as Args, Object.keys(data)) }], resultType: "gasto", resultId: g.id, href: "/empresa/gastos" };
    },
  },
  gasto_borrar: {
    def: def("gasto_borrar", "Borra un gasto. Siempre pide confirmación.", P({ gastoId: STR }), ["gastoId"]),
    async preparar(u, a) {
      const g = await prisma.expense.findFirst({ where: { id: s(a, "gastoId"), userId: u.id }, select: { id: true, title: true, amount: true } });
      if (!g) return { error: "No encontré ese gasto." };
      return { resumen: `Borrar el gasto «${g.title}» (${usd(Number(g.amount))})`, evalua: { destruye: true }, payload: { gastoId: g.id } };
    },
    async ejecutar(u, p) {
      const g = await prisma.expense.findFirstOrThrow({ where: { id: String(p.gastoId), userId: u.id } });
      await prisma.expense.delete({ where: { id: g.id } });
      return { pasos: [{ t: "borrar", m: "expense", fila: filaParaGuardar(g as unknown as Args) }], resultType: "gasto", resultId: g.id, href: "/empresa/gastos" };
    },
  },

  // Reuniones, plataformas, notas y citas
  reunion_asignar: {
    def: def("reunion_asignar", "Asigna (o cambia) el proyecto de una reunión grabada. Busca reunionId con ver_reuniones.", P({ reunionId: STR, proyectoId: STR }), ["reunionId", "proyectoId"]),
    async preparar(u, a) {
      const [m, pr] = await Promise.all([prisma.meeting.findFirst({ where: { id: s(a, "reunionId"), userId: u.id }, select: { id: true, title: true } }), proyectoDe(u, s(a, "proyectoId"))]);
      if (!m || !pr) return { error: "No encontré esa reunión o ese proyecto." };
      return { resumen: `Reunión «${m.title}» → proyecto ${pr.name}`, evalua: {}, payload: { reunionId: m.id, proyectoId: pr.id, clienteId: clienteDelProyecto(pr)?.id ?? null } };
    },
    async ejecutar(u, p) {
      const m = await prisma.meeting.findFirstOrThrow({ where: { id: String(p.reunionId), userId: u.id }, select: { id: true, projectId: true, clientId: true } });
      await prisma.meeting.update({ where: { id: m.id }, data: { projectId: String(p.proyectoId), ...(m.clientId || !p.clienteId ? {} : { clientId: String(p.clienteId) }) } });
      return { pasos: [{ t: "editar", m: "meeting", id: m.id, antes: { projectId: m.projectId, clientId: m.clientId } }], resultType: "reunion", resultId: m.id, href: `/empresa/reuniones/${m.id}` };
    },
  },
  plataforma_asignar: {
    def: def("plataforma_asignar", "Asigna el cliente y/o el proyecto de una plataforma (Platforms). Busca plataformaId con ver_plataformas.", P({ plataformaId: STR, clienteId: STR, proyectoId: STR }), ["plataformaId"]),
    async preparar(u, a) {
      const pl = await prisma.platform.findFirst({ where: { id: s(a, "plataformaId"), userId: u.id }, select: { id: true, name: true } });
      if (!pl) return { error: "No encontré esa plataforma." };
      const pr = s(a, "proyectoId") ? await proyectoDe(u, s(a, "proyectoId")) : null;
      const c = s(a, "clienteId") ? await clienteDe(u, s(a, "clienteId")) : pr ? clienteDelProyecto(pr) : null;
      if (!pr && !c) return { error: "Dime el cliente o el proyecto." };
      return { resumen: `Plataforma «${pl.name}» → ${[c ? nombreDe(c) : null, pr ? `proyecto ${pr.name}` : null].filter(Boolean).join(" · ")}`, evalua: {}, payload: { plataformaId: pl.id, clienteId: c?.id ?? null, proyectoId: pr?.id ?? null } };
    },
    async ejecutar(u, p) {
      const pl = await prisma.platform.findFirstOrThrow({ where: { id: String(p.plataformaId), userId: u.id }, select: { id: true, clientId: true, projectId: true } });
      await prisma.platform.update({ where: { id: pl.id }, data: { ...(p.clienteId ? { clientId: String(p.clienteId) } : {}), ...(p.proyectoId ? { projectId: String(p.proyectoId) } : {}) } });
      return { pasos: [{ t: "editar", m: "platform", id: pl.id, antes: { clientId: pl.clientId, projectId: pl.projectId } }], resultType: "plataforma", resultId: pl.id, href: "/empresa/platforms" };
    },
  },
  nota_crear: {
    def: def("nota_crear", "Deja una nota interna en la línea de tiempo de un proyecto o de un cliente (no la ve el cliente).", P({ proyectoId: STR, clienteId: STR, texto: STR }), ["texto"]),
    async preparar(u, a) {
      if (!s(a, "texto")) return { error: "Falta el texto de la nota." };
      const pr = s(a, "proyectoId") ? await proyectoDe(u, s(a, "proyectoId")) : null;
      const c = s(a, "clienteId") ? await clienteDe(u, s(a, "clienteId")) : pr ? clienteDelProyecto(pr) : null;
      if (!c) return { error: "Necesito el proyecto (con cliente) o el cliente de la nota." };
      return { resumen: `Nota interna${pr ? ` en ${pr.name}` : ` de ${nombreDe(c)}`}: ${s(a, "texto").slice(0, 120)}`, evalua: {}, payload: { proyectoId: pr?.id ?? null, clienteId: c.id, texto: s(a, "texto") } };
    },
    async ejecutar(u, p) {
      const e = await prisma.activityEvent.create({ data: { userId: u.id, clientId: String(p.clienteId), projectId: (p.proyectoId as string) || null, entityType: "nota", kind: "nota_interna", title: String(p.texto).slice(0, 500), visibility: "interno", actorType: "pime", actorEmpresaUserId: u.id } });
      return { pasos: [{ t: "crear", m: "activityEvent", id: e.id }], resultType: "nota", resultId: e.id, href: p.proyectoId ? `/empresa/proyectos/${p.proyectoId}` : `/empresa/clientes/${p.clienteId}` };
    },
  },
  cita_crear: {
    def: def("cita_crear", "Agenda una cita: nombre de la persona, correo y teléfono si los hay, inicio (YYYY-MM-DDTHH:MM, hora de Panamá), duración en minutos y notas. No le manda invitación a nadie.", P({ nombre: STR, correo: STR, telefono: STR, inicio: STR, minutos: NUM, notas: STR }), ["nombre", "inicio"]),
    async preparar(u, a) {
      const m = s(a, "inicio").match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);
      if (!s(a, "nombre") || !m) return { error: "Necesito el nombre y el inicio (YYYY-MM-DDTHH:MM)." };
      const tipo = await prisma.bookingEventType.findFirst({ where: { userId: u.id, active: true }, orderBy: { createdAt: "asc" }, select: { id: true, durationMin: true } });
      if (!tipo) return { error: "No hay ningún tipo de cita configurado en Citas." };
      const minutos = Math.round(num(a, "minutos") ?? tipo.durationMin);
      const inicio = new Date(`${m[1]}T${m[2]}:${m[3]}:00-05:00`);
      const choca = await prisma.booking.findFirst({ where: { userId: u.id, status: { not: "CANCELLED" }, startTime: inicio }, select: { id: true } });
      if (choca) return { error: "Ya hay una cita a esa hora." };
      return { resumen: `Cita · ${s(a, "nombre")} · ${inicio.toLocaleString("es-PA", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Panama" })} · ${minutos} min`, evalua: {}, payload: { tipoId: tipo.id, nombre: s(a, "nombre"), correo: s(a, "correo") || "", telefono: s(a, "telefono") || null, inicio: inicio.toISOString(), minutos, notas: s(a, "notas") || null } };
    },
    async ejecutar(u, p) {
      const inicio = new Date(String(p.inicio));
      const b = await prisma.booking.create({ data: { userId: u.id, eventTypeId: String(p.tipoId), attendeeName: String(p.nombre), attendeeEmail: String(p.correo), attendeePhone: (p.telefono as string) || null, startTime: inicio, endTime: new Date(inicio.getTime() + Number(p.minutos) * 60_000), notes: (p.notas as string) || null, source: "EMPRESA" } });
      return { pasos: [{ t: "crear", m: "booking", id: b.id }], resultType: "cita", resultId: b.id, href: "/empresa/citas" };
    },
  },
  cita_mover: {
    def: def("cita_mover", "Mueve una cita a otra hora (inicio YYYY-MM-DDTHH:MM, hora de Panamá). Busca citaId con ver_citas.", P({ citaId: STR, inicio: STR, minutos: NUM }), ["citaId", "inicio"]),
    async preparar(u, a) {
      const b = await prisma.booking.findFirst({ where: { id: s(a, "citaId"), userId: u.id }, select: { id: true, attendeeName: true, startTime: true, endTime: true } });
      const m = s(a, "inicio").match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);
      if (!b || !m) return { error: "Necesito la cita y el nuevo inicio (YYYY-MM-DDTHH:MM)." };
      const inicio = new Date(`${m[1]}T${m[2]}:${m[3]}:00-05:00`);
      const minutos = Math.round(num(a, "minutos") ?? (b.endTime.getTime() - b.startTime.getTime()) / 60_000);
      return { resumen: `Cita con ${b.attendeeName} → ${inicio.toLocaleString("es-PA", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Panama" })}`, evalua: {}, payload: { citaId: b.id, inicio: inicio.toISOString(), minutos } };
    },
    async ejecutar(u, p) {
      const b = await prisma.booking.findFirstOrThrow({ where: { id: String(p.citaId), userId: u.id } });
      const inicio = new Date(String(p.inicio));
      await prisma.booking.update({ where: { id: b.id }, data: { startTime: inicio, endTime: new Date(inicio.getTime() + Number(p.minutos) * 60_000), status: "RESCHEDULED" } });
      return { pasos: [{ t: "editar", m: "booking", id: b.id, antes: antesDe(b as unknown as Args, ["startTime", "endTime", "status"]) }], resultType: "cita", resultId: b.id, href: "/empresa/citas" };
    },
  },
  cita_cancelar: {
    def: def("cita_cancelar", "Cancela una cita. Siempre pide confirmación. No avisa a la persona.", P({ citaId: STR }), ["citaId"]),
    async preparar(u, a) {
      const b = await prisma.booking.findFirst({ where: { id: s(a, "citaId"), userId: u.id }, select: { id: true, attendeeName: true, startTime: true } });
      if (!b) return { error: "No encontré esa cita." };
      return { resumen: `Cancelar la cita con ${b.attendeeName} del ${b.startTime.toLocaleString("es-PA", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Panama" })}`, evalua: { destruye: true }, payload: { citaId: b.id } };
    },
    async ejecutar(u, p) {
      const b = await prisma.booking.findFirstOrThrow({ where: { id: String(p.citaId), userId: u.id } });
      await prisma.booking.update({ where: { id: b.id }, data: { status: "CANCELLED" } });
      return { pasos: [{ t: "editar", m: "booking", id: b.id, antes: { status: b.status } }], resultType: "cita", resultId: b.id, href: "/empresa/citas" };
    },
  },
};

export const ESCRITURA = new Set(Object.keys(OPERACIONES));
