/** Textos de /baja en español e inglés. Cada enlace lleva su idioma: ?lang=es o ?lang=en. */
export type Idioma = "es" | "en";

export const TEXTOS = {
  es: {
    metaTitulo: "Darme de baja — Pime Panamá",
    titulo: "Darme de baja",
    subtitulo: "Deja de recibir nuestras campañas por correo.",
    dudas: "¿Dudas? Escríbenos a",
    invalido: "Este enlace no es válido o está incompleto. Ábrelo de nuevo desde el correo, o escríbenos y te damos de baja a mano.",
    yaEstaba: (email: string) => [email, " ya estaba dado de baja: no te llegan más campañas."] as const,
    vas: "Vas a dejar de recibir las campañas de Pime en",
    confirmar: "Confirmar mi baja",
    guardando: "Guardando tu baja…",
    listo: ["Listo: ", " ya no va a recibir nuestras campañas. Si te escribimos por un proyecto o una factura, esos correos siguen llegando."] as const,
    errorToken: "Este enlace no es válido. Copia el enlace completo del correo o escríbenos a info@pimepanama.com.",
    errorGuardar: "No pudimos guardar tu baja ahora. Vuelve a intentar en un momento o escríbenos a info@pimepanama.com.",
  },
  en: {
    metaTitulo: "Unsubscribe — Pime Panamá",
    titulo: "Unsubscribe",
    subtitulo: "Stop receiving our emails.",
    dudas: "Questions? Write to us at",
    invalido: "This link isn't valid or is incomplete. Open it again from the email, or write to us and we'll unsubscribe you by hand.",
    yaEstaba: (email: string) => [email, " was already unsubscribed: you won't get any more emails from us."] as const,
    vas: "You'll stop receiving Pime's outreach emails at",
    confirmar: "Confirm unsubscribe",
    guardando: "Saving…",
    listo: ["Done: ", " won't receive our outreach emails anymore. If we write to you about a project or an invoice, those emails still arrive."] as const,
    errorToken: "This link isn't valid. Copy the full link from the email or write to us at info@pimepanama.com.",
    errorGuardar: "We couldn't save your request right now. Try again in a moment or write to us at info@pimepanama.com.",
  },
};

/** ?lang manda; solo los correos enviados antes del 2026-10-21 llegan sin él, y ahí decide el navegador. */
export function idiomaDe(lang: string | undefined, acceptLanguage: string | null): Idioma {
  if (lang === "en" || lang === "es") return lang;
  return /^en\b/i.test(acceptLanguage?.trim() ?? "") ? "en" : "es";
}
