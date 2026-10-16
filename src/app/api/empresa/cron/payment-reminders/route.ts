import { NextRequest, NextResponse } from "next/server";
import { correrRecordatorios } from "@/lib/portal/recordatorios";
import { facturacionMensual } from "@/lib/portal/factura-mensual";
import { correrSeguimientos } from "@/lib/crm/seguimientos";
import { facturarMantenimientos } from "@/lib/crm/mantenimiento";

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
  // Mantenimiento mensual de los proyectos: borrador el día elegido (tampoco se envía solo).
  const mantenimiento = await facturarMantenimientos().catch((e) => ({ error: String(e) }));
  const r = await correrRecordatorios();
  // Seguimientos del CRM: el del lead el día que toca y las reglas de Configuración → Seguimientos.
  const seguimientos = await correrSeguimientos().catch((e) => ({ error: String(e) }));
  // El avance desde GitHub ya no va aquí: lo mueve la revisión única de cada 30 min (motor/sistemas.ts).
  return NextResponse.json({ ok: true, ...r, horas, mantenimiento, seguimientos });
}

export const GET = run;
export const POST = run;
