export function signingTokenSecret(): string {
  const secret = process.env.SIGNING_TOKEN_SECRET?.trim();
  if (!secret || secret.length < 16) {
    throw new Error("SIGNING_TOKEN_SECRET no configurado (mín. 16 caracteres). Genera con: openssl rand -hex 32");
  }
  return secret;
}

export function signingLinkTtlDays(): number {
  const n = Number(process.env.SIGNING_LINK_TTL_DAYS ?? 14);
  return Number.isFinite(n) && n > 0 ? n : 14;
}

export function siteUrl(): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
  return base.replace(/\/$/, "");
}

export function signingLink(token: string): string {
  return `${siteUrl()}/firmar/${token}`;
}
