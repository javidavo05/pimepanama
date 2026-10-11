// El sitio vive en /es y /en (ruta /[lang]). Una dirección de un solo tramo que no es un idioma ni una
// ruta conocida (por ejemplo /nada) caía en /[lang] y terminaba en error 500 con la página por defecto de
// Next. Aquí se manda al 404 de marca (app/global-not-found.tsx) con estado 404.
import { NextResponse, type NextRequest } from "next/server";

const CONOCIDOS = new Set([
  "es", "en", "avance", "api",
  // Reenviados al CMS por next.config.ts
  "empresa", "cliente", "admin", "firmar", "agendar", "resume",
  "icons", "design-system", "brand", "fonts", "logos", "cases",
]);

export function proxy(request: NextRequest) {
  const tramo = request.nextUrl.pathname.slice(1);
  if (!tramo || tramo.includes(".") || CONOCIDOS.has(tramo.toLowerCase())) return NextResponse.next();
  return NextResponse.rewrite(new URL("/_pagina-no-existe/404", request.url));
}

export const config = { matcher: "/:tramo" };
