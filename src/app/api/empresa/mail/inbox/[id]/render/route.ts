import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { buildEmailSrcDoc, isHtmlEmail } from "@/lib/mail/email-html";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireEmpresaUser(request);
    const { id } = await params;

    const email = await prisma.inboxEmail.findFirst({
      where: { id, userId: user.id },
      select: { bodyText: true },
    });
    if (!email) return new NextResponse("Not found", { status: 404 });

    const body = email.bodyText ?? "";
    if (!body || !isHtmlEmail(body)) {
      return new NextResponse("<p>(Sin contenido HTML)</p>", {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const html = buildEmailSrcDoc(body, { proxyImages: true });

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return new NextResponse("Error", { status: 500 });
  }
}
