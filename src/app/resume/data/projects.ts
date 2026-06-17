import type { Lang } from "./content";

export interface Project {
  id: string;
  title: { en: string; es: string };
  category: { en: string; es: string };
  description: { en: string; es: string };
  features: { en: string[]; es: string[] };
  /** Optional real screenshot. Drop a file at /public/resume/projects/<id>.png and set the path here. */
  screenshotUrl?: string;
  /** Slug under /<lang>/portfolio/demos/<slug> for the live interactive demo. */
  demoSlug?: string;
  /** External production URL, if shareable. */
  systemUrl?: string;
  initials: string;
  accentColor: string;
  /** Faux preview metric labels shown in the placeholder mockup. */
  metric: { value: { en: string; es: string }; label: { en: string; es: string } };
}

export function demoUrl(p: Project, lang: Lang): string | undefined {
  return p.demoSlug ? `/${lang}/portfolio/demos/${p.demoSlug}` : undefined;
}

export const projects: Project[] = [
  {
    id: "tdp",
    title: { en: "TDP — National Transport Ticketing", es: "TDP — Boletería Nacional de Transporte" },
    category: { en: "Transport SaaS", es: "SaaS de Transporte" },
    description: {
      en: "Full-stack national bus ticketing system combining a public web portal, Electron-based dual-screen POS terminals, and real-time GPS fleet tracking — integrated with 5+ Panamanian payment gateways.",
      es: "Sistema nacional de boletería de buses full-stack que combina un portal web público, terminales POS de doble pantalla en Electron y rastreo GPS de flota en tiempo real — integrado con 5+ pasarelas de pago panameñas.",
    },
    features: {
      en: ["5+ Payment Gateways", "Electron Dual-Screen POS", "Real-Time GPS Tracking", "Thermal Printer Integration", "Cryptographic QR Tickets", "Offline-First PWA Scanner"],
      es: ["5+ Pasarelas de Pago", "POS Doble Pantalla (Electron)", "Rastreo GPS en Tiempo Real", "Impresión Térmica", "Tickets QR Criptográficos", "Escáner PWA Offline"],
    },
    demoSlug: "tdp",
    initials: "TD",
    accentColor: "#1d4ed8",
    metric: { value: { en: "5+", es: "5+" }, label: { en: "Payment gateways", es: "Pasarelas de pago" } },
  },
  {
    id: "tickets",
    title: { en: "Enterprise Event Ticketing", es: "Boletería de Eventos Empresarial" },
    category: { en: "Events SaaS", es: "SaaS de Eventos" },
    description: {
      en: "Multi-tenant event ticketing platform built for 50,000+ daily transactions. Features NFC cashless payments, cryptographically signed QR codes, and an offline-first PWA scanner app.",
      es: "Plataforma de boletería de eventos multi-tenant construida para 50,000+ transacciones diarias. Incluye pagos sin efectivo por NFC, códigos QR firmados criptográficamente y una app escáner PWA offline-first.",
    },
    features: {
      en: ["50K+ Daily Transactions", "NFC Cashless Payments", "Cryptographic QR Codes", "Multi-tenant White-Label", "Offline PWA Scanner", "Drizzle ORM Type-Safe SQL"],
      es: ["50K+ Transacciones Diarias", "Pagos NFC sin Efectivo", "Códigos QR Criptográficos", "Multi-tenant White-Label", "Escáner PWA Offline", "SQL Tipado con Drizzle"],
    },
    demoSlug: "tickets",
    initials: "TK",
    accentColor: "#7c3aed",
    metric: { value: { en: "50K+", es: "50K+" }, label: { en: "Daily transactions", es: "Transacciones diarias" } },
  },
  {
    id: "sembradores",
    title: { en: "Sembradores — Church Management", es: "Sembradores — Gestión de Iglesias" },
    category: { en: "Non-profit SaaS", es: "SaaS sin Fines de Lucro" },
    description: {
      en: "White-label church management platform built as a Turborepo monorepo with 12 complete feature phases: member management, pastoral care, double-entry accounting, and a PWA member portal.",
      es: "Plataforma white-label de gestión de iglesias construida como monorepo Turborepo con 12 fases completas: gestión de miembros, cuidado pastoral, contabilidad de partida doble y un portal PWA para miembros.",
    },
    features: {
      en: ["12 Feature Phases", "68 SQL Migrations", "Double-Entry Accounting", "Multi-Tenant by Domain", "Bulk Excel Import Engine", "Payment Gateway Abstraction"],
      es: ["12 Fases de Producto", "68 Migraciones SQL", "Contabilidad Partida Doble", "Multi-tenant por Dominio", "Importación Masiva Excel", "Abstracción de Pasarelas"],
    },
    demoSlug: "sembradores",
    initials: "SM",
    accentColor: "#059669",
    metric: { value: { en: "12", es: "12" }, label: { en: "Feature phases", es: "Fases de producto" } },
  },
  {
    id: "academyx",
    title: { en: "Academyx — Football Academy CRM", es: "Academyx — CRM para Academia de Fútbol" },
    category: { en: "Sports SaaS", es: "SaaS Deportivo" },
    description: {
      en: "Comprehensive SaaS for managing a football academy: multi-role enrollment, financial tracking with Stripe, attendance, tournaments, schedules, WhatsApp communications, and real-time dashboards.",
      es: "SaaS integral para gestionar una academia de fútbol: inscripción multi-rol, control financiero con Stripe, asistencia, torneos, horarios, comunicaciones por WhatsApp y dashboards en tiempo real.",
    },
    features: {
      en: ["14,116 TypeScript Files", "497 DB Migrations", "5 User Roles", "Multi-Gateway Payments", "WhatsApp Integration", "PDF Export & QR Codes"],
      es: ["14,116 Archivos TypeScript", "497 Migraciones DB", "5 Roles de Usuario", "Pagos Multi-pasarela", "Integración WhatsApp", "Exportación PDF y QR"],
    },
    demoSlug: "academyx",
    initials: "AX",
    accentColor: "#2563eb",
    metric: { value: { en: "14K+", es: "14K+" }, label: { en: "TypeScript files", es: "Archivos TypeScript" } },
  },
  {
    id: "bnb-real-estate",
    title: { en: "B&B Real Estate Marketplace", es: "B&B Marketplace Inmobiliario" },
    category: { en: "Real Estate", es: "Bienes Raíces" },
    description: {
      en: "Full-featured real estate marketplace with integrated CMS, buyer/seller portals, 3-language SEO (EN/ES/PT), PDF property documents, and a comprehensive Playwright E2E test suite.",
      es: "Marketplace inmobiliario completo con CMS integrado, portales para compradores/vendedores, SEO en 3 idiomas (EN/ES/PT), documentos PDF de propiedades y una suite E2E completa con Playwright.",
    },
    features: {
      en: ["3-Language SEO (EN/ES/PT)", "462 React Components", "E2E Playwright Tests", "PDF Property Documents", "Multi-Image Optimization", "Full CMS Admin"],
      es: ["SEO en 3 Idiomas (EN/ES/PT)", "462 Componentes React", "Tests E2E Playwright", "Documentos PDF de Propiedad", "Optimización Multi-imagen", "CMS Admin Completo"],
    },
    demoSlug: "bnb-real-estate",
    initials: "BB",
    accentColor: "#b45309",
    metric: { value: { en: "462", es: "462" }, label: { en: "React components", es: "Componentes React" } },
  },
  {
    id: "wedding-saas",
    title: { en: "Wedding SaaS — Multi-Tenant Platform", es: "Wedding SaaS — Plataforma Multi-Tenant" },
    category: { en: "Hospitality SaaS", es: "SaaS de Hospitalidad" },
    description: {
      en: "White-label wedding planning SaaS with 7-locale support, audio invitations, guest galleries, package-based billing, and a Godmode admin control plane — 11,577 TypeScript files.",
      es: "SaaS white-label de planificación de bodas con soporte para 7 idiomas, invitaciones de audio, galerías de invitados, facturación por paquetes y un panel de control Godmode — 11,577 archivos TypeScript.",
    },
    features: {
      en: ["11,577 TypeScript Files", "708 Routes", "Multi-Tenant RLS Isolation", "Audio Invitation System", "7-Locale i18n", "Package-Based Billing"],
      es: ["11,577 Archivos TypeScript", "708 Rutas", "Aislamiento Multi-tenant RLS", "Invitaciones de Audio", "i18n en 7 Idiomas", "Facturación por Paquetes"],
    },
    demoSlug: "wedding-saas",
    initials: "WS",
    accentColor: "#db2777",
    metric: { value: { en: "708", es: "708" }, label: { en: "Application routes", es: "Rutas de aplicación" } },
  },
  {
    id: "wedding-site",
    title: { en: "Wedding Site — Collaborative App", es: "Wedding Site — App Colaborativa" },
    category: { en: "Web App", es: "Aplicación Web" },
    description: {
      en: "Guest collaboration platform for weddings: real-time RSVP tracking, shared photo galleries with drag-and-drop via AWS S3 presigned URLs, Excel export, and offline PWA.",
      es: "Plataforma colaborativa de invitados para bodas: seguimiento de RSVP en tiempo real, galerías compartidas con arrastrar y soltar vía URLs prefirmadas de AWS S3, exportación a Excel y PWA offline.",
    },
    features: {
      en: ["11,083 TypeScript Files", "Real-Time Supabase Sync", "AWS S3 Presigned Uploads", "Drag-and-Drop Gallery", "RSVP + Dietary Tracking", "PWA Offline Support"],
      es: ["11,083 Archivos TypeScript", "Sync en Tiempo Real Supabase", "Subidas Prefirmadas AWS S3", "Galería Arrastrar y Soltar", "RSVP + Restricciones Dietéticas", "Soporte PWA Offline"],
    },
    demoSlug: "wedding-site",
    initials: "WA",
    accentColor: "#0891b2",
    metric: { value: { en: "Real-time", es: "Tiempo Real" }, label: { en: "Supabase sync", es: "Sync Supabase" } },
  },
  {
    id: "godmode",
    title: { en: "Godmode — B2B SaaS Control Center", es: "Godmode — Centro de Control SaaS B2B" },
    category: { en: "Business Intelligence", es: "Inteligencia de Negocios" },
    description: {
      en: "Unified B2B dashboard managing digital subscriptions, automotive inventory, and company hierarchies across multiple organizations — with Dodo Payments billing and HMAC-signed webhooks.",
      es: "Dashboard B2B unificado que gestiona suscripciones digitales, inventario automotriz y jerarquías de empresas en múltiples organizaciones — con facturación Dodo Payments y webhooks firmados con HMAC.",
    },
    features: {
      en: ["Multi-Company RLS Isolation", "3 Domain Modules", "HMAC-Signed Webhooks", "Dodo Payments Billing", "Consolidated Analytics", "Role-Based Access Control"],
      es: ["Aislamiento RLS Multi-empresa", "3 Módulos de Dominio", "Webhooks Firmados HMAC", "Facturación Dodo Payments", "Analítica Consolidada", "Control de Acceso por Roles"],
    },
    demoSlug: "godmode",
    initials: "GM",
    accentColor: "#4f46e5",
    metric: { value: { en: "Multi-org", es: "Multi-org" }, label: { en: "RLS isolation", es: "Aislamiento RLS" } },
  },
];
