/** Datos del sitio. Cifras editables; nada inflado. */
export type Lang = "es" | "en";
export const LANGS: Lang[] = ["es", "en"];

export const SITE = {
  nombre: "Pime Panamá",
  dominio: "pimepanama.com",
  /** Todo contacto entra al sistema de leads del CMS de la empresa (decisión de Javier, 2026-10-09): el sitio
   *  no publica teléfono ni correo; cada llamada a la acción lleva al wizard de /contacto. */
  leads: { ruta: "/contacto" },
  cifras: {
    anios: 7,
    proyectos: 50,
    /** Monto desarrollado. Se publica solo cuando Javier lo confirme (pregunta abierta en el artifact). */
    montoDesarrollado: null as number | null,
    mesesGarantia: 3,
  },
};

export const NAV = {
  es: {
    marca: "Pime",
    secciones: [
      { id: "trabajo", label: "Trabajo" },
      { id: "capacidades", label: "Capacidades" },
      { id: "proceso", label: "Proceso" },
      { id: "industrias", label: "Industrias" },
    ],
    paginas: [
      { href: "/es/portfolio", label: "Portfolio" },
      { href: "/es/servicios", label: "Servicios" },
      { href: "/es/empresa", label: "Empresa" },
    ],
    cta: { href: "/agendar", label: "Agendar una llamada" },
    entrar: { href: "/cliente/acceso", label: "Entrar", title: "Entrar a su cuenta de cliente" },
    abrir: "Abrir el menú",
    cerrar: "Cerrar el menú",
    idioma: { href: "/en", label: "EN", title: "Read in English" },
    inicio: "Inicio",
  },
  en: {
    marca: "Pime",
    secciones: [
      { id: "trabajo", label: "Work" },
      { id: "capacidades", label: "Capabilities" },
      { id: "proceso", label: "Process" },
      { id: "industrias", label: "Industries" },
    ],
    paginas: [
      { href: "/en/portfolio", label: "Portfolio" },
      { href: "/en/servicios", label: "Services" },
      { href: "/en/empresa", label: "Company" },
      { href: "/en/nearshore-software-development", label: "US companies" },
    ],
    cta: { href: "/agendar?lang=en", label: "Book a call" },
    entrar: { href: "/cliente/acceso", label: "Sign in", title: "Sign in to your client account" },
    abrir: "Open menu",
    cerrar: "Close menu",
    idioma: { href: "/es", label: "ES", title: "Leer en español" },
    inicio: "Home",
  },
} as const;
