import { isHtmlEmail, htmlToPlainText } from "@/lib/mail/email-html";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const ENLACE = 'style="color:#2F5BEA;text-decoration:underline;"';

/**
 * Enlaces en texto ya escapado. «…dese de baja aquí: https://…/baja/…» (el pie de los correos en frío) queda como
 * «…<a>dese de baja aquí</a>.»; cualquier otra dirección, como enlace con su propio texto.
 */
function enlazar(html: string): string {
  return html
    .replace(/([^\s:.,;][^:<>]*?):\s*(https?:\/\/[^\s<]+\/baja\/[^\s<]+)/g, (_, texto: string, url: string) => {
      const i = texto.search(/(dese de baja aquí|unsubscribe here)$/i);
      return i < 0
        ? `${texto}: <a href="${url}" ${ENLACE}>${url}</a>`
        : `${texto.slice(0, i)}<a href="${url}" ${ENLACE}>${texto.slice(i)}</a>.`;
    })
    .replace(/(^|[\s(])(https?:\/\/[^\s<]+?)([.,;:!?)]?)(?=\s|$|<)/g, (m, antes: string, url: string, despues: string) =>
      `${antes}<a href="${url}" ${ENLACE}>${url}</a>${despues}`);
}

/** Convierte texto plano (p. ej. respuesta IA) a HTML de correo. */
export function plainTextToHtml(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  if (isHtmlEmail(trimmed)) return trimmed;

  return trimmed
    .split(/\n{2,}/)
    .map(
      (p) =>
        `<p style="margin:0 0 1em 0;line-height:1.65;">${enlazar(escapeHtml(p)).replace(/\n/g, "<br>")}</p>`
    )
    .join("");
}

export function normalizeMailBodyHtml(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) return "";
  if (isHtmlEmail(trimmed)) return trimmed;
  return plainTextToHtml(trimmed);
}

export function mailBodyHasContent(body: string): boolean {
  return htmlToPlainText(body).trim().length > 0;
}

/** User message only — strips appended HTML signature block. */
function extractOutboundMessageHtml(html: string): string {
  const bodyMatch = html.match(
    /<div style="font-family:(?:'Segoe UI'|Manrope)[^>]*>([\s\S]*?)<\/div>/i
  );
  if (bodyMatch?.[1]) return bodyMatch[1];

  const sigIdx = html.search(/<br\s*\/?>\s*<br\s*\/?>\s*<table/i);
  if (sigIdx > 0) return html.slice(0, sigIdx);

  return html;
}

/** Plain-text snippet for inbox/sent list rows (message only, no signature). */
export function mailBodyPreview(body: string | null | undefined, maxLen = 160): string | null {
  if (!body?.trim()) return null;
  const messageHtml = extractOutboundMessageHtml(body);
  const plain = htmlToPlainText(messageHtml).replace(/\s+/g, " ").trim();
  if (!plain) return null;
  if (plain.length <= maxLen) return plain;
  return `${plain.slice(0, maxLen).trim()}…`;
}

export { htmlToPlainText };
