/**
 * Capturas de los sistemas publicados, indexadas por slug y por ruta del
 * catálogo, a 1280×800.
 *
 * - `live`: página pública real, tal como la ve cualquier visitante.
 * - `sample`: pantalla interna real (tras iniciar sesión) con datos de
 *   muestra. Nunca datos de clientes. La ventana la marca con una bandera.
 * - `demo`: demo navegable que vive en pimepanama.com.
 *
 * Una pantalla de login no es una captura válida: no muestra el sistema.
 */
export type Shot = { src: string; kind: "live" | "sample" | "demo" };

const S = (name: string, kind: Shot["kind"] = "live"): Shot => ({ src: `/portfolio/shots/${name}.jpg`, kind });
/** Pantalla interna real con datos de muestra. */
const M = (name: string): Shot => S(name, "sample");

export const shots: Record<string, Record<string, Shot>> = {
  academyx: {
    "/": S("academyx"),
    "/soluciones/academias": S("academyx--academias"),
    "/soluciones/escuelas": S("academyx--escuelas"),
  },
  "uapa-suite": {
    "/sistemas": M("uapa-suite--sistemas"),
    "/secretaria/tablero": M("uapa-suite--tablero"),
    "/secretaria/propiedades": M("uapa-suite--propiedades"),
    "/secretaria/documentos": M("uapa-suite--documentos"),
  },
  visita7: {
    "/portal": S("visita7"),
    "/dashboard": M("visita7--dashboard"),
    "/visits/create": M("visita7--visits-create"),
    "/hierarchy": M("visita7--hierarchy"),
    "/iglesias": M("visita7--iglesias"),
  },
  "smart-church": {
    "/": S("smart-church--revive"),
    "/agenda-una-cita": S("smart-church--cita"),
    "/dashboard": M("smart-church--dashboard"),
    "/ministries": M("smart-church--ministries"),
    "/tesoreria": M("smart-church--tesoreria"),
    "/cms": M("smart-church--cms"),
  },
  "wedding-site": {
    "/": S("wedding-site"),
    "/gallery/[event]": S("wedding-site--gallery"),
    "/admin/guests": M("wedding-site--admin-guests"),
    "/admin/seating": M("wedding-site--admin-seating"),
  },
  godmode: {
    "/": S("godmode"),
    "/dashboard": M("godmode--dashboard"),
    "/dashboard/companies": M("godmode--companies"),
    "/dashboard/control-plane/tenants": M("godmode--tenants"),
  },
  cifrapp: {
    "/es": S("cifrapp"),
    "/es/pricing": S("cifrapp--pricing"),
    "/es/access/accountants": S("cifrapp--accountants"),
  },
  "pime-backup": {
    "/dashboard": M("pime-backup--dashboard"),
    "/projects": M("pime-backup--projects"),
    "/jobs": M("pime-backup--jobs"),
    "/agents": M("pime-backup--agents"),
    "/reports": M("pime-backup--reports"),
  },
  misaza: {
    "/": S("misaza"),
    "/product/[id]": S("misaza--product"),
    "/mayoreo": S("misaza--mayoreo"),
  },
  "bnb-real-estate": {
    "/": S("bnb-real-estate"),
    "/propiedades": S("bnb-real-estate--propiedades"),
    "/proyectos": S("bnb-real-estate--proyectos"),
    "/list-with-us": S("bnb-real-estate--list-with-us"),
    "/cms": M("bnb-real-estate--cms"),
    "/cms/leads": M("bnb-real-estate--cms-leads"),
  },
  "holo-realty": {
    "/": S("holo-realty--home"),
    "/relocation": S("holo-realty--relocation"),
    "/propiedades": S("holo-realty--propiedades"),
    "/propiedades/[slug]": S("holo-realty--propiedad"),
  },
  "john-henry": {
    "/": S("john-henry"),
    "/citas": S("john-henry--citas"),
    "/ready-to-wear": S("john-henry--ready-to-wear"),
    "/dashboard": M("john-henry--dashboard"),
    "/orders": M("john-henry--orders"),
    "/orders/[id]/orden-taller": M("john-henry--orden-taller"),
    "/finance/reportes": M("john-henry--finance"),
  },
};
