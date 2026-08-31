import { NextResponse } from "next/server";
import { withEmpresaIdRoute } from "@/app/api/empresa/_route";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { serializeMeetingActionItem } from "@/lib/meetings/serialize";

export const runtime = "nodejs";

const KINDS = ["TECNICO", "COMERCIAL", "ADMINISTRATIVO", "DECISION", "RIESGO"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH"];

/** Crea un pendiente a mano sobre una reunión ya procesada. */
export const POST = withEmpresaIdRoute(async (req, { params }) => {
  const user = await requireEmpresaUser(req);
  const { id } = await params;

  const meeting = await prisma.meeting.findFirst({
    where: { id, userId: user.id },
    select: { id: true, _count: { select: { actionItems: true } } },
  });
  if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return NextResponse.json({ error: "El título es obligatorio" }, { status: 400 });

  const item = await prisma.meetingActionItem.create({
    data: {
      meetingId: id,
      title,
      detail: typeof body.detail === "string" && body.detail.trim() ? body.detail.trim() : null,
      kind: KINDS.includes(body.kind) ? body.kind : "TECNICO",
      priority: PRIORITIES.includes(body.priority) ? body.priority : "MEDIUM",
      owner: typeof body.owner === "string" && body.owner.trim() ? body.owner.trim() : null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      acceptance: Array.isArray(body.acceptance) ? body.acceptance.map(String) : [],
      touchpoints: Array.isArray(body.touchpoints) ? body.touchpoints.map(String) : [],
      sortOrder: meeting._count.actionItems,
    },
  });

  return NextResponse.json(serializeMeetingActionItem(item), { status: 201 });
});

/** Edita un pendiente. El id del pendiente va en el body para no anidar otra ruta. */
export const PATCH = withEmpresaIdRoute(async (req, { params }) => {
  const user = await requireEmpresaUser(req);
  const { id } = await params;
  const body = await req.json();

  const itemId = typeof body.itemId === "string" ? body.itemId : "";
  const existing = await prisma.meetingActionItem.findFirst({
    where: { id: itemId, meeting: { id, userId: user.id } },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim();
  if (typeof body.detail === "string") data.detail = body.detail.trim() || null;
  if (typeof body.owner === "string") data.owner = body.owner.trim() || null;
  if (KINDS.includes(body.kind)) data.kind = body.kind;
  if (PRIORITIES.includes(body.priority)) data.priority = body.priority;
  if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  if (Array.isArray(body.acceptance)) data.acceptance = body.acceptance.map(String);
  if (Array.isArray(body.touchpoints)) data.touchpoints = body.touchpoints.map(String);

  const item = await prisma.meetingActionItem.update({ where: { id: itemId }, data });
  return NextResponse.json(serializeMeetingActionItem(item));
});

export const DELETE = withEmpresaIdRoute(async (req, { params }) => {
  const user = await requireEmpresaUser(req);
  const { id } = await params;
  const itemId = req.nextUrl.searchParams.get("itemId") ?? "";

  const existing = await prisma.meetingActionItem.findFirst({
    where: { id: itemId, meeting: { id, userId: user.id } },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.meetingActionItem.delete({ where: { id: itemId } });
  return NextResponse.json({ ok: true });
});
