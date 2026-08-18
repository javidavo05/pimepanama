import type { CompanyConfig } from "@prisma/client";
import { extractR2Key } from "./r2";
import { getSiteUrl } from "./site-url";

/** Logo permanente en R2 para firmas de correo (URL pública, sin auth). */
export const MAIL_LOGO_R2_KEY = "branding/mail/logo.png";

function isR2StoredLogo(logoUrl: string): boolean {
  return (
    logoUrl.includes(".r2.dev") ||
    logoUrl.includes("r2.cloudflarestorage.com") ||
    logoUrl.startsWith("branding/")
  );
}

/** Relative path safe for next/image and browser img src. */
export function resolveCompanyLogoUrl(logoUrl?: string | null): string {
  const url = logoUrl?.trim();
  if (!url) return "/logo-pime.png";

  if (url.includes("/api/branding/logo")) return "/logo-pime.png";

  if (isR2StoredLogo(url)) {
    const key = extractR2Key(url);
    if (key) return `/api/empresa/r2/asset?key=${encodeURIComponent(key)}`;
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    try {
      const siteHost = new URL(getSiteUrl()).hostname;
      const parsed = new URL(url);
      if (parsed.hostname === siteHost) {
        return `${parsed.pathname}${parsed.search}`;
      }
    } catch {
      // ignore
    }
    return url;
  }

  if (url.startsWith("/")) return url;

  return "/logo-pime.png";
}

/** URL absoluta del logo para PDFs y metadata. */
export function getCompanyLogoUrl(
  config?: Partial<CompanyConfig> | null
): string {
  const resolved = resolveCompanyLogoUrl(config?.logoUrl);
  if (resolved.startsWith("/")) {
    return `${getSiteUrl()}${resolved}`;
  }
  return resolved;
}

/** URL absoluta del logo para firmas HTML en correos y vista previa. */
export function getEmailLogoUrl(
  _config?: { logoUrl?: string | null } | null,
  requestOrigin?: string
): string {
  const base = (requestOrigin ?? getSiteUrl()).replace(/\/$/, "");
  return `${base}/logo-pime.png`;
}

/** Favicon del panel /empresa — siempre estático (sin API autenticada; el favicon no envía cookies). */
export function getEmpresaFaviconUrl(
  _config?: { logoUrl?: string | null; updatedAt?: Date | string | null } | null
): string {
  return "/icons/empresa-icon-192.png";
}

export const EMPRESA_FAVICON_ICONS = {
  icon: [
    { url: "/icons/empresa-icon-192.png", sizes: "192x192", type: "image/png" as const },
    { url: "/icons/empresa-icon-512.png", sizes: "512x512", type: "image/png" as const },
  ],
  apple: "/icons/apple-touch-icon-180.png",
  shortcut: "/icons/empresa-icon-192.png",
};
