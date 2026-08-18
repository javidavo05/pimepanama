import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { analyzeEmailForReply } from "@/lib/mail/ai-reply-analyze";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY no configurada" }, { status: 503 });
    }

    const user = await requireEmpresaUser(request);
    const { subject = "", originalBody = "" } = await request.json();

    const start = Date.now();
    const analysis = await analyzeEmailForReply(subject, originalBody);

    await prisma.aiUsageLog.create({
      data: {
        supabaseUid: user.supabaseUid,
        operation: "reply-analyze",
        model: "gpt-4o",
        inputTokens: 0,
        outputTokens: 0,
        durationMs: Date.now() - start,
      },
    });

    return NextResponse.json(analysis);
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("Reply analyze error:", err);
    return NextResponse.json({ error: "Analysis error" }, { status: 500 });
  }
}
