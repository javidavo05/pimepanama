import { prisma } from "@/lib/prisma";
import { INVOICE_PARTIAL_SCHEDULE_DESC, QUOTE_BALANCE_SCHEDULE_DESC } from "@/lib/quote-balance";

/**
 * Fuente de verdad única de Cuentas por Cobrar.
 *
 * Rendimiento: cada viaje al pooler de Supabase cuesta ~600 ms, así que todo
 * se trae en DOS consultas paralelas y se calcula en memoria. La conciliación
 * de saldos de cotización se hace sobre esos mismos datos y solo escribe
 * cuando algo cambió de verdad — antes eran ~30 viajes en serie (>10 s).
 *
 * Reglas (sin doble conteo):
 *  - Factura abierta aporta su SALDO: `total - amountPaid`. Nunca el total.
 *  - Las cuotas pendientes de una factura son el desglose de ese saldo:
 *    se listan ellas y la factura solo aporta el residuo.
 *  - Cotización sin factura vinculada aporta su total. Si ya tiene factura,
 *    aporta solo la porción NO facturada, vía su cuota de saldo.
 *  - Las cuotas legacy "saldo por pago parcial" se ignoran: ese saldo ya vive
 *    en la propia factura.
 */

export const OPEN_INVOICE_STATUSES = ["DRAFT", "SENT", "ACCEPTED", "PARTIALLY_PAID"] as const;

export type ReceivableKind = "invoice" | "quote" | "schedule";

export type ReceivableItem = {
  id: string;
  kind: ReceivableKind;
  label: string;
  client: string;
  amount: number;
  documentTotal: number;
  amountPaid: number;
  dueDate: Date | null;
  daysLeft: number | null;
  status: string;
  documentId: string;
  documentType: "FACTURA" | "COTIZACION";
  scheduleId: string | null;
  projectName: string | null;
  currency: string;
  /** Cobrar este ítem emitirá una factura nueva (no hay una detrás todavía). */
  willCreateInvoice: boolean;
  href: string;
};

export type ReceivablesResult = {
  items: ReceivableItem[];
  total: number;
  overdue: number;
  due7d: number;
  due30d: number;
};

const round2 = (n: number) => Math.round(n * 100) / 100;
const daysDiff = (d: Date, now: Date) => Math.ceil((d.getTime() - now.getTime()) / 86400000);
const clientLabel = (name: string | null, company: string | null) =>
  [name, company].filter(Boolean).join(" — ");

const DOC_SELECT = {
  id: true,
  type: true,
  number: true,
  status: true,
  total: true,
  amountPaid: true,
  dueDate: true,
  validUntil: true,
  issueDate: true,
  content: true,
  currency: true,
  clientName: true,
  clientCompany: true,
  linkedDocumentId: true,
  project: { select: { id: true, name: true } },
} as const;

type DocRow = Awaited<ReturnType<typeof fetchDocs>>[number];
type SchedRow = Awaited<ReturnType<typeof fetchSchedules>>[number];

function fetchDocs(userId: string) {
  return prisma.document.findMany({
    where: { userId, type: { in: ["FACTURA", "COTIZACION"] } },
    select: DOC_SELECT,
    orderBy: [{ dueDate: "asc" }, { issueDate: "asc" }],
  });
}

function fetchSchedules(userId: string) {
  return prisma.paymentSchedule.findMany({
    where: { userId, status: { in: ["PENDING", "OVERDUE"] } },
    orderBy: { createdAt: "asc" },
  });
}

function sourceQuoteId(doc: DocRow): string | null {
  const raw = (doc.content as Record<string, unknown> | null)?.sourceQuoteId;
  return typeof raw === "string" ? raw : doc.linkedDocumentId;
}

function collectedOf(inv: DocRow): number {
  if (inv.status === "PAID") return Number(inv.total ?? 0);
  if (inv.status === "PARTIALLY_PAID") return Number(inv.amountPaid ?? 0);
  return 0;
}

/**
 * Concilia en memoria los saldos de cotización y devuelve las escrituras
 * necesarias. Sin cambios pendientes no toca la base de datos.
 */
