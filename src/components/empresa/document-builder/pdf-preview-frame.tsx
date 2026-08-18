"use client";

import { useState } from "react";

interface PdfPreviewFrameProps {
  /** Base PDF route (without the `inline` query flag) — e.g. `/api/empresa/documents/{id}/pdf`. */
  url: string;
  title?: string;
  /** Bump this (e.g. after a save) to force the iframe to refetch instead of showing a cached render. */
  refreshKey?: number | string;
  className?: string;
}

/**
 * Embeds the actual generated PDF inline — preview and download hit the exact same render pipeline,
 * so there's no separate "preview template" that can drift from what gets exported.
 */
export function PdfPreviewFrame({ url, title = "Vista previa", refreshKey, className = "" }: PdfPreviewFrameProps) {
  const [loaded, setLoaded] = useState(false);
  const src = `${url}${url.includes("?") ? "&" : "?"}inline=1${refreshKey != null ? `&r=${encodeURIComponent(String(refreshKey))}` : ""}`;

  return (
    <div className={`bg-[#0a0a10] border border-white/[0.06] rounded-xl overflow-hidden ${className}`}>
      <div className="px-4 py-3 border-b border-white/[0.05] flex items-center justify-between">
        <p className="text-white/50 text-xs uppercase tracking-widest font-medium">{title}</p>
        <a href={src.replace("&inline=1", "").replace("?inline=1", "")} target="_blank" rel="noreferrer"
          className="text-[#1AA7F0]/60 text-[10px] hover:text-[#1AA7F0] transition-colors">
          Abrir en pestaña nueva ↗
        </a>
      </div>
      <div className="relative bg-[#050508]" style={{ height: "70vh" }}>
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center text-white/40 text-sm gap-2">
            <span className="w-3 h-3 border-2 border-white/20 border-t-white/50 rounded-full animate-spin" />
            Generando vista previa…
          </div>
        )}
        <iframe
          key={src}
          src={src}
          title={title}
          onLoad={() => setLoaded(true)}
          className="w-full h-full"
          style={{ opacity: loaded ? 1 : 0, transition: "opacity 150ms" }}
        />
      </div>
    </div>
  );
}
