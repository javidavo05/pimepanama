import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { analyzePendingEmails } from "@/lib/mail/analyze-pending";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Analiza con IA los correos de la bandeja que siguen sin resumen. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY no configurada" }, { status: 503 });
    }

    const user = await requireEmpresaUser(request);
    const { id } = await params;
    const account = await prisma.mailAccount.findFirst({ where: { id, userId: user.id }, select: { id: true } });
    if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(await analyzePendingEmails(account.id));
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: err instanceof Error ? err.message : "Analysis error" }, { status: 500 });
  }
}
