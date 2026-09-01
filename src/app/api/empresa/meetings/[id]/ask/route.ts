import { NextResponse } from "next/server";
import { withEmpresaIdRoute } from "@/app/api/empresa/_route";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { buildProjectContext, withManualContext } from "@/lib/meetings/context";
import { getOpenAI, logMeetingAiUsage, runAsk } from "@/lib/meetings/pipeline";
import { flatten, loadSegments } from "@/lib/meetings/segments";
import { parseAttendees } from "@/lib/meetings/types";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Preguntas sobre lo que se dijo en la reunión, respondidas con citas y el
 * minuto exacto. Existe porque la minuta resume y a veces lo que uno necesita es
 * el detalle: qué dijo exactamente el cliente sobre el precio, si se habló o no
 * de un plazo. La cita con timestamp permite ir a escucharlo y comprobarlo.
 */
export const POST = withEmpresaIdRoute(async (req, { params }) => {
  const started = Date.now();
  const user = await requireEmpresaUser(req);
  const { id } = await params;

  const meeting = await prisma.meeting.findFirst({
    where: { id, userId: user.id },
    select: {
      id: true,
      projectId: true,
      attendees: true,
      manualContext: true,
      diarizedText: true,
      transcript: true,
    },
  });
  if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const question = typeof body.question === "string" ? body.question.trim().slice(0, 1000) : "";
  if (!question) {
    return NextResponse.json({ error: "Escribe una pregunta." }, { status: 400 });
  }

  const transcript =
    meeting.diarizedText?.trim() ||
    meeting.transcript?.trim() ||
    flatten(await loadSegments(id));
  if (!transcript) {
    return NextResponse.json(
      { error: "Esta reunión no tiene transcripción todavía." },
      { status: 400 }
    );
  }

  const { block } = await buildProjectContext(user.id, meeting.projectId, meeting.id);
  const projectContext = withManualContext(block, meeting.manualContext);

  const result = await runAsk(
    getOpenAI(),
    transcript,
    question,
    parseAttendees(meeting.attendees),
    projectContext
  );

  await prisma.meeting.update({
    where: { id },
    data: { aiCostUSD: { increment: result.costUSD } },
  });
  await logMeetingAiUsage(
    user.supabaseUid,
    "meeting-ask",
    result.inputTokens,
    result.outputTokens,
    Date.now() - started
  );

  return NextResponse.json({ ...result.data, costUSD: result.costUSD });
});
