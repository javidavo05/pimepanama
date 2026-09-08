"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { wrapDesignSystemDocument } from "@/lib/design-system/document";

interface DesignSystemHtmlEditorProps {
  value: string;
  onChange: (pagesHtml: string) => void;
  title?: string;
}

const A4_WIDTH_PX = 794; // 210mm at 96dpi

/**
 * Visual HTML editor for design-system proposals: renders paginated A4 `.page` divs
 * with brand CSS and allows in-place WYSIWYG editing inside the preview iframe.
 */
export function DesignSystemHtmlEditor({
  value,
  onChange,
  title = "Documento (design-system)",
}: DesignSystemHtmlEditorProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [editing, setEditing] = useState(true);
  const [showSource, setShowSource] = useState(false);
  const [source, setSource] = useState(value);
  const [scale, setScale] = useState(0.72);
  const containerRef = useRef<HTMLDivElement>(null);

  const writeIframe = useCallback(
    (pagesHtml: string, editable: boolean) => {
      const doc = iframeRef.current?.contentDocument;
      if (!doc) return;
      const full = wrapDesignSystemDocument(pagesHtml, { mode: "screen", editable: false });
      doc.open();
      doc.write(full);
      doc.close();

      if (editable) {
        doc.querySelectorAll(".page").forEach((page) => {
          page.setAttribute("contenteditable", "true");
          page.setAttribute("spellcheck", "true");
        });
      }
    },
    []
  );

  const extractFromIframe = useCallback((): string => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return value;
    const pages = [...doc.querySelectorAll(".page")];
    return pages.map((p) => p.outerHTML).join("\n");
  }, [value]);

  useEffect(() => {
    setSource(value);
    writeIframe(value, editing && !showSource);
  }, [value, editing, showSource, writeIframe]);

  useEffect(() => {
    function onResize() {
      const w = containerRef.current?.clientWidth ?? 900;
      setScale(Math.min(0.85, Math.max(0.45, (w - 48) / A4_WIDTH_PX)));
    }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || showSource) return;

    function handleInput() {
      const html = extractFromIframe();
      setSource(html);
      onChange(html);
    }

    const attach = () => {
      const doc = iframe.contentDocument;
      if (!doc) return;
      doc.addEventListener("input", handleInput);
      doc.addEventListener("blur", handleInput, true);
    };

    iframe.addEventListener("load", attach);
    attach();
    return () => {
      iframe.removeEventListener("load", attach);
      iframe.contentDocument?.removeEventListener("input", handleInput);
      iframe.contentDocument?.removeEventListener("blur", handleInput, true);
    };
  }, [extractFromIframe, onChange, showSource, value]);

  function applySource() {
    onChange(source);
    setShowSource(false);
    writeIframe(source, editing);
  }

  return (
    <div className="bg-panel border border-line rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-line flex flex-wrap items-center justify-between gap-3">
        <span className="text-fg-dim text-xs uppercase tracking-widest font-medium">{title}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditing((e) => !e)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              editing
                ? "border-azure/40 text-sky bg-azure/10"
                : "border-line text-fg-faint hover:text-fg-mute"
            }`}
          >
            {editing ? "Edición activa" : "Solo lectura"}
          </button>
          <button
            type="button"
            onClick={() => {
              if (showSource) {
                applySource();
              } else {
                setSource(extractFromIframe());
                setShowSource(true);
              }
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-line text-fg-faint hover:text-fg-mute transition-colors"
          >
            {showSource ? "Aplicar HTML" : "Ver HTML"}
          </button>
        </div>
      </div>

      {showSource ? (
        <div className="p-4">
          <textarea
            value={source}
            onChange={(e) => setSource(e.target.value)}
            rows={24}
            spellCheck={false}
            className="w-full font-mono text-xs bg-canvas border border-line rounded-lg p-4 text-fg-soft focus:outline-none focus:border-azure/40 resize-y"
          />
          <p className="text-fg-ghost text-[11px] mt-2">
            Edita el HTML de las páginas (<code className="text-fg-faint">div.page</code>). Pulsa &quot;Aplicar HTML&quot; para actualizar la vista previa.
          </p>
        </div>
      ) : (
        <div
          ref={containerRef}
          // theme-ok: mesa del visor de documentos — gris fijo en ambos temas, como un lector de PDF
          className="relative bg-[#c8ccd6] overflow-auto" data-theme-surface="fixed"
          style={{ height: "80vh" }}
        >
          <div
            className="mx-auto py-6"
            style={{
              width: A4_WIDTH_PX * scale,
              transformOrigin: "top center",
            }}
          >
            <iframe
              ref={iframeRef}
              title={title}
              className="border-0 bg-transparent"
              style={{
                width: A4_WIDTH_PX,
                height: 1200,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
              sandbox="allow-same-origin allow-scripts"
            />
          </div>
        </div>
      )}

      <div className="px-4 py-2 border-t border-line text-[11px] text-fg-ghost">
        Vista previa con plantilla Pime (Inter + Manrope, A4). Haz clic en el texto para editar visualmente.
      </div>
    </div>
  );
}
