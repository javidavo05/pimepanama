import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { wrapDesignSystemDocument } from "@/lib/design-system/document";
import { buildDefaultContractHtml, resolveContractHtml } from "@/lib/design-system/contract-html";
import type { ContractStatus } from "@prisma/client";

export const runtime = "nodejs";

interface PreviewPayload {
  title?: string;
  description?: string;
  responsibilities?: string;
  terms?: string;
  htmlContent?: string;
  status?: ContractStatus;
  startsAt?: string;
  endsAt?: string;
  value?: number | string;
  clientId?: string;
  clientName?: string;
  projectId?: string;
}

/** Returns full HTML document for live preview (design-system template). */
export async function POST(request: Request) {
  try {
    const user = await requireEmpresaUser(request);
    const body = (await request.json()) as PreviewPayload;

    const client = body.clientId
      ? await prisma.client.findFirst({ where: { id: body.clientId, userId: user.id } })
      : body.clientName
        ? { name: body.clientName, company: null, email: null }
        : null;

    const project = body.projectId
      ? await prisma.project.findFirst({
          where: { id: body.projectId, userId: user.id },
          select: { name: true, description: true, proposalContent: true },
        })
      : null;

    const contract = {
      title: body.title ?? "Documento comercial",
      description: body.description ?? null,
      responsibilities: body.responsibilities ?? null,
      terms: body.terms ?? null,
      value: body.value != null && body.value !== "" ? Number(body.value) : null,
      startsAt: body.startsAt ? new Date(body.startsAt) : null,
      endsAt: body.endsAt ? new Date(body.endsAt) : null,
      htmlContent: body.htmlContent ?? null,
    };

    const pagesHtml = body.htmlContent?.trim()
      ? body.htmlContent.trim()
      : resolveContractHtml(contract, client, user.config, project);

    const html = wrapDesignSystemDocument(pagesHtml, { mode: "screen" });

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("Contract HTML preview error:", err);
    return NextResponse.json({ error: "HTML preview failed" }, { status: 500 });
  }
}

/** Bootstrap default pages HTML from form fields (no save). */
export async function PUT(request: Request) {
  try {
    const user = await requireEmpresaUser(request);
    const body = (await request.json()) as PreviewPayload;

    const client = body.clientId
      ? await prisma.client.findFirst({ where: { id: body.clientId, userId: user.id } })
      : body.clientName
        ? { name: body.clientName, company: null, email: null }
        : null;

    const project = body.projectId
      ? await prisma.project.findFirst({
          where: { id: body.projectId, userId: user.id },
          select: { name: true, description: true, proposalContent: true },
        })
      : null;

    const pagesHtml = buildDefaultContractHtml({
      contract: {
        title: body.title ?? "Documento comercial",
        description: body.description ?? null,
        responsibilities: body.responsibilities ?? null,
        terms: body.terms ?? null,
        value: body.value != null && body.value !== "" ? Number(body.value) : null,
        startsAt: body.startsAt ? new Date(body.startsAt) : null,
        endsAt: body.endsAt ? new Date(body.endsAt) : null,
      },
      client,
      company: user.config,
      project,
    });

    return NextResponse.json({ htmlContent: pagesHtml });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("Contract HTML bootstrap error:", err);
    return NextResponse.json({ error: "Bootstrap failed" }, { status: 500 });
  }
}
