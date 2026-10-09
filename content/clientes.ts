/** Clientes y sistemas. Solo se publica lo que tiene `autorizado: true` (Javier, 2026-10-09: "pon los logos de
 *  las empresas que tenemos"). `logo` es un archivo en public/logos, siempre en blanco sobre tinta; sin logo
 *  se muestra el nombre como wordmark. `ancho` es la proporción ancho/alto para reservar espacio sin saltos. */
export type Cliente = { nombre: string; sistema: string; autorizado: boolean; logo?: string; ancho?: number };

export const CLIENTES: Cliente[] = [
  { nombre: "Svitzer", sistema: "Analítica de muestras de aceite con IA", autorizado: true, logo: "/logos/svitzer.svg", ancho: 3.75 },
  { nombre: "Unión Adventista Panameña", sistema: "Suite institucional: secretaría, propiedades, actas y juntas", autorizado: true, logo: "/logos/adventista.png", ancho: 1.63 },
  { nombre: "B&B Real Estate", sistema: "CMS inmobiliario con sincronización Wasi", autorizado: true, logo: "/logos/bb-real-estate.png", ancho: 1.62 },
  { nombre: "HOLO Realty", sistema: "Gestión de propiedades con API Wasi", autorizado: true, logo: "/logos/holo-realty.png", ancho: 3.1 },
  { nombre: "Academyx", sistema: "CRM SaaS multi-tenant para academias", autorizado: true, logo: "/logos/academyx.svg", ancho: 1.42 },
  { nombre: "Revive", sistema: "Smart Church: management y CMS white-label", autorizado: true, logo: "/logos/revive.png", ancho: 4.4 },
  { nombre: "John Henry", sistema: "CMS y CRM de sastrería de lujo", autorizado: true, logo: "/logos/john-henry.svg", ancho: 1.12 },
  { nombre: "Misaza Designs", sistema: "Sitio y plataforma serverless", autorizado: true, logo: "/logos/misaza.svg", ancho: 1 },
  { nombre: "MedSuite", sistema: "Gestión de clínicas white-label", autorizado: true },
  { nombre: "Sembradores", sistema: "Gestión de iglesias multi-tenant", autorizado: false },
  { nombre: "Wedding CMS", sistema: "Invitaciones y eventos SaaS", autorizado: false },
];

/** Tipos de sistema construidos, para la cinta cuando hay pocos clientes autorizados. */
export const TIPOS_SISTEMA = {
  es: ["ERP a medida", "CRM multi-tenant", "SaaS white-label", "CMS inmobiliario", "Gestión de clínicas", "Gestión de iglesias", "Suite institucional", "Respaldo de Google Workspace", "Reservas directas", "Analítica con IA", "Superadministración multi-empresa"],
  en: ["Custom ERP", "Multi-tenant CRM", "White-label SaaS", "Real estate CMS", "Clinic management", "Church management", "Institutional suite", "Google Workspace backup", "Direct booking", "AI analytics", "Multi-company super-admin"],
};
