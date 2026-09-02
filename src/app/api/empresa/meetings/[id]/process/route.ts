import { NextRequest, NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { buildProjectContext, withManualContext, withRepoContext } from "@/lib/meetings/context";
import { findEchoes, withoutEchoes } from "@/lib/meetings/echo";
import { resolveMeetingStatus } from "@/lib/meetings/meeting-status";
import {
  getOpenAI,
  logMeetingAiUsage,
  runActionItems,
  runChapters,
  runDiarization,
  runMinutes,
  runTechnicalDeliverable,
  runTechnicalPrompt,
} from "@/lib/meetings/pipeline";
import { rebuildRosterOps } from "@/lib/meetings/roster";
import { flatten, loadSegments, replaceSegments } from "@/lib/meetings/segments";
import { buildDiarizedText } from "@/lib/meetings/transcript";
import {
  parseAttendees,
  parseTechnicalDeliverable,
  type ExecutiveMinutes,
  type MeetingSegment,
  type TechnicalMinutes,
} from "@/lib/meetings/types";
import { serializeMeetingActionItem } from "@/lib/meetings/serialize";

export const runtime = "nodejs";
export const maxDuration = 300;

const STAGES = ["diarize", "minutes", "items", "deliverable", "prompt", "chapters"] as const;
type Stage = (typeof STAGES)[number];

/**
 * Procesa la reunión por etapas. Se ejecutan una a una desde el cliente en vez
 * de todo en una llamada porque cada etapa son 1-N llamadas a GPT-4o sobre una
 * transcripción larga, y el conjunto se pasa del techo de 300 s de una función.
 * Dividirlo también deja ver el avance y reintentar una sola etapa.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const started = Date.now();
  let meetingId = "";

  try {
    const user = await requireEmpresaUser(req);
    const { id } = await params;
    meetingId = id;

    const body = await req.json().catch(() => ({}));
    const stage: Stage = STAGES.includes(body?.stage) ? body.stage : "diarize";

    const meeting = await prisma.meeting.findFirst({
      where: { id, userId: user.id },
      include: { actionItems: { orderBy: { sortOrder: "asc" } } },
    });
    if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const segments = await loadSegments(id);
    if (segments.length === 0) {
      return NextResponse.json(
        { error: "La reunión no tiene transcripción todavía." },
        { status: 400 }
      );
    }

    const attendees = parseAttendees(meeting.attendees);
    const { block, repoBlock, hasRepo } = await buildProjectContext(
      user.id,
      meeting.projectId,
      meeting.id
    );
    // El contexto del proyecto y las notas manuales se combinan: se puede grabar
    // primero y decidir después a qué proyecto pertenece la reunión y con qué
    // contexto se analiza.
    const projectContext = withManualContext(block, meeting.manualContext);
    // El código solo entra donde cambia la respuesta. Separar quién habló o
    // partir la reunión en temas no mejora por conocer el repositorio, y ese
    // bloque son miles de tokens en cada una de las llamadas de la etapa.
    const codeContext = withRepoContext(projectContext, repoBlock);
    const openai = getOpenAI();

    // El estado en el que queda la reunión no depende de la etapa que acaba de
    // correr sino de lo que ya tiene: correr solo «Minutas» no puede dejarla
    // marcada como procesando para siempre.
    const settled = (technicalPrompt: string | null = meeting.technicalPrompt) =>
      resolveMeetingStatus({ technicalPrompt, segmentCount: segments.length });

    await prisma.meeting.update({
      where: { id },
      data: { status: "PROCESSING", errorMessage: null },
    });

    // ── Etapa 1: quién dijo qué ──────────────────────────────────────────────
    if (stage === "diarize") {
      // Grabando sin audífonos, el altavoz devuelve la voz del cliente al
      // micrófono y la frase entra por los dos canales. La copia del canal local
      // se aparta antes de analizar: si no, la minuta la registra dos veces y se
      // la atribuye a quien no la dijo.
      const echoes = findEchoes(segments);
      const clean = segments.filter((_, i) => !echoes[i]);

      const result = await runDiarization(openai, clean, attendees, projectContext);
      const diarizedText = buildDiarizedText(result.data);

      // El eco no se borra, solo se excluye del análisis: sigue en la
      // transcripción por si la heurística se equivocó y hay que revisarlo.
      let next = 0;
      const merged = segments.map((seg, i) => (echoes[i] ? seg : result.data[next++]));

      await replaceSegments(id, merged);
      await prisma.$transaction([
        ...rebuildRosterOps(id, result.data, attendees),
        prisma.meeting.update({
          where: { id },
          data: {
            diarizedText,
            status: settled(),
            aiCostUSD: { increment: result.costUSD },
          },
        }),
      ]);

      await logMeetingAiUsage(
        user.supabaseUid,
        "meeting-diarize",
        result.inputTokens,
        result.outputTokens,
        Date.now() - started
      );

      return NextResponse.json({
        stage,
        diarizedText,
        speakers: [...new Set(result.data.map((s) => s.speaker ?? "Desconocido"))],
        echoesDropped: echoes.filter(Boolean).length,
        costUSD: result.costUSD,
      });
    }

    const diarizedText = meeting.diarizedText?.trim() || fallbackTranscript(meeting.transcript, segments);

    // ── Etapa 2: minuta ejecutiva + minuta técnica ───────────────────────────
    if (stage === "minutes") {
      const result = await runMinutes(openai, diarizedText, attendees, codeContext);

      await prisma.meeting.update({
        where: { id },
        data: {
          executiveMinutes: result.data.executive as unknown as object,
          technicalMinutes: result.data.technical as unknown as object,
          status: settled(),
          aiCostUSD: { increment: result.costUSD },
        },
      });

      await logMeetingAiUsage(
        user.supabaseUid,
        "meeting-minutes",
        result.inputTokens,
        result.outputTokens,
        Date.now() - started
      );

      return NextResponse.json({ stage, ...result.data, costUSD: result.costUSD });
    }

    // ── Etapa opcional: índice de temas ──────────────────────────────────────
    // Va sobre la transcripción, no sobre las minutas, así que no necesita que
    // el resto del análisis haya corrido.
    if (stage === "chapters") {
      const result = await runChapters(openai, diarizedText, meeting.durationMs, projectContext);

      await prisma.meeting.update({
        where: { id },
        data: {
          chapters: result.data as unknown as object[],
          status: settled(),
          aiCostUSD: { increment: result.costUSD },
        },
      });

      await logMeetingAiUsage(
        user.supabaseUid,
        "meeting-chapters",
        result.inputTokens,
        result.outputTokens,
        Date.now() - started
      );

      return NextResponse.json({ stage, chapters: result.data, costUSD: result.costUSD });
    }

    const technical = meeting.technicalMinutes as unknown as TechnicalMinutes | null;
    if (!technical) {
      await prisma.meeting.update({ where: { id }, data: { status: settled() } });
      return NextResponse.json(
        { error: "Genera primero las minutas: los pendientes salen de la minuta técnica." },
        { status: 400 }
      );
    }

    // ── Etapa 3: pendientes accionables ──────────────────────────────────────
    if (stage === "items") {
      const result = await runActionItems(openai, diarizedText, technical, attendees, codeContext);

      // Solo se reemplazan los pendientes que aún no se materializaron en una
      // tarea: los ya sincronizados viven en el módulo de Tareas y borrarlos
      // dejaría tareas huérfanas.
      await prisma.$transaction([
        prisma.meetingActionItem.deleteMany({ where: { meetingId: id, taskId: null, deliverableId: null } }),
        prisma.meetingActionItem.createMany({
          data: result.data.map((item, i) => ({
            meetingId: id,
            title: item.title,
            detail: item.detail ?? null,
            kind: item.kind,
            owner: item.owner ?? null,
            dueDate: item.dueDate ? new Date(`${item.dueDate}T12:00:00`) : null,
            priority: item.priority,
            acceptance: item.acceptance,
            touchpoints: item.touchpoints,
            estimateHours: item.estimateHours ?? null,
            sortOrder: i,
          })),
        }),
        prisma.meeting.update({
          where: { id },
          data: { status: settled(), aiCostUSD: { increment: result.costUSD } },
        }),
      ]);

      await logMeetingAiUsage(
        user.supabaseUid,
        "meeting-action-items",
        result.inputTokens,
        result.outputTokens,
        Date.now() - started
      );

      const items = await prisma.meetingActionItem.findMany({
        where: { meetingId: id },
        orderBy: { sortOrder: "asc" },
      });

      return NextResponse.json({
        stage,
        actionItems: items.map(serializeMeetingActionItem),
        costUSD: result.costUSD,
      });
    }

    const draftItems = () =>
      prisma.meetingActionItem
        .findMany({ where: { meetingId: id }, orderBy: { sortOrder: "asc" } })
        .then((rows) =>
          rows.map((i) => ({
            title: i.title,
            detail: i.detail ?? undefined,
            kind: i.kind,
            owner: i.owner ?? undefined,
            dueDate: i.dueDate?.toISOString().slice(0, 10) ?? null,
            priority: i.priority,
            acceptance: i.acceptance,
            touchpoints: i.touchpoints,
            estimateHours: i.estimateHours,
          }))
        );

    // ── Etapa 4: el entregable técnico ───────────────────────────────────────
    // Toda reunión deja uno. Es lo que conecta lo hablado con algo construible,
    // facturable o contratable, y es la base sobre la que se escribe el encargo.
    if (stage === "deliverable") {
      const result = await runTechnicalDeliverable(
        openai,
        diarizedText,
        technical,
        await draftItems(),
        codeContext,
        meeting.title,
        hasRepo
      );

      await prisma.meeting.update({
        where: { id },
        data: {
          technicalDeliverable: (result.data ?? undefined) as unknown as object,
          status: settled(),
          aiCostUSD: { increment: result.costUSD },
        },
      });

      await logMeetingAiUsage(
        user.supabaseUid,
        "meeting-deliverable",
        result.inputTokens,
        result.outputTokens,
        Date.now() - started
      );

      return NextResponse.json({ stage, deliverable: result.data, costUSD: result.costUSD });
    }

    // ── Etapa 5: master prompt + memoria del proyecto ────────────────────────
    const executive = meeting.executiveMinutes as unknown as ExecutiveMinutes | null;
    const result = await runTechnicalPrompt(
      openai,
      technical,
      executive?.decisions ?? [],
      await draftItems(),
      codeContext,
      meeting.title,
      parseTechnicalDeliverable(meeting.technicalDeliverable),
      hasRepo
    );

    await prisma.meeting.update({
      where: { id },
      data: {
        technicalPrompt: result.data.technicalPrompt,
        contextSummary: result.data.contextSummary,
        status: settled(result.data.technicalPrompt),
        aiCostUSD: { increment: result.costUSD },
      },
    });

    await logMeetingAiUsage(
      user.supabaseUid,
      "meeting-tech-prompt",
      result.inputTokens,
      result.outputTokens,
      Date.now() - started
    );

    return NextResponse.json({ stage: "prompt", ...result.data, costUSD: result.costUSD });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("Meeting process error:", err);
    if (meetingId) {
      await prisma.meeting
        .update({
          where: { id: meetingId },
          data: {
            status: "FAILED",
            errorMessage: err instanceof Error ? err.message.slice(0, 500) : "Error desconocido",
          },
        })
        .catch(() => undefined);
    }
    return NextResponse.json({ error: "Error procesando la reunión" }, { status: 500 });
  }
}

/** Si la diarización no corrió, se analiza la transcripción plana. */
function fallbackTranscript(transcript: string | null, segments: MeetingSegment[]): string {
  return transcript?.trim() || flatten(withoutEchoes(segments));
}
