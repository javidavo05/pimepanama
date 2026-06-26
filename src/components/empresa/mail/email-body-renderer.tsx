"use client";

import { useRef, useEffect, useState, useCallback } from "react";

interface EmailBodyRendererProps {
  body: string | null;
}

const isHtml = (s: string) => /<(html|body|div|table|p|span|a|img|br|h[1-6])\b/i.test(s.slice(0, 2000));

const WRAPPER = (html: string) => `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<base target="_blank">
<style>
*{box-sizing:border-box;}
html,body{margin:0;padding:0;}
body{padding:16px 20px;font-family:-apple-system,Arial,sans-serif;font-size:14px;line-height:1.6;color:#222;background:#fff;word-break:break-word;}
img{max-width:100%!important;height:auto;}
a{color:#1AA7F0;text-decoration:none;}
a:hover{text-decoration:underline;}
table{max-width:100%!important;border-collapse:collapse;}
td,th{max-width:100%!important;word-break:break-word;}
pre{white-space:pre-wrap;word-break:break-all;}
/* Hide tracking pixels */
img[width="1"],img[height="1"]{display:none!important;}
</style>
</head>
<body>${html}</body>
</html>`;

export function EmailBodyRenderer({ body }: EmailBodyRendererProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(480);
  const [viewMode, setViewMode] = useState<"html" | "text">("html");

  const html = body && isHtml(body) ? body : null;
  const showModeToggle = !!html;

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
    if (!iframe) return;
    iframe.addEventListener("load", updateHeight);
    // Also update after images load
    const timer = setTimeout(updateHeight, 800);
    return () => {
      iframe.removeEventListener("load", updateHeight);
      clearTimeout(timer);
    };
  }, [updateHeight, html]);

  if (!body) {
    return <p className="text-white/25 text-sm italic">(Sin contenido)</p>;
  }

  if (!html || viewMode === "text") {
    const plainText = html
      ? html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
             .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
             .replace(/<[^>]+>/g, " ")
             .replace(/\s+/g, " ")
             .trim()
      : body;

    return (
      <div>
        {showModeToggle && (
          <div className="flex justify-end mb-3">
            <button onClick={() => setViewMode("html")}
              className="text-[10px] text-[#1AA7F0]/60 hover:text-[#1AA7F0] transition-colors">
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
          <span className="text-white/25 text-xs">Correo HTML</span>
          <button onClick={() => setViewMode("text")}
            className="text-[10px] text-white/30 hover:text-white/60 transition-colors">
            Ver texto plano
          </button>
        </div>
      )}
      <div className="rounded-xl overflow-hidden border border-white/[0.06] bg-white">
        <iframe
          ref={iframeRef}
          srcDoc={WRAPPER(html)}
          sandbox="allow-same-origin allow-popups"
          style={{ width: "100%", height: `${height}px`, border: "none", display: "block" }}
          title="Contenido del correo"
        />
      </div>
    </div>
  );
}
