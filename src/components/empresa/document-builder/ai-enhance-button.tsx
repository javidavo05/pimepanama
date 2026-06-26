"use client";

import { useState } from "react";
import { fmtCost } from "@/lib/ai-pricing";

interface AiEnhanceButtonProps {
  text: string;
  language: "es" | "en";
  context?: string;
  onEnhanced: (text: string) => void;
}

export function AiEnhanceButton({ text, language, context, onEnhanced }: AiEnhanceButtonProps) {
  const [loading, setLoading] = useState(false);
  const [lastCost, setLastCost] = useState<number | null>(null);

  async function enhance() {
    if (!text.trim() || loading) return;
    setLoading(true);
    setLastCost(null);
    try {
      const res = await fetch("/api/empresa/ai/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language, context }),
      });
      if (res.ok) {
        const data = await res.json();
        onEnhanced(data.enhanced);
        if (data.costUSD != null) setLastCost(data.costUSD);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={enhance}
        disabled={loading || !text.trim()}
        title="Mejorar con IA"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#6344E8]/10 border border-[#6344E8]/25 text-[#6344E8] text-xs font-medium hover:bg-[#6344E8]/15 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        {loading ? (
          <>
            <span className="w-2 h-2 rounded-full bg-[#6344E8] animate-pulse" />
            Mejorando...
          </>
        ) : (
          <>✦ IA</>
        )}
      </button>
      {lastCost != null && !loading && (
        <span
          className="text-[10px] text-white/25 font-mono"
          title={`Costo real: $${lastCost.toFixed(6)}`}
        >
          {fmtCost(lastCost)}
        </span>
      )}
    </div>
  );
}
