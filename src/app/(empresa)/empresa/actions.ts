"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { serializeDocument, serializePaymentMethod } from "@/lib/serializers";
import { createInvoiceFromQuote } from "@/lib/quote-to-invoice";
import { syncQuoteInvoiceBalance } from "@/lib/quote-balance";
import {
  clearLegacyPartialSchedules,
  settleDocumentSchedules,
} from "@/lib/invoice-settlement";
import {
  collectSchedule,
  markDocumentPaid,
  registerInvoicePayment,
  resetInvoicePayment,
} from "@/lib/invoice-payments";
import {
  collectScheduleWithInvoice,
  collectQuoteWithInvoice,
  type CollectResult,
} from "@/lib/collect-receivable";
import { DocumentType, DocumentStatus, ProjectStatus, ContractStatus, LeadStatus, LeadSource, Prisma } from "@prisma/client";
import type { FinancingPlan } from "@/lib/financing";
import { serializeProject, serializeContract, serializeSchedule, serializeLead } from "@/lib/serializers";

const DOCUMENT_LIST_PATH: Record<DocumentType, string> = {
  FACTURA: "facturas",
  COTIZACION: "cotizaciones",
  BITACORA: "bitacoras",
  CORREO: "correos",
};

const AUDITED_FIELD_LABELS: Record<string, string> = {
  title: "Título",
  clientName: "Cliente",
  clientEmail: "Email cliente",
  clientCompany: "Empresa cliente",
  clientAddress: "Dirección cliente",
  clientRuc: "RUC cliente",
  clientId: "Cliente vinculado",
  issueDate: "Fecha de emisión",
  dueDate: "Fecha de vencimiento",
  subtotal: "Subtotal",
  taxAmount: "Impuesto",
  total: "Total",
  commissionAmt: "Comisión",
  netAmount: "Neto",
  currency: "Moneda",
  paymentMethodId: "Método de pago",
  projectId: "Proyecto",
  contractId: "Contrato",
  content: "Contenido (líneas/notas)",
};

const AUDITED_NUMERIC_FIELDS = new Set(["subtotal", "taxAmount", "total", "commissionAmt", "netAmount"]);
const AUDITED_DATE_FIELDS = new Set(["issueDate", "dueDate", "validUntil"]);