async function reconcileInMemory(
  userId: string,
  docs: DocRow[],
  schedules: SchedRow[]
): Promise<{ schedules: SchedRow[]; docsChanged: Map<string, string> }> {
  const quotes = docs.filter((d) => d.type === "COTIZACION");
  const invoices = docs.filter((d) => d.type === "FACTURA");

  const invoicesByQuote = new Map<string, DocRow[]>();
  for (const inv of invoices) {
    const qid = sourceQuoteId(inv);
    if (!qid) continue;
    invoicesByQuote.set(qid, [...(invoicesByQuote.get(qid) ?? []), inv]);
  }

  const balanceByQuote = new Map<string, SchedRow[]>();
  for (const s of schedules) {
    if (s.description !== QUOTE_BALANCE_SCHEDULE_DESC) continue;
    balanceByQuote.set(s.documentId, [...(balanceByQuote.get(s.documentId) ?? []), s]);
  }

  const toDelete: string[] = [];
  const toUpdate: { id: string; amount: number }[] = [];
  const toCreate: { userId: string; documentId: string; description: string; amount: number; dueDate: Date }[] = [];
  const docsChanged = new Map<string, string>();

  for (const quote of quotes) {
    const linked = invoicesByQuote.get(quote.id) ?? [];
    if (linked.length === 0) continue;

    const quoteTotal = Number(quote.total ?? 0);
    const invoicedTotal = linked.reduce((s, i) => s + Number(i.total ?? 0), 0);
    const collected = linked.reduce((s, i) => s + collectedOf(i), 0);
    const uninvoiced = Math.max(0, round2(quoteTotal - invoicedTotal));
    const existing = balanceByQuote.get(quote.id) ?? [];

    if (uninvoiced > 0.01) {
      const [keep, ...extra] = existing;
      if (keep) {
        if (Math.abs(Number(keep.amount) - uninvoiced) > 0.001) {
          toUpdate.push({ id: keep.id, amount: uninvoiced });
        }
      } else {
        toCreate.push({
          userId,
          documentId: quote.id,
          description: QUOTE_BALANCE_SCHEDULE_DESC,
          amount: uninvoiced,
          dueDate: quote.dueDate ?? quote.validUntil ?? new Date(Date.now() + 30 * 86400000),
        });
      }
      toDelete.push(...extra.map((e) => e.id));
      if (quote.status === "PAID") docsChanged.set(quote.id, "ACCEPTED");
    } else {
      toDelete.push(...existing.map((e) => e.id));
      const allPaid = linked.every((i) => i.status === "PAID");
      if (allPaid && collected >= quoteTotal - 0.01 && quote.status !== "PAID") {
        docsChanged.set(quote.id, "PAID");
      }
    }
  }

  const hasWrites = toDelete.length > 0 || toUpdate.length > 0 || toCreate.length > 0 || docsChanged.size > 0;
  if (!hasWrites) return { schedules, docsChanged };

  // Una sola ida y vuelta para todos los ajustes.
  await prisma.$transaction([
    ...(toDelete.length ? [prisma.paymentSchedule.deleteMany({ where: { id: { in: toDelete } } })] : []),
    ...toUpdate.map((u) =>
      prisma.paymentSchedule.update({ where: { id: u.id }, data: { amount: u.amount } })
    ),
    ...toCreate.map((c) => prisma.paymentSchedule.create({ data: c })),
    ...[...docsChanged.entries()].map(([id, status]) =>
      prisma.document.update({ where: { id }, data: { status: status as "PAID" | "ACCEPTED" } })
    ),
  ]);

  // Refleja los cambios en memoria en vez de releer.
  let next = schedules.filter((s) => !toDelete.includes(s.id));
  next = next.map((s) => {
    const upd = toUpdate.find((u) => u.id === s.id);
    return upd ? { ...s, amount: upd.amount as unknown as SchedRow["amount"] } : s;
  });
  if (toCreate.length > 0) {
    const created = await prisma.paymentSchedule.findMany({
      where: {
        userId,
        status: { in: ["PENDING", "OVERDUE"] },
        documentId: { in: toCreate.map((c) => c.documentId) },
        description: QUOTE_BALANCE_SCHEDULE_DESC,
      },
    });
    next = [...next.filter((s) => !created.some((c) => c.id === s.id)), ...created];
  }

  for (const [id, status] of docsChanged) {
    const d = docs.find((x) => x.id === id);
    if (d) (d as { status: string }).status = status;
  }

  return { schedules: next, docsChanged };
}

