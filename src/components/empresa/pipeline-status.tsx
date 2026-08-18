import Link from "next/link";

export interface PipelineStep {
  id?: string | null;
  label: string;
  status?: string | null;
  href?: string | null;
  /** Monto del documento, si aplica. */
  amount?: number | null;
}

export interface PipelineCollection {
  total: number;
  collected: number;
  currency: string;
}

interface PipelineStatusProps {
  project?: PipelineStep | null;
  cotizacion?: PipelineStep | null;
  factura?: PipelineStep | null;
  /** Progreso real del cobro. Reemplaza el antiguo isPaid binario. */
  collection?: PipelineCollection | null;
  /** Enlaces para completar los pasos que faltan. */
  actions?: {
    project?: string | null;
    cotizacion?: string | null;
    factura?: string | null;
  };
  /** Paso en el que estás parado, para resaltarlo. */
  current?: "project" | "cotizacion" | "factura";
}

const STATUS_ES: Record<string, string> = {
  DRAFT: "Borrador",
  SENT: "Enviada",
  ACCEPTED: "Aceptada",
  REJECTED: "Rechazada",
  PAID: "Pagada",
  PARTIALLY_PAID: "Pago parcial",
  CANCELLED: "Cancelada",
  ACTIVE: "Activo",
  PAUSED: "Pausado",
  COMPLETED: "Completado",
  TERMINATED: "Terminado",
  EXPIRED: "Vencido",
};

/** Verde = cerrado, ámbar = en curso, azul = emitido, gris = sin empezar. */
function toneOf(status: string | null | undefined): string {
  switch (status) {
    case "PAID":
    case "ACTIVE":
    case "COMPLETED":
      return "border-green-500/30 bg-green-500/[0.06] text-green-400";
    case "ACCEPTED":
      return "border-[#C8A96E]/30 bg-[#C8A96E]/[0.06] text-[#C8A96E]";
    case "PARTIALLY_PAID":
      return "border-amber-500/30 bg-amber-500/[0.06] text-amber-400";
    case "SENT":
      return "border-[#1AA7F0]/30 bg-[#1AA7F0]/[0.06] text-[#1AA7F0]";
    case "REJECTED":
    case "CANCELLED":
    case "TERMINATED":
      return "border-red-500/30 bg-red-500/[0.06] text-red-400";
    default:
      return "border-white/[0.12] bg-white/[0.03] text-white/70";
  }
}

