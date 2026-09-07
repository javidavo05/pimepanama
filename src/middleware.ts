import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── /empresa auth guard ──────────────────────────────────────────────────
  if (pathname === "/empresa/login") {
    return NextResponse.next();
  }

  if (pathname.startsWith("/empresa")) {
    // Build a mutable response so @supabase/ssr can refresh the JWT cookie
    const supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    // MUST call getUser() on every request to keep the session refreshed
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const loginUrl = new URL("/empresa/login", request.url);
      const redirectResponse = NextResponse.redirect(loginUrl);
      // Copy refreshed session cookies into the redirect so tokens survive
      supabaseResponse.cookies
        .getAll()
        .forEach(({ name, value, ...opts }) =>
          redirectResponse.cookies.set(name, value, opts)
        );
      return redirectResponse;
    }

    return supabaseResponse;
  }
  // ────────────────────────────────────────────────────────────────────────

  // Skip internal routes
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/resume") ||
    pathname.startsWith("/_next")
  ) {
    return NextResponse.next();
  }

  // Las URLs viejas con prefijo /es ahora son la raíz. /en es una página real,
  // así que no se toca.
  if (pathname === "/es" || pathname.startsWith("/es/")) {
    const rest = pathname.slice(3) || "/";
    return NextResponse.redirect(new URL(rest, request.url), { status: 301 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2)).*)",
  ],
};
