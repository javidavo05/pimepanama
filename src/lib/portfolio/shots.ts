/**
 * Capturas reales de los sitios publicados, indexadas por slug y por ruta
 * del catálogo. Las públicas se tomaron el 2026-09-15; las de paneles
 * internos (tras iniciar sesión) el 2026-09-16, a 1280×800, con datos
 * reales de producción. `live` es la pantalla real del producto; `demo`
 * es la demo navegable que vive en pimepanama.com para sistemas sin sitio
 * público. Las rutas sin captura se dibujan con la pantalla sintética.
 */
export type Shot = { src: string; kind: "live" | "demo" };

const S = (name: string, kind: Shot["kind"] = "live"): Shot => ({ src: `/portfolio/shots/${name}.jpg`, kind });

export const shots: Record<string, Record<string, Shot>> = {
  academyx: { "/": S("academyx") },
  "uapa-suite": {
    "/ingresar": S("uapa-suite"),
    "/sistemas": S("uapa-suite--sistemas"),
    "/secretaria/tablero": S("uapa-suite--tablero"),
    "/secretaria/propiedades": S("uapa-suite--propiedades"),
    "/secretaria/documentos": S("uapa-suite--documentos"),
    "/secretaria/votos": S("uapa-suite--votos"),
    "/secretaria/asistente": S("uapa-suite--asistente"),
  },
  visita7: {
    "/portal": S("visita7"),
    "/dashboard": S("visita7--dashboard"),
    "/visits/create": S("visita7--visits-create"),
    "/hierarchy": S("visita7--hierarchy"),
    "/iglesias": S("visita7--iglesias"),
    "/calendar": S("visita7--calendar"),
  },
  "wedding-site": {
    "/": S("wedding-site"),
    "/invite/rsvp": S("wedding-site--invite"),
    "/admin/guests": S("wedding-site--admin-guests"),
    "/admin/seating": S("wedding-site--admin-seating"),
    "/admin/wedding/day-control": S("wedding-site--admin-day-control"),
  },
  godmode: {
    "/": S("godmode"),
    "/dashboard": S("godmode--dashboard"),
    "/dashboard/companies": S("godmode--companies"),
    "/dashboard/vehicles": S("godmode--vehicles"),
    "/dashboard/analytics": S("godmode--analytics"),
    "/dashboard/control-plane/tenants": S("godmode--tenants"),
  },
  cifrapp: { "/es": S("cifrapp"), "/es/pricing": S("cifrapp--pricing") },
  misaza: { "/": S("misaza"), "/explore": S("misaza--explore") },
  "bnb-real-estate": { "/": S("bnb-real-estate"), "/propiedades": S("bnb-real-estate--propiedades"), "/cms": S("bnb-real-estate--cms") },
  "john-henry": {
    "/": S("john-henry"),
    "/citas": S("john-henry--citas"),
    "/clients/[id]/medidas": S("john-henry--medidas"),
    "/orders/[id]/orden-taller": S("john-henry--orden-taller"),
    "/finance/reportes": S("john-henry--finance"),
  },
  tdp: { "/search": S("tdp--demo", "demo") },
  tickets: { "/events/[slug]": S("tickets--demo", "demo") },
  sembradores: { "/t/[slug]/dashboard": S("sembradores--demo", "demo") },
  "wedding-os": { "/es/planner": S("wedding-os--demo", "demo") },
};
