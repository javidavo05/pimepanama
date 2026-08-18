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

  const contactParts: string[] = [];
  if (config?.phone) contactParts.push(`<span style="color:#666;">${escapeHtml(config.phone)}</span>`);
  const email = account.username.trim() || config?.email;
  if (email) {
    contactParts.push(
      `<a href="mailto:${escapeHtml(email)}" style="color:#1AA7F0;text-decoration:none;">${escapeHtml(email)}</a>`
    );
  }
  if (config?.website) {
    const display = config.website.replace(/^https?:\/\//, "");
    contactParts.push(
      `<a href="${escapeHtml(config.website.startsWith("http") ? config.website : `https://${config.website}`)}" style="color:#1AA7F0;text-decoration:none;">${escapeHtml(display)}</a>`
    );
  }
  const contactLine = contactParts.join(' <span style="color:#ccc;">&middot;</span> ');

  // logo-pime.png is ~3023×1666 (wide). Never force a square — Gmail/Outlook squash non-square assets.
  const logoW = 120;
  const logoH = 66;

  return `
<br><br>
<table cellpadding="0" cellspacing="0" border="0" style="font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:#444;max-width:520px;">
  <tr>
    <td style="width:4px;background:linear-gradient(180deg,#1AA7F0 0%,#6344E8 100%);border-radius:2px;padding:0;font-size:0;line-height:0;">&nbsp;</td>
    <td style="padding:0 0 0 16px;vertical-align:middle;">
      <table cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding-right:14px;vertical-align:middle;">
            <img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(company)}" width="${logoW}" height="${logoH}" style="display:block;border:0;outline:none;text-decoration:none;width:${logoW}px;height:auto;max-width:${logoW}px;border-radius:4px;" />
          </td>
          <td style="vertical-align:middle;line-height:1.5;border-left:1px solid #eee;padding-left:14px;">
            <div style="font-size:15px;font-weight:600;color:#111;letter-spacing:-0.2px;">${escapeHtml(name)}</div>
            <div style="font-size:12px;color:#1AA7F0;font-weight:500;margin-top:2px;">${escapeHtml(title)}</div>
            ${contactLine ? `<div style="font-size:11px;margin-top:6px;line-height:1.6;">${contactLine}</div>` : ""}
          </td>
        </tr>
      </table>
      <div style="margin-top:10px;font-size:10px;color:#aaa;letter-spacing:0.04em;text-transform:uppercase;">${escapeHtml(company)} &middot; Communications Suite</div>
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
  const bodyBlock = `<div style="font-family:'Segoe UI',Arial,sans-serif;font-size:14px;line-height:1.65;color:#222;">${normalizeMailBodyHtml(bodyHtml)}</div>`;
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
