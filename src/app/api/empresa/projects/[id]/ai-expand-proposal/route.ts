import { NextRequest, NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import {
  generateProposalContent,
  ProposalGenerationError,
} from "@/lib/pdf/proposal-generate";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireEmpresaUser(req);
  const { id } = await params;

  const project = await prisma.project.findFirst({
    where: { id, userId: user.id },
    include: { client: { select: { name: true, company: true } } },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));

  try {
    const { content, costUSD } = await generateProposalContent({
      project,
      extraNotes: typeof body.extraNotes === "string" ? body.extraNotes : "",
      language: typeof body.language === "string" ? body.language : "es",
      supabaseUid: user.supabaseUid,
    });

    await prisma.project.update({
      where: { id: project.id },
      data: { proposalContent: content as unknown as object },
    });

    return NextResponse.json({ content, costUSD });
  } catch (err) {
    if (err instanceof ProposalGenerationError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    throw err;
  }
}
