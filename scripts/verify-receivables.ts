/**
 * Verificación end-to-end de Facturas / Por Cobrar / Por Pagar contra la BD real.
 * Trabaja SOLO sobre un EmpresaUser de prueba aislado y lo borra todo al final.
 */
import { prisma } from "../src/lib/prisma";
import { getReceivables } from "../src/lib/receivables";
import {
  registerInvoicePayment,
  collectSchedule,
  markDocumentPaid,
} from "../src/lib/invoice-payments";
import { syncQuoteInvoiceBalance } from "../src/lib/quote-balance";
import { INVOICE_PARTIAL_SCHEDULE_DESC } from "../src/lib/quote-balance";
import { getMonthlySummary, getLedgerEntries } from "../src/lib/ledger";
import { collectScheduleWithInvoice, collectQuoteWithInvoice } from "../src/lib/collect-receivable";
import { QUOTE_BALANCE_SCHEDULE_DESC } from "../src/lib/quote-balance";

const TAG = `verify-${Date.now()}`;
let userId = "";
let pass = 0;
let fail = 0;

function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}\n      esperado: ${JSON.stringify(expected)}\n      obtenido: ${JSON.stringify(actual)}`); }
}

async function mkInvoice(total: number, opts: { dueInDays?: number; status?: "DRAFT" | "SENT" } = {}) {
  return prisma.document.create({
    data: {
      type: "FACTURA",
      status: opts.status ?? "DRAFT",
      number: `T-${Math.random().toString(36).slice(2, 8)}`,
      title: `${TAG} factura`,
      clientName: "Cliente Prueba",
      content: {},
      total,
      subtotal: total,
      dueDate: new Date(Date.now() + (opts.dueInDays ?? 15) * 86400000),
      userId,
    },
  });
}

async function arTotal() { return (await getReceivables(userId)).total; }
async function arItems() { return (await getReceivables(userId)).items; }

async function main() {
  const before = {
    users: await prisma.empresaUser.count(),
    docs: await prisma.document.count(),
    scheds: await prisma.paymentSchedule.count(),
    exps: await prisma.expense.count(),
  };
  console.log("Estado real antes:", before);

  const user = await prisma.empresaUser.create({
    data: { supabaseUid: `${TAG}-uid`, email: `${TAG}@verify.local`, fullName: "Verificación AR" },
  });
  userId = user.id;
  console.log(`\nUsuario de prueba aislado: ${userId}\n`);

  // ── 1. Crear factura → nace la cuenta por cobrar sola ──────────────────────
  console.log("1. Crear factura sin cobro (sin proyecto ni contrato)");
  const f1 = await mkInvoice(1000);
  check("AR total = 1000", await arTotal(), 1000);
  check("1 ítem en AR", (await arItems()).length, 1);
  check("es la factura, no una cuota", (await arItems())[0].kind, "invoice");

  // ── 2. Pago parcial ────────────────────────────────────────────────────────
  console.log("\n2. Pago parcial de 400 sobre 1000");
  const r1 = await registerInvoicePayment(userId, f1.id, 400, "2026-12-01");
  check("status PARTIALLY_PAID", r1.status, "PARTIALLY_PAID");
  check("saldo 600", r1.outstanding, 600);
  check("AR total = 600", await arTotal(), 600);
  const it2 = (await arItems())[0];
  check("AR muestra el saldo, no el total", it2.amount, 600);
  check("AR muestra lo abonado", it2.amountPaid, 400);
  check("vencimiento del saldo aplicado", it2.dueDate?.toISOString().slice(0, 10), "2026-12-01");

  // ── 3. Segundo abono acumulativo ───────────────────────────────────────────
  console.log("\n3. Segundo abono de 250 (acumulativo)");
  const r2 = await registerInvoicePayment(userId, f1.id, 250);
  check("cobrado acumulado 650", r2.amountPaid, 650);
  check("AR total = 350", await arTotal(), 350);

  // ── 4. Cobrar el resto → debe desaparecer ──────────────────────────────────
  console.log("\n4. Cobrar el saldo restante (350)");
  const r3 = await registerInvoicePayment(userId, f1.id, 350);
  check("status PAID", r3.status, "PAID");
  check("AR total = 0", await arTotal(), 0);
  check("desaparece de Por Cobrar", (await arItems()).length, 0);

  // ── 5. Regresión: cuota legacy de pago parcial no debe quedar inmortal ─────
  console.log("\n5. Regresión — cuota legacy 'pago parcial' al cobrar todo");
  const f2 = await mkInvoice(500);
  await registerInvoicePayment(userId, f2.id, 200);
  await prisma.paymentSchedule.create({
    data: { userId, documentId: f2.id, description: INVOICE_PARTIAL_SCHEDULE_DESC, amount: 300, dueDate: new Date() },
  });
  check("la cuota legacy no duplica el saldo", await arTotal(), 300);
  await registerInvoicePayment(userId, f2.id, 300);
  const legacyLeft = await prisma.paymentSchedule.count({
    where: { documentId: f2.id, status: { in: ["PENDING", "OVERDUE"] } },
  });
  check("no quedan cuotas vivas", legacyLeft, 0);
  check("AR vacío tras cobrar todo", await arTotal(), 0);

  // ── 6. Doble conteo cotización ↔ factura ───────────────────────────────────
  console.log("\n6. Cotización 1000 → factura 400 → cobrado 200");
  const quote = await prisma.document.create({
    data: {
      type: "COTIZACION", status: "ACCEPTED", number: `TQ-${Date.now()}`, title: `${TAG} cot`,
      clientName: "Cliente Prueba", content: {}, total: 1000, userId,
      dueDate: new Date(Date.now() + 20 * 86400000),
    },
  });
  const f3 = await prisma.document.create({
    data: {
      type: "FACTURA", status: "SENT", number: `TF-${Date.now()}`, title: `${TAG} fac`,
      clientName: "Cliente Prueba", content: { sourceQuoteId: quote.id }, total: 400, userId,
      linkedDocumentId: quote.id, dueDate: new Date(Date.now() + 10 * 86400000),
    },
  });
  await prisma.document.update({
    where: { id: quote.id },
    data: { linkedDocumentId: f3.id, content: { linkedInvoiceId: f3.id } },
  });
  await registerInvoicePayment(userId, f3.id, 200);
  await syncQuoteInvoiceBalance(quote.id, userId);
  // real: 1000 - 200 cobrado = 800  (antes daba 1000 por doble conteo)
  check("AR total = 800 (sin doble conteo)", await arTotal(), 800);
  const kinds = (await arItems()).map((i) => `${i.kind}:${i.amount}`).sort();
  check("desglose = factura 200 + saldo no facturado 600", kinds, ["invoice:200", "schedule:600"]);
  await markDocumentPaid(userId, f3.id);
  check("tras pagar la factura queda solo lo no facturado (600)", await arTotal(), 600);

  // ── 7. Plan de cuotas sin proyecto ─────────────────────────────────────────
  console.log("\n7. Plan de cuotas sobre factura de 900, sin proyecto");
  const f4 = await mkInvoice(900);
  for (let i = 1; i <= 3; i++) {
    await prisma.paymentSchedule.create({
      data: { userId, documentId: f4.id, description: `Cuota ${i}`, amount: 300, dueDate: new Date(Date.now() + i * 30 * 86400000) },
    });
  }
  const f4items = (await arItems()).filter((i) => i.documentId === f4.id);
  check("3 cuotas listadas, sin duplicar la factura", f4items.length, 3);
  check("suma de cuotas = 900", f4items.reduce((s, i) => s + i.amount, 0), 900);
  const scheds = await prisma.paymentSchedule.findMany({ where: { documentId: f4.id }, orderBy: { dueDate: "asc" } });
  await collectSchedule(userId, scheds[0].id);
  const f4mid = await prisma.document.findUniqueOrThrow({ where: { id: f4.id } });
  check("cobrar 1 cuota acredita la factura", Number(f4mid.amountPaid), 300);
  check("factura queda PARTIALLY_PAID", f4mid.status, "PARTIALLY_PAID");
  check("AR de esa factura baja a 600", (await arItems()).filter((i) => i.documentId === f4.id).reduce((s, i) => s + i.amount, 0), 600);
  await collectSchedule(userId, scheds[1].id);
  await collectSchedule(userId, scheds[2].id);
  const f4end = await prisma.document.findUniqueOrThrow({ where: { id: f4.id } });
  check("con todas las cuotas cobradas → PAID", f4end.status, "PAID");
  check("factura sale de Por Cobrar", (await arItems()).filter((i) => i.documentId === f4.id).length, 0);

  // ── 8. Por pagar (gastos) ──────────────────────────────────────────────────
  console.log("\n8. Por pagar — gasto pendiente → pagado");
  const month = new Date().toISOString().slice(0, 7);
  const exp = await prisma.expense.create({
    data: { userId, title: `${TAG} hosting`, amount: 120, category: "HOSTING", status: "PENDING", dueDate: new Date() },
  });
  let sum = await getMonthlySummary(userId, month);
  check("aparece en 'por pagar'", sum.gastosPendientes, 120);
  check("aún no cuenta como pagado", sum.gastosPagados, 0);
  await prisma.expense.update({ where: { id: exp.id }, data: { status: "PAID", paidAt: new Date() } });
  sum = await getMonthlySummary(userId, month);
  check("tras pagar sale de 'por pagar'", sum.gastosPendientes, 0);
  check("cuenta como pagado", sum.gastosPagados, 120);
  const ledger = await getLedgerEntries(userId, { month });
  check("el libro lo registra como EGRESO", ledger.filter((e) => e.id === `exp-${exp.id}`)[0]?.type, "EGRESO");

  // ── 9. Ingresos del mes reflejan lo COBRADO, no lo facturado ───────────────
  console.log("\n9. Ingresos del mes = cobrado real");
  const f5 = await mkInvoice(1000);
  await registerInvoicePayment(userId, f5.id, 250);
  const sum2 = await getMonthlySummary(userId, month);
  // f1 1000 + f2 500 + f3 400 + f4 900 + f5 250 cobrados = 3050
  check("ingresos = suma de cobros reales (3050)", sum2.ingresos, 3050);

  // ── 10. Cobrar una cuota de cotización EMITE la factura ───────────────────
  console.log("\n10. Cobrar saldo de cotización sin factura → debe emitir factura");
  const q2 = await prisma.document.create({
    data: {
      type: "COTIZACION", status: "ACCEPTED", number: `TQ2-${Date.now()}`, title: `${TAG} cot2`,
      clientName: "Cliente Cuota", content: {}, total: 1200, userId,
      dueDate: new Date(Date.now() + 15 * 86400000),
    },
  });
  const fq2 = await prisma.document.create({
    data: {
      type: "FACTURA", status: "SENT", number: `TF2-${Date.now()}`, title: `${TAG} fac2`,
      clientName: "Cliente Cuota", content: { sourceQuoteId: q2.id }, total: 700, userId,
      linkedDocumentId: q2.id,
    },
  });
  await prisma.document.update({
    where: { id: q2.id },
    data: { linkedDocumentId: fq2.id, content: { linkedInvoiceId: fq2.id } },
  });
  await syncQuoteInvoiceBalance(q2.id, userId);
  const saldoCuota = await prisma.paymentSchedule.findFirstOrThrow({
    where: { documentId: q2.id, description: QUOTE_BALANCE_SCHEDULE_DESC, status: "PENDING" },
  });
  check("cuota de saldo = 500 (1200 - 700 facturado)", Number(saldoCuota.amount), 500);

  const facturasAntes = await prisma.document.count({ where: { userId, type: "FACTURA" } });
  const res10 = await collectScheduleWithInvoice(userId, saldoCuota.id, 500);
  const facturasDespues = await prisma.document.count({ where: { userId, type: "FACTURA" } });
  check("se emitió una factura nueva", facturasDespues - facturasAntes, 1);
  check("el resultado la reporta como creada", res10.invoiceCreated, true);
  const nueva = await prisma.document.findUniqueOrThrow({ where: { id: res10.invoiceId } });
  check("la factura nueva está PAID", nueva.status, "PAID");
  check("por el monto cobrado", Number(nueva.total), 500);
  check("cobrado = 500", Number(nueva.amountPaid ?? 0), 500);
  check("queda ligada a la cotización", nueva.linkedDocumentId, q2.id);
  const cuotaCerrada = await prisma.paymentSchedule.findUniqueOrThrow({ where: { id: saldoCuota.id } });
  check("la cuota queda PAID", cuotaCerrada.status, "PAID");
  check("la cuota apunta a la factura emitida", cuotaCerrada.invoiceId, res10.invoiceId);
  check("la cotización sale de Por Cobrar", (await arItems()).filter((i) => i.documentId === q2.id).length, 0);

  // ── 11. Cobrar una cotización sin ninguna factura ──────────────────────────
  console.log("\n11. Cobrar cotización sin factura alguna → emite factura");
  const q3 = await prisma.document.create({
    data: {
      type: "COTIZACION", status: "SENT", number: `TQ3-${Date.now()}`, title: `${TAG} cot3`,
      clientName: "Cliente Directo", content: {}, total: 800, userId,
      dueDate: new Date(Date.now() + 10 * 86400000),
    },
  });
  check("aparece en Por Cobrar como cotización", (await arItems()).filter((i) => i.documentId === q3.id)[0]?.kind, "quote");
  check("avisa que se creará factura", (await arItems()).filter((i) => i.documentId === q3.id)[0]?.willCreateInvoice, true);
  const res11 = await collectQuoteWithInvoice(userId, q3.id, 300);
  const inv11 = await prisma.document.findUniqueOrThrow({ where: { id: res11.invoiceId } });
  check("factura emitida por el monto cobrado", Number(inv11.total), 300);
  check("y queda PAID", inv11.status, "PAID");
  const restante = (await arItems()).filter((i) => i.documentId === q3.id);
  check("el saldo no facturado (500) sigue por cobrar", restante.reduce((s, i) => s + i.amount, 0), 500);

  // ── 12. Regresión: el sync no debe duplicar cuotas ni cambiar su id ───────
  console.log("\n12. Regresión — sync concurrente no duplica cuotas");
  const antesId = (await prisma.paymentSchedule.findFirstOrThrow({
    where: { documentId: q3.id, description: QUOTE_BALANCE_SCHEDULE_DESC, status: "PENDING" },
  })).id;
  await Promise.all([
    syncQuoteInvoiceBalance(q3.id, userId),
    syncQuoteInvoiceBalance(q3.id, userId),
    syncQuoteInvoiceBalance(q3.id, userId),
    syncQuoteInvoiceBalance(q3.id, userId),
  ]);
  const tras = await prisma.paymentSchedule.findMany({
    where: { documentId: q3.id, description: QUOTE_BALANCE_SCHEDULE_DESC, status: "PENDING" },
  });
  check("sigue habiendo una sola cuota", tras.length, 1);
  check("y conserva el mismo id (el botón Cobrar no se rompe)", tras[0].id, antesId);

  console.log(`\n${"─".repeat(60)}\nRESULTADO: ${pass} ✓   ${fail} ✗\n${"─".repeat(60)}`);
  return before;
}

async function cleanup() {
  if (!userId) return;
  await prisma.paymentSchedule.deleteMany({ where: { userId } });
  await prisma.task.deleteMany({ where: { userId } });
  await prisma.expense.deleteMany({ where: { userId } });
  await prisma.documentAuditLog.deleteMany({ where: { document: { userId } } });
  await prisma.document.updateMany({ where: { userId }, data: { linkedDocumentId: null } });
  await prisma.document.deleteMany({ where: { userId } });
  await prisma.empresaUser.delete({ where: { id: userId } });
  console.log("\nLimpieza: usuario de prueba y todos sus datos eliminados.");
}

let before: Record<string, number> | undefined;
main()
  .then((b) => { before = b; })
  .catch((e) => { fail++; console.error("\nERROR:", e); })
  .finally(async () => {
    await cleanup();
    const after = {
      users: await prisma.empresaUser.count(),
      docs: await prisma.document.count(),
      scheds: await prisma.paymentSchedule.count(),
      exps: await prisma.expense.count(),
    };
    console.log("Estado real después:", after);
    if (before) {
      const same = JSON.stringify(before) === JSON.stringify(after);
      console.log(same ? "✓ Datos reales intactos." : "✗ ATENCIÓN: los conteos reales cambiaron.");
    }
    await prisma.$disconnect();
    process.exit(fail > 0 ? 1 : 0);
  });
