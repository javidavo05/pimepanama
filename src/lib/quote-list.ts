import type { Prisma } from "@prisma/client";

/** Cotizaciones pagadas — solo en facturas e histórico del cliente. */
export function openQuoteWhere(userId: string): Prisma.DocumentWhereInput {
  return {
    userId,
    type: "COTIZACION",
    status: { not: "PAID" },
  };
}
