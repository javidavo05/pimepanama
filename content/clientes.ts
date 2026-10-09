/** Clientes y sistemas. Solo se publica lo que tiene `autorizado: true`. Javier confirma uno por uno. */
export type Cliente = { nombre: string; sistema: string; autorizado: boolean };

export const CLIENTES: Cliente[] = [
  { nombre: "Svitzer", sistema: "Analítica de muestras de aceite con IA", autorizado: true },
  { nombre: "B&B Real Estate", sistema: "CMS inmobiliario con sincronización Wasi", autorizado: false },
  { nombre: "HOLO Realty", sistema: "Gestión de propiedades con API Wasi", autorizado: false },
  { nombre: "Academyx", sistema: "CRM SaaS multi-tenant para academias", autorizado: false },
  { nombre: "MedSuite", sistema: "Gestión de clínicas white-label", autorizado: false },
  { nombre: "Sembradores", sistema: "Gestión de iglesias multi-tenant", autorizado: false },
  { nombre: "Smart Church", sistema: "Management y CMS white-label", autorizado: false },
  { nombre: "Unión Adventista Panameña", sistema: "Suite institucional: secretaría, propiedades, actas y juntas", autorizado: false },
  { nombre: "John Henry Oficial", sistema: "CMS y CRM de sastrería de lujo", autorizado: false },
  { nombre: "Wedding CMS", sistema: "Invitaciones y eventos SaaS", autorizado: false },
  { nombre: "Misaza Designs", sistema: "Sitio y plataforma serverless", autorizado: false },
];

/** Tipos de sistema construidos, para la cinta cuando hay pocos clientes autorizados. */
export const TIPOS_SISTEMA = {
  es: ["ERP a medida", "CRM multi-tenant", "SaaS white-label", "CMS inmobiliario", "Gestión de clínicas", "Gestión de iglesias", "Suite institucional", "Respaldo de Google Workspace", "Reservas directas", "Analítica con IA", "Superadministración multi-empresa"],
  en: ["Custom ERP", "Multi-tenant CRM", "White-label SaaS", "Real estate CMS", "Clinic management", "Church management", "Institutional suite", "Google Workspace backup", "Direct booking", "AI analytics", "Multi-company super-admin"],
};
