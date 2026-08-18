import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { renderProjectProposalPdf } from "@/lib/pdf/render";
import { isProposalContent } from "@/lib/pdf/proposal-content";
import { Readable } from "stream";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireEmpresaUser(request);

    const project = await prisma.project.findFirst({
      where: { id, userId: user.id },
      include: { client: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!isProposalContent(project.proposalContent)) {
      return NextResponse.json(
        { error: "Este proyecto todavía no tiene contenido de propuesta generado. Genera el contenido con IA primero." },
        { status: 409 }
      );
    }

    const company = user.configId
      ? await prisma.companyConfig.findUnique({ where: { id: user.configId } })
      : null;

    const stream = await renderProjectProposalPdf(project, project.client, company, project.proposalContent);

    const filename = `Propuesta-${project.name}`
      .replace(/\s+/g, "-")
      .replace(/[^\w.-]/g, "")
      .slice(0, 80);

    const webStream = Readable.toWeb(stream as Readable) as ReadableStream;
    const inline = new URL(request.url).searchParams.get("inline") === "1";

    return new Response(webStream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename}.pdf"`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("Proposal PDF generation error:", err);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}
