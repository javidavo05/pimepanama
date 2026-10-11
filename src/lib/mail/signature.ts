import { normalizeMailBodyHtml } from "@/lib/mail/body-format";
import { getEmailLogoUrl } from "@/lib/company-logo";
import { htmlToPlainText } from "@/lib/mail/email-html";

export type SignatureConfig = {
  label: string;
  username: string;
  fromName?: string | null;
  signatureName?: string | null;
  signatureTitle?: string | null;
  signatureEnabled?: boolean | null;
  signatureHtml?: string | null;
};

export type CompanySignatureConfig = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  logoUrl?: string | null;
};

export function defaultSignatureTitleForLabel(label: string): string {
  const l = label.toLowerCase();
  if (l.includes("ventas")) return "Director de Ventas";
  return "Director General";
}

export function buildSignatureHtml(
  account: SignatureConfig,
  config: CompanySignatureConfig | null,
  options?: { logoOrigin?: string }
): string {
  if (account.signatureHtml?.trim()) return account.signatureHtml;

  const name = account.signatureName ?? account.fromName ?? "Javier Vallejo";
  const title = account.signatureTitle ?? defaultSignatureTitleForLabel(account.label);
  const logoUrl = getEmailLogoUrl(config, options?.logoOrigin);
  const company = config?.name ?? "Pime Panamá";

  // Marca «Capas abiertas», línea Normal (design-system/brand/manual.html).
  // theme-ok: firma de correo, se pinta sobre el fondo blanco del cliente de correo, no sobre la UI temada.
  const INK = "#0B1D3A", ACCENT = "#1F5BFF", SLATE = "#4A5A78", MUTED = "#8792A8", LINE = "#E4E8F0";
  const FONT = "Manrope,'Segoe UI',Arial,sans-serif";

  const contactParts: string[] = [];
  if (config?.phone) contactParts.push(`<span style="color:${SLATE};">${escapeHtml(config.phone)}</span>`);
  const email = account.username.trim() || config?.email;
  if (email) {
    contactParts.push(
      `<a href="mailto:${escapeHtml(email)}" style="color:${ACCENT};text-decoration:none;">${escapeHtml(email)}</a>`
    );
  }
  if (config?.website) {
    const display = config.website.replace(/^https?:\/\//, "");
    contactParts.push(
      `<a href="${escapeHtml(config.website.startsWith("http") ? config.website : `https://${config.website}`)}" style="color:${ACCENT};text-decoration:none;">${escapeHtml(display)}</a>`
    );
  }
  const contactLine = contactParts.join(` <span style="color:${MUTED};">&middot;</span> `);

  // Logo horizontal (símbolo + «pime»), 132 × 38 px a la vista; el PNG es el doble para pantallas retina.
  const logoW = 132;
  const logoH = 38;

  return `
<br><br>
<table cellpadding="0" cellspacing="0" border="0" style="font-family:${FONT};font-size:13px;color:${SLATE};max-width:520px;">
  <tr>
    <td style="width:3px;background:${ACCENT};border-radius:2px;padding:0;font-size:0;line-height:0;">&nbsp;</td>
    <td style="padding:0 0 0 16px;vertical-align:middle;">
      <table cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding-right:16px;vertical-align:middle;">
            <img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(company)}" width="${logoW}" height="${logoH}" style="display:block;border:0;outline:none;text-decoration:none;width:${logoW}px;height:${logoH}px;max-width:${logoW}px;" />
          </td>
          <td style="vertical-align:middle;line-height:1.5;border-left:1px solid ${LINE};padding-left:16px;">
            <div style="font-size:15px;font-weight:700;color:${INK};letter-spacing:-0.2px;">${escapeHtml(name)}</div>
            <div style="font-size:12px;color:${ACCENT};font-weight:600;margin-top:2px;">${escapeHtml(title)}</div>
            ${contactLine ? `<div style="font-size:11px;margin-top:6px;line-height:1.6;">${contactLine}</div>` : ""}
          </td>
        </tr>
      </table>
      <div style="margin-top:12px;font-size:10px;color:${MUTED};letter-spacing:0.12em;text-transform:uppercase;font-weight:600;">${escapeHtml(company)} &middot; Software &middot; Panam&aacute;</div>
    </td>
  </tr>
</table>`;
}

export function buildSignaturePlain(
  account: SignatureConfig,
  config: CompanySignatureConfig | null
): string {
  const name = account.signatureName ?? account.fromName ?? "Javier Vallejo";
  const title = account.signatureTitle ?? defaultSignatureTitleForLabel(account.label);
  const lines = [
    `--`,
    name,
    title,
    config?.name ?? "Pime Panamá",
    config?.phone,
    account.username.trim() || config?.email,
    config?.website,
  ].filter(Boolean);
  return lines.join("\n");
}

export function wrapBodyWithSignature(
  bodyHtml: string,
  account: SignatureConfig,
  config: CompanySignatureConfig | null
): { html: string; text: string } {
  const bodyBlock = `<div style="font-family:Manrope,'Segoe UI',Arial,sans-serif;font-size:14px;line-height:1.65;color:#1C2B48;">${normalizeMailBodyHtml(bodyHtml)}</div>`;
  const signature = account.signatureEnabled !== false ? buildSignatureHtml(account, config) : "";
  const plainBody = htmlToPlainText(bodyHtml).trim();
  const plainSig = account.signatureEnabled !== false ? "\n\n" + buildSignaturePlain(account, config) : "";
  return {
    html: bodyBlock + signature,
    text: plainBody + plainSig,
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
