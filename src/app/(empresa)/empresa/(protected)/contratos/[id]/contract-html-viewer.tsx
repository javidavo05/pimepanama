"use client";

import { useEffect, useRef, useState } from "react";
import { wrapDesignSystemDocument } from "@/lib/design-system/document";

interface ContractHtmlViewerProps {
  pagesHtml: string;
  refreshKey?: string;
}

/** Read-only design-system document preview for saved contracts. */
export function ContractHtmlViewer({ pagesHtml, refreshKey }: ContractHtmlViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(0.55);
  const containerRef = useRef<HTMLDivElement>(null);
  const A4_WIDTH = 794;

  useEffect(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(wrapDesignSystemDocument(pagesHtml, { mode: "screen" }));
    doc.close();
  }, [pagesHtml, refreshKey]);

  useEffect(() => {
    function onResize() {
      const w = containerRef.current?.clientWidth ?? 900;
      setScale(Math.min(0.65, Math.max(0.4, (w - 32) / A4_WIDTH)));
    }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl overflow-hidden mb-6">
      <div className="px-4 py-3 border-b border-white/[0.05]">
        <span className="text-white/60 text-xs uppercase tracking-widest font-medium">Vista del documento</span>
      </div>
      <div ref={containerRef} className="relative bg-[#c8ccd6] overflow-auto" style={{ height: "70vh" }}>
        <div className="mx-auto py-4" style={{ width: A4_WIDTH * scale }}>
          <iframe
            ref={iframeRef}
            title="Vista del contrato"
            className="border-0"
            style={{
              width: A4_WIDTH,
              height: 1100,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
            sandbox="allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
}
