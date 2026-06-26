// Static landing content (software-focused). Source of truth for the public
// homepage — no database required. Edit here and deploy with `git push`.
export const staticContent = {
  hero: {
    id: "hero-main",
    headline_en: "Software Development in Panama",
    headline_es: "Desarrollo de Software en Panama",
    subheadline_en:
      "We are a software development company in Panama. We build custom SaaS platforms, CRMs, CMS systems, management tools, and automation workflows that help businesses across Panama and the region operate better and grow with technology.",
    subheadline_es:
      "Somos una empresa de desarrollo de software en Panama. Construimos plataformas SaaS, CRMs, CMS, sistemas de gestión y herramientas de automatización a medida que ayudan a empresas de Panama y la región a operar mejor y crecer con tecnología.",
    highlight_en: "30+ systems delivered across Panama and the region",
    highlight_es: "Más de 30 sistemas entregados en Panama y la región",
    backgroundImageUrl: null,
    backgroundVideoUrl: null,
    ctaPrimaryLabel_en: "View Projects",
    ctaPrimaryLabel_es: "Ver Proyectos",
    ctaPrimaryLink: "#projects",
    ctaSecondaryLabel_en: "Request a Quote",
    ctaSecondaryLabel_es: "Solicitar Cotización",
    ctaSecondaryLink: "#contact",
  },
  sections: [
    {
      id: "section-services",
      slug: "services",
      title_en: "Digital solutions for real businesses",
      title_es: "Soluciones digitales para empresas reales",
      subtitle_en: "What we build",
      subtitle_es: "Lo que construimos",
      body_en: null,
      body_es: null,
    },
    {
      id: "section-sectors",
      slug: "sectors",
      title_en: "Experience across 10+ industries",
      title_es: "Experiencia en más de 10 industrias",
      subtitle_en: "Industries",
      subtitle_es: "Industrias",
      body_en: null,
      body_es: null,
    },
    {
      id: "section-differentials",
      slug: "differentials",
      title_en: "Why Pime Panamá",
      title_es: "Por qué Pime Panamá",
      subtitle_en: null,
      subtitle_es: null,
      body_en: null,
      body_es: null,
    },
  ],
  services: [
    {
      id: "service-saas-platforms",
      slug: "saas-platforms",
      order: 1,
      icon: "ph:stack",
      title_en: "SaaS Platforms",
      title_es: "Plataformas SaaS",
      description_en:
        "Scalable multi-tenant systems for companies that need to serve multiple organizations from a single platform. Robust architecture, integrated billing, and per-organization dashboards.",
      description_es:
        "Sistemas multi-tenant escalables para empresas que necesitan servir a múltiples organizaciones desde una sola plataforma. Arquitectura robusta, billing integrado, y paneles por organización.",
    },
    {
      id: "service-enterprise-crm",
      slug: "enterprise-crm",
      order: 2,
      icon: "ph:users-three",
      title_en: "Enterprise CRM",
      title_es: "CRM Empresarial",
      description_en:
        "Customer, prospect, sales, and operations management adapted to your process — not the other way around. From simple pipelines to complex flows with automations, reports, and roles.",
      description_es:
        "Gestión de clientes, prospectos, ventas y operaciones adaptada a tu proceso, no al revés. Desde pipelines simples hasta flujos complejos con automatizaciones, reportes y roles.",
    },
    {
      id: "service-cms-websites",
      slug: "cms-websites",
      order: 3,
      icon: "ph:globe",
      title_en: "CMS & Websites",
      title_es: "CMS y Sitios Web",
      description_en:
        "From professional landing pages starting at $750 to headless CMS for high-traffic platforms. Design, development, and fast delivery.",
      description_es:
        "Desde landing pages profesionales desde $750 hasta sistemas de gestión de contenido headless para plataformas de alto tráfico. Diseño, desarrollo y entrega rápida.",
    },
    {
      id: "service-process-automation",
      slug: "process-automation",
      order: 4,
      icon: "ph:lightning",
      title_en: "Process Automation",
      title_es: "Automatización de Procesos",
      description_en:
        "Automated workflows, recurring billing, email and WhatsApp notifications, scheduled reports, and cron jobs that eliminate repetitive manual work.",
      description_es:
        "Flujos de trabajo automáticos, cobros recurrentes, notificaciones por email y WhatsApp, reportes programados y cron jobs que eliminan trabajo manual repetitivo.",
    },
    {
      id: "service-management-systems",
      slug: "management-systems",
      order: 5,
      icon: "ph:buildings",
      title_en: "Management Systems",
      title_es: "Sistemas de Gestión",
      description_en:
        "Internal platforms for churches, academies, hospitals, events, and any organization that needs to digitize operations and manage information efficiently.",
      description_es:
        "Plataformas internas para iglesias, academias, hospitales, eventos y cualquier organización que necesite digitalizar sus operaciones y gestionar su información eficientemente.",
    },
    {
      id: "service-digital-consulting",
      slug: "digital-consulting",
      order: 6,
      icon: "ph:compass",
      title_en: "Digital Architecture Consulting",
      title_es: "Consultoría y Arquitectura Digital",
      description_en:
        "Technical diagnosis, architecture design, and product roadmap for companies that want to build right from the start or scale existing systems without technical debt.",
      description_es:
        "Diagnóstico técnico, diseño de arquitectura, y roadmap de producto para empresas que quieren construir bien desde el inicio o escalar sistemas existentes sin deuda técnica.",
    },
  ],
  sectors: [
    { id: "sector-real-estate", slug: "real-estate", order: 1, title_en: "Real Estate", title_es: "Inmobiliaria", description_en: null, description_es: null },
    { id: "sector-education", slug: "education", order: 2, title_en: "Education", title_es: "Educación", description_en: null, description_es: null },
    { id: "sector-churches-ngos", slug: "churches-ngos", order: 3, title_en: "Churches & NGOs", title_es: "Iglesias y ONGs", description_en: null, description_es: null },
    { id: "sector-events-ticketing", slug: "events-ticketing", order: 4, title_en: "Events & Ticketing", title_es: "Eventos y Ticketing", description_en: null, description_es: null },
    { id: "sector-media-radio", slug: "media-radio", order: 5, title_en: "Media & Radio", title_es: "Medios y Radio", description_en: null, description_es: null },
    { id: "sector-health", slug: "health", order: 6, title_en: "Health", title_es: "Salud", description_en: null, description_es: null },
    { id: "sector-tourism", slug: "tourism", order: 7, title_en: "Tourism", title_es: "Turismo", description_en: null, description_es: null },
    { id: "sector-service-companies", slug: "service-companies", order: 8, title_en: "Service Companies", title_es: "Empresas de Servicios", description_en: null, description_es: null },
    { id: "sector-retail", slug: "retail", order: 9, title_en: "Retail", title_es: "Retail", description_en: null, description_es: null },
    { id: "sector-corporate-tools", slug: "corporate-tools", order: 10, title_en: "Corporate Tools", title_es: "Herramientas Corporativas", description_en: null, description_es: null },
  ],
  differentiators: [
    {
      id: "diff-your-code",
      slug: "your-code",
      order: 1,
      title_en: "The code is yours",
      title_es: "El código es tuyo",
      description_en:
        "We deliver the full source code. You don't depend on us forever. You can take your system to any developer in the future without restrictions.",
      description_es:
        "Entregamos el código fuente completo. No dependes de nosotros para siempre. Puedes llevar tu sistema a cualquier desarrollador en el futuro sin restricciones.",
    },
    {
      id: "diff-no-commissions",
      slug: "no-commissions",
      order: 2,
      title_en: "No commissions",
      title_es: "Sin comisiones",
      description_en:
        "We don't charge a percentage of your transactions or mandatory monthly licenses. You pay for the project, period. What you generate with your system is completely yours.",
      description_es:
        "No cobramos porcentaje de tus transacciones ni licencias mensuales obligatorias. Pagas el proyecto, punto. Lo que generas con tu sistema es completamente tuyo.",
    },
    {
      id: "diff-ai-accelerated",
      slug: "ai-accelerated",
      order: 3,
      title_en: "AI-accelerated development",
      title_es: "Desarrollo acelerado con IA",
      description_en:
        "We use AI-assisted development tools to deliver faster without sacrificing technical quality or scalability. More speed, same architectural soundness.",
      description_es:
        "Usamos herramientas de desarrollo asistido por IA para entregar más rápido sin sacrificar calidad técnica ni escalabilidad. Más velocidad, misma solidez arquitectónica.",
    },
    {
      id: "diff-dedicated-team",
      slug: "dedicated-team",
      order: 4,
      title_en: "Dedicated team",
      title_es: "Equipo dedicado",
      description_en:
        "5 developers working on real projects, with delivery processes proven across 30+ systems. We don't subcontract or outsource your project.",
      description_es:
        "5 desarrolladores trabajando en proyectos reales, con procesos de entrega probados en más de 30 sistemas. No subcontratamos ni externalizamos tu proyecto.",
    },
  ],
  portfolio: [],
  callsToAction: [],
  seo: [
    {
      id: "seo-main",
      page: "home",
      metaTitle_en: "Software Development Company in Panama | Pime Panamá",
      metaTitle_es: "Empresa de Desarrollo de Software en Panama | Pime Panamá",
      metaDescription_en:
        "Software development company in Panama. We build SaaS platforms, CRM, CMS and automation systems for businesses across Panama, Latin America and beyond.",
      metaDescription_es:
        "Empresa de desarrollo de software en Panama. Construimos plataformas SaaS, CRM, CMS y sistemas de automatización para empresas en Panama, Latinoamérica y el mundo.",
      ogImageUrl: null,
    },
  ],
};
