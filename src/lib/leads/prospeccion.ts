/**
 * Interruptor de la búsqueda de leads (agente de prospección diaria). Pedido de Javier, 2026-11-24: apagada por
 * defecto; se enciende desde Jarvis (nodo «Asistente»), solo el dueño.
 *
 * Apagada: las rutas de la llave «prospectos» (cargar, preparar y aprobar) responden 423 y el agente termina sin
 * buscar. Así no gasta IA (la rutina en Claude, la propuesta y la verificadora en OpenAI) ni manda correos.
 *
 * Vive en CompanyConfig.reglasCrm.prospeccionActiva (JSON ya existente: no hace falta migración).
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Una lectura por minuto basta: el cambio desde Jarvis limpia este recuerdo en la misma instancia.
let recuerdo: { valor: boolean; hasta: number } | null = null;

export async function prospeccionActiva(): Promise<boolean> {
  if (recuerdo && recuerdo.hasta > Date.now()) return recuerdo.valor;
  const c = await prisma.companyConfig.findFirst({ select: { reglasCrm: true } }).catch(() => null);
  const valor = ((c?.reglasCrm ?? {}) as Record<string, unknown>).prospeccionActiva === true;
  recuerdo = { valor, hasta: Date.now() + 60_000 };
  return valor;
}

export async function guardarProspeccion(configId: string, activa: boolean) {
  const actual = await prisma.companyConfig.findUnique({ where: { id: configId }, select: { reglasCrm: true } });
  const previo = (actual?.reglasCrm ?? {}) as Record<string, unknown>;
  await prisma.companyConfig.update({ where: { id: configId }, data: { reglasCrm: { ...previo, prospeccionActiva: activa } as object } });
  recuerdo = { valor: activa, hasta: Date.now() + 60_000 };
}

/** Respuesta para las rutas del agente cuando la búsqueda está apagada. */
export function busquedaApagada() {
  return NextResponse.json(
    { error: "La búsqueda de leads está apagada en Jarvis. No busques ni cargues nada hoy.", busquedaActiva: false },
    { status: 423 },
  );
}
