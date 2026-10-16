import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── /cliente: cuenta del cliente ────────────────────────────────────────
  // Públicas: entrar, activar la invitación, pedir y elegir contraseña nueva. Lo demás exige sesión;
  // qué cliente es y si está activo lo decide getPortalUser en cada página.
  const PUBLICAS_CLIENTE = ["/cliente/acceso", "/cliente/activar", "/cliente/recuperar", "/cliente/nueva-clave"];
  if (pathname === "/cliente" || pathname.startsWith("/cliente/")) {
    if (PUBLICAS_CLIENTE.some((p) => pathname === p || pathname.startsWith(p + "/"))) return NextResponse.next();
    const res = NextResponse.next({ request });
    const sb = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cs) {
          cs.forEach(({ name, value }) => request.cookies.set(name, value));
          cs.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    });
    const { data } = await sb.auth.getClaims();
    if (!data?.claims) {
      const r = NextResponse.redirect(new URL("/cliente/acceso", request.url));
      res.cookies.getAll().forEach(({ name, value, ...o }) => r.cookies.set(name, value, o));
      return r;
    }
    return res;
  }

  // ── /empresa auth guard ──────────────────────────────────────────────────
  // Login y «crear contraseña» del invitado al equipo: todavía no hay sesión.
  if (pathname === "/empresa/login" || pathname === "/empresa/crear-clave") {
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

    // getClaims() refresca la sesión si venció y verifica la firma del JWT en
    // el servidor con las llaves públicas del proyecto (ES256), sin el viaje a
    // Supabase Auth que hacía getUser() en cada cambio de pestaña.
    const { data } = await supabase.auth.getClaims();

    if (!data?.claims) {
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
