import Link from "next/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { ArTaskActions } from "@/components/empresa/ar-task-actions";
import { CollectRow } from "@/components/empresa/collect-row";
import { getReceivables } from "@/lib/receivables";

export const metadata = { title: "Cuentas por Cobrar — Pime Suite" };
export const dynamic = "force-dynamic";

function fmtUSD(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const DOC_STATUS_LABEL: Record<string, string> = {
  SENT: "Enviada", ACCEPTED: "Aceptada", DRAFT: "Borrador", PAID: "Pagada", PARTIALLY_PAID: "Pago parcial",
  PENDING: "Pendiente", OVERDUE: "Vencido", CANCELLED: "Cancelado",
};

export default async function CuentasPorCobrarPage() {
  const user = await getEmpresaUser();
  const now = new Date();

  // getReceivables concilia los saldos de cotización sobre los mismos datos que
  // ya trae, así que no hace falta un reconcile aparte. Las tareas se piden en
  // paralelo: cada viaje al pooler cuesta ~600 ms.
  const [{ items, total, overdue, due7d, due30d }, openTasks] = await Promise.all([
    getReceivables(user.id, now),
    prisma.task.findMany({
      where: { userId: user.id, completed: false },
      select: { id: true, title: true, dueDate: true, assignee: true, documentId: true, paymentScheduleId: true },
    }),
  ]);

  const itemDocIds = new Set(items.filter((i) => !i.scheduleId).map((i) => i.documentId));
  const itemSchedIds = new Set(items.map((i) => i.scheduleId).filter((id): id is string => !!id));
  const relatedTasks = openTasks.filter(
    (t) =>
      (t.documentId && itemDocIds.has(t.documentId)) ||
      (t.paymentScheduleId && itemSchedIds.has(t.paymentScheduleId))
  );
  const tasksByDoc = new Map<string, typeof relatedTasks>();
  const tasksBySchedule = new Map<string, typeof relatedTasks>();
  for (const t of relatedTasks) {
    if (t.documentId) tasksByDoc.set(t.documentId, [...(tasksByDoc.get(t.documentId) ?? []), t]);
    if (t.paymentScheduleId) tasksBySchedule.set(t.paymentScheduleId, [...(tasksBySchedule.get(t.paymentScheduleId) ?? []), t]);
  }

  const groups = [
    { label: "Vencido", items: items.filter((i) => i.daysLeft !== null && i.daysLeft < 0), color: "text-danger" },
    { label: "Esta semana (7 días)", items: items.filter((i) => i.daysLeft !== null && i.daysLeft >= 0 && i.daysLeft <= 7), color: "text-warn" },
    { label: "Este mes (30 días)", items: items.filter((i) => i.daysLeft !== null && i.daysLeft > 7 && i.daysLeft <= 30), color: "text-brand-fg" },
    { label: "Futuro", items: items.filter((i) => i.daysLeft !== null && i.daysLeft > 30), color: "text-fg-dim" },
    { label: "Sin fecha de vencimiento", items: items.filter((i) => i.daysLeft === null), color: "text-fg-faint" },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-fg text-2xl font-semibold tracking-tight">Cuentas por cobrar</h1>
          <p className="text-fg-dim text-sm mt-0.5">{items.length} ítem{items.length !== 1 ? "s" : ""} pendientes</p>
        </div>
        <Link
          href="/empresa/facturas/nueva"
          className="px-4 py-2.5 bg-sand hover:bg-sand-lt text-on-accent text-sm font-semibold rounded-lg transition-all"
        >
          + Nueva factura
        </Link>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total por cobrar", value: `$${fmtUSD(total)}`, color: "text-brand-fg", sub: "saldos pendientes" },
          { label: "Vencido", value: `$${fmtUSD(overdue)}`, color: overdue > 0 ? "text-danger" : "text-fg-dim", sub: "requiere atención" },
          { label: "Próximos 7 días", value: `$${fmtUSD(due7d)}`, color: "text-warn", sub: "por vencer" },
          { label: "Próximos 30 días", value: `$${fmtUSD(due30d)}`, color: "text-iris-fg", sub: "por vencer" },
        ].map(({ label, value, color, sub }) => (
          <div key={label} className="bg-panel border border-line rounded-2xl p-5">
            <p className="text-fg-dim text-xs uppercase tracking-widest font-medium mb-3">{label}</p>
            <p className={`font-mono text-2xl font-semibold ${color}`}>{value}</p>
            <p className="text-fg-faint text-xs mt-1.5">{sub}</p>
          </div>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="bg-panel border border-line rounded-2xl p-12 text-center">
          <p className="text-fg-dim font-medium">Sin cuentas por cobrar</p>
          <p className="text-fg-dim text-sm mt-2">Todo cobrado. Al crear una factura su saldo aparece aquí automáticamente.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.label} className="bg-panel border border-line rounded-2xl">
              <div className="px-5 py-3 border-b border-line flex items-center justify-between">
                <h2 className={`text-xs uppercase tracking-widest font-medium ${group.color}`}>{group.label}</h2>
                <span className="text-fg-dim text-xs font-mono">
                  ${fmtUSD(group.items.reduce((s, i) => s + i.amount, 0))}
                </span>
              </div>
              <div className="divide-y divide-line">
                {group.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 flex-wrap px-5 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={item.href} className="text-fg-mute text-sm font-mono hover:text-brand-fg transition-colors truncate">
                          {item.label}
                        </Link>
                        {item.kind === "schedule" && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded border border-iris/30 text-iris-fg">cuota</span>
                        )}
                        {item.kind === "quote" && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded border border-warn/30 text-warn">⚠ sin factura</span>
                        )}
                        {item.kind === "invoice" && item.status === "DRAFT" && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded border border-line-loud text-fg-faint">borrador</span>
                        )}
                        {item.amountPaid > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded border border-ok/30 text-ok">
                            abonado ${fmtUSD(item.amountPaid)} de ${fmtUSD(item.documentTotal)}
                          </span>
                        )}
                        {item.projectName && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded border border-brand/25 text-brand-fg">
                            🗂️ {item.projectName}
                          </span>
                        )}
                      </div>
                      <p className="text-fg-dim text-xs mt-0.5 truncate">{item.client}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-fg-mute text-sm font-mono">${fmtUSD(item.amount)}</p>
                      {item.dueDate && (
                        <p className={`text-xs mt-0.5 ${item.daysLeft !== null && item.daysLeft < 0 ? "text-danger" : item.daysLeft !== null && item.daysLeft <= 7 ? "text-warn" : "text-fg-faint"}`}>
                          {item.daysLeft !== null && item.daysLeft < 0
                            ? `vencido hace ${Math.abs(item.daysLeft)}d`
                            : item.daysLeft === 0
                              ? "vence hoy"
                              : `vence en ${item.daysLeft}d`}
                        </p>
                      )}
                    </div>

                    <span className={`px-2 py-0.5 text-[10px] rounded border shrink-0 ${
                      item.status === "OVERDUE" || (item.daysLeft !== null && item.daysLeft < 0)
                        ? "bg-danger/15 text-danger border-danger/20"
                        : item.status === "PARTIALLY_PAID"
                          ? "bg-ok/15 text-ok border-ok/20"
                          : item.status === "ACCEPTED" || item.status === "SENT"
                            ? "bg-info/15 text-info border-info/20"
                            : "bg-fill-2 text-fg-dim border-line-mid"
                    }`}>
                      {DOC_STATUS_LABEL[item.status] ?? item.status}
                    </span>

                    <ArTaskActions
                      documentId={item.scheduleId ? null : item.documentId}
                      paymentScheduleId={item.scheduleId}
                      defaultTitle={`Seguimiento de pago — ${item.client || item.label}`}
                      initialTasks={(item.scheduleId ? tasksBySchedule.get(item.scheduleId) : tasksByDoc.get(item.documentId))?.map((t) => ({
                        id: t.id,
                        title: t.title,
                        dueDate: t.dueDate?.toISOString() ?? null,
                        assignee: t.assignee,
                      })) ?? []}
                    />

                    <CollectRow
                      kind={item.kind}
                      documentId={item.documentId}
                      scheduleId={item.scheduleId}
                      outstanding={item.amount}
                      currency={item.currency}
                      willCreateInvoice={item.willCreateInvoice}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
