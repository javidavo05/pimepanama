"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { buildEmailSrcDoc, htmlToPlainText, isHtmlEmail } from "@/lib/mail/email-html";

interface EmailBodyRendererProps {
  body: string | null;
  emailId?: string;
  onBodyUpdated?: (body: string) => void;
}

export function EmailBodyRenderer({ body, emailId, onBodyUpdated }: EmailBodyRendererProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(480);
  const [viewMode, setViewMode] = useState<"html" | "text">("html");
  const [resyncing, setResyncing] = useState(false);
  const [resyncError, setResyncError] = useState<string | null>(null);
  const [renderVersion, setRenderVersion] = useState(0);

  const html = body && isHtmlEmail(body) ? body : null;
  const showModeToggle = !!html;
  const showResync = !!emailId && !html;
  const iframeSrc = emailId
    ? `/api/empresa/mail/inbox/${emailId}/render?v=${renderVersion}`
    : null;

  const updateHeight = useCallback(() => {
    try {
      const doc = iframeRef.current?.contentDocument;
      if (!doc) return;
      const h = Math.max(200, doc.documentElement.scrollHeight + 32);
      setHeight(h);
    } catch {}
  }, []);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !html) return;
    iframe.addEventListener("load", updateHeight);
    const timer = setTimeout(updateHeight, 800);
    const timer2 = setTimeout(updateHeight, 2000);
    const timer3 = setTimeout(updateHeight, 5000);
    return () => {
      iframe.removeEventListener("load", updateHeight);
      clearTimeout(timer);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [updateHeight, html, renderVersion, iframeSrc]);

  async function handleResyncBody() {
    if (!emailId) return;
    setResyncing(true);
    setResyncError(null);
    try {
      const res = await fetch(`/api/empresa/mail/inbox/${emailId}/resync-body`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setResyncError(data.error ?? "No se pudo recuperar el HTML");
        return;
      }
      if (data.bodyText && isHtmlEmail(data.bodyText)) {
        onBodyUpdated?.(data.bodyText);
        setRenderVersion((v) => v + 1);
        setViewMode("html");
      } else if (data.upgraded === 0) {
        setResyncError(
          data.noHtml > 0
            ? "El servidor no tiene parte HTML para este correo"
            : "No se encontró el mensaje en el buzón IMAP"
        );
      }
    } catch {
      setResyncError("Error de red al re-sincronizar");
    } finally {
      setResyncing(false);
    }
  }

  if (!body) {
    return <p className="text-white/50 text-sm italic">(Sin contenido)</p>;
  }

  if (!html || viewMode === "text") {
    const plainText = html ? htmlToPlainText(html) : body;

    return (
      <div>
        {showResync && (
          <div className="mb-3 text-xs text-amber-400/80 border border-amber-500/20 bg-amber-500/10 rounded-lg px-3 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span>Este correo se guardó sin HTML. Recupéralo desde el buzón IMAP.</span>
            <button
              type="button"
              onClick={handleResyncBody}
              disabled={resyncing}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 disabled:opacity-50 transition-all"
            >
              {resyncing ? "Recuperando…" : "Recuperar formato"}
            </button>
          </div>
        )}
        {resyncError && (
          <p className="mb-3 text-xs text-red-400/80 border border-red-500/20 bg-red-500/10 rounded-lg px-3 py-2">
            {resyncError}
          </p>
        )}
        {showModeToggle && (
          <div className="flex justify-end mb-3">
            <button
              onClick={() => setViewMode("html")}
              className="text-[10px] text-[#1AA7F0]/60 hover:text-[#1AA7F0] transition-colors"
            >
              Ver con formato →
            </button>
          </div>
        )}
        <div className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap font-sans">
          {plainText || "(Sin contenido de texto)"}
        </div>
      </div>
    );
  }

  return (
    <div>
      {showModeToggle && (
        <div className="flex items-center justify-between mb-3">
          <span className="text-white/50 text-xs">Correo HTML</span>
          <button
            onClick={() => setViewMode("text")}
            className="text-[10px] text-white/55 hover:text-white/60 transition-colors"
          >
            Ver texto plano
          </button>
        </div>
      )}
      <div className="rounded-xl overflow-hidden border border-white/[0.06] bg-white w-full min-w-0">
        <iframe
          ref={iframeRef}
          src={iframeSrc ?? undefined}
          srcDoc={iframeSrc ? undefined : buildEmailSrcDoc(html, { proxyImages: true })}
          sandbox="allow-same-origin allow-popups"
          className="w-full min-w-0"
          style={{ height: `${height}px`, border: "none", display: "block" }}
          title="Contenido del correo"
        />
      </div>
    </div>
  );
}
