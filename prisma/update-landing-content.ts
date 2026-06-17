import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌿 Actualizando contenido de Pime Panamá...\n");

  // ─── HERO ───────────────────────────────────────────────────────────────────
  console.log("Hero...");
  await prisma.hero.updateMany({
    data: {
      headline_es: "Desarrollo de Software Empresarial en Panama",
      headline_en: "Enterprise Software Development in Panama",
      subheadline_es:
        "Construimos plataformas SaaS, CRMs, CMS, sistemas de gestión y herramientas de automatización que ayudan a organizaciones a operar mejor y crecer con tecnología.",
      subheadline_en:
        "We build SaaS platforms, CRMs, CMS systems, management tools, and automation workflows that help organizations operate better and grow with technology.",
      highlight_es: "Más de 30 sistemas entregados en Panama y la región",
      highlight_en: "30+ systems delivered across Panama and the region",
      ctaPrimaryLabel_es: "Ver Proyectos",
      ctaPrimaryLabel_en: "View Projects",
      ctaPrimaryLink: "#projects",
      ctaSecondaryLabel_es: "Solicitar Cotización",
      ctaSecondaryLabel_en: "Request a Quote",
      ctaSecondaryLink: "#contact",
    },
  });
  console.log("  ✓ Hero actualizado\n");

  // ─── PAGE SECTIONS ───────────────────────────────────────────────────────────
  console.log("Secciones de página...");
  const sections = [
    {
      slug: "services",
      title_es: "Soluciones digitales para empresas reales",
      title_en: "Digital solutions for real businesses",
      subtitle_es: "Lo que construimos",
      subtitle_en: "What we build",
    },
    {
      slug: "sectors",
      title_es: "Experiencia en más de 10 industrias",
      title_en: "Experience across 10+ industries",
      subtitle_es: "Industrias",
      subtitle_en: "Industries",
    },
    {
      slug: "differentials",
      title_es: "Por qué Pime Panamá",
      title_en: "Why Pime Panamá",
      subtitle_es: null,
      subtitle_en: null,
    },
  ];

  for (const section of sections) {
    await prisma.pageSection.upsert({
      where: { slug: section.slug },
      update: {
        title_es: section.title_es,
        title_en: section.title_en,
        subtitle_es: section.subtitle_es,
        subtitle_en: section.subtitle_en,
      },
      create: {
        slug: section.slug,
        title_es: section.title_es,
        title_en: section.title_en,
        subtitle_es: section.subtitle_es,
        subtitle_en: section.subtitle_en,
      },
    });
  }

  // Remove the old "value" section (replaced by hardcoded AboutSection)
  await prisma.pageSection.deleteMany({ where: { slug: "value" } });
  console.log("  ✓ Secciones actualizadas\n");

  // ─── SERVICES ────────────────────────────────────────────────────────────────
  console.log("Servicios...");
  // Clear existing services and recreate in correct order
  await prisma.service.deleteMany({});

  const services = [
    {
      slug: "saas-platforms",
      order: 1,
      icon: "ph:stack",
      title_es: "Plataformas SaaS",
      title_en: "SaaS Platforms",
      description_es:
        "Sistemas multi-tenant escalables para empresas que necesitan servir a múltiples organizaciones desde una sola plataforma. Arquitectura robusta, billing integrado, y paneles por organización.",
      description_en:
        "Scalable multi-tenant systems for companies that need to serve multiple organizations from a single platform. Robust architecture, integrated billing, and per-organization dashboards.",
    },
    {
      slug: "enterprise-crm",
      order: 2,
      icon: "ph:users-three",
      title_es: "CRM Empresarial",
      title_en: "Enterprise CRM",
      description_es:
        "Gestión de clientes, prospectos, ventas y operaciones adaptada a tu proceso, no al revés. Desde pipelines simples hasta flujos complejos con automatizaciones, reportes y roles.",
      description_en:
        "Customer, prospect, sales, and operations management adapted to your process — not the other way around. From simple pipelines to complex flows with automations, reports, and roles.",
    },
    {
      slug: "cms-websites",
      order: 3,
      icon: "ph:globe",
      title_es: "CMS y Sitios Web",
      title_en: "CMS & Websites",
      description_es:
        "Desde landing pages profesionales desde $750 hasta sistemas de gestión de contenido headless para plataformas de alto tráfico. Diseño, desarrollo y entrega rápida.",
      description_en:
        "From professional landing pages starting at $750 to headless CMS for high-traffic platforms. Design, development, and fast delivery.",
    },
    {
      slug: "process-automation",
      order: 4,
      icon: "ph:lightning",
      title_es: "Automatización de Procesos",
      title_en: "Process Automation",
      description_es:
        "Flujos de trabajo automáticos, cobros recurrentes, notificaciones por email y WhatsApp, reportes programados y cron jobs que eliminan trabajo manual repetitivo.",
      description_en:
        "Automated workflows, recurring billing, email and WhatsApp notifications, scheduled reports, and cron jobs that eliminate repetitive manual work.",
    },
    {
      slug: "management-systems",
      order: 5,
      icon: "ph:buildings",
      title_es: "Sistemas de Gestión",
      title_en: "Management Systems",
      description_es:
        "Plataformas internas para iglesias, academias, hospitales, eventos y cualquier organización que necesite digitalizar sus operaciones y gestionar su información eficientemente.",
      description_en:
        "Internal platforms for churches, academies, hospitals, events, and any organization that needs to digitize operations and manage information efficiently.",
    },
    {
      slug: "digital-consulting",
      order: 6,
      icon: "ph:compass",
      title_es: "Consultoría y Arquitectura Digital",
      title_en: "Digital Architecture Consulting",
      description_es:
        "Diagnóstico técnico, diseño de arquitectura, y roadmap de producto para empresas que quieren construir bien desde el inicio o escalar sistemas existentes sin deuda técnica.",
      description_en:
        "Technical diagnosis, architecture design, and product roadmap for companies that want to build right from the start or scale existing systems without technical debt.",
    },
  ];

  for (const service of services) {
    await prisma.service.create({ data: service });
  }
  console.log("  ✓ 6 servicios creados\n");

  // ─── SECTORS ─────────────────────────────────────────────────────────────────
  console.log("Sectores...");
  await prisma.sector.deleteMany({});

  const sectors = [
    { slug: "real-estate", order: 1, title_es: "Inmobiliaria", title_en: "Real Estate" },
    { slug: "education", order: 2, title_es: "Educación", title_en: "Education" },
    { slug: "churches-ngos", order: 3, title_es: "Iglesias y ONGs", title_en: "Churches & NGOs" },
    { slug: "events-ticketing", order: 4, title_es: "Eventos y Ticketing", title_en: "Events & Ticketing" },
    { slug: "media-radio", order: 5, title_es: "Medios y Radio", title_en: "Media & Radio" },
    { slug: "health", order: 6, title_es: "Salud", title_en: "Health" },
    { slug: "tourism", order: 7, title_es: "Turismo", title_en: "Tourism" },
    { slug: "service-companies", order: 8, title_es: "Empresas de Servicios", title_en: "Service Companies" },
    { slug: "retail", order: 9, title_es: "Retail", title_en: "Retail" },
    { slug: "corporate-tools", order: 10, title_es: "Herramientas Corporativas", title_en: "Corporate Tools" },
  ];

  for (const sector of sectors) {
    await prisma.sector.create({ data: sector });
  }
  console.log("  ✓ 10 sectores creados\n");

  // ─── DIFFERENTIATORS ─────────────────────────────────────────────────────────
  console.log("Diferenciadores...");
  await prisma.differentiator.deleteMany({});

  const differentiators = [
    {
      slug: "your-code",
      order: 1,
      title_es: "El código es tuyo",
      title_en: "The code is yours",
      description_es:
        "Entregamos el código fuente completo. No dependes de nosotros para siempre. Puedes llevar tu sistema a cualquier desarrollador en el futuro sin restricciones.",
      description_en:
        "We deliver the full source code. You don't depend on us forever. You can take your system to any developer in the future without restrictions.",
    },
    {
      slug: "no-commissions",
      order: 2,
      title_es: "Sin comisiones",
      title_en: "No commissions",
      description_es:
        "No cobramos porcentaje de tus transacciones ni licencias mensuales obligatorias. Pagas el proyecto, punto. Lo que generas con tu sistema es completamente tuyo.",
      description_en:
        "We don't charge a percentage of your transactions or mandatory monthly licenses. You pay for the project, period. What you generate with your system is completely yours.",
    },
    {
      slug: "ceo-codes",
      order: 3,
      title_es: "CEO que también codifica",
      title_en: "CEO who also codes",
      description_es:
        "Javier Vallejo, CEO de Pime Panamá, es también el desarrollador principal. Tu proyecto no pasa por intermediarios — la persona que te cotiza es la misma que construye.",
      description_en:
        "Javier Vallejo, CEO of Pime Panamá, is also the lead developer. Your project doesn't go through middlemen — the person who quotes you is the same one who builds it.",
    },
    {
      slug: "ai-accelerated",
      order: 4,
      title_es: "Desarrollo acelerado con IA",
      title_en: "AI-accelerated development",
      description_es:
        "Usamos herramientas de desarrollo asistido por IA para entregar más rápido sin sacrificar calidad técnica ni escalabilidad. Más velocidad, misma solidez arquitectónica.",
      description_en:
        "We use AI-assisted development tools to deliver faster without sacrificing technical quality or scalability. More speed, same architectural soundness.",
    },
    {
      slug: "dedicated-team",
      order: 5,
      title_es: "Equipo dedicado",
      title_en: "Dedicated team",
      description_es:
        "5 desarrolladores trabajando en proyectos reales, con procesos de entrega probados en más de 30 sistemas. No subcontratamos ni externalizamos tu proyecto.",
      description_en:
        "5 developers working on real projects, with delivery processes proven across 30+ systems. We don't subcontract or outsource your project.",
    },
  ];

  for (const diff of differentiators) {
    await prisma.differentiator.create({ data: diff });
  }
  console.log("  ✓ 5 diferenciadores creados\n");

  // ─── PORTFOLIO ITEMS ─────────────────────────────────────────────────────────
  console.log("Portfolio...");
  await prisma.portfolioItem.deleteMany({});

  const portfolio = [
    {
      slug: "academyx-crm",
      order: 1,
      clientName: "Academyx",
      category: "crm",
      featured: true,
      year: 2023,
      industry_es: "Educación",
      industry_en: "Education",
      title_es: "Academyx CRM",
      title_en: "Academyx CRM",
      summary_es:
        "Plataforma CRM completa para gestión de estudiantes, cursos, pagos recurrentes y comunicaciones. Multi-tenant con paneles por sede.",
      summary_en:
        "Complete CRM platform for managing students, courses, recurring payments, and communications. Multi-tenant with dashboards per campus.",
      techStack: JSON.stringify(["Next.js", "Prisma", "PostgreSQL", "Stripe", "Resend"]),
      liveUrl: null,
    },
    {
      slug: "sembradores-platform",
      order: 2,
      clientName: "Sembradores",
      category: "saas",
      featured: true,
      year: 2023,
      industry_es: "Iglesias y ONGs",
      industry_en: "Churches & NGOs",
      title_es: "Sembradores Church Platform",
      title_en: "Sembradores Church Platform",
      summary_es:
        "Sistema de gestión pastoral para red de iglesias en Panama y Latinoamérica. Gestión de miembros, células, diezmos, eventos y comunicados.",
      summary_en:
        "Pastoral management system for a church network across Panama and Latin America. Member, cell, tithe, event, and announcement management.",
      techStack: JSON.stringify(["Next.js", "Prisma", "PostgreSQL", "WhatsApp API"]),
      liveUrl: null,
    },
    {
      slug: "tickex-ticketing",
      order: 3,
      clientName: "Tickex",
      category: "saas",
      featured: true,
      year: 2024,
      industry_es: "Eventos y Ticketing",
      industry_en: "Events & Ticketing",
      title_es: "Tickex — Ticketing Digital",
      title_en: "Tickex — Digital Ticketing",
      summary_es:
        "Plataforma de venta de tickets online para eventos en Panama. Generación de QR, validación en puerta, panel de organizador y reportes en tiempo real.",
      summary_en:
        "Online ticket sales platform for events in Panama. QR generation, door validation, organizer dashboard, and real-time reports.",
      techStack: JSON.stringify(["Next.js", "Prisma", "Stripe", "QR Code", "PostgreSQL"]),
      liveUrl: null,
    },
    {
      slug: "bb-real-estate",
      order: 4,
      clientName: "B&B Real Estate",
      category: "cms",
      featured: true,
      year: 2022,
      industry_es: "Inmobiliaria",
      industry_en: "Real Estate",
      title_es: "B&B Real Estate CMS",
      title_en: "B&B Real Estate CMS",
      summary_es:
        "CMS inmobiliario con catálogo de propiedades, búsqueda avanzada, sistema de leads, generación de fichas PDF y panel de administración completo.",
      summary_en:
        "Real estate CMS with property catalog, advanced search, lead system, PDF sheet generation, and full admin panel.",
      techStack: JSON.stringify(["Next.js", "Prisma", "PostgreSQL", "Cloudinary"]),
      liveUrl: null,
    },
    {
      slug: "visita7-pastoral",
      order: 5,
      clientName: "Visita7",
      category: "saas",
      featured: false,
      year: 2023,
      industry_es: "Iglesias y ONGs",
      industry_en: "Churches & NGOs",
      title_es: "Visita7 — Sistema Pastoral",
      title_en: "Visita7 — Pastoral System",
      summary_es:
        "Herramienta de seguimiento pastoral para visitas domiciliarias. Asignación de zonas, registro de visitas, reportes por líder y mapas de cobertura.",
      summary_en:
        "Pastoral follow-up tool for home visits. Zone assignment, visit logging, leader reports, and coverage maps.",
      techStack: JSON.stringify(["Next.js", "Prisma", "PostgreSQL", "Google Maps"]),
      liveUrl: null,
    },
    {
      slug: "wedding-event-platform",
      order: 6,
      clientName: "Novias & Eventos",
      category: "saas",
      featured: false,
      year: 2023,
      industry_es: "Eventos y Ticketing",
      industry_en: "Events & Ticketing",
      title_es: "Wedding & Event Platform",
      title_en: "Wedding & Event Platform",
      summary_es:
        "Plataforma SaaS para coordinación de bodas y eventos. Gestión de proveedores, checklist interactivo, presupuesto en tiempo real y portal de invitados.",
      summary_en:
        "SaaS platform for wedding and event coordination. Vendor management, interactive checklist, real-time budget, and guest portal.",
      techStack: JSON.stringify(["Next.js", "Prisma", "PostgreSQL", "Resend"]),
      liveUrl: null,
    },
    {
      slug: "chivas-parranderas",
      order: 7,
      clientName: "Chivas Parranderas",
      category: "saas",
      featured: false,
      year: 2024,
      industry_es: "Turismo",
      industry_en: "Tourism",
      title_es: "Chivas Parranderas MVP",
      title_en: "Chivas Parranderas MVP",
      summary_es:
        "MVP de plataforma de reservas para chivas parranderas en Panama. Catálogo de chivas, disponibilidad en tiempo real, reserva online y pagos integrados.",
      summary_en:
        "MVP booking platform for party buses (chivas) in Panama. Vehicle catalog, real-time availability, online booking, and integrated payments.",
      techStack: JSON.stringify(["Next.js", "Prisma", "PostgreSQL", "Stripe"]),
      liveUrl: null,
    },
    {
      slug: "radio-media-platforms",
      order: 8,
      clientName: "Plataformas de Radio",
      category: "cms",
      featured: false,
      year: 2022,
      industry_es: "Medios y Radio",
      industry_en: "Media & Radio",
      title_es: "Plataformas de Radio y Medios",
      title_en: "Radio & Media Platforms",
      summary_es:
        "CMS y sitios web para emisoras de radio en Panama. Programación en vivo, archivo de programas, noticias, publicidad y streaming integrado.",
      summary_en:
        "CMS and websites for radio stations in Panama. Live schedule, program archive, news, advertising, and integrated streaming.",
      techStack: JSON.stringify(["Next.js", "Prisma", "PostgreSQL", "Cloudinary"]),
      liveUrl: null,
    },
  ];

  for (const item of portfolio) {
    await prisma.portfolioItem.create({ data: item });
  }
  console.log("  ✓ 8 proyectos de portfolio creados\n");

  // ─── SEO ─────────────────────────────────────────────────────────────────────
  console.log("SEO...");
  await prisma.seoSetting.upsert({
    where: { page: "home" },
    update: {
      metaTitle_es: "Pime Panamá | Desarrollo de Software Empresarial en Panama",
      metaTitle_en: "Pime Panamá | Enterprise Software Development in Panama",
      metaDescription_es:
        "Empresa de desarrollo de software en Panama. Construimos plataformas SaaS, CRM, CMS y sistemas de automatización para empresas en Panama, Latinoamérica y el mundo.",
      metaDescription_en:
        "Software development company in Panama. We build SaaS platforms, CRM, CMS and automation systems for businesses across Panama, Latin America and beyond.",
    },
    create: {
      page: "home",
      metaTitle_es: "Pime Panamá | Desarrollo de Software Empresarial en Panama",
      metaTitle_en: "Pime Panamá | Enterprise Software Development in Panama",
      metaDescription_es:
        "Empresa de desarrollo de software en Panama. Construimos plataformas SaaS, CRM, CMS y sistemas de automatización para empresas en Panama, Latinoamérica y el mundo.",
      metaDescription_en:
        "Software development company in Panama. We build SaaS platforms, CRM, CMS and automation systems for businesses across Panama, Latin America and beyond.",
    },
  });
  console.log("  ✓ SEO actualizado\n");

  console.log("✅ Transformación completa. Todos los contenidos actualizados.");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