function formatAuditValue(key: string, value: unknown): string {
  if (value == null) return "—";
  if (AUDITED_DATE_FIELDS.has(key)) return new Date(value as string | Date).toLocaleDateString("es-PA");
  if (AUDITED_NUMERIC_FIELDS.has(key)) return `$${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  return String(value);
}

/**
 * Si el documento ya está PAID/PARTIALLY_PAID, cada edición queda registrada
 * con quién y qué cambió — es el único resguardo ya que la edición no tiene
 * restricciones de campo (ver decisión del usuario).
 */
async function logDocumentEditIfNeeded(
  existing: { id: string; status: DocumentStatus },
  data: Record<string, unknown>,
  actorEmail: string,
  actorName: string | null | undefined
) {
  if (existing.status !== "PAID" && existing.status !== "PARTIALLY_PAID") return;

  const changedParts: string[] = [];
  for (const [key, after] of Object.entries(data)) {
    if (key === "status" || !(key in AUDITED_FIELD_LABELS)) continue;
    const before = (existing as Record<string, unknown>)[key];

    let changed: boolean;
    if (key === "content") {
      changed = JSON.stringify(before ?? {}) !== JSON.stringify(after ?? {});
    } else if (AUDITED_NUMERIC_FIELDS.has(key)) {
      changed = Number(before ?? 0) !== Number(after ?? 0);
    } else if (AUDITED_DATE_FIELDS.has(key)) {
      const beforeTime = before ? new Date(before as string).getTime() : null;
      const afterTime = after ? new Date(after as string).getTime() : null;
      changed = beforeTime !== afterTime;
    } else {
      changed = String(before ?? "") !== String(after ?? "");
    }

    if (changed) {
      changedParts.push(
        key === "content"
          ? AUDITED_FIELD_LABELS[key]
          : `${AUDITED_FIELD_LABELS[key]}: ${formatAuditValue(key, before)} → ${formatAuditValue(key, after)}`
      );
    }
  }

  if (changedParts.length === 0) return;

  await prisma.documentAuditLog.create({
    data: {
      documentId: existing.id,
      actorEmail,
      actorName: actorName ?? undefined,
      summary: changedParts.join("; "),
    },
  });
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/empresa/login");
}

export async function createClientAction(data: {
  name: string;
  company?: string;
  ruc?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  notes?: string;
}) {
  const user = await getEmpresaUser();
  const client = await prisma.client.create({ data: { ...data, userId: user.id } });
  revalidatePath("/empresa/clientes");
  return client;
}

export async function updateClientAction(
  id: string,
  data: Partial<{
    name: string;
    company: string;
    ruc: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    country: string;
    notes: string;
  }>
) {
  const user = await getEmpresaUser();
  const existing = await prisma.client.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new Error("Client not found");
  const client = await prisma.client.update({ where: { id }, data });
  revalidatePath("/empresa/clientes");
  revalidatePath(`/empresa/clientes/${id}`);
  return client;
}

export async function createPaymentMethodAction(data: {
  name: string;
  type: string;
  commissionPct?: number;
  commissionFlat?: number;
  commissionTax?: number;
  bankName?: string;
  accountNumber?: string;
  accountType?: string;
  accountHolder?: string;
}) {
  const user = await getEmpresaUser();
  const method = await prisma.paymentMethod.create({ data: { ...data, userId: user.id } as never });
  revalidatePath("/empresa/configuracion");
  return serializePaymentMethod(method);
}

export async function updatePaymentMethodAction(
  id: string,
  data: Partial<{
    name: string;
    type: string;
    commissionPct: number;
    commissionFlat: number;
    commissionTax: number;
    bankName: string;
    accountNumber: string;
    accountType: string;
    accountHolder: string;
    isActive: boolean;
  }>
) {
  const user = await getEmpresaUser();
  const existing = await prisma.paymentMethod.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) throw new Error("Método de pago no encontrado");

  const method = await prisma.paymentMethod.update({ where: { id }, data: data as never });
  revalidatePath("/empresa/configuracion");
  return serializePaymentMethod(method);
}

export async function deletePaymentMethodAction(id: string) {
  const user = await getEmpresaUser();
  const existing = await prisma.paymentMethod.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) throw new Error("Método de pago no encontrado");

  await prisma.paymentMethod.update({
    where: { id },
    data: { isActive: false },
  });
  revalidatePath("/empresa/configuracion");
}

export async function createDocumentAction(data: {
  type: DocumentType;
  title: string;
  language?: string;
  clientName?: string;
  clientEmail?: string;
  clientCompany?: string;
  clientAddress?: string;
  clientRuc?: string;
  clientId?: string;
  leadId?: string;
  content?: object;
  issueDate?: Date | string;
  dueDate?: Date | string;
  validUntil?: Date | string;
  subtotal?: number;
  taxAmount?: number;
  total?: number;
  commissionAmt?: number;
  netAmount?: number;
  currency?: string;
  status?: DocumentStatus;
  paymentMethodId?: string;
  r2Key?: string;
  projectId?: string;
  contractId?: string;
}) {
  const user = await getEmpresaUser();

  const toDate = (value?: Date | string) => (value ? new Date(value) : undefined);

  // Auto-generate document number
  const prefix =
    data.type === "FACTURA"
      ? (user.config?.invoicePrefix ?? "INV")
      : data.type === "COTIZACION"
        ? (user.config?.quotePrefix ?? "COT")
        : data.type === "BITACORA"
          ? "BIT"
          : "COR";

  const year = new Date().getFullYear();
  const count = await prisma.document.count({
    where: { type: data.type, userId: user.id },
  });
  const number = `${prefix}-${year}-${String(count + 1).padStart(4, "0")}`;

  const doc = await prisma.document.create({
    data: {
      type: data.type,
      title: data.title,
      language: data.language,
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      clientCompany: data.clientCompany,
      clientAddress: data.clientAddress,
      clientRuc: data.clientRuc,
      clientId: data.clientId,
      leadId: data.leadId,
      content: (data.content as object) ?? {},
      issueDate: toDate(data.issueDate),
      dueDate: toDate(data.dueDate),
      validUntil: toDate(data.validUntil),
      subtotal: data.subtotal ?? undefined,
      taxAmount: data.taxAmount ?? undefined,
      total: data.total ?? undefined,
      commissionAmt: data.commissionAmt ?? undefined,
      netAmount: data.netAmount ?? undefined,
      currency: data.currency,
      status: data.status ?? "DRAFT",
      paymentMethodId: data.paymentMethodId,
      r2Key: data.r2Key,
      projectId: data.projectId,
      contractId: data.contractId,
      number,
      userId: user.id,
      companyId: user.configId ?? undefined,
    },
  });

  if (data.type === "COTIZACION" && data.status === "ACCEPTED") {
    await createInvoiceFromQuote(doc, user);
    revalidatePath("/empresa/facturas");
    revalidatePath("/empresa/clientes");
  }

  revalidatePath("/empresa");
  revalidatePath(`/empresa/${DOCUMENT_LIST_PATH[data.type]}`);
  return serializeDocument(doc);
}

export async function updateDocumentAction(
  id: string,
  data: Partial<{
    title: string;
    status: DocumentStatus;
    language: string;
    clientName: string;
    clientEmail: string;
    clientCompany: string;
    clientAddress: string;
    clientRuc: string;
    clientId: string;
    leadId: string;
    content: object;
    issueDate: Date;
    dueDate: Date;
    validUntil: Date;
    subtotal: number;
    taxAmount: number;
    total: number;
    commissionAmt: number;
    netAmount: number;
    currency: string;
    paymentMethodId: string;
    r2Key: string;
    aiEnhanced: boolean;
    aiTokensUsed: number;
    projectId: string;
    contractId: string;
  }>
) {
  const user = await getEmpresaUser();
  const existing = await prisma.document.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) throw new Error("Document not found or access denied");

  const doc = await prisma.document.update({
    where: { id },
    data: {
      ...data,
      content: data.content as object | undefined,
      subtotal: data.subtotal ?? undefined,
      taxAmount: data.taxAmount ?? undefined,
      total: data.total ?? undefined,
    },
  });

  await logDocumentEditIfNeeded(existing, data, user.email, user.fullName);

  const newStatus = data.status ?? existing.status;

  // Cambiar el estado a mano debe cerrar el ciclo igual que registrar el pago:
  // sin esto la factura sale de "por cobrar" pero sus cuotas quedan vivas.
  if (data.status && data.status !== existing.status) {
    if (data.status === "PAID") {
      const total = existing.total != null ? Number(existing.total) : null;
      if (total != null) {
        await prisma.document.update({ where: { id }, data: { amountPaid: total } });
      }
      await settleDocumentSchedules(id);
    } else if (data.status === "CANCELLED" || data.status === "REJECTED") {
      await clearLegacyPartialSchedules(id);
      await prisma.paymentSchedule.updateMany({
        where: { documentId: id, status: { in: ["PENDING", "OVERDUE"] } },
        data: { status: "CANCELLED" },
      });
    } else if (existing.status === "PAID" || existing.status === "PARTIALLY_PAID") {
      // Reabrir: el cobro deja de estar registrado.
      await prisma.document.update({ where: { id }, data: { amountPaid: null } });
    }
    if (existing.type === "FACTURA" && existing.linkedDocumentId) {
      await syncQuoteInvoiceBalance(existing.linkedDocumentId, user.id);
    }
    revalidatePath("/empresa/cuentas-por-cobrar");
  }
  if (
    existing.type === "COTIZACION" &&
    newStatus === "ACCEPTED" &&
    existing.status !== "ACCEPTED"
  ) {
    await createInvoiceFromQuote(doc, user);
    revalidatePath("/empresa/facturas");
    revalidatePath("/empresa/clientes");
  }

  revalidatePath("/empresa");
  revalidatePath(`/empresa/${DOCUMENT_LIST_PATH[existing.type]}`);
  revalidatePath(`/empresa/${DOCUMENT_LIST_PATH[existing.type]}/${id}`);
  return serializeDocument(doc);
}

export async function convertQuoteToInvoiceAction(quoteId: string) {
  const user = await getEmpresaUser();
  const quote = await prisma.document.findFirst({
    where: { id: quoteId, userId: user.id, type: "COTIZACION" },
  });
  if (!quote) throw new Error("Cotización no encontrada");

  const invoice = await createInvoiceFromQuote(quote, user);

  revalidatePath("/empresa");
  revalidatePath("/empresa/cotizaciones");
  revalidatePath(`/empresa/cotizaciones/${quoteId}`);
  revalidatePath("/empresa/facturas");
  revalidatePath(`/empresa/facturas/${invoice.id}`);
  revalidatePath("/empresa/clientes");

  return serializeDocument(invoice);
}

export async function deleteDocumentAction(id: string) {
  const user = await getEmpresaUser();
  const existing = await prisma.document.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) throw new Error("Document not found or access denied");

  await prisma.document.delete({ where: { id } });
  revalidatePath("/empresa");
  revalidatePath(`/empresa/${DOCUMENT_LIST_PATH[existing.type]}`);
}

export async function updateCompanyConfigAction(data: {
  name?: string;
  legalName?: string;
  ruc?: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  website?: string;
  currency?: string;
  defaultLocale?: string;
  invoicePrefix?: string;
  quotePrefix?: string;
  paymentTermsDays?: number;
  taxRatePercent?: number;
  footerNotes_en?: string;
  footerNotes_es?: string;
}) {
  const user = await getEmpresaUser();

  if (user.configId) {
    await prisma.companyConfig.update({
      where: { id: user.configId },
      data,
    });
  } else {
    const config = await prisma.companyConfig.create({ data });
    await prisma.empresaUser.update({
      where: { id: user.id },
      data: { configId: config.id },
    });
  }

  revalidatePath("/empresa/configuracion");
}

// ─── Projects ────────────────────────────────────────────────────────────────

export async function createProjectAction(data: {
  name: string;
  clientId?: string;
  description?: string;
  scope?: string;
  status?: ProjectStatus;
  startDate?: string;
  endDate?: string;
  totalBudget?: number;
  aiSummary?: string;
  aiTags?: string[];
}) {
  const user = await getEmpresaUser();
  const project = await prisma.project.create({
    data: {
      ...data,
      userId: user.id,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      aiTags: data.aiTags ?? [],
    },
  });
  revalidatePath("/empresa/proyectos");
  revalidatePath("/empresa");
  return serializeProject(project);
}

/**
 * Crea un proyecto, sus clientes y (opcionalmente) su contrato en una sola
 * operación. Proyecto y contrato se levantaban por separado en dos pantallas
 * distintas, lo que hacía que casi siempre quedara uno sin el otro.
 */
export async function createProjectWithContractAction(data: {
  name: string;
  clientIds: string[];
  description?: string;
  scope?: string;
  status?: ProjectStatus;
  startDate?: string;
  endDate?: string;
  totalBudget?: number;
  contract?: {
    title: string;
    value?: number;
    startsAt?: string;
    endsAt?: string;
    responsibilities?: string;
    terms?: string;
    description?: string;
  } | null;
  /** Entregables (los suele extraer el análisis del contrato adjunto). */
  deliverables?: { name: string; description?: string; dueDate?: string }[];
  /** Plan de financiación: abono inicial + cuotas. */
  financingPlan?: {
    total: number;
    downPayment: number;
    installments: number;
    frequency: "MONTHLY" | "BIWEEKLY" | "WEEKLY";
    firstDueDate: string;
  } | null;
}) {
  const user = await getEmpresaUser();
  if (!data.name.trim()) throw new Error("El proyecto necesita un nombre");
  if (data.clientIds.length === 0) throw new Error("El proyecto necesita al menos un cliente");

  // Solo clientes que de verdad son de este usuario.
  const validClients = await prisma.client.findMany({
    where: { id: { in: data.clientIds }, userId: user.id },
    select: { id: true },
  });
  if (validClients.length === 0) throw new Error("Los clientes indicados no existen");
  const clientIds = validClients.map((c) => c.id);

  const toDate = (v?: string) => (v ? new Date(v) : undefined);

  const project = await prisma.project.create({
    data: {
      userId: user.id,
      name: data.name,
      description: data.description,
      scope: data.scope,
      status: data.status ?? "ACTIVE",
      startDate: toDate(data.startDate),
      endDate: toDate(data.endDate),
      totalBudget: data.totalBudget ?? undefined,
      // clientId queda como espejo legacy del cliente principal.
      clientId: clientIds[0],
      clients: { createMany: { data: clientIds.map((clientId) => ({ clientId })) } },
      financingPlan: data.financingPlan ?? undefined,
      aiTags: [],
    },
  });

  const deliverables = (data.deliverables ?? []).filter((d) => d.name?.trim());
  if (deliverables.length > 0) {
    await prisma.deliverable.createMany({
      data: deliverables.map((d, i) => ({
        projectId: project.id,
        name: d.name.trim(),
        description: d.description?.trim() || null,
        dueDate: d.dueDate ? new Date(d.dueDate) : null,
        sortOrder: i,
        source: "AI_CONTRACT",
      })),
    });
  }

  let contract = null;
  if (data.contract?.title?.trim()) {
    contract = await prisma.contract.create({
      data: {
        userId: user.id,
        projectId: project.id,
        clientId: clientIds[0],
        title: data.contract.title,
        description: data.contract.description,
        responsibilities: data.contract.responsibilities,
        terms: data.contract.terms,
        value: data.contract.value ?? undefined,
        startsAt: toDate(data.contract.startsAt),
        endsAt: toDate(data.contract.endsAt),
        status: "ACTIVE",
      },
    });
  }

  revalidatePath("/empresa/proyectos");
  revalidatePath("/empresa/contratos");
  revalidatePath("/empresa");

  return {
    project: serializeProject(project),
    contractId: contract?.id ?? null,
  };
}

/** Reemplaza la lista de clientes de un proyecto. */
export async function setProjectClientsAction(projectId: string, clientIds: string[]) {
  const user = await getEmpresaUser();
  const project = await prisma.project.findFirst({ where: { id: projectId, userId: user.id } });
  if (!project) throw new Error("Proyecto no encontrado");
  if (clientIds.length === 0) throw new Error("El proyecto necesita al menos un cliente");

  const valid = await prisma.client.findMany({
    where: { id: { in: clientIds }, userId: user.id },
    select: { id: true },
  });
  const ids = valid.map((c) => c.id);
  if (ids.length === 0) throw new Error("Los clientes indicados no existen");

  await prisma.$transaction([
    prisma.projectClient.deleteMany({ where: { projectId } }),
    prisma.projectClient.createMany({ data: ids.map((clientId) => ({ projectId, clientId })) }),
    prisma.project.update({ where: { id: projectId }, data: { clientId: ids[0] } }),
  ]);

  revalidatePath("/empresa/proyectos");
  revalidatePath(`/empresa/proyectos/${projectId}`);
}

export async function updateProjectAction(
  id: string,
  data: Partial<{
    name: string;
    clientId: string | null;
    description: string | null;
    scope: string | null;
    status: ProjectStatus;
    startDate: string | null;
    endDate: string | null;
    totalBudget: number | null;
    aiSummary: string | null;
    aiTags: string[];
    financingPlan: FinancingPlan | null;
  }>
) {
  const user = await getEmpresaUser();
  const existing = await prisma.project.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new Error("Proyecto no encontrado");

  // `undefined` = no tocar el campo, `null` = vaciarlo. Sin esa distinción no
  // había forma de quitar una fecha o un presupuesto ya guardado.
  const toDate = (v: string | null | undefined) =>
    v === undefined ? undefined : v ? new Date(v) : null;

  const project = await prisma.project.update({
    where: { id },
    data: {
      name: data.name,
      clientId: data.clientId,
      description: data.description,
      scope: data.scope,
      status: data.status,
      startDate: toDate(data.startDate),
      endDate: toDate(data.endDate),
      totalBudget: data.totalBudget,
      aiSummary: data.aiSummary,
      aiTags: data.aiTags,
      financingPlan:
        data.financingPlan === undefined
          ? undefined
          : data.financingPlan ?? Prisma.DbNull,
    },
  });
  revalidatePath("/empresa/proyectos");
  revalidatePath(`/empresa/proyectos/${id}`);
  revalidatePath("/empresa");
  return serializeProject(project);
}

// ─── Entregables ─────────────────────────────────────────────────────────────

export async function createDeliverableAction(
  projectId: string,
  data: { name: string; description?: string | null; dueDate?: string | null }
) {
  const user = await getEmpresaUser();
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: user.id },
    select: { id: true },
  });
  if (!project) throw new Error("Proyecto no encontrado");
  if (!data.name.trim()) throw new Error("El entregable necesita un nombre");

  const last = await prisma.deliverable.findFirst({
    where: { projectId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  await prisma.deliverable.create({
    data: {
      projectId,
      name: data.name.trim(),
      description: data.description?.trim() || null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      sortOrder: (last?.sortOrder ?? -1) + 1,
      source: "MANUAL",
    },
  });
  revalidatePath(`/empresa/proyectos/${projectId}`);
}

export async function updateDeliverableAction(
  id: string,
  data: Partial<{
    name: string;
    description: string | null;
    dueDate: string | null;
    completed: boolean;
  }>
) {
  const user = await getEmpresaUser();
  const existing = await prisma.deliverable.findFirst({
    where: { id, project: { userId: user.id } },
    select: { id: true, projectId: true, completed: true },
  });
  if (!existing) throw new Error("Entregable no encontrado");

  await prisma.deliverable.update({
    where: { id },
    data: {
      name: data.name?.trim(),
      description: data.description === undefined ? undefined : data.description?.trim() || null,
      dueDate: data.dueDate === undefined ? undefined : data.dueDate ? new Date(data.dueDate) : null,
      completed: data.completed,
      // La fecha de cierre la pone el sistema, no el formulario.
      completedAt:
        data.completed === undefined ? undefined : data.completed ? new Date() : null,
    },
  });
  revalidatePath(`/empresa/proyectos/${existing.projectId}`);
}

export async function deleteDeliverableAction(id: string) {
  const user = await getEmpresaUser();
  const existing = await prisma.deliverable.findFirst({
    where: { id, project: { userId: user.id } },
    select: { id: true, projectId: true },
  });
  if (!existing) throw new Error("Entregable no encontrado");
  await prisma.deliverable.delete({ where: { id } });
  revalidatePath(`/empresa/proyectos/${existing.projectId}`);
}

export async function deleteProjectAction(id: string) {
  const user = await getEmpresaUser();
  const existing = await prisma.project.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new Error("Proyecto no encontrado");
  await prisma.project.delete({ where: { id } });
  revalidatePath("/empresa/proyectos");
  revalidatePath("/empresa");
}

// ─── Contracts ───────────────────────────────────────────────────────────────

export async function createContractAction(data: {
  title: string;
  projectId?: string;
  clientId?: string;
  description?: string;
  responsibilities?: string;
  terms?: string;
  htmlContent?: string;
  status?: ContractStatus;
  signedAt?: string;
  startsAt?: string;
  endsAt?: string;
  value?: number;
}) {
  const user = await getEmpresaUser();
  const contract = await prisma.contract.create({
    data: {
      ...data,
      userId: user.id,
      signedAt: data.signedAt ? new Date(data.signedAt) : undefined,
      startsAt: data.startsAt ? new Date(data.startsAt) : undefined,
      endsAt: data.endsAt ? new Date(data.endsAt) : undefined,
    },
  });
  revalidatePath("/empresa/contratos");
  if (data.projectId) revalidatePath(`/empresa/proyectos/${data.projectId}`);
  revalidatePath("/empresa");
  return serializeContract(contract);
}

export async function updateContractAction(
  id: string,
  data: Partial<{
    title: string;
    projectId: string | null;
    clientId: string | null;
    description: string | null;
    responsibilities: string | null;
    terms: string | null;
    htmlContent: string | null;
    status: ContractStatus;
    signedAt: string | null;
    startsAt: string | null;
    endsAt: string | null;
    value: number | null;
  }>
) {
  const user = await getEmpresaUser();
  const existing = await prisma.contract.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new Error("Contrato no encontrado");

  // Igual que en los proyectos: `undefined` no toca el campo, `null` lo vacía.
  const toDate = (v: string | null | undefined) =>
    v === undefined ? undefined : v ? new Date(v) : null;

  const contract = await prisma.contract.update({
    where: { id },
    data: {
      ...data,
      signedAt: toDate(data.signedAt),
      startsAt: toDate(data.startsAt),
      endsAt: toDate(data.endsAt),
    },
  });
  revalidatePath("/empresa/contratos");
  revalidatePath(`/empresa/contratos/${id}`);
  if (existing.projectId) revalidatePath(`/empresa/proyectos/${existing.projectId}`);
  return serializeContract(contract);
}

export async function deleteContractAction(id: string) {
  const user = await getEmpresaUser();
  const existing = await prisma.contract.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new Error("Contrato no encontrado");
  await prisma.contract.delete({ where: { id } });
  revalidatePath("/empresa/contratos");
  if (existing.projectId) revalidatePath(`/empresa/proyectos/${existing.projectId}`);
}

// ─── Leads (CRM) ────────────────────────────────────────────────────────────────

export async function createLeadAction(data: {
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  source?: LeadSource;
  estimatedValue?: number;
  notes?: string;
  nextFollowUpAt?: string;
}) {
  const user = await getEmpresaUser();
  const lead = await prisma.lead.create({
    data: {
      ...data,
      userId: user.id,
      nextFollowUpAt: data.nextFollowUpAt ? new Date(data.nextFollowUpAt) : undefined,
    },
  });
  revalidatePath("/empresa/leads");
  return serializeLead(lead);
}

export async function updateLeadAction(
  id: string,
  data: Partial<{
    name: string;
    company: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    country: string;
    source: LeadSource;
    estimatedValue: number;
    notes: string;
    nextFollowUpAt: string;
    lostReason: string;
  }>
) {
  const user = await getEmpresaUser();
  const existing = await prisma.lead.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new Error("Lead no encontrado");
  const lead = await prisma.lead.update({
    where: { id },
    data: {
      ...data,
      nextFollowUpAt: data.nextFollowUpAt ? new Date(data.nextFollowUpAt) : undefined,
    },
  });
  revalidatePath("/empresa/leads");
  revalidatePath(`/empresa/leads/${id}`);
  return serializeLead(lead);
}

export async function updateLeadStatusAction(id: string, status: LeadStatus) {
  const user = await getEmpresaUser();
  const existing = await prisma.lead.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new Error("Lead no encontrado");

  if (status === "GANADO" && !existing.convertedClientId) {
    const [, lead] = await prisma.$transaction(async (tx) => {
      const client = await tx.client.create({
        data: {
          name: existing.name,
          company: existing.company,
          email: existing.email,
          phone: existing.phone,
          address: existing.address,
          city: existing.city,
          country: existing.country,
          userId: user.id,
        },
      });
      const updatedLead = await tx.lead.update({
        where: { id },
        data: { status, convertedClientId: client.id, convertedAt: new Date() },
      });
      await tx.document.updateMany({
        where: { leadId: id },
        data: { clientId: client.id },
      });
      return [client, updatedLead];
    });
    revalidatePath("/empresa/leads");
    revalidatePath(`/empresa/leads/${id}`);
    revalidatePath("/empresa/clientes");
    return serializeLead(lead);
  }

  const lead = await prisma.lead.update({ where: { id }, data: { status } });
  revalidatePath("/empresa/leads");
  revalidatePath(`/empresa/leads/${id}`);
  return serializeLead(lead);
}

export async function deleteLeadAction(id: string) {
  const user = await getEmpresaUser();
  const existing = await prisma.lead.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new Error("Lead no encontrado");
  if (existing.convertedClientId) throw new Error("No se puede eliminar un lead ya convertido a cliente");
  await prisma.lead.delete({ where: { id } });
  revalidatePath("/empresa/leads");
}

// Rellena hacia atrás: crea un Lead a partir de un documento (cotización/factura)
// que se originó sin pasar por el CRM. Queda GANADO de inmediato porque el
// negocio ya existe — es solo para completar el historial de pipeline.
export async function createRetroactiveLeadAction(documentId: string) {
  const user = await getEmpresaUser();
  const doc = await prisma.document.findFirst({ where: { id: documentId, userId: user.id } });
  if (!doc) throw new Error("Documento no encontrado");
  if (doc.leadId) throw new Error("El documento ya tiene un lead vinculado");
  if (!doc.clientName) throw new Error("El documento no tiene datos de cliente para crear el lead");

  const lead = await prisma.lead.create({
    data: {
      userId: user.id,
      name: doc.clientName,
      company: doc.clientCompany,
      email: doc.clientEmail,
      address: doc.clientAddress,
      status: "GANADO",
      source: "OTRO",
      convertedClientId: doc.clientId ?? undefined,
      convertedAt: new Date(),
    },
  });

  await prisma.document.update({ where: { id: documentId }, data: { leadId: lead.id } });

  revalidatePath("/empresa/leads");
  revalidatePath(`/empresa/${DOCUMENT_LIST_PATH[doc.type]}/${documentId}`);
  return serializeLead(lead);
}

// ─── Payment Schedules ────────────────────────────────────────────────────────

export async function createPaymentSchedulesAction(
  documentId: string,
  entries: { description: string; amount: number; dueDate: string }[]
) {
  const user = await getEmpresaUser();
  const doc = await prisma.document.findFirst({ where: { id: documentId, userId: user.id } });
  if (!doc) throw new Error("Documento no encontrado");

  await prisma.paymentSchedule.deleteMany({ where: { documentId, status: "PENDING" } });

  const schedules = await prisma.$transaction(
    entries.map((e) =>
      prisma.paymentSchedule.create({
        data: {
          userId: user.id,
          documentId,
          description: e.description,
          amount: e.amount,
          dueDate: new Date(e.dueDate),
        },
      })
    )
  );

  revalidatePath("/empresa/cuentas-por-cobrar");
  revalidatePath("/empresa");
  return schedules.map(serializeSchedule);
}

/**
 * Cobra cualquier ítem de Cuentas por Cobrar. Si el saldo no tiene factura
 * detrás (cotización o cuota de cotización), la factura se emite en el acto.
 */
export async function collectReceivableAction(input: {
  kind: "invoice" | "quote" | "schedule";
  documentId: string;
  scheduleId?: string | null;
  amount: number;
}): Promise<CollectResult> {
  const user = await getEmpresaUser();
  let result: CollectResult;

  if (input.kind === "schedule") {
    if (!input.scheduleId) throw new Error("Falta la cuota a cobrar");
    result = await collectScheduleWithInvoice(user.id, input.scheduleId, input.amount);
  } else if (input.kind === "quote") {
    result = await collectQuoteWithInvoice(user.id, input.documentId, input.amount);
  } else {
    const paid = await registerInvoicePayment(user.id, input.documentId, input.amount);
    const doc = await prisma.document.findFirst({
      where: { id: input.documentId, userId: user.id },
      select: { number: true },
    });
    result = {
      invoiceId: input.documentId,
      invoiceNumber: doc?.number ?? null,
      invoiceCreated: false,
      amountCollected: paid.amountPaid,
    };
  }

  revalidatePath("/empresa/cuentas-por-cobrar");
  revalidatePath("/empresa/facturas");
  revalidatePath("/empresa/cotizaciones");
  revalidatePath("/empresa/por-pagar");
  revalidatePath(`/empresa/facturas/${result.invoiceId}`);
  revalidatePath("/empresa");
  return result;
}

export async function markSchedulePaidAction(id: string) {
  const user = await getEmpresaUser();
  const schedule = await prisma.paymentSchedule.findFirst({
    where: { id, userId: user.id },
    select: { documentId: true },
  });
  if (!schedule) throw new Error("Cuota no encontrada");

  await collectSchedule(user.id, id);

  revalidatePath("/empresa/cuentas-por-cobrar");
  revalidatePath("/empresa/facturas");
  revalidatePath(`/empresa/facturas/${schedule.documentId}`);
  revalidatePath("/empresa/por-pagar");
  revalidatePath("/empresa");
}

export async function registerInvoicePaymentAction(
  documentId: string,
  paymentAmount: number,
  remainderDueDate?: string
) {
  const user = await getEmpresaUser();
  const result = await registerInvoicePayment(user.id, documentId, paymentAmount, remainderDueDate);

  const linkedId = (
    await prisma.document.findFirst({
      where: { id: documentId, userId: user.id },
      select: { linkedDocumentId: true },
    })
  )?.linkedDocumentId;

  revalidatePath("/empresa/facturas");
  revalidatePath("/empresa/cotizaciones");
  revalidatePath("/empresa/cuentas-por-cobrar");
  revalidatePath("/empresa/por-pagar");
  revalidatePath(`/empresa/facturas/${documentId}`);
  if (linkedId) revalidatePath(`/empresa/cotizaciones/${linkedId}`);
  revalidatePath("/empresa");

  return result;
}

export async function resetInvoicePaymentAction(documentId: string) {
  const user = await getEmpresaUser();
  await resetInvoicePayment(user.id, documentId);

  revalidatePath("/empresa/facturas");
  revalidatePath("/empresa/cuentas-por-cobrar");
  revalidatePath(`/empresa/facturas/${documentId}`);
  revalidatePath("/empresa");
}

export async function markDocumentPaidAction(id: string) {
  const user = await getEmpresaUser();
  const doc = await prisma.document.findFirst({
    where: { id, userId: user.id },
    select: { type: true, linkedDocumentId: true },
  });
  if (!doc) throw new Error("Documento no encontrado");

  await markDocumentPaid(user.id, id);

  revalidatePath("/empresa/facturas");
  revalidatePath("/empresa/cotizaciones");
  revalidatePath("/empresa/cuentas-por-cobrar");
  revalidatePath(`/empresa/facturas/${id}`);
  if (doc.type === "FACTURA" && doc.linkedDocumentId) {
    revalidatePath(`/empresa/cotizaciones/${doc.linkedDocumentId}`);
  }
  revalidatePath("/empresa");
}

export async function linkDocumentsAction(facturaId: string, cotizacionId: string) {
  const user = await getEmpresaUser();
  const [factura, cotizacion] = await Promise.all([
    prisma.document.findFirst({ where: { id: facturaId, userId: user.id, type: "FACTURA" } }),
    prisma.document.findFirst({ where: { id: cotizacionId, userId: user.id, type: "COTIZACION" } }),
  ]);
  if (!factura || !cotizacion) throw new Error("Documentos no encontrados");

  const facturaContent = (factura.content ?? {}) as Record<string, unknown>;
  const cotizacionContent = (cotizacion.content ?? {}) as Record<string, unknown>;

  await Promise.all([
    prisma.document.update({
      where: { id: facturaId },
      data: {
        linkedDocumentId: cotizacionId,
        content: { ...facturaContent, sourceQuoteId: cotizacionId, sourceQuoteNumber: cotizacion.number },
      },
    }),
    prisma.document.update({
      where: { id: cotizacionId },
      data: {
        ...(cotizacion.linkedDocumentId ? {} : { linkedDocumentId: facturaId }),
        content: {
          ...cotizacionContent,
          linkedInvoiceId: cotizacion.linkedDocumentId ?? cotizacionContent.linkedInvoiceId ?? facturaId,
        },
      },
    }),
  ]);

  await syncQuoteInvoiceBalance(cotizacionId, user.id);

  revalidatePath(`/empresa/facturas/${facturaId}`);
  revalidatePath(`/empresa/cotizaciones/${cotizacionId}`);
  revalidatePath("/empresa/cuentas-por-cobrar");
  revalidatePath("/empresa/cotizaciones");
  revalidatePath("/empresa/facturas");
}

export async function attachInvoiceToQuoteAction(invoiceId: string, quoteId: string) {
  const user = await getEmpresaUser();
  const [invoice, quote] = await Promise.all([
    prisma.document.findFirst({ where: { id: invoiceId, userId: user.id, type: "FACTURA" } }),
    prisma.document.findFirst({ where: { id: quoteId, userId: user.id, type: "COTIZACION" } }),
  ]);
  if (!invoice || !quote) throw new Error("Documentos no encontrados");

  const invoiceContent = (invoice.content ?? {}) as Record<string, unknown>;
  await prisma.document.update({
    where: { id: invoiceId },
    data: {
      linkedDocumentId: quoteId,
      content: {
        ...invoiceContent,
        sourceQuoteId: quoteId,
        sourceQuoteNumber: quote.number,
      },
    },
  });

  await syncQuoteInvoiceBalance(quoteId, user.id);
  revalidatePath(`/empresa/facturas/${invoiceId}`);
  revalidatePath(`/empresa/cotizaciones/${quoteId}`);
  revalidatePath("/empresa/cuentas-por-cobrar");
}

export async function markScheduleInvoicedAction(scheduleId: string, invoiceId: string) {
  const user = await getEmpresaUser();
  const schedule = await prisma.paymentSchedule.findFirst({
    where: { id: scheduleId, userId: user.id },
  });
  if (!schedule) return;

  await prisma.paymentSchedule.update({
    where: { id: scheduleId },
    data: { invoiceId, status: "CANCELLED" },
  });
}

export type CompanyConfigFormState = {
  success?: boolean;
  error?: string;
};

export async function saveCompanyConfigFormAction(
  _prev: CompanyConfigFormState,
  formData: FormData
): Promise<CompanyConfigFormState> {
  try {
    await updateCompanyConfigAction({
      name: formData.get("name") as string,
      legalName: formData.get("legalName") as string,
      ruc: formData.get("ruc") as string,
      address: formData.get("address") as string,
      city: formData.get("city") as string,
      country: formData.get("country") as string,
      phone: formData.get("phone") as string,
      email: formData.get("email") as string,
      website: formData.get("website") as string,
      logoUrl: formData.get("logoUrl") as string,
      currency: formData.get("currency") as string,
      invoicePrefix: formData.get("invoicePrefix") as string,
      quotePrefix: formData.get("quotePrefix") as string,
      paymentTermsDays:
        parseInt(formData.get("paymentTermsDays") as string, 10) || 30,
      taxRatePercent:
        parseFloat(formData.get("taxRatePercent") as string) || 7,
      footerNotes_es: formData.get("footerNotes_es") as string,
      footerNotes_en: formData.get("footerNotes_en") as string,
    });
    return { success: true };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "No se pudo guardar la configuración",
    };
  }
}
