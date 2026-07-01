import type { CompanyConfig } from "@prisma/client";
import { extractR2Key } from "./r2";
import { getSiteUrl } from "./site-url";

function isR2StoredLogo(logoUrl: string): boolean {
  return (
    logoUrl.includes(".r2.dev") ||
    logoUrl.includes("r2.cloudflarestorage.com") ||
    logoUrl.startsWith("branding/")
  );
}

/** Relative or absolute URL safe for browser img src. */
export function resolveCompanyLogoUrl(logoUrl?: string | null): string {
  const url = logoUrl?.trim();
  if (!url) return "/logo-pime.png";

  if (isR2StoredLogo(url)) {
    const key = extractR2Key(url);
    if (key) return `/api/empresa/r2/asset?key=${encodeURIComponent(key)}`;
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

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
