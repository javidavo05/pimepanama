/** Base URL for design-system static assets (fonts, logos, style.css). */
export const DESIGN_SYSTEM_BASE = "/design-system";

const SCREEN_STYLES = `
  html, body { margin: 0; padding: 0; }
  body {
    background: #DCE2EC;
    padding: 24px 16px 48px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
  }
  .page {
    box-shadow: 0 4px 24px rgba(11, 29, 58, 0.12);
    flex-shrink: 0;
  }
  [contenteditable="true"]:focus {
    outline: 2px solid rgba(31, 91, 255, 0.45);
    outline-offset: 2px;
    border-radius: 2px;
  }
  [contenteditable="true"]:hover {
    background: rgba(31, 91, 255, 0.04);
  }
`;

const PRINT_STYLES = `
  html, body { margin: 0; padding: 0; background: white; }
  body { display: block; }
  .page { box-shadow: none; margin: 0; }
`;

/**
 * Wraps `.page` fragments in a full HTML document with design-system CSS.
 * `linea` activa la paleta de la línea de marca del cliente (`data-linea`, como en design-system).
 * `inlineCss` reemplaza el <link> (para Chromium sin servidor, que no puede resolver rutas relativas).
 */
export function wrapDesignSystemDocument(
  pagesHtml: string,
  opts?: { mode?: "screen" | "print"; editable?: boolean; linea?: "normal" | "premium"; inlineCss?: string }
): string {
  const mode = opts?.mode ?? "screen";
  const extra = mode === "screen" ? SCREEN_STYLES : PRINT_STYLES;
  const editableAttr = opts?.editable ? ' contenteditable="true"' : "";
  const linea = opts?.linea === "premium" ? "premium" : "normal";
  const css = opts?.inlineCss ? `<style>${opts.inlineCss}</style>` : `<link rel="stylesheet" href="${DESIGN_SYSTEM_BASE}/style.css" />`;

  return `<!DOCTYPE html>
<html lang="es" data-linea="${linea}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  ${css}
  <style>${extra}</style>
</head>
<body${editableAttr}>
${pagesHtml}
</body>
</html>`;
}

/** Extracts inner HTML of all `.page` divs from a full document or fragment. */
export function extractPagesHtml(html: string): string {
  const trimmed = html.trim();
  if (!trimmed.includes("<html")) return trimmed;

  const matches = [...trimmed.matchAll(/<div\s+class="page"[\s\S]*?<\/div>\s*(?=<div\s+class="page"|$)/gi)];
  if (matches.length > 0) {
    return matches.map((m) => m[0].trim()).join("\n");
  }

  const bodyMatch = trimmed.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  return bodyMatch?.[1]?.trim() ?? trimmed;
}
