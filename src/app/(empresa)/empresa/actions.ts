"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { DocumentType, DocumentStatus } from "@prisma/client";

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/empresa/login");
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
  content?: object;
  issueDate?: Date;
  dueDate?: Date;
  validUntil?: Date;
  subtotal?: number;
  taxAmount?: number;
  total?: number;
  currency?: string;
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
      ...data,
      number,
      userId: user.id,
      companyId: user.configId ?? undefined,
      content: (data.content as object) ?? {},
      subtotal: data.subtotal ?? undefined,
      taxAmount: data.taxAmount ?? undefined,
      total: data.total ?? undefined,
    },
  });

  revalidatePath("/empresa");
  revalidatePath(`/empresa/${data.type.toLowerCase()}s`);
  return doc;
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
    content: object;
    issueDate: Date;
    dueDate: Date;
    validUntil: Date;
    subtotal: number;
    taxAmount: number;
    total: number;
    currency: string;
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
  return doc;
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
