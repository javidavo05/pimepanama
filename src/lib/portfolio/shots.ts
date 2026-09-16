/**
 * Capturas reales de los sitios publicados, tomadas del navegador el
 * 2026-09-15, indexadas por slug y por ruta del catálogo. `live` es la
 * pantalla real del producto; `demo` es la demo navegable que vive en
 * pimepanama.com para sistemas sin sitio público. Las rutas sin captura
 * se dibujan con la pantalla sintética.
 */
export type Shot = { src: string; kind: "live" | "demo" };

const S = (name: string, kind: Shot["kind"] = "live"): Shot => ({ src: `/portfolio/shots/${name}.jpg`, kind });

export const shots: Record<string, Record<string, Shot>> = {
  academyx: { "/": S("academyx") },
  "uapa-suite": { "/ingresar": S("uapa-suite") },
  visita7: { "/portal": S("visita7") },
  "wedding-site": { "/": S("wedding-site"), "/invite/rsvp": S("wedding-site--invite") },
  godmode: { "/": S("godmode") },
  cifrapp: { "/es": S("cifrapp"), "/es/pricing": S("cifrapp--pricing") },
  misaza: { "/": S("misaza"), "/explore": S("misaza--explore") },
  "bnb-real-estate": { "/": S("bnb-real-estate"), "/propiedades": S("bnb-real-estate--propiedades") },
  "john-henry": { "/": S("john-henry"), "/citas": S("john-henry--citas") },
  tdp: { "/search": S("tdp--demo", "demo") },
  tickets: { "/events/[slug]": S("tickets--demo", "demo") },
  sembradores: { "/t/[slug]/dashboard": S("sembradores--demo", "demo") },
  "wedding-os": { "/es/planner": S("wedding-os--demo", "demo") },
};
