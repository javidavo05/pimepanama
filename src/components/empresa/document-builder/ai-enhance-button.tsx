"use client";

import { useState } from "react";

interface AiEnhanceButtonProps {
  text: string;
  language: "es" | "en";
  context?: string;
  onEnhanced: (text: string) => void;
}

export function AiEnhanceButton({
  text,
  language,
  context,
  onEnhanced,
}: AiEnhanceButtonProps) {
  const [loading, setLoading] = useState(false);

  async function enhance() {
    if (!text.trim() || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/empresa/ai/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language, context }),
      });
      if (res.ok) {
        const data = await res.json();
        onEnhanced(data.enhanced);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={enhance}
      disabled={loading || !text.trim()}
      title="Mejorar con IA"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#C8A96E]/10 border border-[#C8A96E]/20 text-[#C8A96E] text-xs font-medium hover:bg-[#C8A96E]/15 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
    >
      {loading ? (
        <>
          <span className="w-2.5 h-2.5 rounded-full bg-[#C8A96E] animate-pulse" />
          Mejorando...
        </>
      ) : (
        <>✦ IA</>
      )}
    </button>
  );
}
