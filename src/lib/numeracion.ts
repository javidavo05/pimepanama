import { prisma } from "@/lib/prisma";
import type { DocumentType, Prisma } from "@prisma/client";

/**
 * Número siguiente de un documento: el mayor ya usado con ese prefijo y año, más uno. Antes se contaba
 * cuántos documentos había (count + 1), y al borrar uno el siguiente repetía un número existente.
 */
export async function siguienteNumero(userId: string, type: DocumentType, prefix: string, tx: Prisma.TransactionClient | typeof prisma = prisma): Promise<string> {
  const year = new Date().getFullYear();
  const base = `${prefix}-${year}-`;
  const filas = await tx.document.findMany({ where: { userId, type, number: { startsWith: base } }, select: { number: true } });
  const max = filas.reduce((m, f) => Math.max(m, Number(f.number?.slice(base.length)) || 0), 0);
  return `${base}${String(max + 1).padStart(4, "0")}`;
}
