import { NextRequest, NextResponse } from "next/server";
import { correrRecordatorios } from "@/lib/portal/recordatorios";
import { sincronizarTodos } from "@/lib/portal/github-avance";
import { facturacionMensual } from "@/lib/portal/factura-mensual";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Tarea diaria de cobros. Vercel Cron llama con GET (antes solo había POST y respondía 405 todos los
 * días). Exige siempre CRON_SECRET: sin la variable no corre para nadie.
 */
async function run(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Los primeros días del mes: borradores de la factura de horas del mes anterior (no se envían solos).
  const horas = await facturacionMensual().catch((e) => ({ error: String(e) }));
  const r = await correrRecordatorios();
  // Respaldo diario del avance desde GitHub (el webhook lo hace al instante). Vercel Hobby permite
  // pocas tareas programadas, así que va en la misma.
  const github = await sincronizarTodos().catch((e) => ({ error: String(e) }));
  return NextResponse.json({ ok: true, ...r, horas, github });
}

export const GET = run;
export const POST = run;
