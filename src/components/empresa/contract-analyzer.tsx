"use client";

import { useRef, useState } from "react";
import { fetchLargo } from "@/lib/fetch-largo";

export type ContractSourceType =
  | "CONTRACT"
  | "PROPOSAL"
  | "QUOTE"
  | "PRODUCT"
  | "SCOPE"
  | "OTHER";

export type AnalyzedDeliverable = { name: string; description?: string | null; dueDate?: string | null };

export type AnalyzedPhase = {
  name: string;
  summary?: string | null;
  amount?: number | null;
  timeframe?: string | null;
  estimatedDays?: number | null;
  optional?: boolean;
  deliverables: AnalyzedDeliverable[];
};

export type AnalyzedPayment = {
  cashAmount?: number | null;
  barter?: { amount: number; description: string } | null;
  schedule: "MILESTONES" | "INSTALLMENTS" | "SINGLE" | "UNSPECIFIED";
  milestones: {
    description: string;
    percent: number;
    trigger: "SIGNING" | "DELIVERY" | "PHASE" | "DATE";
    dueDate?: string | null;
  }[];
  installments?: {
    downPayment: number;
    count: number;
    frequency: "MONTHLY" | "BIWEEKLY" | "WEEKLY";
    firstDueDate?: string | null;
  } | null;
  paymentNotes?: string | null;
};

export type ContractAnalysis = {
  sourceType?: ContractSourceType | null;
  /** Qué es el documento, en dos o tres frases. */
  documentSummary?: string | null;
  projectName?: string | null;
  contractTitle?: string | null;
  clientName?: string | null;
  value?: number | null;
  currency?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  /** Plazo tal como lo dice el documento ("hasta 3 meses desde..."). */
  durationText?: string | null;
  description?: string | null;
  scope?: string | null;
  scopeIncludes?: string[];
  scopeExcludes?: string[];
  responsibilities?: string | null;
  terms?: string | null;
  phases?: AnalyzedPhase[];
  /** Lista plana de todos los entregables (compatibilidad). */
  deliverables?: AnalyzedDeliverable[];
  payment?: AnalyzedPayment | null;
  /** Lo que la IA redactó por su cuenta porque el documento no lo decía. */
  assumptions?: string[];
  costUSD?: number;
};

interface ContractAnalyzerProps {
  onAnalyzed: (result: ContractAnalysis) => void;
}

const MAX_MB = 12;

/** Qué decirle al usuario según lo que resultó ser el documento. */
const SOURCE_PHRASE: Record<ContractSourceType, string> = {
  CONTRACT: "Contrato leído",
  PROPOSAL: "Propuesta leída",
  QUOTE: "Cotización leída",
  PRODUCT: "Detalle del producto leído",
  SCOPE: "Alcance de trabajo leído",
  OTHER: "Documento leído",
};

const PAYMENT_PHRASE: Record<AnalyzedPayment["schedule"], string> = {
  MILESTONES: "pago por hitos",
  INSTALLMENTS: "abono más cuotas",
  SINGLE: "un solo pago",
  UNSPECIFIED: "",
};

/** Resumen de lo que se precargó, para que se vea de un vistazo qué revisar. */
function summarize(data: ContractAnalysis): string {
  const source: ContractSourceType = data.sourceType ?? "OTHER";
  const phases = data.phases?.length ?? 0;
  const items = data.phases?.reduce((n, p) => n + p.deliverables.length, 0) ?? data.deliverables?.length ?? 0;
  const parts = [
    `${phases} fase${phases !== 1 ? "s" : ""}`,
    `${items} entregable${items !== 1 ? "s" : ""}`,
  ];
  const payment = data.payment;
  if (payment && PAYMENT_PHRASE[payment.schedule]) {
    const split = payment.schedule === "MILESTONES" && payment.milestones.length > 0
      ? ` ${payment.milestones.map((m) => Math.round(m.percent)).join("/")}`
      : "";
    parts.push(`${PAYMENT_PHRASE[payment.schedule]}${split}`);
  }
  if (payment?.barter?.amount) parts.push("parte en canje");
  const contract = source === "CONTRACT"
    ? "El contrato queda activo."
    : "El contrato queda como borrador para firmar.";
  return `${SOURCE_PHRASE[source] ?? SOURCE_PHRASE.OTHER}: ${parts.join(", ")}. ${contract}`;
}

