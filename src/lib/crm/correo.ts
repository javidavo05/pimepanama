/**
 * Correos del CRM (fase 5): variables de las plantillas y el armazón HTML de cada correo.
 * Todo es puro y sirve en el servidor y en el navegador (la vista previa usa lo mismo que el envío).
 *
 * El cuerpo se escribe como texto: los saltos de línea se respetan y los enlaces http(s) quedan tocables.
 * Los datos que se meten en las variables vienen de la base (nombre, empresa…) y siempre se escapan.
 */

export const VARIABLES = [
  { clave: "nombre", label: "Nombre", ayuda: "Primer nombre del contacto" },
  { clave: "empresa", label: "Empresa", ayuda: "Empresa del cliente" },
  { clave: "contacto", label: "Contacto", ayuda: "Nombre completo del contacto" },
  { clave: "mi_nombre", label: "Mi nombre", ayuda: "Quien envía el correo" },
] as const;

export type ClaveVariable = (typeof VARIABLES)[number]["clave"];
export type DatosCorreo = Partial<Record<ClaveVariable, string | null | undefined>>;

/** Datos de ejemplo para la vista previa. */
export const DATOS_EJEMPLO: Record<ClaveVariable, string> = {
  nombre: "María",
  empresa: "Ferretería El Puente",
  contacto: "María González",
  mi_nombre: "Javier Vallejo",
};

export function escaparHtml(v: string | null | undefined): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const VAR_RE = /\{\{\s*([a-z_]+)\s*\}\}/g;
const CLAVES = new Set<string>(VARIABLES.map((v) => v.clave));

/** Primer nombre de «María José González» → «María». */
export function primerNombre(nombre: string | null | undefined): string {
  return String(nombre ?? "").trim().split(/\s+/)[0] ?? "";
}

/**
 * Rellena las variables de una plantilla HTML. Los datos se escapan; las variables que no existen quedan tal
 * cual (así se notan en la vista previa) y las conocidas sin dato quedan vacías.
 */
export function rellenar(plantilla: string, datos: DatosCorreo): string {
  return plantilla.replace(VAR_RE, (todo, clave: string) => (CLAVES.has(clave) ? escaparHtml(datos[clave as ClaveVariable]) : todo));
}

/** Igual que `rellenar` pero para texto plano (asunto, texto que se pre-llena en un campo): no escapa. */
export function rellenarTexto(plantilla: string, datos: DatosCorreo): string {
  return plantilla
    .replace(VAR_RE, (todo, clave: string) => (CLAVES.has(clave) ? String(datos[clave as ClaveVariable] ?? "") : todo))
    .replace(/\s*\r?\n\s*/g, " ");
}

/** Variables escritas que no existen («{{telefono}}»): se avisa antes de guardar. */
export function variablesDesconocidas(texto: string): string[] {
  const fuera = new Set<string>();
  for (const m of texto.matchAll(VAR_RE)) if (!CLAVES.has(m[1])) fuera.add(m[1]);
  return [...fuera];
}

const P = "margin:0 0 16px 0;font-family:'Manrope',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#0B1D3A;";

/** Texto escrito por el equipo → HTML: escapa, separa párrafos, respeta saltos y vuelve tocables los enlaces. */
export function textoAHtml(texto: string): string {
  const parrafos = texto.replace(/\r\n/g, "\n").trim().split(/\n{2,}/).filter((p) => p.trim());
  return parrafos
    .map((p) => {
      const html = escaparHtml(p.trim())
        .replace(/https?:\/\/[^\s<]+[^\s<.,;:!?)]/g, (url) => `<a href="${url}" style="color:#1F5BFF;">${url}</a>`)
        .replace(/\n/g, "<br>");
      return `<p style="${P}">${html}</p>`;
    })
    .join("");
}

/** El cuerpo de texto con sus variables ya puestas, en HTML seguro. */
export function cuerpoHtml(cuerpo: string, datos: DatosCorreo): string {
  return rellenar(textoAHtml(cuerpo), datos);
}

/**
 * Armazón de los correos del CRM: banda de la marca, logo, el cuerpo y el pie. En las campañas el pie lleva
 * «Darme de baja» y un píxel de apertura; en los correos uno a uno, solo la firma de la empresa.
 */
export function correoHtml(p: { cuerpo: string; preheader?: string; logoUrl: string; siteUrl: string; bajaUrl?: string | null; pixelUrl?: string | null }): string {
  const F = "font-family:'Manrope',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;";
  const banda = ["#0B1D3A", "#1F5BFF", "#6FA8FF"].map((c) => `<tr><td height="3" bgcolor="${c}" style="height:3px;line-height:3px;font-size:0;background-color:${c};">&nbsp;</td></tr>`).join("");
  const baja = p.bajaUrl
    ? `<br><span style="color:#8792A8;">¿No quieres recibir más correos como este? </span><a href="${escaparHtml(p.bajaUrl)}" style="color:#4A5A78;">Darme de baja</a>`
    : "";
  const pixel = p.pixelUrl ? `<img src="${escaparHtml(p.pixelUrl)}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;" />` : "";
  return `<!DOCTYPE html>
<html lang="es"><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><meta name="color-scheme" content="light" /><title>Pime Panamá</title></head>
<body style="margin:0;padding:0;background-color:#F4F6FA;">
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#F4F6FA;">${escaparHtml(p.preheader ?? "")}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F4F6FA" style="background-color:#F4F6FA;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:#FFFFFF;border:1px solid #E4E8F0;border-radius:14px;overflow:hidden;">
${banda}
<tr><td style="padding:32px 32px 16px 32px;"><a href="${escaparHtml(p.siteUrl)}" style="text-decoration:none;"><img src="${escaparHtml(p.logoUrl)}" width="132" height="38" alt="Pime Panamá" style="display:block;width:132px;height:38px;border:0;${F}font-size:20px;font-weight:800;color:#0B1D3A;" /></a></td></tr>
<tr><td style="padding:8px 32px 8px 32px;">${p.cuerpo}</td></tr>
<tr><td style="padding:8px 32px 32px 32px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td height="1" bgcolor="#E4E8F0" style="height:1px;line-height:1px;font-size:0;">&nbsp;</td></tr>
<tr><td style="padding-top:16px;${F}font-size:12px;line-height:1.6;color:#4A5A78;"><strong style="color:#0B1D3A;">Pime Panamá</strong> · <a href="mailto:info@pimepanama.com" style="color:#1F5BFF;text-decoration:none;">info@pimepanama.com</a>${baja}</td></tr></table></td></tr>
</table>${pixel}
</td></tr></table>
</body></html>`;
}
