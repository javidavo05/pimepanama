import Link from "next/link";

interface PipelineStep {
  id?: string | null;
  label: string;
  sublabel?: string | null;
  status?: string | null;
  href?: string | null;
}

interface PipelineStatusProps {
  project?: PipelineStep | null;
  cotizacion?: PipelineStep | null;
  factura?: PipelineStep | null;
  isPaid?: boolean;
}

function stepColor(status: string | null | undefined, isPending: boolean): string {
  if (isPending) return "text-white/25 border-white/[0.08]";
  if (!status) return "text-white/25 border-white/[0.08]";
  if (status === "PAID") return "text-green-400 border-green-500/30 bg-green-500/[0.06]";
  if (status === "ACCEPTED") return "text-[#C8A96E] border-[#C8A96E]/30 bg-[#C8A96E]/[0.06]";
  if (status === "SENT") return "text-[#1AA7F0] border-[#1AA7F0]/30 bg-[#1AA7F0]/[0.06]";
  if (status === "ACTIVE") return "text-green-400 border-green-500/30 bg-green-500/[0.06]";
  if (status === "REJECTED" || status === "CANCELLED" || status === "TERMINATED") return "text-red-400 border-red-500/30 bg-red-500/[0.06]";
  if (status === "DRAFT") return "text-white/50 border-white/[0.12] bg-white/[0.03]";
  return "text-white/50 border-white/[0.12] bg-white/[0.03]";
}

const STATUS_ES: Record<string, string> = {
  DRAFT: "Borrador", SENT: "Enviada", ACCEPTED: "Aceptada",
  REJECTED: "Rechazada", PAID: "Pagada", CANCELLED: "Cancelada",
  ACTIVE: "Activo", PAUSED: "Pausado", COMPLETED: "Completado",
  DRAFT_CONTRACT: "Borrador", TERMINATED: "Terminado", EXPIRED: "Vencido",
};

interface StepProps {
  icon: string;
  step: PipelineStep | null | undefined;
  pending?: boolean;
}

function Step({ icon, step, pending }: StepProps) {
  const color = stepColor(step?.status, pending ?? !step?.id);
  const inner = (
    <div className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg border text-center transition-all ${color} ${step?.href ? "hover:opacity-80" : ""}`}>
      <span className="text-base leading-none">{icon}</span>
      <span className="text-[10px] font-medium tracking-wide truncate max-w-[90px]">{step?.label ?? "—"}</span>
      {step?.sublabel && (
        <span className="text-[9px] opacity-60 truncate max-w-[90px]">{step.sublabel}</span>
      )}
      {step?.status && (
        <span className="text-[9px] opacity-70 font-mono">{STATUS_ES[step.status] ?? step.status}</span>
      )}
    </div>
  );

  if (step?.href) {
    return <Link href={step.href}>{inner}</Link>;
  }
  return inner;
}

export function PipelineStatus({ project, cotizacion, factura, isPaid }: PipelineStatusProps) {
  const paidStep: PipelineStep | null = isPaid
    ? { id: "paid", label: "Cobrado", status: "PAID" }
    : factura?.status === "PAID"
      ? { id: "paid", label: "Cobrado", status: "PAID" }
      : null;

  return (
    <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-4">
      <p className="text-white/40 text-[10px] uppercase tracking-widest font-medium mb-3">Pipeline</p>
      <div className="flex items-center gap-1.5">
        <Step icon="🗂️" step={project} />
        <span className="text-white/20 text-xs">→</span>
        <Step icon="📋" step={cotizacion} />
        <span className="text-white/20 text-xs">→</span>
        <Step icon="📄" step={factura} />
        <span className="text-white/20 text-xs">→</span>
        <Step icon="✅" step={paidStep} pending={!paidStep} />
      </div>
    </div>
  );
}
