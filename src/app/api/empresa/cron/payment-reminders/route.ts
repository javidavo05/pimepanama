import { NextRequest, NextResponse } from "next/server";
import { correrRecordatorios } from "@/lib/portal/recordatorios";

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
  const r = await correrRecordatorios();
  return NextResponse.json({ ok: true, ...r });
}

export const GET = run;
export const POST = run;
