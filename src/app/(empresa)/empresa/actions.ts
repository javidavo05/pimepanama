"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { serializeDocument } from "@/lib/serializers";
import { DocumentType, DocumentStatus } from "@prisma/client";

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
  return method;
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
  issueDate?: Date;
  dueDate?: Date;
  validUntil?: Date;
  subtotal?: number;
  taxAmount?: number;
  total?: number;
  commissionAmt?: number;
  netAmount?: number;
  currency?: string;
  status?: DocumentStatus;
  paymentMethodId?: string;
  r2Key?: string;
}) {
  const user = await getEmpresaUser();

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
      issueDate: data.issueDate,
      dueDate: data.dueDate,
      validUntil: data.validUntil,
      subtotal: data.subtotal ?? undefined,
      taxAmount: data.taxAmount ?? undefined,
      total: data.total ?? undefined,
      commissionAmt: data.commissionAmt ?? undefined,
      netAmount: data.netAmount ?? undefined,
      currency: data.currency,
      status: data.status ?? "DRAFT",
      paymentMethodId: data.paymentMethodId,
      r2Key: data.r2Key,
      number,
      userId: user.id,
      companyId: user.configId ?? undefined,
    },
  });

  revalidatePath("/empresa");
  revalidatePath(`/empresa/${data.type.toLowerCase()}s`);
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

  revalidatePath(`/empresa/${existing.type.toLowerCase()}s/${id}`);
  revalidatePath("/empresa");
  return serializeDocument(doc);
}

export async function deleteDocumentAction(id: string) {
  const user = await getEmpresaUser();
  const existing = await prisma.document.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) throw new Error("Document not found or access denied");

  await prisma.document.delete({ where: { id } });
  revalidatePath("/empresa");
  revalidatePath(`/empresa/${existing.type.toLowerCase()}s`);
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
