const PROXY_PATH = "/api/empresa/mail/inbox/image";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export function isSafeExternalImageUrl(urlString: string): boolean {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    return false;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return false;

  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "0.0.0.0"
  ) {
    return false;
  }

  if (
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  ) {
    return false;
  }

  return true;
}

export function normalizeExternalImageUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith("data:") || trimmed.startsWith("cid:")) return null;
  if (trimmed.startsWith(PROXY_PATH)) return null;

  let absolute = trimmed;
  if (trimmed.startsWith("//")) absolute = `https:${trimmed}`;
  if (!/^https?:\/\//i.test(absolute)) return null;
  if (!isSafeExternalImageUrl(absolute)) return null;

  return absolute;
}

export function buildProxiedImageUrl(externalUrl: string): string | null {
  const absolute = normalizeExternalImageUrl(externalUrl);
  if (!absolute) return null;
  return `${PROXY_PATH}?url=${encodeURIComponent(absolute)}`;
}

export function getImageFetchHeaders(url: URL): Record<string, string> {
  const host = url.hostname.toLowerCase();
  const headers: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
  };

  if (host.includes("googleusercontent.com") || host.includes("gstatic.com")) {
    headers.Referer = "https://mail.google.com/";
  } else if (
    host.includes("outlook.com") ||
    host.includes("office365.com") ||
    host.includes("live.com") ||
    host.includes("microsoft.com")
  ) {
    headers.Referer = "https://outlook.live.com/";
  } else if (host.includes("yahoo.com") || host.includes("yimg.com")) {
    headers.Referer = "https://mail.yahoo.com/";
  }

  return headers;
}

export const EMAIL_IMAGE_MAX_BYTES = MAX_IMAGE_BYTES;

function rewriteUrlInCssValue(value: string): string {
  return value.replace(/url\(\s*(['"]?)(https?:\/\/[^)'"]+)\1\s*\)/gi, (_match, _quote, rawUrl: string) => {
    const proxied = buildProxiedImageUrl(rawUrl);
    return proxied ? `url("${proxied}")` : _match;
  });
}

function rewriteSrcset(value: string): string {
  return value
    .split(",")
    .map((part) => {
      const trimmed = part.trim();
      const space = trimmed.search(/\s/);
      if (space === -1) {
        const proxied = buildProxiedImageUrl(trimmed);
        return proxied ?? trimmed;
      }
      const url = trimmed.slice(0, space);
      const descriptor = trimmed.slice(space);
      const proxied = buildProxiedImageUrl(url);
      return proxied ? `${proxied}${descriptor}` : trimmed;
    })
    .join(", ");
}

/** Rewrite external image URLs to load through our authenticated proxy. */
export function rewriteEmailExternalImages(html: string): string {
  let out = html.replace(
    /\bsrc\s*=\s*(["'])(\/\/[^"']+)\1/gi,
    (_match, quote: string, rawUrl: string) => {
      const proxied = buildProxiedImageUrl(rawUrl);
      return proxied ? `src=${quote}${proxied}${quote}` : _match;
    }
  );

  out = out.replace(
    /\bsrc\s*=\s*(["'])(https?:\/\/[^"']+)\1/gi,
    (_match, quote: string, rawUrl: string) => {
      const proxied = buildProxiedImageUrl(rawUrl);
      return proxied ? `src=${quote}${proxied}${quote}` : _match;
    }
  );

  out = out.replace(
    /\bsrcset\s*=\s*(["'])([^"']+)\1/gi,
    (_match, quote: string, srcset: string) => {
      const rewritten = rewriteSrcset(srcset);
      return `srcset=${quote}${rewritten}${quote}`;
    }
  );

  out = out.replace(
    /\bstyle\s*=\s*(["'])([^"']*)\1/gi,
    (_match, quote: string, style: string) => `style=${quote}${rewriteUrlInCssValue(style)}${quote}`
  );

  out = out.replace(/url\(\s*(['"]?)(https?:\/\/[^)'"]+)\1\s*\)/gi, (_match, _quote, rawUrl: string) => {
    const proxied = buildProxiedImageUrl(rawUrl);
    return proxied ? `url("${proxied}")` : _match;
  });

  return out;
}
