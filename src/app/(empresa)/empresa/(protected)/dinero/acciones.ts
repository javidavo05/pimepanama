"use server";

/**
 * Cobros viejos (pagados antes del registro de pagos) que solo viven en la factura: se les pone la fecha en que
 * entró el dinero y pasan a ser una fila de pago, para que el mes a mes los ubique bien (pedido de Javier,
 * 2026-10-20). No se le avisa nada al cliente: es dinero que ya conocía.
 */
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { puedeVer } from "@/lib/auth/permisos";
import { pagadoEfectivo } from "@/lib/portal/saldo";
import { recalcularFactura } from "@/lib/portal/empresa";
import { PAGO_METODO_LABEL } from "@/lib/portal/estados";

export type CobroConFecha = { documentId: string; fecha: string; metodo: string };

export async function fecharCobrosViejosAction(cobros: CobroConFecha[]): Promise<{ ok: number } | { error: string }> {
  const u = await getEmpresaUser();
  if (!puedeVer(u.miembro.area, "dinero")) return { error: "Tu área no maneja el dinero." };
  if (!cobros.length) return { error: "No hay cobros que fechar." };
  const hoy = new Date().toISOString().slice(0, 10);
  for (const c of cobros) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(c.fecha) || c.fecha > hoy) return { error: "Una de las fechas no es válida o está en el futuro." };
    if (!(c.metodo in PAGO_METODO_LABEL)) return { error: "Uno de los métodos de pago no es válido." };
  }
  let ok = 0;
  try {
    for (const c of cobros) {
      const f = await prisma.document.findFirst({ where: { id: c.documentId, userId: u.id, type: "FACTURA" }, select: { id: true, status: true, total: true, amountPaid: true, clientId: true, payments: { where: { status: "confirmado" }, select: { documentId: true, amount: true, status: true } } } });
      if (!f || f.status === "DRAFT" || f.status === "CANCELLED") continue;
      const enFilas = f.payments.reduce((a, p) => a + Number(p.amount), 0);
      const viejo = Math.round((pagadoEfectivo(f, f.payments) - enFilas) * 100) / 100;
      if (viejo <= 0.005) continue;
      await prisma.payment.create({ data: { userId: u.id, clientId: f.clientId, documentId: f.id, amount: viejo, paidAt: new Date(`${c.fecha}T12:00:00Z`), method: c.metodo, status: "confirmado", note: "Cobro anterior al registro de pagos; fecha puesta en Dinero", recordedByEmpresaUserId: u.id, confirmedAt: new Date() } });
      await recalcularFactura(f.id);
      ok++;
    }
  } catch (e) {
    console.error("[dinero] fechar cobros", e);
    return { error: ok ? `Se guardaron ${ok}, pero falló uno. Vuelve a intentar con los que quedan.` : "No se pudieron guardar las fechas. No se cambió nada." };
  } finally {
    ["/empresa", "/empresa/dinero", "/empresa/facturas", "/empresa/reportes", "/empresa/clientes"].forEach((p) => revalidatePath(p));
  }
  return { ok };
}
