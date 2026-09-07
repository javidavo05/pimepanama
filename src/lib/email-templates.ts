/**
 * Correos transaccionales de la web pública.
 *
 * Siguen `design-system/PROMPT_CLAUDE_CODE.md`: la paleta de marca, el
 * gradiente **solo como acento** (nunca como fondo de bloques grandes) y la
 * regla de que lo comercial se ve serio y corporativo, no llamativo.
 *
 * Restricciones de correo, que mandan sobre cualquier otra cosa:
 * - Layout en tablas con estilos inline: Outlook no entiende flex ni grid, y
 *   varios clientes descartan el <style> del head.
 * - Sin @import de fuentes web: Gmail las ignora. Se declaran igual por si el
 *   cliente las tiene, con una pila de respaldo que aguanta sola.
 * - El logo va como PNG en URL absoluta. La mitad de los clientes bloquea
 *   imágenes por defecto, así que el `alt` tiene que leerse como la marca.
 * - Fondos claros fijados explícitamente: el modo oscuro de Gmail y Outlook
 *   invierte lo que no está declarado, y el wordmark del logo es negro.
 */
import { getEmailLogoUrl } from "./company-logo";
import { getSiteUrl } from "./site-url";

type Lang = "es" | "en";

type ContactData = {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  message: string;
  locale: Lang;
  /** Enlace al lead ya creado en el CRM, para responder desde el panel. */
  leadUrl?: string;
};

// design-system/PROMPT_CLAUDE_CODE.md §1 — no se inventan variantes.
const C = {
  blue: "#0586FE",
  purple: "#552EFF",
  ink: "#0B0D14",
  slate: "#4B5468",
  slateLight: "#8A93A6",
  line: "#E7E9EF",
  panel: "#F5F6F9",
  white: "#FFFFFF",
};

const BODY_FONT =
  "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const HEAD_FONT =
  "'Manrope','Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/** El contenido lo escribe un desconocido en un formulario público: se escapa. */
function esc(value: string | undefined | null): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function nl2br(value: string): string {
  return esc(value).replace(/\r?\n/g, "<br>");
}

const COPY = {
  es: {
    tagline: "Desarrollo de software a medida en Panamá",
    proof: "Más de 30 sistemas entregados en Panamá y la región",
    rights: "Todos los derechos reservados.",
  },
  en: {
    tagline: "Custom software development in Panama",
    proof: "Over 30 systems delivered in Panama and the region",
    rights: "All rights reserved.",
  },
} as const;

/**
 * Estructura común de todos los correos: barra de acento, logo, contenido y
 * pie. El contenido llega ya como HTML de tabla.
 */