export async function getReceivables(
  userId: string,
  now: Date = new Date()
): Promise<ReceivablesResult> {
  const [allDocs, rawSchedules] = await Promise.all([fetchDocs(userId), fetchSchedules(userId)]);

  const { schedules } = await reconcileInMemory(userId, allDocs, rawSchedules);

  const docsById = new Map(allDocs.map((d) => [d.id, d]));

  // Las cuotas legacy de "pago parcial" duplican el saldo de la propia factura.
  const liveSchedules = schedules.filter((s) => s.description !== INVOICE_PARTIAL_SCHEDULE_DESC);

  const scheduledByDoc = new Map<string, number>();
  for (const s of liveSchedules) {
    scheduledByDoc.set(s.documentId, (scheduledByDoc.get(s.documentId) ?? 0) + Number(s.amount));
  }

  const items: ReceivableItem[] = [];

  const openDocs = allDocs.filter((d) => {
    if (Number(d.total ?? 0) <= 0) return false;
    if (d.type === "FACTURA") return (OPEN_INVOICE_STATUSES as readonly string[]).includes(d.status);
    return d.status === "SENT" || d.status === "ACCEPTED";
  });

  for (const doc of openDocs) {
    const isQuote = doc.type === "COTIZACION";
    const content = doc.content as Record<string, unknown> | null;

    // Cotización ya facturada: su parte pendiente la aporta su cuota de saldo.
    if (isQuote && (doc.linkedDocumentId || content?.linkedInvoiceId)) continue;

    const total = Number(doc.total ?? 0);
    const paid = Number(doc.amountPaid ?? 0);
    const outstanding = round2(Math.max(0, total - paid));
    const scheduled = round2(scheduledByDoc.get(doc.id) ?? 0);
    const residual = round2(outstanding - scheduled);
    if (residual <= 0.01) continue;

    items.push({
      id: doc.id,
      kind: isQuote ? "quote" : "invoice",
      label: doc.number ?? doc.type,
      client: clientLabel(doc.clientName, doc.clientCompany),
      amount: residual,
      documentTotal: total,
      amountPaid: paid,
      dueDate: doc.dueDate,
      daysLeft: doc.dueDate ? daysDiff(doc.dueDate, now) : null,
      status: doc.status,
      documentId: doc.id,
      documentType: doc.type as "FACTURA" | "COTIZACION",
      scheduleId: null,
      projectName: doc.project?.name ?? null,
      currency: doc.currency,
      willCreateInvoice: isQuote,
      href: `/empresa/${isQuote ? "cotizaciones" : "facturas"}/${doc.id}`,
    });
  }

  for (const sc of liveSchedules) {
    const doc = docsById.get(sc.documentId);
    if (!doc) continue;
    const isQuote = doc.type === "COTIZACION";
    items.push({
      id: sc.id,
      kind: "schedule",
      label: `${doc.number ?? doc.type} — ${sc.description}`,
      client: clientLabel(doc.clientName, doc.clientCompany),
      amount: round2(Number(sc.amount)),
      documentTotal: Number(doc.total ?? 0),
      amountPaid: Number(doc.amountPaid ?? 0),
      dueDate: sc.dueDate,
      daysLeft: daysDiff(sc.dueDate, now),
      status: sc.dueDate < now && sc.status === "PENDING" ? "OVERDUE" : sc.status,
      documentId: sc.documentId,
      documentType: doc.type as "FACTURA" | "COTIZACION",
      scheduleId: sc.id,
      projectName: doc.project?.name ?? null,
      currency: doc.currency,
      willCreateInvoice: isQuote,
      href: `/empresa/${isQuote ? "cotizaciones" : "facturas"}/${sc.documentId}`,
    });
  }

  items.sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.getTime() - b.dueDate.getTime();
  });

  const sum = (list: ReceivableItem[]) => round2(list.reduce((s, i) => s + i.amount, 0));
  const isOverdue = (i: ReceivableItem) => i.daysLeft !== null && i.daysLeft < 0;
  const within = (i: ReceivableItem, days: number) =>
    i.daysLeft !== null && i.daysLeft >= 0 && i.daysLeft <= days;

  return {
    items,
    total: sum(items),
    overdue: sum(items.filter(isOverdue)),
    due7d: sum(items.filter((i) => within(i, 7))),
    due30d: sum(items.filter((i) => within(i, 30))),
  };
}

/** Total por cobrar — para el dashboard. */
export async function getReceivablesTotal(userId: string): Promise<number> {
  const { total } = await getReceivables(userId);
  return total;
}
