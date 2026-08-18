import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { renderContractPdf } from "@/lib/pdf/render";
import { Readable } from "stream";
import type { Contract, Client, ContractStatus } from "@prisma/client";

export const runtime = "nodejs";

interface PreviewPayload {
  title?: string;
  description?: string;
  responsibilities?: string;
  terms?: string;
  status?: ContractStatus;
  startsAt?: string;
  endsAt?: string;
  value?: number | string;
  clientId?: string;
  clientName?: string;
}

/**
 * Renders a contract PDF from unsaved draft form state — mirrors documents/preview for the contract
 * builder, which uses its own Contract model instead of the shared Document model.
 */
export async function POST(request: Request) {
  try {
    const user = await requireEmpresaUser(request);
    const body = (await request.json()) as PreviewPayload;

    const client: Client | null = body.clientId
      ? await prisma.client.findFirst({ where: { id: body.clientId, userId: user.id } })
      : body.clientName
        ? ({ name: body.clientName } as unknown as Client)
        : null;

    const now = new Date();
    const draft = {
      id: "preview",
      title: body.title ?? "",
      description: body.description || null,
      responsibilities: body.responsibilities || null,
      terms: body.terms || null,
      status: body.status ?? "DRAFT",
      signedAt: null,
      startsAt: body.startsAt ? new Date(body.startsAt) : null,
      endsAt: body.endsAt ? new Date(body.endsAt) : null,
      value: body.value != null && body.value !== "" ? Number(body.value) : null,
      userId: user.id,
      projectId: null,
      clientId: body.clientId ?? null,
      createdAt: now,
      updatedAt: now,
    } as unknown as Contract;

    const stream = await renderContractPdf(draft, client, user.config);
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
    console.error("Draft contract preview error:", err);
    return NextResponse.json({ error: "Preview generation failed" }, { status: 500 });
  }
}