function shell(opts: { preheader: string; content: string; lang: Lang }): string {
  const { preheader, content, lang } = opts;
  const t = COPY[lang];
  const site = getSiteUrl();
  const logo = getEmailLogoUrl();

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="${lang}">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<title>Pime Panamá</title>
<style type="text/css">
  :root { color-scheme: light; supported-color-schemes: light; }
  body { margin:0; padding:0; width:100% !important; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  img { border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }
  table { border-collapse:collapse !important; }
  a { color:${C.blue}; }
  @media only screen and (max-width:620px) {
    .wrap { width:100% !important; }
    .pad { padding-left:24px !important; padding-right:24px !important; }
    .h1 { font-size:22px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:${C.panel};">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${C.panel};">
    ${esc(preheader)}&#8199;&#65279;&#8199;&#65279;&#8199;&#65279;&#8199;&#65279;&#8199;&#65279;&#8199;&#65279;&#8199;&#65279;&#8199;&#65279;
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.panel}" style="background-color:${C.panel};">
    <tr>
      <td align="center" style="padding:32px 16px;">

        <table role="presentation" class="wrap" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background-color:${C.white};border:1px solid ${C.line};border-radius:14px;overflow:hidden;">

          <!-- Acento de marca. El gradiente solo se usa así: una barra fina.
               Outlook ignora el degradado y muestra el azul sólido. -->
          <tr>
            <td height="4" bgcolor="${C.blue}" style="height:4px;line-height:4px;font-size:0;background-color:${C.blue};background-image:linear-gradient(90deg,${C.blue} 0%,${C.purple} 100%);border-radius:13px 13px 0 0;">&nbsp;</td>
          </tr>

          <!-- Logo sobre blanco: el wordmark es negro y desaparece en oscuro. -->
          <tr>
            <td class="pad" bgcolor="${C.white}" align="left" style="padding:32px 40px 8px 40px;background-color:${C.white};">
              <a href="${site}" style="text-decoration:none;">
                <img src="${logo}" width="150" height="83" alt="Pime Panamá"
                     style="display:block;width:150px;height:83px;border:0;outline:none;font-family:${HEAD_FONT};font-size:21px;font-weight:800;letter-spacing:-0.02em;color:${C.ink};" />
              </a>
            </td>
          </tr>

          ${content}

          <!-- Pie -->
          <tr>
            <td class="pad" bgcolor="${C.white}" style="padding:8px 40px 32px 40px;background-color:${C.white};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td height="1" bgcolor="${C.line}" style="height:1px;line-height:1px;font-size:0;background-color:${C.line};">&nbsp;</td></tr>
                <tr>
                  <td style="padding-top:20px;font-family:${BODY_FONT};font-size:13px;line-height:1.6;color:${C.slate};">
                    <strong style="color:${C.ink};">Pime Panamá</strong><br />
                    <span style="color:${C.slateLight};">${t.tagline} · ${t.proof}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:12px;font-family:${BODY_FONT};font-size:13px;line-height:1.6;">
                    <a href="mailto:info@pimepanama.com" style="color:${C.blue};text-decoration:none;">info@pimepanama.com</a>
                    <span style="color:${C.line};">&nbsp;|&nbsp;</span>
                    <a href="${site}" style="color:${C.blue};text-decoration:none;">pimepanama.com</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <table role="presentation" class="wrap" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
          <tr>
            <td align="center" style="padding:20px 16px 0 16px;font-family:${BODY_FONT};font-size:11px;line-height:1.6;color:${C.slateLight};">
              © ${new Date().getFullYear()} Pime Panamá. ${t.rights}
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}

function eyebrow(text: string): string {
  return `<tr>
    <td class="pad" bgcolor="${C.white}" style="padding:16px 40px 0 40px;background-color:${C.white};font-family:${BODY_FONT};font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${C.blue};">
      ${esc(text)}
    </td>
  </tr>`;
}

function heading(text: string): string {
  return `<tr>
    <td class="pad h1" bgcolor="${C.white}" style="padding:8px 40px 0 40px;background-color:${C.white};font-family:${HEAD_FONT};font-size:25px;font-weight:800;letter-spacing:-0.02em;line-height:1.25;color:${C.ink};">
      ${esc(text)}
    </td>
  </tr>`;
}

function paragraph(html: string, topPad = 16): string {
  return `<tr>
    <td class="pad" bgcolor="${C.white}" style="padding:${topPad}px 40px 0 40px;background-color:${C.white};font-family:${BODY_FONT};font-size:15px;font-weight:400;line-height:1.7;color:${C.slate};">
      ${html}
    </td>
  </tr>`;
}

/** Panel neutro para citar datos: label arriba en gris, valor debajo en ink. */
function detailPanel(rows: { label: string; value: string }[]): string {
  const inner = rows
    .map(
      (r, i) => `<tr>
        <td style="padding:${i === 0 ? 0 : 14}px 0 0 0;font-family:${BODY_FONT};font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${C.slateLight};">
          ${esc(r.label)}
        </td>
      </tr>
      <tr>
        <td style="padding:4px 0 0 0;font-family:${BODY_FONT};font-size:14px;line-height:1.65;color:${C.ink};">
          ${r.value}
        </td>
      </tr>`
    )
    .join("");

  return `<tr>
    <td class="pad" bgcolor="${C.white}" style="padding:20px 40px 0 40px;background-color:${C.white};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.panel}" style="background-color:${C.panel};border:1px solid ${C.line};border-radius:10px;">
        <tr><td style="padding:20px 22px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${inner}</table>
        </td></tr>
      </table>
    </td>
  </tr>`;
}

/** Botón a prueba de Outlook: color sólido, sin degradado ni VML. */
function button(href: string, label: string): string {
  return `<tr>
    <td class="pad" bgcolor="${C.white}" style="padding:24px 40px 0 40px;background-color:${C.white};">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td bgcolor="${C.blue}" style="background-color:${C.blue};border-radius:10px;">
            <a href="${esc(href)}" style="display:inline-block;padding:14px 28px;font-family:${BODY_FONT};font-size:14px;font-weight:700;color:${C.white};text-decoration:none;border-radius:10px;">
              ${esc(label)}
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function spacer(h = 32): string {
  return `<tr><td height="${h}" bgcolor="${C.white}" style="height:${h}px;line-height:${h}px;font-size:0;background-color:${C.white};">&nbsp;</td></tr>`;
}

// ─── Aviso interno de nueva solicitud ───────────────────────────────────────

export function getAdminNotificationEmail(data: ContactData) {
  const { locale, leadUrl } = data;
  const fecha = new Date().toLocaleString("es-PA", {
    timeZone: "America/Panama",
    dateStyle: "medium",
    timeStyle: "short",
  });

  const rows = [
    { label: "Nombre", value: esc(data.name) },
    {
      label: "Correo",
      value: `<a href="mailto:${esc(data.email)}" style="color:${C.blue};text-decoration:none;">${esc(data.email)}</a>`,
    },
    ...(data.company ? [{ label: "Empresa", value: esc(data.company) }] : []),
    ...(data.phone
      ? [{
          label: "Teléfono",
          value: `<a href="tel:${esc(data.phone)}" style="color:${C.blue};text-decoration:none;">${esc(data.phone)}</a>`,
        }]
      : []),
    { label: "Mensaje", value: nl2br(data.message) },
    { label: "Recibido", value: `${esc(fecha)} · ${locale === "es" ? "Español" : "English"}` },
  ];

  const content = [
    eyebrow("Nueva solicitud"),
    heading(data.name),
    paragraph(
      `Entró por el formulario de <a href="${getSiteUrl()}" style="color:${C.blue};text-decoration:none;">pimepanama.com</a>. Ya está guardada como lead en Pime Suite.`
    ),
    detailPanel(rows),
    leadUrl ? button(leadUrl, "Abrir el lead en Pime Suite") : "",
    spacer(),
  ].join("");

  return {
    subject: `[Pime Panamá] Nueva solicitud de ${data.name}${data.company ? ` · ${data.company}` : ""}`,
    html: shell({
      preheader: `${data.name}${data.company ? ` de ${data.company}` : ""}: ${data.message.slice(0, 120)}`,
      content,
      lang: "es",
    }),
  };
}

// ─── Acuse de recibo al cliente ─────────────────────────────────────────────

export function getCustomerThankYouEmail(data: ContactData) {
  const { locale } = data;
  const name = esc(data.name);

  const t =
    locale === "en"
      ? {
          subject: "We received your request — Pime Panamá",
          preheader: "A senior engineer is reviewing your requirements. You'll hear back within one business day.",
          eyebrow: "Request received",
          title: `Thank you, ${data.name.split(" ")[0]}`,
          p1: "Your message reached our team and a senior engineer is already reviewing your requirements.",
          p2: "You will get an answer <strong style=\"color:" + C.ink + ";\">within one business day</strong>, with a concrete read of your project and the next step we recommend — not a generic brochure.",
          sent: "What you sent us",
          p3: "If something is urgent in the meantime, reply to this email and it reaches us directly.",
          sign: "Pime Panamá team",
        }
      : {
          subject: "Recibimos su solicitud — Pime Panamá",
          preheader: "Un ingeniero senior está revisando sus requerimientos. Le respondemos dentro de un día hábil.",
          eyebrow: "Solicitud recibida",
          title: `Gracias, ${data.name.split(" ")[0]}`,
          p1: "Su mensaje llegó a nuestro equipo y un ingeniero senior ya está revisando sus requerimientos.",
          p2: `Le vamos a responder <strong style="color:${C.ink};">dentro de un día hábil</strong>, con una lectura concreta de su proyecto y el siguiente paso que recomendamos — no un folleto genérico.`,
          sent: "Lo que nos escribió",
          p3: "Si mientras tanto surge algo urgente, responda a este correo y nos llega directo.",
          sign: "Equipo de Pime Panamá",
        };

  const content = [
    eyebrow(t.eyebrow),
    heading(t.title),
    paragraph(t.p1),
    paragraph(t.p2),
    // Devolverle su propio mensaje es la prueba de que llegó completo.
    detailPanel([{ label: t.sent, value: nl2br(data.message) }]),
    paragraph(t.p3, 20),
    paragraph(
      `<span style="color:${C.slateLight};">${esc(t.sign)}</span>`,
      20
    ),
    spacer(),
  ].join("");

  return {
    subject: t.subject,
    html: shell({ preheader: t.preheader, content, lang: locale }),
  };
}

// ─── Envío promocional ──────────────────────────────────────────────────────

export function getPromotionalEmail(params: {
  recipientName: string;
  subject: string;
  title: string;
  content: string;
  ctaText: string;
  ctaLink: string;
  locale: Lang;
}) {
  const { recipientName, subject, title, content, ctaText, ctaLink, locale } = params;

  const body = [
    eyebrow(locale === "es" ? "Pime Panamá" : "Pime Panamá"),
    heading(title),
    paragraph(`${locale === "es" ? "Estimado/a" : "Dear"} ${esc(recipientName)},`),
    paragraph(nl2br(content)),
    ctaLink ? button(ctaLink, ctaText) : "",
    spacer(),
  ].join("");

  return {
    subject,
    html: shell({ preheader: title, content: body, lang: locale }),
  };
}
