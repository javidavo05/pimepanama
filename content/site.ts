/** Datos del sitio. Cifras editables; nada inflado. */
export type Lang = "es" | "en";
export const LANGS: Lang[] = ["es", "en"];

export const SITE = {
  nombre: "Pime Panamá",
  dominio: "pimepanama.com",
  telefono: "6479-5352",
  telefonoE164: "+50764795352",
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
    cta: { href: "/es/contacto", label: "Pedir una propuesta" },
    telefono: "Llamar al 6479-5352",
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
    ],
    cta: { href: "/en/contacto", label: "Request a proposal" },
    telefono: "Call 6479-5352",
    abrir: "Open menu",
    cerrar: "Close menu",
    idioma: { href: "/es", label: "ES", title: "Leer en español" },
    inicio: "Home",
  },
} as const;