function money(n: number, currency: string) {
  return `${currency} ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface NodeProps {
  /** Qué es este paso. Siempre visible: sin esto, un paso vacío no dice nada. */
  caption: string;
  icon: string;
  step?: PipelineStep | null;
  /** Texto cuando el paso está vacío ("Sin proyecto"). */
  emptyLabel: string;
  /** Enlace para completarlo. */
  actionHref?: string | null;
  actionLabel?: string;
  isCurrent?: boolean;
}

function Node({ caption, icon, step, emptyLabel, actionHref, actionLabel = "Vincular", isCurrent }: NodeProps) {
  const filled = Boolean(step?.id);
  const tone = filled ? toneOf(step?.status) : "border-dashed border-white/[0.12] bg-transparent text-white/40";

  const body = (
    <div
      className={`h-full flex flex-col gap-1 px-3 py-2.5 rounded-lg border transition-all ${tone} ${
        isCurrent ? "ring-1 ring-white/20" : ""
      } ${step?.href ? "hover:brightness-125" : ""}`}
    >
      <span className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest text-white/40 font-medium">
        <span className="text-[11px] leading-none">{icon}</span>
        {caption}
      </span>

      {filled ? (
        <>
          <span className="text-[11px] font-medium font-mono truncate">{step!.label}</span>
          <span className="flex items-center gap-1.5 flex-wrap">
            {step!.status && (
              <span className="text-[9px] opacity-80">{STATUS_ES[step!.status] ?? step!.status}</span>
            )}
            {step!.amount != null && step!.amount > 0 && (
              <span className="text-[9px] font-mono text-white/50">
                {step!.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            )}
          </span>
        </>
      ) : (
        <>
          <span className="text-[11px] text-white/35">{emptyLabel}</span>
          {actionHref ? (
            <span className="text-[9px] text-[#1AA7F0] hover:text-[#4FC0FF]">+ {actionLabel}</span>
          ) : (
            <span className="text-[9px] text-white/25">—</span>
          )}
        </>
      )}
    </div>
  );

  const href = filled ? step?.href : actionHref;
  return href ? (
    <Link href={href} className="flex-1 min-w-0">
      {body}
    </Link>
  ) : (
    <div className="flex-1 min-w-0">{body}</div>
  );
}

/** Último nodo: el cobro con su avance real, no un check de sí/no. */
function CollectionNode({ collection }: { collection?: PipelineCollection | null }) {
  if (!collection || collection.total <= 0) {
    return (
      <div className="flex-1 min-w-0">
        <div className="h-full flex flex-col gap-1 px-3 py-2.5 rounded-lg border border-dashed border-white/[0.12] text-white/40">
          <span className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest text-white/40 font-medium">
            <span className="text-[11px] leading-none">💰</span>
            Cobro
          </span>
          <span className="text-[11px] text-white/35">Sin cobrar</span>
          <span className="text-[9px] text-white/25">—</span>
        </div>
      </div>
    );
  }

  const { total, collected, currency } = collection;
  const pct = Math.max(0, Math.min(100, Math.round((collected / total) * 100)));
  const settled = pct >= 100;

  return (
    <div className="flex-1 min-w-0">
      <div
        className={`h-full flex flex-col gap-1 px-3 py-2.5 rounded-lg border ${
          settled
            ? "border-green-500/30 bg-green-500/[0.06] text-green-400"
            : collected > 0
              ? "border-amber-500/30 bg-amber-500/[0.06] text-amber-400"
              : "border-white/[0.12] bg-white/[0.03] text-white/60"
        }`}
      >
        <span className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest text-white/40 font-medium">
          <span className="text-[11px] leading-none">{settled ? "✅" : "💰"}</span>
          Cobro
        </span>
        <span className="text-[11px] font-medium font-mono truncate">
          {settled ? money(total, currency) : `${collected.toLocaleString("en-US", { minimumFractionDigits: 2 })} / ${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
        </span>
        <div className="flex items-center gap-1.5">
          <div className="flex-1 h-1 rounded-full bg-white/[0.08] overflow-hidden">
            <div
              className={`h-full rounded-full ${settled ? "bg-green-400" : "bg-amber-400"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[9px] opacity-80 shrink-0">{pct}%</span>
        </div>
      </div>
    </div>
  );
}

export function PipelineStatus({
  project,
  cotizacion,
  factura,
  collection,
  actions,
  current,
}: PipelineStatusProps) {
  return (
    <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-4">
      <p className="text-white/60 text-[10px] uppercase tracking-widest font-medium mb-3">
        Pipeline
      </p>
      <div className="flex items-stretch gap-1.5">
        <Node
          caption="Proyecto"
          icon="🗂️"
          step={project}
          emptyLabel="Sin proyecto"
          actionHref={actions?.project}
          isCurrent={current === "project"}
        />
        <span className="self-center text-white/25 text-xs shrink-0">→</span>
        <Node
          caption="Cotización"
          icon="📋"
          step={cotizacion}
          emptyLabel="Sin cotización"
          actionHref={actions?.cotizacion}
          isCurrent={current === "cotizacion"}
        />
        <span className="self-center text-white/25 text-xs shrink-0">→</span>
        <Node
          caption="Factura"
          icon="📄"
          step={factura}
          emptyLabel="Sin factura"
          actionHref={actions?.factura}
          actionLabel="Facturar"
          isCurrent={current === "factura"}
        />
        <span className="self-center text-white/25 text-xs shrink-0">→</span>
        <CollectionNode collection={collection} />
      </div>
    </div>
  );
}
