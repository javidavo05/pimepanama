import Link from "next/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Cuentas por Cobrar — Pime Suite" };
export const dynamic = "force-dynamic";

function fmtUSD(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function daysDiff(date: Date, now: Date): number {
  return Math.ceil((date.getTime() - now.getTime()) / 86400000);
}

const DOC_STATUS_LABEL: Record<string, string> = {
  SENT: "Enviada", ACCEPTED: "Aceptada", DRAFT: "Borrador", PAID: "Pagada",
};
const SCHEDULE_STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente", OVERDUE: "Vencido", PAID: "Pagado", CANCELLED: "Cancelado",
};

export default async function CuentasPorCobrarPage() {
  const user = await getEmpresaUser();
  const now = new Date();
  const in7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const in30d = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [rawDocs, schedules] = await Promise.all([
    prisma.document.findMany({
      where: {
        userId: user.id,
        type: { in: ["FACTURA", "COTIZACION"] },
        status: { in: ["SENT", "ACCEPTED"] },
        total: { not: null, gt: 0 },
      },
      select: {
        id: true, type: true, number: true, clientName: true, clientCompany: true,
        total: true, dueDate: true, issueDate: true, status: true,
        content: true,
        project: { select: { id: true, name: true } },
      },
      orderBy: [{ dueDate: "asc" }, { issueDate: "asc" }],
    }),
    prisma.paymentSchedule.findMany({
      where: { userId: user.id, status: { in: ["PENDING", "OVERDUE"] } },
      include: {
        document: {
          select: {
            id: true, type: true, number: true, clientName: true, clientCompany: true,
            project: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { dueDate: "asc" },
    }),
  ]);

  // Excluir COTIZACIONes que ya tienen una FACTURA vinculada (la factura es el doc de cobro)
  const pendingDocs = rawDocs.filter((d) => {
    if (d.type === "COTIZACION") {
      const c = d.content as Record<string, unknown> | null;
      return !c?.linkedInvoiceId;
    }
    return true;
  });

  const totalDocs = pendingDocs.reduce((s, d) => s + Number(d.total ?? 0), 0);
  const totalSchedules = schedules.reduce((s, sc) => s + Number(sc.amount), 0);
  const total = totalDocs + totalSchedules;

  const overdueDocAmt = pendingDocs.filter((d) => d.dueDate && d.dueDate < now).reduce((s, d) => s + Number(d.total ?? 0), 0);
  const overdueSchAmt = schedules.filter((s) => s.dueDate < now || s.status === "OVERDUE").reduce((s, sc) => s + Number(sc.amount), 0);
  const overdue = overdueDocAmt + overdueSchAmt;

  const due7dAmt = schedules.filter((s) => s.dueDate >= now && s.dueDate <= in7d).reduce((s, sc) => s + Number(sc.amount), 0);
  const due30dAmt = schedules.filter((s) => s.dueDate >= now && s.dueDate <= in30d).reduce((s, sc) => s + Number(sc.amount), 0);

  // Group: overdue / this week / this month / future
  type ARItem = {
    id: string;
    label: string;
    client: string;
    amount: number;
    dueDate: Date | null;
    daysLeft: number | null;
    status: string;
    docId: string;
    projectName: string | null;
    isSchedule: boolean;
  };

  const items: ARItem[] = [
    ...pendingDocs.map((d) => ({
      id: d.id,
      label: d.number ?? d.type,
      client: [d.clientName, d.clientCompany].filter(Boolean).join(" — "),
      amount: Number(d.total ?? 0),
      dueDate: d.dueDate,
      daysLeft: d.dueDate ? daysDiff(d.dueDate, now) : null,
      status: d.status,
      docId: d.id,
      projectName: d.project?.name ?? null,
      isSchedule: false,
    })),
    ...schedules.map((sc) => ({
      id: sc.id,
      label: `${sc.document.number ?? sc.document.type} — ${sc.description}`,
      client: [sc.document.clientName, sc.document.clientCompany].filter(Boolean).join(" — "),
      amount: Number(sc.amount),
      dueDate: sc.dueDate,
      daysLeft: daysDiff(sc.dueDate, now),
      status: sc.status,
      docId: sc.documentId,
      projectName: sc.document.project?.name ?? null,
      isSchedule: true,
    })),
  ].sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.getTime() - b.dueDate.getTime();
  });

  const groups = [
    { label: "Vencido", items: items.filter((i) => i.daysLeft !== null && i.daysLeft < 0), color: "text-red-400" },
    { label: "Esta semana (7 días)", items: items.filter((i) => i.daysLeft !== null && i.daysLeft >= 0 && i.daysLeft <= 7), color: "text-amber-400" },
    { label: "Este mes (30 días)", items: items.filter((i) => i.daysLeft !== null && i.daysLeft > 7 && i.daysLeft <= 30), color: "text-[#1AA7F0]" },
    { label: "Futuro", items: items.filter((i) => i.daysLeft !== null && i.daysLeft > 30), color: "text-white/40" },
    { label: "Sin fecha de vencimiento", items: items.filter((i) => i.daysLeft === null), color: "text-white/25" },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-2xl font-semibold tracking-tight">Cuentas por cobrar</h1>
          <p className="text-white/40 text-sm mt-0.5">{items.length} ítem{items.length !== 1 ? "s" : ""} pendientes</p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total por cobrar", value: `$${fmtUSD(total)}`, color: "text-[#1AA7F0]", sub: "facturas + cuotas" },
          { label: "Vencido", value: `$${fmtUSD(overdue)}`, color: overdue > 0 ? "text-red-400" : "text-white/40", sub: "requiere atención" },
          { label: "Próximos 7 días", value: `$${fmtUSD(due7dAmt)}`, color: "text-amber-400", sub: "cuotas con plan de pago" },
          { label: "Próximos 30 días", value: `$${fmtUSD(due30dAmt)}`, color: "text-[#6344E8]", sub: "cuotas con plan de pago" },
        ].map(({ label, value, color, sub }) => (
          <div key={label} className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl p-5">
            <p className="text-white/40 text-xs uppercase tracking-widest font-medium mb-3">{label}</p>
            <p className={`font-mono text-2xl font-semibold ${color}`}>{value}</p>
            <p className="text-white/20 text-xs mt-1.5">{sub}</p>
          </div>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl p-12 text-center">
          <p className="text-white/60 font-medium">Sin cuentas por cobrar</p>
          <p className="text-white/30 text-sm mt-2">Aparecerán aquí las facturas y cotizaciones enviadas o aceptadas, y los planes de pago activos.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.label} className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-white/[0.05] flex items-center justify-between">
                <h2 className={`text-xs uppercase tracking-widest font-medium ${group.color}`}>{group.label}</h2>
                <span className="text-white/30 text-xs font-mono">
                  ${fmtUSD(group.items.reduce((s, i) => s + i.amount, 0))}
                </span>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {group.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 px-5 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link href={`/empresa/${item.isSchedule ? "cotizaciones" : (item.status === "PAID" || item.label.startsWith("FAC") ? "facturas" : "cotizaciones")}/${item.docId}`}
                          className="text-white/70 text-sm font-mono hover:text-[#1AA7F0] transition-colors truncate">
                          {item.label}
                        </Link>
                        {item.isSchedule && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded border border-[#6344E8]/30 text-[#8B6FFF]">cuota</span>
                        )}
                        {!item.isSchedule && item.label.startsWith("COT") && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded border border-amber-500/30 text-amber-400">⚠ sin factura</span>
                        )}
                        {item.projectName && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded border border-[#1AA7F0]/25 text-[#1AA7F0]/60">
                            🗂️ {item.projectName}
                          </span>
                        )}
                      </div>
                      <p className="text-white/35 text-xs mt-0.5 truncate">{item.client}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-white/70 text-sm font-mono">${fmtUSD(item.amount)}</p>
                      {item.dueDate && (
                        <p className={`text-xs mt-0.5 ${item.daysLeft !== null && item.daysLeft < 0 ? "text-red-400" : item.daysLeft !== null && item.daysLeft <= 7 ? "text-amber-400" : "text-white/25"}`}>
                          {item.daysLeft !== null && item.daysLeft < 0
                            ? `vencido hace ${Math.abs(item.daysLeft)}d`
                            : item.daysLeft === 0
                              ? "vence hoy"
                              : `vence en ${item.daysLeft}d`}
                        </p>
                      )}
                    </div>
                    <span className={`px-2 py-0.5 text-[10px] rounded border shrink-0 ${
                      (item.status === "OVERDUE" || (item.daysLeft !== null && item.daysLeft < 0 && !item.isSchedule))
                        ? "bg-red-500/15 text-red-400 border-red-500/20"
                        : item.status === "ACCEPTED" || item.status === "SENT"
                          ? "bg-blue-500/15 text-blue-400 border-blue-500/20"
                          : item.status === "PENDING"
                            ? "bg-white/[0.05] text-white/40 border-white/[0.10]"
                            : "bg-white/[0.05] text-white/25 border-white/[0.08]"
                    }`}>
                      {item.isSchedule ? SCHEDULE_STATUS_LABEL[item.status] ?? item.status : DOC_STATUS_LABEL[item.status] ?? item.status}
                    </span>
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
