/**
 * Seguimientos automáticos del CRM (fase 4). Corre en la tarea diaria (cron payment-reminders) y crea las
 * tareas que el equipo no puede olvidar:
 * - el seguimiento que se programó en un lead (Lead.nextFollowUpAt), el día que toca;
 * - las reglas de Configuración → Seguimientos (CompanyConfig.reglasCrm): lead sin respuesta, cliente sin
 *   contacto y contrato por vencer.
 * Las decisiones son puras (seguimientos-reglas.ts); aquí solo se lee, se crea y se avisa.
 * Latencia: todo se lee de una vez para todas las empresas (~600 ms por consulta), nunca en bucle.
 */
import type { LeadStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/notifications/push";
import { enlaceAviso } from "@/lib/tasks-avisos";
import {
  LEAD_CERRADO, LIMITES_DIAS, diaPanama, fechaDeDia, masReciente, planearSeguimientos, reglasDe, sumarDias,
  type ClienteDato, type ContratoDato, type LeadDato, type TareaExistente, type TareaNueva,
  diaDeTarea,
} from "./seguimientos-reglas";

const porClave = <T, K>(filas: T[], clave: (f: T) => K | null | undefined, valor: (f: T) => Date | null | undefined) => {
  const m = new Map<K, Date>();
  for (const f of filas) {
    const k = clave(f), v = valor(f);
    if (k == null || !v) continue;
    const prev = m.get(k);
    if (!prev || v > prev) m.set(k, v);
  }
  return m;
};

export async function correrSeguimientos(ahora = new Date()) {
  const hoy = diaPanama(ahora);
  const duenos = await prisma.empresaUser.findMany({
    where: { ownerId: null, activo: true },
    select: { id: true, config: { select: { reglasCrm: true } } },
  });
  if (!duenos.length) return { tareas: 0 };
  const ids = duenos.map((d) => d.id);
  const haceUnAno = new Date(ahora.getTime() - 366 * 86_400_000);
  const tope = fechaDeDia(sumarDias(hoy, LIMITES_DIAS.max + 1));

  const [leads, clientes, contratos, tareas, intLead, intCliente, eventos, equipo] = await Promise.all([
    prisma.lead.findMany({
      where: { userId: { in: ids }, status: { notIn: [...LEAD_CERRADO] as LeadStatus[] } },
      select: { id: true, userId: true, name: true, company: true, status: true, responsableId: true, nextFollowUpAt: true, createdAt: true, updatedAt: true },
    }),
    prisma.client.findMany({
      where: { userId: { in: ids }, archivedAt: null, internal: false, NOT: { name: { startsWith: "[prueba]" } } },
      select: { id: true, userId: true, name: true, company: true, responsableId: true, ultimoContactoAt: true, createdAt: true },
    }),
    prisma.contract.findMany({
      where: { userId: { in: ids }, status: "ACTIVE", clientId: { not: null }, endsAt: { gte: fechaDeDia(sumarDias(hoy, -1)), lte: tope } },
      select: { id: true, userId: true, title: true, clientId: true, endsAt: true, client: { select: { name: true, company: true, responsableId: true, archivedAt: true } } },
    }),
    prisma.task.findMany({
      where: { userId: { in: ids }, OR: [{ leadId: { not: null } }, { clientId: { not: null } }], AND: [{ OR: [{ completed: false }, { completedAt: { gte: haceUnAno } }] }] },
      select: { userId: true, title: true, clientId: true, leadId: true, completed: true, completedAt: true, dueDate: true, allDay: true },
    }),
    prisma.interaccion.groupBy({ by: ["leadId"], where: { userId: { in: ids }, leadId: { not: null } }, _max: { ocurrioAt: true } }),
    prisma.interaccion.groupBy({ by: ["clientId"], where: { userId: { in: ids }, clientId: { not: null } }, _max: { ocurrioAt: true } }),
    // Lo que hizo alguien (cliente o equipo) en la línea de tiempo; lo automático no cuenta como contacto.
    prisma.activityEvent.groupBy({ by: ["clientId"], where: { userId: { in: ids }, actorType: { in: ["cliente", "pime"] } }, _max: { createdAt: true } }),
    prisma.empresaUser.findMany({ where: { ownerId: { in: ids }, activo: true }, select: { id: true, ownerId: true } }),
  ]);

  const ultLead = porClave(intLead, (g) => g.leadId, (g) => g._max.ocurrioAt);
  const ultCliente = porClave(intCliente, (g) => g.clientId, (g) => g._max.ocurrioAt);
  const ultEvento = porClave(eventos, (g) => g.clientId, (g) => g._max.createdAt);
  const hechaLead = porClave(tareas.filter((t) => t.completed), (t) => t.leadId, (t) => t.completedAt);
  const hechaCliente = porClave(tareas.filter((t) => t.completed), (t) => t.clientId, (t) => t.completedAt);
  // Un responsable dado de baja no recibe tareas: pasan al dueño.
  const activos = new Map<string, Set<string>>(ids.map((id) => [id, new Set([id])]));
  for (const m of equipo) if (m.ownerId) activos.get(m.ownerId)?.add(m.id);

  const nuevasPorDueno: { userId: string; t: TareaNueva }[] = [];
  for (const d of duenos) {
    const vale = (id: string | null) => (id && activos.get(d.id)?.has(id) ? id : null);
    const leadsD: LeadDato[] = leads.filter((l) => l.userId === d.id).map((l) => ({
      id: l.id, nombre: l.company ? `${l.name} (${l.company})` : l.name, status: l.status, responsableId: vale(l.responsableId),
      nextFollowUpAt: l.nextFollowUpAt, ultimaActividad: masReciente([l.createdAt, l.updatedAt, ultLead.get(l.id), hechaLead.get(l.id)]) ?? l.createdAt,
    }));
    const clientesD: ClienteDato[] = clientes.filter((c) => c.userId === d.id).map((c) => ({
      id: c.id, nombre: c.company || c.name, responsableId: vale(c.responsableId),
      ultimaActividad: masReciente([c.createdAt, c.ultimoContactoAt, ultCliente.get(c.id), ultEvento.get(c.id), hechaCliente.get(c.id)]) ?? c.createdAt,
    }));
    const contratosD: ContratoDato[] = contratos.filter((k) => k.userId === d.id && k.clientId && k.endsAt && k.client && !k.client.archivedAt).map((k) => ({
      id: k.id, titulo: k.title, clientId: k.clientId!, clienteNombre: k.client!.company || k.client!.name, responsableId: vale(k.client!.responsableId), endsAt: k.endsAt!,
    }));
    const tareasD: TareaExistente[] = tareas.filter((t) => t.userId === d.id).map((t) => ({ titulo: t.title, clientId: t.clientId, leadId: t.leadId, completed: t.completed, dia: diaDeTarea(t) }));
    for (const t of planearSeguimientos({ duenoId: d.id, hoy, reglas: reglasDe(d.config?.reglasCrm), leads: leadsD, clientes: clientesD, contratos: contratosD, tareas: tareasD })) {
      nuevasPorDueno.push({ userId: d.id, t });
    }
  }
  if (!nuevasPorDueno.length) return { tareas: 0 };

  const creadas = await prisma.task.createManyAndReturn({
    data: nuevasPorDueno.map(({ userId, t }) => ({
      userId, title: t.titulo, description: t.descripcion, priority: t.prioridad, dueDate: fechaDeDia(t.dia), allDay: true,
      clientId: t.clientId, leadId: t.leadId, responsableId: t.responsableId, sortOrder: 0,
    })),
    select: { id: true, userId: true, title: true, responsableId: true, dueDate: true, allDay: true },
  });

  // Lo que vence hoy: una entrada de campana por tarea (que además marca el aviso «hoy» como dado, para que el
  // cron de tareas no lo repita) y un solo push por responsable con el resumen.
  const deHoy = creadas.filter((t) => diaDeTarea(t) === hoy);
  if (deHoy.length) {
    await prisma.mailNotification.createMany({
      data: deHoy.map((t) => ({ userId: t.userId, title: `Seguimiento para hoy — ${t.title}`, body: "Lo creó la regla de seguimientos del CRM.", link: enlaceAviso(t.id, "hoy") })),
    }).catch((e) => console.error("[seguimientos] campana", e));
    const grupos = new Map<string, { userId: string; miembro: string; titulos: string[] }>();
    for (const t of deHoy) {
      const miembro = t.responsableId ?? t.userId;
      const g = grupos.get(`${t.userId}|${miembro}`) ?? { userId: t.userId, miembro, titulos: [] };
      g.titulos.push(t.title);
      grupos.set(`${t.userId}|${miembro}`, g);
    }
    await Promise.all([...grupos.values()].map((g) =>
      sendPushToUser(g.userId, {
        title: g.titulos.length === 1 ? "Seguimiento para hoy" : `${g.titulos.length} seguimientos para hoy`,
        body: g.titulos.slice(0, 3).join(" · ") + (g.titulos.length > 3 ? ` y ${g.titulos.length - 3} más` : ""),
        url: "/empresa/tareas", tag: "seguimientos",
      }, { soloMiembroId: g.miembro }).catch((e) => console.error("[seguimientos] push", e)),
    ));
  }

  const motivos = nuevasPorDueno.reduce<Record<string, number>>((a, { t }) => ({ ...a, [t.motivo]: (a[t.motivo] ?? 0) + 1 }), {});
  return { tareas: creadas.length, ...motivos };
}
