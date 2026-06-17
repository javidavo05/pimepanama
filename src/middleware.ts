import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ENGLISH_COUNTRIES = new Set(["US", "CA", "GB", "AU", "NZ", "IE"]);
const COOKIE_NAME = "NEXT_LOCALE";
const ONE_YEAR = 60 * 60 * 24 * 365;

function detectLocale(request: NextRequest): "en" | "es" {
  // 1. Respect saved user preference
  const cookie = request.cookies.get(COOKIE_NAME)?.value;
  if (cookie === "en" || cookie === "es") return cookie;

  // 2. Vercel geolocation header (only available on Vercel)
  const country = request.headers.get("x-vercel-ip-country");
  if (country && ENGLISH_COUNTRIES.has(country)) return "en";

  // 3. Default to Spanish (primary market: Panama + Latin America)
  return "es";
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip internal routes
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/resume") ||
    pathname.startsWith("/_next")
  ) {
    return NextResponse.next();
  }

  // Redirect legacy locale-prefixed URLs to canonical root URLs
  const localePrefix = pathname.match(/^\/(en|es)(\/.*)?$/);
  if (localePrefix) {
    const rest = localePrefix[2] ?? "/";
    const canonical = new URL(rest, request.url);
    const response = NextResponse.redirect(canonical, { status: 301 });
    // Preserve locale preference from the URL they visited
    const visitedLocale = localePrefix[1] as "en" | "es";
    response.cookies.set(COOKIE_NAME, visitedLocale, {
      path: "/",
      maxAge: ONE_YEAR,
      sameSite: "lax",
    });
    return response;
  }

  // Set locale cookie if not already set
  const currentCookie = request.cookies.get(COOKIE_NAME)?.value;
  if (currentCookie !== "en" && currentCookie !== "es") {
    const locale = detectLocale(request);
    const response = NextResponse.next();
    response.cookies.set(COOKIE_NAME, locale, {
      path: "/",
      maxAge: ONE_YEAR,
      sameSite: "lax",
    });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2)).*)",
  ],
};
