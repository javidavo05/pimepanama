import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { renderDocumentPdf } from "@/lib/pdf/render";
import { Readable } from "stream";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireEmpresaUser(request);

    const doc = await prisma.document.findFirst({
      where: { id, userId: user.id },
    });

    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const company = user.configId
      ? await prisma.companyConfig.findUnique({ where: { id: user.configId } })
      : null;

    const stream = await renderDocumentPdf(doc, company);

    const filename = `${doc.number ?? doc.id}.pdf`
      .replace(/\s+/g, "-")
      .replace(/[^\w.-]/g, "");

    // Convert Node.js Readable stream to web ReadableStream
    const webStream = Readable.toWeb(stream as Readable) as ReadableStream;

    return new Response(webStream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("PDF generation error:", err);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}
