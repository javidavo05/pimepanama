import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyUser } from "@/lib/notifications/notify";
import { diaDeTarea, diaPanama, diasEntre, fechaDeDia, sumarDias } from "@/lib/crm/seguimientos-reglas";
import { DIAS_ATRASO_MAX, DIAS_PRONTO, avisoDeTarea, enlaceAviso } from "@/lib/tasks-avisos";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Revisión diaria de tareas. Vercel Cron llama con GET (antes solo existía POST y respondía 405).
 * - Vence hoy → campana + push al responsable (o al dueño si no tiene), una vez.
 * - Quedó atrasada → campana + push al responsable, una vez.
 * - Vence en los próximos 3 días → solo campana, como siempre (Task.reminderSent).
 * Para no repetir «hoy» y «atrasada», el enlace del aviso lleva la tarea y el tipo (enlaceAviso) y se busca en la
 * campana antes de enviar. Todo se lee en tres consultas, nunca una por tarea.
 */
async function run(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ahora = new Date();
  const hoy = diaPanama(ahora);
  // Margen de un día a cada lado: las tareas con hora se guardan como instante y las de todo el día a medianoche UTC.
  const desde = fechaDeDia(sumarDias(hoy, -DIAS_ATRASO_MAX - 1));
  const hasta = fechaDeDia(sumarDias(hoy, DIAS_PRONTO + 2));

  const tareas = await prisma.task.findMany({
    where: { completed: false, dueDate: { gte: desde, lt: hasta } },
    select: {
      id: true, userId: true, title: true, assignee: true, dueDate: true, allDay: true, completed: true, reminderSent: true, responsableId: true,
      responsable: { select: { fullName: true, email: true, activo: true } },
      project: { select: { name: true } },
    },
  });
  if (!tareas.length) return NextResponse.json({ ok: true, hoy: 0, atrasadas: 0, pronto: 0 });

  const enlaces = tareas.flatMap((t) => [enlaceAviso(t.id, "hoy"), enlaceAviso(t.id, "atrasada")]);
  const yaDados = new Set((await prisma.mailNotification.findMany({ where: { link: { in: enlaces } }, select: { link: true } })).map((n) => n.link));

  const cuenta = { hoy: 0, atrasadas: 0, pronto: 0 };
  const marcarPronto: string[] = [];
  const envios: Promise<unknown>[] = [];

  for (const t of tareas) {
    const aviso = avisoDeTarea(t, hoy, { hoy: yaDados.has(enlaceAviso(t.id, "hoy")), atrasada: yaDados.has(enlaceAviso(t.id, "atrasada")) });
    if (!aviso) continue;
    const quien = t.responsable ? t.responsable.fullName || t.responsable.email : t.assignee;
    const detalle = [t.project?.name, quien ? `Responsable: ${quien}` : "Sin responsable asignado"].filter(Boolean).join(" · ");
    // El push va al teléfono del responsable; si no tiene o ya no está en el equipo, al del dueño.
    const soloMiembroId = t.responsableId && t.responsable?.activo ? t.responsableId : t.userId;

    if (aviso === "pronto") {
      const dias = Math.max(1, diasEntre(hoy, diaDeTarea(t) ?? hoy));
      envios.push(notifyUser({ userId: t.userId, title: `Tarea vence en ${dias} ${dias === 1 ? "día" : "días"} — ${t.title}`, body: detalle, link: "/empresa/tareas", push: false }));
      marcarPronto.push(t.id);
      cuenta.pronto++;
      continue;
    }
    envios.push(notifyUser({
      userId: t.userId,
      soloMiembroId,
      title: aviso === "hoy" ? `Vence hoy — ${t.title}` : `Tarea atrasada — ${t.title}`,
      body: detalle,
      link: enlaceAviso(t.id, aviso),
      tag: `tarea-${t.id}`,
    }));
    if (aviso === "hoy") cuenta.hoy++;
    else cuenta.atrasadas++;
    // El aviso de «pronto» ya no hace falta para esta tarea.
    if (!t.reminderSent) marcarPronto.push(t.id);
  }

  await Promise.all(envios);
  if (marcarPronto.length) await prisma.task.updateMany({ where: { id: { in: marcarPronto } }, data: { reminderSent: true } });

  return NextResponse.json({ ok: true, ...cuenta });
}

export const GET = run;
export const POST = run;
