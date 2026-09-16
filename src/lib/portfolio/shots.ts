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
  geogenius: {
    "/site/es": S("geogenius--site"),
    "/site/es/explorador": S("geogenius--explorador"),
    "/schools/panel/jugar": S("geogenius--schools-login"),
  },
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
  "smart-church": { "/": S("smart-church--revive"), "/agenda-una-cita": S("smart-church--cita") },
  sembradores: { "/signup": S("sembradores--signup"), "/t/[slug]/dashboard": S("sembradores--demo", "demo") },
  "church-translate": { "/onboarding": S("church-translate--login") },
  "wedding-os": { "/": S("wedding-os--home"), "/es/planner": S("wedding-os--login") },
  "wedding-site": {
    "/": S("wedding-site"),
    "/invite/rsvp": S("wedding-site--invite"),
    "/gallery/[event]": S("wedding-site--gallery"),
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
  cifrapp: { "/es": S("cifrapp"), "/es/pricing": S("cifrapp--pricing"), "/es/access/accountants": S("cifrapp--accountants") },
  tdp: {
    "/search": S("tdp--search"),
    "/scanner": S("tdp--scanner-login"),
    "/displays/departures": S("tdp--departures"),
    "/dashboard/control-center": S("tdp--login"),
  },
  tickets: { "/events/[slug]": S("tickets--home") },
  medsuite: { "/": S("medsuite--home"), "/admin": S("medsuite--admin-login") },
  "house-booking": { "/": S("house-booking--home"), "/cms": S("house-booking--cms-login") },
  "pime-social": { "/": S("pime-social--dashboard"), "/posts": S("pime-social--posts"), "/analytics": S("pime-social--analytics") },
  misaza: { "/": S("misaza"), "/explore": S("misaza--explore"), "/mayoreo": S("misaza--mayoreo") },
  "bright-tale-store": {
    "/books": S("bright-tale-store--books"),
    "/books/[slug]": S("bright-tale-store--book"),
    "/checkout": S("bright-tale-store--checkout"),
    "/account/library": S("bright-tale-store--login"),
  },
  "bnb-real-estate": {
    "/": S("bnb-real-estate"),
    "/propiedades": S("bnb-real-estate--propiedades"),
    "/proyectos": S("bnb-real-estate--proyectos"),
    "/list-with-us": S("bnb-real-estate--list-with-us"),
    "/cms": S("bnb-real-estate--cms"),
  },
  "holo-realty": {
    "/": S("holo-realty--home"),
    "/relocation": S("holo-realty--relocation"),
    "/propiedades": S("holo-realty--propiedades"),
    "/portal": S("holo-realty--portal-login"),
  },
  "john-henry": {
    "/": S("john-henry"),
    "/citas": S("john-henry--citas"),
    "/ready-to-wear": S("john-henry--ready-to-wear"),
    "/clients/[id]/medidas": S("john-henry--medidas"),
    "/orders/[id]/orden-taller": S("john-henry--orden-taller"),
    "/finance/reportes": S("john-henry--finance"),
  },
  "mision-cristiana": { "/": S("mision-cristiana--home") },
  "muro-anatolia": { "/": S("muro-anatolia--game") },
  "futbol-control": {
    "Dashboard.html": S("futbol-control--dashboard"),
    "PlayersManager.html": S("futbol-control--players"),
    "FinancialDashboard.html": S("futbol-control--finance"),
    "TournamentManagerWindow": S("futbol-control--tournaments"),
  },
  "academia-suarez": {
    "Dashboard.html": S("academia-suarez--dashboard"),
    "PendingApprovals.html": S("academia-suarez--approvals"),
    "FamilyGroupsManager.html": S("academia-suarez--families"),
  },
  "sd-autosales": { MainPage: S("sd-autosales--main"), ChartsPage: S("sd-autosales--charts") },
  "pime-backup": { "/": S("pime-backup--login") },
  "git-pime": { "localhost:3847": S("git-pime--portal") },
  "cajon-revelado": { "ejemplo/App.tsx": S("cajon-revelado--ejemplo") },
  "integraciones-panama": { "yappy/swagger.yml": S("integraciones-panama--swagger") },
};
