"use client";

interface SignaturePreviewProps {
  html: string;
  className?: string;
  collapsibleOnMobile?: boolean;
}

function SignatureBody({ html }: { html: string }) {
  return (
    <div className="bg-white p-3 sm:p-4 min-h-[80px] overflow-x-auto">
      <div
        className="min-w-0 max-w-full [&_table]:max-w-full [&_img]:h-auto [&_img]:max-w-[120px]"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

export function SignaturePreview({ html, className = "", collapsibleOnMobile = false }: SignaturePreviewProps) {
  if (collapsibleOnMobile) {
    return (
      <>
        <details className={`sm:hidden rounded-xl border border-line overflow-hidden ${className}`}>
          <summary className="px-3 py-2.5 bg-fill text-fg-faint text-[10px] uppercase tracking-widest cursor-pointer list-none flex items-center justify-between">
            <span>Vista previa de firma</span>
            <span className="text-fg-trace text-xs">▼</span>
          </summary>
          <SignatureBody html={html} />
        </details>
        <div className={`hidden sm:block rounded-xl border border-line overflow-hidden ${className}`}>
          <div className="px-3 py-2 bg-fill border-b border-line">
            <p className="text-fg-faint text-[10px] uppercase tracking-widest">Vista previa de firma</p>
          </div>
          <SignatureBody html={html} />
        </div>
      </>
    );
  }

  return (
    <div className={`rounded-xl border border-line overflow-hidden ${className}`}>
      <div className="px-3 py-2 bg-fill border-b border-line">
        <p className="text-fg-faint text-[10px] uppercase tracking-widest">Vista previa de firma</p>
      </div>
      <SignatureBody html={html} />
    </div>
  );
}