export function ContractAnalyzer({ onAnalyzed }: ContractAnalyzerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pasted, setPasted] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [assumptions, setAssumptions] = useState<string[]>([]);

  function readAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
      reader.readAsDataURL(file);
    });
  }

  async function analyze(payload: { fileName?: string; fileDataUrl?: string; text?: string }) {
    setBusy(true);
    setError(null);
    setDone(null);
    setSummary(null);
    setAssumptions([]);
    try {
      const res = await fetchLargo("/api/empresa/ai/analyze-contract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo analizar el documento");
        return;
      }
      onAnalyzed(data as ContractAnalysis);
      setDone(summarize(data as ContractAnalysis));
      setSummary(typeof data.documentSummary === "string" ? data.documentSummary : null);
      setAssumptions(Array.isArray(data.assumptions) ? data.assumptions : []);
    } catch {
      setError("Error de red al analizar el documento");
    } finally {
      setBusy(false);
    }
  }

  async function onFile(file: File) {
    setError(null);
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`El archivo supera ${MAX_MB} MB`);
      return;
    }
    if (file.type !== "application/pdf") {
      setError("Por ahora solo PDF. Para Word, pega el texto.");
      return;
    }
    setFileName(file.name);
    await analyze({ fileName: file.name, fileDataUrl: await readAsDataUrl(file) });
  }

  return (
    <div className="bg-panel border border-iris/20 rounded-xl p-5 space-y-3">
      <div>
        <h3 className="text-iris-fg text-xs uppercase tracking-widest font-medium">
          ¿Tienes una propuesta, cotización o contrato?
        </h3>
        <p className="text-fg-faint text-xs mt-1">
          Adjunta la propuesta, la cotización o el contrato y la IA arma el proyecto
          completo: las fases, cada entregable, la forma de pago (50/50, cuotas o
          canje) y un borrador del contrato. Si es una propuesta o cotización, el
          contrato queda como borrador para firmar.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
          }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="px-4 py-2 rounded-lg bg-iris/15 border border-iris/30 text-iris-fg text-sm font-medium hover:bg-iris/25 disabled:opacity-50 transition-all"
        >
          {busy ? "Leyendo el documento…" : "📎 Adjuntar documento (PDF)"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setShowPaste((v) => !v)}
          className="inline-flex items-center min-h-11 sm:min-h-8 text-fg-faint hover:text-fg-soft text-xs px-2 transition-colors"
        >
          o pegar el texto
        </button>
        {fileName && !busy && (
          <span className="text-fg-faint text-xs font-mono truncate max-w-[220px]">{fileName}</span>
        )}
      </div>

      {showPaste && (
        <div className="space-y-2">
          <textarea
            rows={5}
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            placeholder="Pega aquí la propuesta, el alcance o el contrato..."
            className="w-full bg-fill border border-line rounded-lg px-3 py-2.5 text-fg-soft text-sm placeholder-fg-trace focus:outline-none focus:border-iris/40 resize-none"
          />
          <button
            type="button"
            disabled={busy || !pasted.trim()}
            onClick={() => void analyze({ text: pasted })}
            className="inline-flex items-center justify-center min-h-11 sm:min-h-8 px-3 rounded-lg bg-iris/15 border border-iris/30 text-iris-fg text-xs font-medium disabled:opacity-40"
          >
            {busy ? "Analizando…" : "Analizar texto"}
          </button>
        </div>
      )}

      {busy && (
        <p className="text-fg-faint text-xs">
          Leyendo el documento página por página para sacar todas las fases y entregables… una
          propuesta completa tarda entre 2 y 4 minutos. No cierres esta pantalla.
        </p>
      )}
      {error && <p className="text-danger text-xs">{error}</p>}
      {done && <p className="text-ok text-xs">✓ {done}</p>}
      {summary && <p className="text-fg-dim text-xs leading-relaxed">{summary}</p>}

      {/* Lo que la IA completó por su cuenta: es lo primero que hay que revisar. */}
      {assumptions.length > 0 && (
        <div className="rounded-lg border border-warn/25 bg-warn/[0.06] px-3 py-2.5">
          <p className="text-warn text-[11px] uppercase tracking-widest font-medium">
            Redactado por la IA — no venía en el documento
          </p>
          <ul className="mt-1.5 space-y-1">
            {assumptions.map((a, i) => (
              <li key={i} className="text-fg-dim text-xs leading-relaxed">
                • {a}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-fg-ghost text-[10px]">
        Revisa siempre lo redactado: la IA puede equivocarse y nada se guarda hasta que pulses crear.
      </p>
    </div>
  );
}
