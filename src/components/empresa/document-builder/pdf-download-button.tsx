"use client";

import { useState } from "react";

interface PdfDownloadButtonProps {
  documentId?: string;
  /** Overrides the default `/api/empresa/documents/{id}/pdf` route — e.g. for contracts/proposals. */
  url?: string;
  /** POST draft form state to this endpoint (same as live preview). Takes priority over documentId/url. */
  draftEndpoint?: string;
  draftPayload?: unknown;
  filename?: string;
  label?: string;
}

export function PdfDownloadButton({
  documentId,
  url,
  draftEndpoint,
  draftPayload,
  filename,
  label = "Descargar PDF",
}: PdfDownloadButtonProps) {
  const [loading, setLoading] = useState(false);

  async function download() {
    if (loading) return;
    setLoading(true);
    try {
      let res: Response;
      if (draftEndpoint && draftPayload != null) {
        res = await fetch(draftEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draftPayload),
        });
      } else {
        res = await fetch(url ?? `/api/empresa/documents/${documentId}/pdf`);
      }
      if (!res.ok) throw new Error("Error generando PDF");

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename ?? `documento-${documentId ?? Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error(err);
      alert("Error al generar el PDF. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={download}
      disabled={loading}
      className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#C8A96E] hover:bg-[#d4b87a] disabled:opacity-50 text-[#030611] text-sm font-semibold rounded-lg transition-all"
    >
      {loading ? (
        <>
          <span className="w-3 h-3 border-2 border-[#030611]/30 border-t-[#030611] rounded-full animate-spin" />
          Generando...
        </>
      ) : (
        <>↓ {label}</>
      )}
    </button>
  );
}
