import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { analyzeEmail } from "@/lib/mail/ai-analyze";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY no configurada" }, { status: 503 });
    }

    const user = await requireEmpresaUser(request);
    const { id } = await params;
    const email = await prisma.inboxEmail.findFirst({ where: { id, userId: user.id } });
    if (!email) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const analysis = await analyzeEmail(email.subject ?? "", email.bodyText ?? "");

    const updated = await prisma.inboxEmail.update({
      where: { id },
      data: { aiSummary: analysis.summary, aiTags: analysis.tags },
      select: { id: true, aiSummary: true, aiTags: true },
    });

    // Log AI usage
    await prisma.aiUsageLog.create({
      data: {
        supabaseUid: user.supabaseUid,
        operation: "mail-analyze",
        model: "gpt-4o",
        inputTokens: 0,
        outputTokens: 0,
        durationMs: 0,
      },
    });

    // Create notification if urgent
    if (analysis.urgency === "high" || analysis.tags.includes("urgent")) {
      await prisma.mailNotification.create({
        data: {
          userId: user.id,
          emailId: id,
          title: `🔴 Urgente: ${email.subject ?? "Sin asunto"}`,
          body: analysis.summary,
        },
      });
    }

    return NextResponse.json({ ...updated, urgency: analysis.urgency, suggestedAction: analysis.suggestedAction, costUSD: analysis.costUSD });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "Analysis error" }, { status: 500 });
  }
}
