export type PortfolioItemExtended = {
  id: string;
  slug: string;
  order: number;
  imageUrl: string | null;
  clientName: string | null;
  industry_en: string | null;
  industry_es: string | null;
  title_en: string;
  title_es: string;
  summary_en: string;
  summary_es: string;
  outcome_en: string | null;
  outcome_es: string | null;
  caseStudyUrl: string | null;
  screenshots: string;
  techStack: string;
  highlights: string;
  liveUrl: string | null;
  repoUrl: string | null;
  demoUrl: string | null;
  category: string;
  featured: boolean;
  year: number;
  value: number;
};

export const staticPortfolioItems: PortfolioItemExtended[] = [
  {
    id: "portfolio-tdp",
    slug: "tdp",
    order: 1,
    imageUrl: "/portfolio/tdp/thumbnail.jpg",
    clientName: "TDP",
    industry_en: "Transportation",
    industry_es: "Transporte",
    title_en: "TDP — National Transport Ticketing",
    title_es: "TDP — Ticketing de Transporte Nacional",
    summary_en:
      "Full-stack national bus ticketing system combining a public web portal, Electron-based dual-screen POS terminals, and real-time GPS fleet tracking — all integrated with 5+ Panamanian payment gateways.",
    summary_es:
      "Sistema de ticketing de transporte nacional que combina un portal web público, terminales POS de doble pantalla basados en Electron y rastreo GPS en tiempo real — integrado con más de 5 pasarelas de pago panameñas.",
    outcome_en: "10,369 TypeScript files · Electron desktop app · Thermal printer integration",
    outcome_es: "10,369 archivos TypeScript · App Electron · Integración con impresoras térmicas",
    caseStudyUrl: null,
    screenshots: JSON.stringify(["/portfolio/tdp/thumbnail.jpg"]),
    techStack: JSON.stringify([
      "Next.js 14", "Electron", "Supabase", "TypeScript",
      "Yappy", "PagueloFacil", "Tilopay", "GPS", "PWA",
    ]),
    highlights: JSON.stringify([
      "5+ payment gateways (Yappy, PagueloFacil, Tilopay, PayU, Banesco)",
      "Dual-screen Electron POS terminals",
      "Real-time GPS fleet tracking",
      "Thermal printer integration",
      "Cryptographic QR ticket validation",
      "PWA scanner app with offline support",
    ]),
    liveUrl: null,
    repoUrl: null,
    demoUrl: "/portfolio/demos/tdp",
    category: "saas",
    featured: true,
    year: 2024,
    value: 275000,
  },
  {
    id: "portfolio-tickets",
    slug: "tickets",
    order: 2,
    imageUrl: "/portfolio/tickets/thumbnail.jpg",
    clientName: "Tickets Platform",
    industry_en: "Events & Entertainment",
    industry_es: "Eventos y Entretenimiento",
    title_en: "Tickets — Enterprise Event Ticketing",
    title_es: "Tickets — Plataforma de Ticketing Empresarial",
    summary_en:
      "Multi-tenant event ticketing platform built for 50,000+ daily transactions, featuring NFC cashless payments, cryptographically signed QR codes, and an offline-first PWA scanner app.",
    summary_es:
      "Plataforma de ticketing multi-tenant construida para más de 50,000 transacciones diarias, con pagos cashless NFC, códigos QR con firma criptográfica y una PWA scanner offline-first.",
    outcome_en: "50,000+ daily transactions · NFC cashless system · Drizzle ORM type-safe SQL",
    outcome_es: "50,000+ transacciones diarias · Sistema cashless NFC · SQL type-safe con Drizzle ORM",
    caseStudyUrl: null,
    screenshots: JSON.stringify(["/portfolio/tickets/thumbnail.jpg"]),
    techStack: JSON.stringify([
      "Next.js 14", "Drizzle ORM", "PostgreSQL", "NFC",
      "Yappy", "PWA", "IndexedDB", "Resend",
    ]),
    highlights: JSON.stringify([
      "50,000+ daily transactions capacity",
      "NFC band cashless payment system",
      "Cryptographic signed QR codes",
      "Multi-tenant white-label theming with DB-driven config",
      "Offline-first PWA scanner with IndexedDB",
      "Wallet system with multi-gateway abstraction",
    ]),
    liveUrl: null,
    repoUrl: null,
    demoUrl: "/portfolio/demos/tickets",
    category: "saas",
    featured: true,
    year: 2024,
    value: 325000,
  },
  {
    id: "portfolio-sembradores",
    slug: "sembradores",
    order: 3,
    imageUrl: "/portfolio/sembradores/thumbnail.jpg",
    clientName: "Sembradores",
    industry_en: "Non-profit / Religious",
    industry_es: "Sin fines de lucro / Religioso",
    title_en: "Sembradores — Church Management SaaS",
    title_es: "Sembradores — SaaS de Gestión Eclesiástica",
    summary_en:
      "White-label church management platform built as a Turborepo monorepo with 12 complete feature phases: from member management and pastoral care to double-entry accounting, payment gateways, and a PWA member portal.",
    summary_es:
      "Plataforma white-label para gestión eclesiástica construida como monorepo Turborepo con 12 fases de funcionalidades completas: desde gestión de miembros y cuidado pastoral hasta contabilidad de doble entrada, pasarelas de pago y portal PWA.",
    outcome_en: "12 feature phases · 68 SQL migrations · Double-entry accounting system",
    outcome_es: "12 fases de funcionalidades · 68 migraciones SQL · Sistema de contabilidad de doble entrada",
    caseStudyUrl: null,
    screenshots: JSON.stringify(["/portfolio/sembradores/thumbnail.jpg"]),
    techStack: JSON.stringify([
      "Next.js 15", "Turborepo", "Supabase", "pnpm",
      "Brevo", "Yappy", "Banco General", "PWA", "ExcelJS", "Recharts",
    ]),
    highlights: JSON.stringify([
      "12 complete feature phases delivered",
      "68 SQL migrations with RLS policies",
      "Double-entry accounting with journal entries & GL",
      "Multi-tenant by domain with white-label branding",
      "Bulk Excel import engine with dry-run support",
      "Payment gateway abstraction (Yappy, Banco General, Stripe-ready)",
    ]),
    liveUrl: null,
    repoUrl: null,
    demoUrl: "/portfolio/demos/sembradores",
    category: "saas",
    featured: true,
    year: 2024,
    value: 300000,
  },
  {
    id: "portfolio-academyx",
    slug: "academyx",
    order: 4,
    imageUrl: "/portfolio/academyx/thumbnail.jpg",
    clientName: "Academia Suárez",
    industry_en: "Sports & Education",
    industry_es: "Deportes y Educación",
    title_en: "Academyx — Football Academy CRM",
    title_es: "Academyx — CRM para Academia de Fútbol",
    summary_en:
      "Comprehensive SaaS for managing a football academy: multi-role enrollment, financial tracking with Stripe, attendance, tournaments, schedules, WhatsApp communications, and real-time dashboards.",
    summary_es:
      "SaaS integral para gestionar una academia de fútbol: inscripciones multi-rol, seguimiento financiero con Stripe, asistencia, torneos, horarios, comunicaciones por WhatsApp y dashboards en tiempo real.",
    outcome_en: "14,116 TypeScript files · 497 DB migrations · 5 user roles",
    outcome_es: "14,116 archivos TypeScript · 497 migraciones DB · 5 roles de usuario",
    caseStudyUrl: null,
    screenshots: JSON.stringify(["/portfolio/academyx/thumbnail.jpg"]),
    techStack: JSON.stringify([
      "Next.js 16", "Supabase", "Stripe", "AWS S3",
      "WhatsApp", "Brevo", "Redis", "PWA", "Recharts",
    ]),
    highlights: JSON.stringify([
      "14,116 TypeScript files — largest codebase",
      "497 database migrations showing scale",
      "5 user roles (parent, player, coach, admin, superuser)",
      "Multi-payment gateway (Stripe, Yappy, cash, transfer)",
      "WhatsApp + email campaign integration",
      "PDF export, QR codes, PWA offline support",
    ]),
    liveUrl: null,
    repoUrl: null,
    demoUrl: "/portfolio/demos/academyx",
    category: "saas",
    featured: true,
    year: 2024,
    value: 100000,
  },
  {
    id: "portfolio-bnb-real-estate",
    slug: "bnb-real-estate",
    order: 5,
    imageUrl: "/portfolio/bnb/thumbnail.jpg",
    clientName: "B&B Real Estate",
    industry_en: "Real Estate",
    industry_es: "Bienes Raíces",
    title_en: "B&B Real Estate — Property Marketplace",
    title_es: "B&B Real Estate — Marketplace Inmobiliaria",
    summary_en:
      "Full-featured real estate marketplace with an integrated CMS, buyer/seller portals, 3-language SEO (EN/ES/PT), PDF property documents, and a comprehensive Playwright E2E test suite.",
    summary_es:
      "Marketplace inmobiliario completo con CMS integrado, portales de comprador/vendedor, SEO trilingüe (ES/EN/PT), documentos PDF de propiedades y suite de pruebas E2E con Playwright.",
    outcome_en: "3-language SEO · 462 React components · E2E Playwright tests",
    outcome_es: "SEO en 3 idiomas · 462 componentes React · Pruebas E2E con Playwright",
    caseStudyUrl: null,
    screenshots: JSON.stringify(["/portfolio/bnb/thumbnail.jpg"]),
    techStack: JSON.stringify([
      "Next.js 15", "Supabase", "Stripe", "AWS S3",
      "Cloudflare R2", "Playwright", "Vitest", "Sharp",
    ]),
    highlights: JSON.stringify([
      "3-language SEO optimization (EN/ES/PT sitemaps)",
      "462 React components — production-grade UI library",
      "E2E Playwright + Vitest unit tests",
      "PDF property document generation",
      "Multi-image optimization with Sharp + R2",
      "Full CMS admin with auth and content revalidation",
    ]),
    liveUrl: null,
    repoUrl: null,
    demoUrl: "/portfolio/demos/bnb-real-estate",
    category: "web-app",
    featured: true,
    year: 2024,
    value: 125000,
  },
  {
    id: "portfolio-wedding-saas",
    slug: "wedding-saas",
    order: 6,
    imageUrl: "/portfolio/wedding-saas/thumbnail.jpg",
    clientName: "Wedding SaaS",
    industry_en: "Events & Hospitality",
    industry_es: "Eventos y Hospitalidad",
    title_en: "Wedding SaaS — Multi-tenant Wedding Platform",
    title_es: "Wedding SaaS — Plataforma de Bodas Multi-tenant",
    summary_en:
      "White-label wedding planning SaaS with 7-locale support, audio invitations, guest galleries, package-based billing, and a Godmode admin control plane — built with Next.js 16 and 11,577 TypeScript files.",
    summary_es:
      "SaaS white-label de planificación de bodas con soporte para 7 idiomas, invitaciones con audio, galerías para invitados, facturación por paquetes y un panel de control Godmode — construido con Next.js 16 y 11,577 archivos TypeScript.",
    outcome_en: "11,577 TypeScript files · 708 routes · 7 locales",
    outcome_es: "11,577 archivos TypeScript · 708 rutas · 7 idiomas",
    caseStudyUrl: null,
    screenshots: JSON.stringify(["/portfolio/wedding-saas/thumbnail.jpg"]),
    techStack: JSON.stringify([
      "Next.js 16", "React 19", "Supabase", "Tailwind v4",
      "next-intl", "PWA", "Serwist", "dnd-kit",
    ]),
    highlights: JSON.stringify([
      "Multi-tenant isolation with RLS per wedding",
      "Audio invitation system with custom branding",
      "7-locale internationalization with next-intl",
      "Package-based billing system (guest count pricing)",
      "Godmode admin control plane API",
      "PWA with service workers (Serwist)",
    ]),
    liveUrl: null,
    repoUrl: null,
    demoUrl: "/portfolio/demos/wedding-saas",
    category: "saas",
    featured: false,
    year: 2024,
    value: 200000,
  },
  {
    id: "portfolio-wedding-site",
    slug: "wedding-site",
    order: 7,
    imageUrl: "/portfolio/wedding-site/thumbnail.jpg",
    clientName: "Wedding Site",
    industry_en: "Events & Hospitality",
    industry_es: "Eventos y Hospitalidad",
    title_en: "Wedding Site — Collaborative Wedding App",
    title_es: "Wedding Site — App Colaborativa de Bodas",
    summary_en:
      "Guest collaboration platform for weddings: real-time RSVP tracking, shared photo galleries with drag-and-drop reordering via AWS S3 presigned URLs, Excel export, and a PWA for offline access.",
    summary_es:
      "Plataforma colaborativa de bodas: RSVP en tiempo real, galerías de fotos compartidas con reordenamiento drag-and-drop vía AWS S3, exportación a Excel y PWA para acceso offline.",
    outcome_en: "11,083 TypeScript files · Real-time Supabase · AWS S3 presigned uploads",
    outcome_es: "11,083 archivos TypeScript · Supabase en tiempo real · Cargas S3 con presigned URLs",
    caseStudyUrl: null,
    screenshots: JSON.stringify(["/portfolio/wedding-site/thumbnail.jpg"]),
    techStack: JSON.stringify([
      "Next.js 16", "React 19", "Supabase", "AWS S3",
      "Nodemailer", "dnd-kit", "PWA", "xlsx",
    ]),
    highlights: JSON.stringify([
      "Real-time guest collaboration via Supabase Realtime",
      "Drag-and-drop photo gallery with @dnd-kit",
      "AWS S3 presigned URLs for secure file uploads",
      "RSVP tracking with dietary restrictions",
      "Excel export for guest lists",
      "PWA with offline support",
    ]),
    liveUrl: null,
    repoUrl: null,
    demoUrl: "/portfolio/demos/wedding-site",
    category: "web-app",
    featured: false,
    year: 2024,
    value: 90000,
  },
  {
    id: "portfolio-godmode",
    slug: "godmode",
    order: 8,
    imageUrl: "/portfolio/godmode/thumbnail.jpg",
    clientName: "Godmode",
    industry_en: "Business Intelligence",
    industry_es: "Inteligencia de Negocio",
    title_en: "Godmode — B2B SaaS Control Center",
    title_es: "Godmode — Centro de Control SaaS B2B",
    summary_en:
      "Unified B2B dashboard for managing digital subscriptions, automotive inventory, and company hierarchies across multiple organizations — with Dodo Payments billing, consolidated analytics, and HMAC-signed control plane webhooks.",
    summary_es:
      "Dashboard B2B unificado para gestionar suscripciones digitales, inventario automotriz y jerarquías corporativas en múltiples organizaciones — con facturación Dodo Payments, analítica consolidada y webhooks con firma HMAC.",
    outcome_en: "3 business modules · Multi-company management · Control plane webhooks",
    outcome_es: "3 módulos de negocio · Gestión multi-empresa · Webhooks de control plane",
    caseStudyUrl: null,
    screenshots: JSON.stringify(["/portfolio/godmode/thumbnail.jpg"]),
    techStack: JSON.stringify([
      "Next.js 16", "React 19", "Supabase", "Tailwind v4",
      "Recharts", "Dodo Payments", "Resend", "Vitest",
    ]),
    highlights: JSON.stringify([
      "Multi-company management with RLS isolation",
      "3 domain modules: digital, automotive, holdings",
      "HMAC-signed control plane webhooks",
      "Dodo Payments SaaS billing integration",
      "Consolidated analytics across companies",
      "Role-based access (owner, manager, viewer)",
    ]),
    liveUrl: null,
    repoUrl: null,
    demoUrl: "/portfolio/demos/godmode",
    category: "saas",
    featured: false,
    year: 2024,
    value: 115000,
  },
];

export function getStaticPortfolioItems(): PortfolioItemExtended[] {
  return staticPortfolioItems;
}
