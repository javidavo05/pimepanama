import { NextResponse } from "next/server";
import OpenAI from "openai";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const user = await requireEmpresaUser(request);
    const { rawNotes, language = "es" } = await request.json();

    if (!rawNotes?.trim()) {
      return NextResponse.json({ error: "rawNotes is required" }, { status: 400 });
    }

    const lang = language === "en" ? "professional English" : "formal Panamanian Spanish";

    const start = Date.now();
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a corporate secretary for a Panamanian technology company. Restructure the provided meeting notes into a formal business log. Respond entirely in ${lang}. Return a JSON object with these exact keys: "agenda" (string — summary of topics discussed), "decisions" (array of strings — key decisions made), "actionItems" (array of objects with "task", "owner", "due" keys), "nextMeeting" (string — next steps or next meeting info). Be concise and professional.`,
        },
        { role: "user", content: rawNotes },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
      temperature: 0.3,
    });

    const usage = response.usage;
    const content = JSON.parse(response.choices[0]?.message?.content ?? "{}");

    await prisma.aiUsageLog.create({
      data: {
        supabaseUid: user.supabaseUid,
        operation: "restructure",
        model: "gpt-4o",
        inputTokens: usage?.prompt_tokens ?? 0,
        outputTokens: usage?.completion_tokens ?? 0,
        durationMs: Date.now() - start,
      },
    });

    return NextResponse.json(content);
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("Restructure error:", err);
    return NextResponse.json({ error: "AI service error" }, { status: 500 });
  }
}
