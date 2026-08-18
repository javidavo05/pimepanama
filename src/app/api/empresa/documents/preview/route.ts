import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { renderDocumentPdf } from "@/lib/pdf/render";
import { resolveDocumentPdfPaymentMethods } from "@/lib/pdf/payment-methods";
import { Readable } from "stream";
import type { Document as PrismaDocument, DocumentType } from "@prisma/client";

export const runtime = "nodejs";

interface PreviewPayload {
  type: DocumentType;
  title?: string;
  language?: string;
  currency?: string;
  clientName?: string;
  clientEmail?: string;
  clientCompany?: string;
  clientAddress?: string;
  clientRuc?: string;
  issueDate?: string;
  dueDate?: string;
  validUntil?: string;
  status?: string;
  paymentMethodId?: string | null;
  pdfPaymentMethodIds?: string[];
  number?: string;
  content?: Record<string, unknown>;
}

/**
 * Renders a PDF from unsaved draft form state (no persisted Document row) — powers the live "Vista
 * previa" panel in the nueva/edit builders. Reuses the exact same renderDocumentPdf() pipeline as the
 * real /api/empresa/documents/[id]/pdf route, so the preview never drifts from the real export.
 */
export async function POST(request: Request) {
  try {
    const user = await requireEmpresaUser(request);
    const body = (await request.json()) as PreviewPayload;

    if (!body.type) {
      return NextResponse.json({ error: "Missing document type" }, { status: 400 });
    }

    const now = new Date();
    const draft = {
      id: "preview",
      type: body.type,
      status: body.status ?? "DRAFT",
      language: body.language ?? "es",
      number: body.number ?? "VISTA PREVIA",
      title: body.title ?? "",
      clientName: body.clientName || null,
      clientEmail: body.clientEmail || null,
      clientCompany: body.clientCompany || null,
      clientAddress: body.clientAddress || null,
      clientRuc: body.clientRuc || null,
      content: {
        ...(body.content ?? {}),
        ...(body.pdfPaymentMethodIds ? { pdfPaymentMethodIds: body.pdfPaymentMethodIds } : {}),
      },
      issueDate: body.issueDate ? new Date(body.issueDate) : now,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      validUntil: body.validUntil ? new Date(body.validUntil) : null,
      currency: body.currency ?? user.config?.currency ?? "USD",
      subtotal: null,
      taxAmount: null,
      total: null,
      commissionAmt: null,
      netAmount: null,
      amountPaid: null,
      aiEnhanced: false,
      aiTokensUsed: 0,
      createdAt: now,
      updatedAt: now,
      userId: user.id,
      clientId: null,
      leadId: null,
      projectId: null,
      contractId: null,
      paymentMethodId: body.paymentMethodId ?? null,
    } as unknown as PrismaDocument;

    const allMethods = await prisma.paymentMethod.findMany({
      where: { userId: user.id, isActive: true },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });
    const paymentMethods = resolveDocumentPdfPaymentMethods(draft, allMethods);

    const stream = await renderDocumentPdf(draft, user.config, paymentMethods);
    const webStream = Readable.toWeb(stream as Readable) as ReadableStream;

    return new Response(webStream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="vista-previa.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("Draft document preview error:", err);
    return NextResponse.json({ error: "Preview generation failed" }, { status: 500 });
  }
}
