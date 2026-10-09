import type { Lang } from "./site";

/** /servicios: los cinco tipos de sistema (CAPACIDADES) con qué incluye, cómo se entrega y los casos reales.
 *  Los casos por tipo salen de content/portfolio.ts por slug. Nada de plazos ni cifras inventadas. */
export const SERVICIOS: Record<Lang, {
  eyebrow: string; titulo: string[]; bajada: string; indice: string; incluye: string; entrega: string; entregaItems: string[];
  noHacemos: string; noHacemosItems: string[]; casos: string; cta: string; ctaTodos: { href: string; label: string };
}> = {
  es: {
    eyebrow: "Servicios", titulo: ["Cinco tipos de sistema,", "todos a medida"], bajada: "Cada uno se diseña desde cero para la operación de su empresa, con precio cerrado por fase y tres meses de garantía. Elija el que más se parece a lo que necesita.",
    indice: "En esta página", incluye: "Qué incluye", entrega: "Cómo se entrega", entregaItems: ["Propuesta con precio cerrado por fase", "Pantallas diseñadas y aprobadas antes de programar", "Entregas por fase que se usan desde el primer día", "Tres meses de garantía después de entregar"],
    noHacemos: "Lo que no hacemos", noHacemosItems: ["No vendemos plantillas ni adaptamos un sistema genérico", "No cobramos licencias ajenas ni por usuario", "No entregamos sin capacitar al equipo"],
    casos: "Sistemas de este tipo en producción", cta: "Pedir una propuesta de", ctaTodos: { href: "/es/contacto", label: "Pedir una propuesta" },
  },
  en: {
    eyebrow: "Services", titulo: ["Five kinds of system,", "all custom-built"], bajada: "Each one is designed from scratch for your company's operation, with a fixed price per phase and a three-month warranty. Pick the one closest to what you need.",
    indice: "On this page", incluye: "What's included", entrega: "How it's delivered", entregaItems: ["Proposal with a fixed price per phase", "Screens designed and approved before coding", "Phase deliveries in use from day one", "Three-month warranty after delivery"],
    noHacemos: "What we don't do", noHacemosItems: ["We don't sell templates or adapt a generic system", "We don't charge third-party licenses or per-user fees", "We don't deliver without training the team"],
    casos: "Systems of this kind in production", cta: "Request a proposal for", ctaTodos: { href: "/en/contacto", label: "Request a proposal" },
  },
};
/** Casos reales por tipo de servicio (slugs de content/portfolio.ts). */
export const CASOS_POR_SERVICIO: Record<string, string[]> = {
  erp: ["uapa-suite", "pime-backup"],
  crm: ["john-henry", "bnb-real-estate"],
  saas: ["academyx", "godmode", "smart-church", "medsuite"],
  portal: ["misaza", "holo-realty", "geogenius"],
  ia: ["svitzer"],
};

/** /empresa: quiénes somos, con las cifras de SITE y los clientes autorizados. Sin equipo inventado ni fotos. */
export const EMPRESA: Record<Lang, {
  eyebrow: string; titulo: string[]; bajada: string;
  cifras: { anios: string; proyectos: string; garantia: string };
  como: { titulo: string; items: { titulo: string; texto: string }[] };
  no: { titulo: string; items: string[] };
  clientes: string; industrias: string; cta: { href: string; label: string }; verPortfolio: string;
}> = {
  es: {
    eyebrow: "Empresa", titulo: ["Construimos los sistemas", "que operan empresas en Panamá"], bajada: "Pime Panamá diseña y programa ERP, CRM y plataformas a medida desde cero. Sin plantillas, sin licencias ajenas: el sistema es suyo, con su código y sus datos.",
    cifras: { anios: "años construyendo sistemas", proyectos: "sistemas entregados", garantia: "meses de garantía por sistema" },
    como: { titulo: "Cómo trabajamos", items: [
      { titulo: "Primero la operación", texto: "Antes de programar entendemos cómo funciona hoy su empresa: qué se hace a mano, dónde se pierde información y quién usaría el sistema." },
      { titulo: "Precio cerrado, fases independientes", texto: "La propuesta fija el precio de cada fase. Usted decide cuáles y en qué orden, y cada una se usa desde que se entrega." },
      { titulo: "Respondemos por lo que entregamos", texto: "Tres meses de garantía después de cada entrega, capacitación al equipo y el sistema en su propio dominio." },
    ] },
    no: { titulo: "Lo que no hacemos", items: ["No vendemos plantillas ni adaptamos un sistema genérico", "No cobramos licencias ajenas ni por usuario", "No retenemos su código ni sus datos"] },
    clientes: "Empresas que ya operan con un sistema de Pime", industrias: "Industrias donde hay un sistema en producción", cta: { href: "/es/contacto", label: "Pedir una propuesta" }, verPortfolio: "Ver los sistemas entregados",
  },
  en: {
    eyebrow: "Company", titulo: ["We build the systems", "that run companies in Panama"], bajada: "Pime Panamá designs and codes custom ERP, CRM and platforms from scratch. No templates, no third-party licenses: the system is yours, with its code and data.",
    cifras: { anios: "years building systems", proyectos: "systems delivered", garantia: "months of warranty per system" },
    como: { titulo: "How we work", items: [
      { titulo: "The operation first", texto: "Before coding we understand how your company runs today: what is done by hand, where information gets lost and who would use the system." },
      { titulo: "Fixed price, independent phases", texto: "The proposal sets the price of each phase. You choose which ones and in what order, and each is in use from the day it ships." },
      { titulo: "We stand behind what we deliver", texto: "Three months of warranty after each delivery, team training and the system on your own domain." },
    ] },
    no: { titulo: "What we don't do", items: ["We don't sell templates or adapt a generic system", "We don't charge third-party licenses or per-user fees", "We don't keep your code or your data"] },
    clientes: "Companies already running a Pime system", industrias: "Industries with a system in production", cta: { href: "/en/contacto", label: "Request a proposal" }, verPortfolio: "See delivered systems",
  },
};
