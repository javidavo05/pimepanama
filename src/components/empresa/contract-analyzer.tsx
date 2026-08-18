"use client";

import { useRef, useState } from "react";

export type ContractSourceType =
  | "CONTRACT"
  | "PROPOSAL"
  | "QUOTE"
  | "PRODUCT"
  | "SCOPE"
  | "OTHER";

export type ContractAnalysis = {
  sourceType?: ContractSourceType | null;
  projectName?: string | null;
  contractTitle?: string | null;
  clientName?: string | null;
  value?: number | null;
  currency?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  scope?: string | null;
  responsibilities?: string | null;
  terms?: string | null;
  deliverables?: { name: string; description?: string | null; dueDate?: string | null }[];
  financing?: {
    downPayment?: number | null;
    installments?: number | null;
    frequency?: "MONTHLY" | "BIWEEKLY" | "WEEKLY" | null;
    firstDueDate?: string | null;
  } | null;
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
  CONTRACT: "Contrato analizado",
  PROPOSAL: "Contrato redactado desde la propuesta",
  QUOTE: "Contrato redactado desde la cotización",
  PRODUCT: "Contrato redactado desde el detalle del producto",
  SCOPE: "Contrato redactado desde el alcance de trabajo",
  OTHER: "Contrato redactado desde el documento",
};

export function ContractAnalyzer({ onAnalyzed }: ContractAnalyzerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pasted, setPasted] = useState("");
  const [showPaste, setShowPaste] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
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
    setAssumptions([]);
    try {
      const res = await fetch("/api/empresa/ai/analyze-contract", {
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

      const source: ContractSourceType = data.sourceType ?? "OTHER";
      const n = data.deliverables?.length ?? 0;
      setDone(
        `${SOURCE_PHRASE[source] ?? SOURCE_PHRASE.OTHER} — ${n} entregable${n !== 1 ? "s" : ""} detectado${n !== 1 ? "s" : ""}.` +
          (data.financing ? " Se precargó el plan de financiación." : "")
      );
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
    <div className="bg-[#0a0a10] border border-[#6344E8]/20 rounded-xl p-5 space-y-3">
      <div>
        <h3 className="text-[#8B6FFF] text-xs uppercase tracking-widest font-medium">
          ¿Tienes una propuesta, cotización o contrato?
        </h3>
        <p className="text-white/50 text-xs mt-1">
          Adjunta lo que tengas —propuesta, cotización, detalle del producto o el
          contrato firmado— y la IA redacta el contrato: alcance, responsabilidades,
          términos, entregables y forma de pago.
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
          className="px-4 py-2 rounded-lg bg-[#6344E8]/15 border border-[#6344E8]/30 text-[#8B6FFF] text-sm font-medium hover:bg-[#6344E8]/25 disabled:opacity-50 transition-all"
        >
          {busy ? "Analizando…" : "📎 Adjuntar documento (PDF)"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setShowPaste((v) => !v)}
          className="text-white/50 hover:text-white/80 text-xs px-2 py-1 transition-colors"
        >
          o pegar el texto
        </button>
        {fileName && !busy && (
          <span className="text-white/45 text-xs font-mono truncate max-w-[220px]">{fileName}</span>
        )}
      </div>

      {showPaste && (
        <div className="space-y-2">
          <textarea
            rows={5}
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            placeholder="Pega aquí la propuesta, el alcance o el contrato..."
            className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white/80 text-sm placeholder-white/20 focus:outline-none focus:border-[#6344E8]/40 resize-none"
          />
          <button
            type="button"
            disabled={busy || !pasted.trim()}
            onClick={() => void analyze({ text: pasted })}
            className="px-3 py-1.5 rounded-lg bg-[#6344E8]/15 border border-[#6344E8]/30 text-[#8B6FFF] text-xs font-medium disabled:opacity-40"
          >
            {busy ? "Analizando…" : "Analizar texto"}
          </button>
        </div>
      )}

      {busy && (
        <p className="text-white/45 text-xs">
          Leyendo el documento y redactando el contrato… suele tardar entre 10 y 25 segundos.
        </p>
      )}
      {error && <p className="text-red-400 text-xs">{error}</p>}
      {done && <p className="text-green-400 text-xs">✓ {done}</p>}

      {/* Lo que la IA completó por su cuenta: es lo primero que hay que revisar. */}
      {assumptions.length > 0 && (
        <div className="rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2.5">
          <p className="text-amber-400/90 text-[11px] uppercase tracking-widest font-medium">
            Redactado por la IA — no venía en el documento
          </p>
          <ul className="mt-1.5 space-y-1">
            {assumptions.map((a, i) => (
              <li key={i} className="text-white/60 text-xs leading-relaxed">
                • {a}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-white/30 text-[10px]">
        Revisa siempre lo redactado: la IA puede equivocarse y nada se guarda hasta que pulses crear.
      </p>
    </div>
  );
}
