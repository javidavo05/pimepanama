"use client";

import { useEffect, useRef, useState } from "react";

interface DraftPdfPreviewProps {
  /** POST endpoint that renders a draft PDF from the raw payload — see /api/empresa/documents/preview. */
  endpoint: string;
  /** JSON-serializable draft data matching the endpoint's expected body. */
  payload: unknown;
  title?: string;
  debounceMs?: number;
  defaultOpen?: boolean;
}

/**
 * Live "how will this look" preview for a document still being edited (no persisted id yet).
 * Same idea as PdfPreviewFrame (used on saved documents), but POSTs the current draft form state to
 * a preview endpoint instead of GETing a saved document's PDF — debounced so it doesn't re-render on
 * every keystroke.
 */
export function DraftPdfPreview({
  endpoint,
  payload,
  title = "Vista previa del documento",
  debounceMs = 700,
  defaultOpen = true,
}: DraftPdfPreviewProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const prevUrl = useRef<string | null>(null);
  const payloadKey = JSON.stringify(payload);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(false);

    const id = setTimeout(async () => {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payloadKey,
        });
        if (cancelled) return;
        if (!res.ok) {
          setError(true);
          return;
        }
        const blob = await res.blob();
        if (cancelled) return;
        const objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
        if (prevUrl.current) URL.revokeObjectURL(prevUrl.current);
        prevUrl.current = objectUrl;
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, debounceMs);

    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [payloadKey, endpoint, open, debounceMs]);

  useEffect(
    () => () => {
      if (prevUrl.current) URL.revokeObjectURL(prevUrl.current);
    },
    []
  );

  return (
    <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 py-3 border-b border-white/[0.05] flex items-center justify-between text-left"
      >
        <span className="text-white/60 text-xs uppercase tracking-widest font-medium">{title}</span>
        <span className="text-white/40 text-[10px] flex items-center gap-2">
          {open && loading && (
            <span className="w-2.5 h-2.5 border-2 border-white/20 border-t-white/50 rounded-full animate-spin" />
          )}
          {open ? "Ocultar ▲" : "Mostrar ▼"}
        </span>
      </button>
      {open && (
        <div className="relative bg-[#050508]" style={{ height: "75vh" }}>
          {!url && !error && (
            <div className="absolute inset-0 flex items-center justify-center text-white/40 text-sm gap-2">
              <span className="w-3 h-3 border-2 border-white/20 border-t-white/50 rounded-full animate-spin" />
              Generando vista previa…
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center text-red-400/70 text-sm px-6 text-center">
              No se pudo generar la vista previa. Completa los campos requeridos e intenta de nuevo.
            </div>
          )}
          {url && (
            <iframe
              src={url}
              title={title}
              className="w-full h-full"
              style={{ opacity: loading ? 0.5 : 1, transition: "opacity 150ms" }}
            />
          )}
        </div>
      )}
    </div>
  );
}
