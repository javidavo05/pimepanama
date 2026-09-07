/**
 * Los avisos que el formulario público mandaba a info@ son HTML con la misma
 * plantilla desde 2024 (`getAdminNotificationEmail`). Meses de solicitudes
 * quedaron ahí sin convertirse en leads, así que hace falta leerlas de vuelta.
 *
 * No es un parser de HTML general: reconoce exactamente esa plantilla y
 * devuelve null ante cualquier otra cosa, para no inventar leads con basura.
 */

export type ParsedContactEmail = {
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  message: string;
  locale: "es" | "en";
};

const FIELD_RE =
  /<div class="label">([^<]+)<\/div>\s*<div class="(?:value|message-box)">([\s\S]*?)<\/div>/g;

function stripHtml(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

/** true si el correo es uno de los avisos del formulario público. */
export function isContactFormEmail(subject: string | null): boolean {
  return /^\[PIME Panama\]\s*Nueva solicitud de /i.test(subject ?? "");
}

export function parseContactEmail(bodyHtml: string | null): ParsedContactEmail | null {
  if (!bodyHtml) return null;

  const fields = new Map<string, string>();
  for (const [, label, raw] of bodyHtml.matchAll(FIELD_RE)) {
    fields.set(label.trim().toLowerCase(), stripHtml(raw));
  }

  const name = fields.get("nombre") ?? "";
  const email = (fields.get("email") ?? "").toLowerCase();
  const message = fields.get("mensaje") ?? "";

  // Sin nombre, correo y mensaje no hay lead que crear.
  if (!name || !email || !message) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return null;

  return {
    name,
    email,
    company: fields.get("empresa") || null,
    phone: fields.get("teléfono") || fields.get("telefono") || null,
    message,
    locale: (fields.get("idioma") ?? "").toLowerCase().startsWith("en") ? "en" : "es",
  };
}
