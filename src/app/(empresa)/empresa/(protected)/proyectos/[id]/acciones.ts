"use server";

/**
 * Acciones del detalle del proyecto: «Qué le falta» (marcar un requisito como «No aplica», Project.linkWaived,
 * 0047) y «Completar con un documento».
 */
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { esRequisito } from "@/lib/proyectos/completitud";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import type { FinancingPlan } from "@/lib/financing";
import { esUno, FASE_COBRO } from "@/lib/portal/estados";
import type { FaseDesdeDocumento } from "@/lib/proyectos/desde-documento";

export async function marcarNoAplicaAction(projectId: string, key: string, noAplica: boolean): Promise<{ error?: string }> {
  if (!esRequisito(key)) return { error: "Ese requisito no existe." };
  const user = await getEmpresaUser();
  const p = await prisma.project.findFirst({ where: { id: projectId, userId: user.id }, select: { id: true, linkWaived: true } });
  if (!p) return { error: "No se encontró el proyecto." };
  const next = new Set(p.linkWaived);
  if (noAplica) next.add(key);
  else next.delete(key);
  await prisma.project.update({ where: { id: p.id }, data: { linkWaived: [...next] } });
  revalidatePath(`/empresa/proyectos/${p.id}`);
  revalidatePath("/empresa/proyectos");
  return {};
}

// ─── Completar con un documento ──────────────────────────────────────────────

export type DocumentoParaAplicar = {
  /** Solo si se eligió reemplazar la descripción y el alcance. */
  descripcion?: string | null;
  alcance?: string | null;
  presupuesto?: number | null;
  fases?: FaseDesdeDocumento[];
  plan?: FinancingPlan | null;
  contrato?: {
    title: string;
    value: number | null;
    responsibilities: string | null;
    terms: string | null;
    startsAt: string | null;
    endsAt: string | null;
    /** Solo si el documento ya es el contrato firmado. */
    firmado: boolean;
  } | null;
};

export type ResultadoAplicar = {
  error?: string;
  fasesNuevas?: number;
  fasesCompletadas?: number;
  entregables?: number;
  contratoId?: string | null;
};

/** Mismo nombre aunque cambien tildes, mayúsculas o espacios: «Fase 1 · Sitio web» = «fase 1 sitio web». */
const clave = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Agrega a un proyecto que ya existe lo que la IA leyó de su propuesta, cotización o contrato.
 * Nada se borra: las fases que ya existen (mismo nombre) reciben solo los entregables que les faltan,
 * las nuevas se crean al final y el contrato nace como un borrador aparte.
 */
export async function aplicarDocumentoAction(projectId: string, d: DocumentoParaAplicar): Promise<ResultadoAplicar> {
  const user = await getEmpresaUser();
  const p = await prisma.project.findFirst({
    where: { id: projectId, userId: user.id },
    select: {
      id: true, clientId: true, clients: { select: { clientId: true }, take: 1 },
      phases: { select: { id: true, name: true, sortOrder: true, deliverables: { select: { name: true } } } },
      _count: { select: { deliverables: true } },
    },
  });
  if (!p) return { error: "No se encontró el proyecto." };

  const data: Prisma.ProjectUpdateInput = {};
  if (d.descripcion?.trim()) data.description = d.descripcion.trim();
  if (d.alcance?.trim()) data.scope = d.alcance.trim();
  if (d.presupuesto != null && Number.isFinite(d.presupuesto) && d.presupuesto >= 0) data.totalBudget = d.presupuesto;
  if (d.plan) data.financingPlan = d.plan as unknown as Prisma.InputJsonValue;
  if (Object.keys(data).length) await prisma.project.update({ where: { id: p.id }, data });

  // Fases: las que ya existen se completan; las nuevas van al final.
  const existentes = new Map(p.phases.map((f) => [clave(f.name), f]));
  let orden = p.phases.reduce((m, f) => Math.max(m, f.sortOrder), -1);
  const nuevas: Prisma.ProjectPhaseCreateManyInput[] = [];
  const items: Prisma.DeliverableCreateManyInput[] = [];
  let fasesCompletadas = 0;
  let sort = p._count.deliverables;
  for (const f of d.fases ?? []) {
    if (!f.name?.trim()) continue;
    const ya = existentes.get(clave(f.name));
    const phaseId = ya?.id ?? randomUUID();
    const tiene = new Set((ya?.deliverables ?? []).map((x) => clave(x.name)));
    if (!ya) {
      nuevas.push({
        id: phaseId,
        projectId: p.id,
        name: f.name.trim().slice(0, 160),
        description: f.description?.trim() || null,
        price: f.price ?? 0,
        billingPoint: esUno(FASE_COBRO, f.billingPoint) ? f.billingPoint : "al_entregar",
        estimatedDays: f.estimatedDays ?? null,
        sortOrder: ++orden,
      });
    }
    let agregados = 0;
    for (const it of f.deliverables) {
      const k = clave(it.name ?? "");
      if (!k || tiene.has(k)) continue;
      tiene.add(k);
      agregados++;
      items.push({
        projectId: p.id,
        phaseId,
        name: it.name.trim().slice(0, 300),
        description: it.description?.trim() || null,
        dueDate: it.dueDate ? new Date(it.dueDate) : null,
        sortOrder: sort++,
        source: "AI_CONTRACT",
      });
    }
    if (ya && agregados > 0) fasesCompletadas++;
  }
  if (nuevas.length) await prisma.projectPhase.createMany({ data: nuevas });
  if (items.length) await prisma.deliverable.createMany({ data: items });

  let contratoId: string | null = null;
  if (d.contrato?.title?.trim()) {
    const c = await prisma.contract.create({
      data: {
        userId: user.id,
        projectId: p.id,
        clientId: p.clientId ?? p.clients[0]?.clientId ?? null,
        title: d.contrato.title.trim(),
        responsibilities: d.contrato.responsibilities,
        terms: d.contrato.terms,
        value: d.contrato.value ?? undefined,
        startsAt: d.contrato.startsAt ? new Date(d.contrato.startsAt) : undefined,
        endsAt: d.contrato.endsAt ? new Date(d.contrato.endsAt) : undefined,
        // Una propuesta o cotización no es un contrato firmado.
        status: d.contrato.firmado ? "ACTIVE" : "DRAFT",
      },
      select: { id: true },
    });
    contratoId = c.id;
    revalidatePath("/empresa/contratos");
  }

  revalidatePath(`/empresa/proyectos/${p.id}`);
  revalidatePath("/empresa/proyectos");
  return { fasesNuevas: nuevas.length, fasesCompletadas, entregables: items.length, contratoId };
}
