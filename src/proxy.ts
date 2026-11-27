// El sitio vive en /es y /en (ruta /[lang]). Una dirección de un solo tramo que no es un idioma ni una
// ruta conocida (por ejemplo /nada, o /wp-login.php y /.env de los escáneres) caía en /[lang] y se renderizaba en
// el momento para terminar en error. Aquí se manda al 404 de marca (app/global-not-found.tsx) con estado 404.
//
// El matcher deja fuera los idiomas, las rutas conocidas y los archivos reales de la raíz: así el proxy (una
// función en Vercel) solo corre para tramos desconocidos, no en cada visita a /es, /en, robots o el favicon.
// Si agregas una carpeta en public/ o un archivo de la raíz (o un reenvío al CMS en next.config.ts), agrégalo a
// CONOCIDOS y al matcher: el proxy no lo deja pasar.
import { NextResponse, type NextRequest } from "next/server";

const CONOCIDOS = new Set([
  "es", "en", "avance", "api",
  // Reenviados al CMS por next.config.ts
  "empresa", "cliente", "admin", "firmar", "agendar", "resume", "baja",
  "icons", "design-system", "brand", "fonts", "logos", "cases",
  // Archivos de la raíz: los de app/ (robots, sitemap, íconos), los de public/ y los que se reenvían al CMS.
  "robots.txt", "sitemap.xml", "favicon.ico", "icon.svg", "apple-icon.png",
  "file.svg", "globe.svg", "next.svg", "vercel.svg", "window.svg",
  "logo-pime.png", "pime-icon.svg", "pime-logo.svg", "manifest.webmanifest", "sw-empresa.js", "offline-empresa.html",
]);

export function proxy(request: NextRequest) {
  // Las peticiones RSC de Next pueden llegar como /es.rsc o /es.segments/…: cuentan como /es.
  const tramo = request.nextUrl.pathname.slice(1).replace(/\/$/, "").replace(/\.(rsc|json)$/, "");
  if (!tramo || tramo.includes("/") || CONOCIDOS.has(tramo.toLowerCase())) return NextResponse.next();
  return NextResponse.rewrite(new URL("/_pagina-no-existe/404", request.url));
}

// Mantener en sincronía con CONOCIDOS (el matcher tiene que ser un literal: Next lo lee al compilar). Los sufijos
// .rsc/.json/.segments son las peticiones RSC de esas mismas rutas.
export const config = {
  matcher:
    "/((?!(?:es|en|avance|api|empresa|cliente|admin|firmar|agendar|resume|baja|icons|design-system|brand|fonts|logos|cases|robots\\.txt|sitemap\\.xml|favicon\\.ico|icon\\.svg|apple-icon\\.png|file\\.svg|globe\\.svg|next\\.svg|vercel\\.svg|window\\.svg|logo-pime\\.png|pime-icon\\.svg|pime-logo\\.svg|manifest\\.webmanifest|sw-empresa\\.js|offline-empresa\\.html)(?:/|$|\\.rsc|\\.json|\\.segments/))[^/]+)",
};
