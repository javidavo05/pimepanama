const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Basic RFC-style check — catches typos like missing @ but not wrong mailboxes. */
export function isValidMailAddress(email: string): boolean {
  const trimmed = email.trim();
  return trimmed.length > 3 && trimmed.length <= 254 && EMAIL_RE.test(trimmed);
}

export function parseMailAddressList(raw: string): string[] {
  return raw
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function validateMailAddressList(
  raw: string,
  label: string
): { ok: true; addresses: string[] } | { ok: false; error: string } {
  const addresses = parseMailAddressList(raw);
  if (addresses.length === 0) {
    return { ok: false, error: `${label} requerido` };
  }
  for (const addr of addresses) {
    if (!isValidMailAddress(addr)) {
      return { ok: false, error: `Dirección inválida en ${label.toLowerCase()}: ${addr}` };
    }
  }
  return { ok: true, addresses };
}
