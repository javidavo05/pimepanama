"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { serializeDocument, serializePaymentMethod } from "@/lib/serializers";
import { createInvoiceFromQuote } from "@/lib/quote-to-invoice";
import { DocumentType, DocumentStatus, ProjectStatus, ContractStatus } from "@prisma/client";
import { serializeProject, serializeContract, serializeSchedule } from "@/lib/serializers";

const DOCUMENT_LIST_PATH: Record<DocumentType, string> = {
  FACTURA: "facturas",
  COTIZACION: "cotizaciones",
  BITACORA: "bitacoras",
  CORREO: "correos",
};

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

  const newStatus = data.status ?? existing.status;
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

export async function updateProjectAction(
  id: string,
  data: Partial<{
    name: string;
    clientId: string;
    description: string;
    scope: string;
    status: ProjectStatus;
    startDate: string;
    endDate: string;
    totalBudget: number;
    aiSummary: string;
    aiTags: string[];
  }>
) {
  const user = await getEmpresaUser();
  const existing = await prisma.project.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new Error("Proyecto no encontrado");
  const project = await prisma.project.update({
    where: { id },
    data: {
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    },
  });
  revalidatePath("/empresa/proyectos");
  revalidatePath(`/empresa/proyectos/${id}`);
  revalidatePath("/empresa");
  return serializeProject(project);
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
    projectId: string;
    clientId: string;
    description: string;
    responsibilities: string;
    terms: string;
    status: ContractStatus;
    signedAt: string;
    startsAt: string;
    endsAt: string;
    value: number;
  }>
) {
  const user = await getEmpresaUser();
  const existing = await prisma.contract.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new Error("Contrato no encontrado");
  const contract = await prisma.contract.update({
    where: { id },
    data: {
      ...data,
      signedAt: data.signedAt ? new Date(data.signedAt) : undefined,
      startsAt: data.startsAt ? new Date(data.startsAt) : undefined,
      endsAt: data.endsAt ? new Date(data.endsAt) : undefined,
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

export async function markSchedulePaidAction(id: string) {
  const user = await getEmpresaUser();
  const existing = await prisma.paymentSchedule.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new Error("Cuota no encontrada");
  await prisma.paymentSchedule.update({
    where: { id },
    data: { status: "PAID", paidAt: new Date() },
  });

  // Si todas las cuotas del documento están pagadas → marcar el documento como PAID
  const pendingCount = await prisma.paymentSchedule.count({
    where: { documentId: existing.documentId, status: { in: ["PENDING", "OVERDUE"] } },
  });
  if (pendingCount === 0) {
    await markDocumentPaidAction(existing.documentId);
  }

  revalidatePath("/empresa/cuentas-por-cobrar");
  revalidatePath("/empresa");
}

export async function markDocumentPaidAction(id: string) {
  const user = await getEmpresaUser();
  const doc = await prisma.document.findFirst({
    where: { id, userId: user.id },
    select: { id: true, type: true, linkedDocumentId: true },
  });
  if (!doc) throw new Error("Documento no encontrado");

  await prisma.document.update({ where: { id }, data: { status: "PAID" } });

  // Cuando se marca una FACTURA como pagada, marcar también la COTIZACION vinculada
  if (doc.type === "FACTURA" && doc.linkedDocumentId) {
    await prisma.document.update({
      where: { id: doc.linkedDocumentId },
      data: { status: "PAID" },
    });
  }

  revalidatePath("/empresa/facturas");
  revalidatePath("/empresa/cotizaciones");
  revalidatePath("/empresa/cuentas-por-cobrar");
  revalidatePath(`/empresa/facturas/${id}`);
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
        linkedDocumentId: facturaId,
        content: { ...cotizacionContent, linkedInvoiceId: facturaId },
      },
    }),
  ]);

  revalidatePath(`/empresa/facturas/${facturaId}`);
  revalidatePath(`/empresa/cotizaciones/${cotizacionId}`);
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
