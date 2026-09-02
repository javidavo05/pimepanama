import { NextResponse } from "next/server";
import { withEmpresaIdRoute } from "@/app/api/empresa/_route";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { buildProjectContext, withManualContext, withRepoContext } from "@/lib/meetings/context";
import {
  describeDeliverable,
  getOpenAI,
  logMeetingAiUsage,
  runContractDraft,
} from "@/lib/meetings/pipeline";
import {
  generateProposalContent,
  ProposalGenerationError,
} from "@/lib/pdf/proposal-generate";
import {
  parseTechnicalDeliverable,
  type ExecutiveMinutes,
  type TechnicalDeliverable,
} from "@/lib/meetings/types";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Convierte el entregable técnico de la reunión en algo que existe en el
 * sistema: un entregable del proyecto, un borrador de propuesta comercial y/o un
 * borrador de contrato.
 *
 * Es el paso que cierra el circuito. Sin él, el entregable se queda como texto
 * en una pantalla y alguien tiene que volver a teclearlo en el módulo que
 * corresponda. Cada salida es idempotente: lo que ya se materializó no se
 * duplica al volver a pulsar.
 */

function deliverableDescription(d: TechnicalDeliverable): string {
  const parts = [d.summary];
  if (d.scope.length > 0) parts.push(`Alcance:\n${d.scope.map((s) => `- ${s}`).join("\n")}`);
  if (d.acceptance.length > 0) {
    parts.push(`Criterios de aceptación:\n${d.acceptance.map((a) => `- ${a}`).join("\n")}`);
  }
  if (d.outOfScope.length > 0) {
    parts.push(`Fuera de alcance:\n${d.outOfScope.map((o) => `- ${o}`).join("\n")}`);
  }
  if (d.touchedAreas.length > 0) parts.push(`Toca: ${d.touchedAreas.join(", ")}`);
  return parts.filter(Boolean).join("\n\n");
}

export const POST = withEmpresaIdRoute(async (req, { params }) => {
  const started = Date.now();
  const user = await requireEmpresaUser(req);
  const { id } = await params;

  const meeting = await prisma.meeting.findFirst({
    where: { id, userId: user.id },
    include: {
      project: { include: { client: { select: { name: true, company: true } } } },
    },
  });
  if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const deliverable = parseTechnicalDeliverable(meeting.technicalDeliverable);
  if (!deliverable) {
    return NextResponse.json(
      { error: "Corre primero la etapa «Entregable»: no hay nada que materializar." },
      { status: 400 }
    );
  }
  if (!meeting.project) {
    return NextResponse.json(
      { error: "La reunión no está ligada a un proyecto. Asígnale uno para poder materializarla." },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const wants = {
    deliverable: body.deliverable === true,
    proposal: body.proposal === true,
    contract: body.contract === true,
  };
  if (!wants.deliverable && !wants.proposal && !wants.contract) {
    return NextResponse.json({ error: "No se seleccionó ninguna salida." }, { status: 400 });
  }

  const done: string[] = [];
  const skipped: string[] = [];
  let costUSD = 0;

  // ── Entregable del proyecto ────────────────────────────────────────────────
  if (wants.deliverable) {
    if (meeting.deliverableId) {
      skipped.push("El entregable del proyecto ya se había creado.");
    } else {
      const count = await prisma.deliverable.count({ where: { projectId: meeting.project.id } });
      const created = await prisma.deliverable.create({
        data: {
          projectId: meeting.project.id,
          name: deliverable.title,
          description: deliverableDescription(deliverable),
          sortOrder: count,
          source: "AI_MEETING",
        },
      });
      await prisma.meeting.update({ where: { id }, data: { deliverableId: created.id } });
      done.push("Entregable creado en el proyecto.");
    }
  }

  // El contexto —incluido el mapa del repositorio— se arma una vez y lo comparten
  // la propuesta y el contrato.
  const needsContext = wants.proposal || wants.contract;
  let projectContext = "";
  if (needsContext) {
    const ctx = await buildProjectContext(user.id, meeting.projectId, meeting.id);
    projectContext = withRepoContext(
      withManualContext(ctx.block, meeting.manualContext),
      ctx.repoBlock
    );
  }

  // ── Borrador de propuesta comercial ────────────────────────────────────────
  if (wants.proposal) {
    if (meeting.proposalDraftedAt) {
      skipped.push("La propuesta ya se había redactado desde esta reunión.");
    } else {
      try {
        const { content, costUSD: proposalCost } = await generateProposalContent({
          project: meeting.project,
          // El entregable acordado manda sobre la descripción vieja del proyecto:
          // es lo más reciente que se sabe del alcance.
          extraNotes: `Lo acordado en la reunión "${meeting.title}" del ${meeting.meetingDate.toISOString().slice(0, 10)}:\n\n${describeDeliverable(deliverable)}`,
          language: meeting.language,
          supabaseUid: user.supabaseUid,
        });
        costUSD += proposalCost;

        await prisma.project.update({
          where: { id: meeting.project.id },
          data: { proposalContent: content as unknown as object },
        });
        await prisma.meeting.update({ where: { id }, data: { proposalDraftedAt: new Date() } });
        done.push("Borrador de propuesta comercial redactado en el proyecto.");
      } catch (err) {
        if (err instanceof ProposalGenerationError) {
          skipped.push(`Propuesta: ${err.message}`);
        } else {
          throw err;
        }
      }
    }
  }

  // ── Borrador de contrato ───────────────────────────────────────────────────
  if (wants.contract) {
    if (meeting.contractId) {
      skipped.push("El contrato ya se había redactado desde esta reunión.");
    } else {
      const executive = meeting.executiveMinutes as unknown as ExecutiveMinutes | null;
      const draft = await runContractDraft(
        getOpenAI(),
        deliverable,
        executive?.decisions ?? [],
        projectContext,
        meeting.title
      );
      costUSD += draft.costUSD;

      const contract = await prisma.contract.create({
        data: {
          userId: user.id,
          projectId: meeting.project.id,
          clientId: meeting.clientId ?? meeting.project.clientId,
          title: draft.data.title,
          description: draft.data.description,
          responsibilities: draft.data.responsibilities,
          terms: draft.data.terms,
          status: "DRAFT",
        },
      });

      await prisma.meeting.update({ where: { id }, data: { contractId: contract.id } });
      await logMeetingAiUsage(
        user.supabaseUid,
        "meeting-contract-draft",
        draft.inputTokens,
        draft.outputTokens,
        Date.now() - started
      );
      done.push("Borrador de contrato creado.");
    }
  }

  if (costUSD > 0) {
    await prisma.meeting.update({ where: { id }, data: { aiCostUSD: { increment: costUSD } } });
  }

  const refreshed = await prisma.meeting.findUnique({
    where: { id },
    select: { deliverableId: true, proposalDraftedAt: true, contractId: true, projectId: true },
  });

  return NextResponse.json({
    done,
    skipped,
    costUSD,
    deliverableId: refreshed?.deliverableId ?? null,
    contractId: refreshed?.contractId ?? null,
    proposalDraftedAt: refreshed?.proposalDraftedAt?.toISOString() ?? null,
    projectId: refreshed?.projectId ?? null,
  });
});
