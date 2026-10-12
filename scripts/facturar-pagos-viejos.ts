/**
 * Factura los pagos confirmados que todavía no tienen factura (pagos de antes de la regla «todo pago con
 * factura», 2026-10-12). Cada factura queda emitida en la cuenta del cliente; no se envía nada.
 *   - Pago con fase o proyecto → a la factura de esa fase o proyecto (motor/pagos.ts).
 *   - Si no → una factura suelta por el monto, ya pagada, con la fecha del pago como fecha de emisión.
 * No toca pagos con factura ni a la empresa interna. Es idempotente: un pago ya facturado no vuelve a entrar.
 *
 *   npx tsx --env-file=.env.local scripts/facturar-pagos-viejos.ts                 # solo lista (no escribe)
 *   npx tsx --env-file=.env.local scripts/facturar-pagos-viejos.ts --aplicar       # factura y anota en el registro
 *   npx tsx --env-file=.env.local scripts/facturar-pagos-viejos.ts --deshacer      # deshace lo anotado en el registro
 * Opciones: --cliente <id> (solo ese cliente), --lista <archivo.json>, --registro <archivo.json>.
 */
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { prisma } from "../src/lib/prisma";
import { facturarPagosSinFactura, borrarFacturaSiQuedoVacia } from "../src/lib/motor/pagos";

const arg = (k: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const aplicar = process.argv.includes("--aplicar");
const deshacer = process.argv.includes("--deshacer");
const cliente = arg("--cliente");
const lista = arg("--lista") ?? "pagos-sin-factura.json";
const registro = arg("--registro") ?? "facturas-de-pagos-viejos.json";

type Hecho = { pagoId: string; facturaId: string; creada: boolean };

async function main() {
  if (deshacer) {
    if (!existsSync(registro)) throw new Error(`No existe el registro ${registro}.`);
    const hechos = JSON.parse(readFileSync(registro, "utf8")) as Hecho[];
    let borradas = 0;
    for (const h of [...hechos].reverse()) {
      const pg = await prisma.payment.findUnique({ where: { id: h.pagoId }, select: { documentId: true, userId: true } });
      if (!pg || pg.documentId !== h.facturaId) continue; // ya se movió a mano: no se toca
      await prisma.payment.update({ where: { id: h.pagoId }, data: { documentId: null } });
      if (h.creada && (await borrarFacturaSiQuedoVacia(pg.userId, h.facturaId))) borradas++;
      else { const { recalcularFactura } = await import("../src/lib/portal/empresa"); await recalcularFactura(h.facturaId); }
    }
    console.log(`Deshecho: ${hechos.length} pagos sin factura otra vez, ${borradas} facturas borradas.`);
    return;
  }

  const pagos = await prisma.payment.findMany({
    where: { documentId: null, status: "confirmado", clientId: cliente ?? { not: null }, client: { internal: false } },
    orderBy: { paidAt: "asc" },
    select: { id: true, userId: true, amount: true, paidAt: true, phaseId: true, projectId: true, client: { select: { id: true, name: true, company: true, portalUsers: { where: { status: "activo" }, select: { id: true } } } } },
  });
  const filas = pagos.map((p) => ({ pagoId: p.id, clienteId: p.client!.id, cliente: p.client!.company || p.client!.name, monto: Number(p.amount), fecha: p.paidAt.toISOString().slice(0, 10), faseId: p.phaseId, proyectoId: p.projectId, conCuenta: p.client!.portalUsers.length > 0 }));
  writeFileSync(lista, JSON.stringify(filas, null, 2));
  console.log(`${filas.length} pagos confirmados sin factura (lista en ${lista}).`);
  for (const f of filas) console.log(`  ${f.fecha} · ${f.cliente} · USD ${f.monto.toFixed(2)}${f.faseId ? " · con fase" : f.proyectoId ? " · con proyecto" : " · suelto"}`);
  if (!aplicar || !filas.length) return;

  const hechos: Hecho[] = existsSync(registro) ? JSON.parse(readFileSync(registro, "utf8")) : [];
  const porEquipo = new Map<string, string[]>();
  for (const p of pagos) porEquipo.set(p.userId, [...(porEquipo.get(p.userId) ?? []), p.id]);
  for (const [userId, ids] of porEquipo) {
    const u = await prisma.empresaUser.findUniqueOrThrow({ where: { id: userId }, include: { config: true } });
    const r = await facturarPagosSinFactura(u, ids);
    hechos.push(...r);
    writeFileSync(registro, JSON.stringify(hechos, null, 2)); // se anota a medida que avanza
  }
  const creadas = new Set(hechos.filter((h) => h.creada).map((h) => h.facturaId));
  const clientes = new Set(filas.map((f) => f.cliente));
  console.log(`Listo: ${hechos.length} pagos facturados, ${creadas.size} facturas nuevas, ${clientes.size} clientes. Registro en ${registro}.`);
  console.log(`Clientes sin cuenta en el portal: ${new Set(filas.filter((f) => !f.conCuenta).map((f) => f.cliente)).size}.`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
