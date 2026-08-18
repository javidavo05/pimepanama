import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { renderContractPdf } from "@/lib/pdf/render";
import { resolveContractHtml } from "@/lib/design-system/contract-html";
import { renderHtmlToPdfBuffer } from "@/lib/design-system/html-to-pdf";
import { Readable } from "stream";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireEmpresaUser(request);

    const contract = await prisma.contract.findFirst({
      where: { id, userId: user.id },
      include: {
        client: true,
        project: { select: { name: true, description: true, proposalContent: true } },
      },
    });

    if (!contract) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const company = user.configId
      ? await prisma.companyConfig.findUnique({ where: { id: user.configId } })
      : null;

    const filename = `Contrato-${contract.title}`
      .replace(/\s+/g, "-")
      .replace(/[^\w.-]/g, "")
      .slice(0, 80);

    const inline = new URL(request.url).searchParams.get("inline") === "1";
    const useLegacy = new URL(request.url).searchParams.get("legacy") === "1";

    if (!useLegacy) {
      try {
        const pagesHtml = resolveContractHtml(contract, contract.client, company, contract.project);
        const pdfBuffer = await renderHtmlToPdfBuffer(pagesHtml);
        return new Response(new Uint8Array(pdfBuffer), {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename}.pdf"`,
            "Cache-Control": "private, no-cache",
          },
        });
      } catch (htmlErr) {
        console.warn("HTML→PDF failed, falling back to react-pdf:", htmlErr);
      }
    }

    const stream = await renderContractPdf(contract, contract.client, company);
    const webStream = Readable.toWeb(stream as Readable) as ReadableStream;

    return new Response(webStream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename}.pdf"`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("Contract PDF generation error:", err);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}
