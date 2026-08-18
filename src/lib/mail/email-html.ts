import { rewriteEmailExternalImages } from "@/lib/mail/email-image-proxy";

/** True when the string looks like HTML email content (not plain text). */
export function isHtmlEmail(s: string): boolean {
  const sample = s.trim().slice(0, 16000);
  if (!sample) return false;

  if (/^<!DOCTYPE\s+html/i.test(sample) || /^<html[\s>]/i.test(sample)) return true;

  return /<(?:style|head|body|div|table|tbody|thead|tfoot|tr|td|th|p|span|a|img|br|h[1-6]|center|font|meta|link|ul|ol|li|section|article)\b/i.test(
    sample
  );
}

/** Normalize mailparser html field (string | Buffer | false). */
export function parseMailHtml(html: unknown, textAsHtml?: unknown): string | null {
  if (typeof html === "string" && html.trim()) return html;
  if (Buffer.isBuffer(html)) return html.toString("utf8");
  if (typeof textAsHtml === "string" && textAsHtml.trim()) return textAsHtml;
  return null;
}

type MailAttachment = {
  contentType?: string;
  content?: Buffer | string;
};

type ParsedMailLike = {
  html?: unknown;
  textAsHtml?: unknown;
  attachments?: MailAttachment[];
};

/** Best-effort HTML extraction from a parsed MIME message. */
export function extractEmailHtml(parsed: ParsedMailLike): string | null {
  const direct = parseMailHtml(parsed.html, parsed.textAsHtml);
  if (direct) return direct;

  for (const att of parsed.attachments ?? []) {
    const type = (att.contentType ?? "").toLowerCase();
    if (!type.includes("text/html") || !att.content) continue;
    const content = Buffer.isBuffer(att.content) ? att.content.toString("utf8") : String(att.content);
    if (content.trim()) return content;
  }

  return null;
}

/** Body was stored as plain text but likely came from an HTML marketing email. */
export function needsHtmlResync(body: string | null | undefined): boolean {
  if (!body || isHtmlEmail(body)) return false;
  return /@font-face|@media\s+only|mso-|\.pc-[a-z]|<table|<div/i.test(body);
}

const IFRAME_RESPONSIVE_CSS = `
html,body{margin:0;padding:0;max-width:100%!important;overflow-x:auto!important;}
body{word-break:break-word;}
img{max-width:100%!important;height:auto!important;}
table{max-width:100%!important;}
td,th{max-width:100%!important;word-break:break-word;}
.shell_width-row,.scale,.shell{width:100%!important;max-width:100%!important;}
img[width="1"],img[height="1"]{display:none!important;}
`;

function injectResponsiveStyles(html: string): string {
  const styleTag = `<style data-mail-hub-inject>${IFRAME_RESPONSIVE_CSS}</style>`;
  if (/<head[\s>]/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>${styleTag}`);
  }
  if (/<html[\s>]/i.test(html)) {
    return html.replace(/<html([^>]*)>/i, `<html$1><head>${styleTag}</head>`);
  }
  return html;
}

export type BuildEmailSrcDocOptions = {
  proxyImages?: boolean;
};

/** Build a safe srcDoc for sandboxed iframe — avoid nesting full documents. */
export function buildEmailSrcDoc(html: string, options?: BuildEmailSrcDocOptions): string {
  const trimmed = (options?.proxyImages !== false ? rewriteEmailExternalImages(html) : html).trim();
  if (/^<!DOCTYPE\s+html/i.test(trimmed) || /^<html[\s>]/i.test(trimmed)) {
    return injectResponsiveStyles(trimmed);
  }

  return `<!DOCTYPE html>
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
img[width="1"],img[height="1"]{display:none!important;}
</style>
</head>
<body>${trimmed}</body>
</html>`;
}

/** Decode common HTML entities (including double-encoded &amp;nbsp;). */
export function decodeHtmlEntities(text: string): string {
  let s = text;
  for (let i = 0; i < 2; i++) {
    s = s.replace(/&amp;/g, "&");
  }
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&#160;/g, " ")
    .replace(/&middot;/gi, "·")
    .replace(/&#183;/g, "·")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

export function htmlToPlainText(html: string): string {
  const stripped = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return decodeHtmlEntities(stripped);
}
