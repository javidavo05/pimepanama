// Static fallback content when database is not available
export const staticContent = {
  hero: {
    id: "hero-main",
    headline_en: "Experts in Comprehensive Engineering and Industrial Supply Solutions",
    headline_es: "Expertos en Soluciones Integrales de Ingeniería y Suministros Industriales",
    subheadline_en:
      "Leaders across Panama and Latin America in specialized consulting, world-class equipment sourcing, and turnkey project management with international standards. We transform industrial challenges into sustainable competitive advantages.",
    subheadline_es:
      "Líderes en Panamá y Latinoamérica en consultoría especializada, suministro de equipos de alta gama y gestión de proyectos con estándares internacionales. Transformamos desafíos industriales en ventajas competitivas sostenibles.",
    highlight_en: "Trusted by global leaders: Maersk, Svitzer, Seventh-day Adventist Church, and more.",
    highlight_es: "Confianza de líderes globales: Maersk, Svitzer, Iglesia Adventista del Séptimo Día y más.",
    backgroundImageUrl: null,
    backgroundVideoUrl: null,
    ctaPrimaryLabel_en: "Request Free Technical Assessment",
    ctaPrimaryLabel_es: "Solicite Evaluación Gratuita",
    ctaPrimaryLink: "#contact",
    ctaSecondaryLabel_en: "Download Success Portfolio",
    ctaSecondaryLabel_es: "Descargue Nuestro Portafolio",
    ctaSecondaryLink: "#contact",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  sections: [
    {
      id: "section-services",
      slug: "services",
      title_en: "Professional Services",
      title_es: "Servicios Profesionalizados",
      subtitle_en: "Comprehensive engineering expertise for complex industrial operations.",
      subtitle_es: "Experiencia integral en ingeniería para operaciones industriales complejas.",
      body_en: null,
      body_es: null,
    },
    {
      id: "section-value",
      slug: "value",
      title_en: "Corporate Value Proposition",
      title_es: "Propuesta de Valor Corporativa",
      subtitle_en: null,
      subtitle_es: null,
      body_en:
        "At PIME Panama, we merge technological innovation with local knowledge to deliver scalable solutions tailored to industrial, energy, and infrastructure sectors. Our strategic alliance network with leading manufacturers enables us to respond with agility to the most demanding requirements in the Latin American market.",
      body_es:
        "En PIME Panama, fusionamos innovación tecnológica con conocimiento local para ofrecer soluciones escalables adaptadas a sectores industriales, energéticos y de infraestructura. Nuestra red de alianzas estratégicas con fabricantes líderes nos permite responder con agilidad a los requerimientos más exigentes del mercado latinoamericano.",
    },
    {
      id: "section-sectors",
      slug: "sectors",
      title_en: "Sectors of Specialization",
      title_es: "Sectores de Especialización",
      subtitle_en: "Proven track record across critical industries and large-scale infrastructure.",
      subtitle_es: "Trayectoria comprobada en industrias críticas e infraestructura de gran escala.",
      body_en: null,
      body_es: null,
    },
    {
      id: "section-differentials",
      slug: "differentials",
      title_en: "Competitive Differentiators",
      title_es: "Diferenciales Competitivos",
      subtitle_en: "Excellence from strategy to lifecycle support.",
      subtitle_es: "Excelencia desde la estrategia hasta el soporte de ciclo de vida.",
      body_en: null,
      body_es: null,
    },
  ],
  services: [
    {
      id: "service-strategic-consulting",
      slug: "strategic-consulting",
      order: 1,
      title_en: "Strategic Engineering Consulting",
      title_es: "Consultoría Estratégica en Ingeniería",
      description_en:
        "Specialized technical advisory to optimize industrial and construction processes. We develop feasibility studies, strategic planning, and technical audits using internationally recognized methodologies, ensuring efficiency and profitability in every project.",
      description_es:
        "Asesoría técnica especializada para optimizar procesos industriales y de construcción. Desarrollamos estudios de viabilidad, planificación estratégica y auditorías técnicas con metodologías avaladas por normas internacionales, garantizando eficiencia y rentabilidad en cada proyecto.",
      icon: "mdi:strategy",
    },
    {
      id: "service-equipment-supply",
      slug: "equipment-supply",
      order: 2,
      title_en: "Premium Equipment and Materials Supply",
      title_es: "Suministro de Equipos y Materiales de Alta Gama",
      description_en:
        "We distribute industrial equipment, electrical materials, precision pipes and valves from global brands. We guarantee certified quality, timely delivery, and post-sale technical support to minimize downtime and maximize productivity.",
      description_es:
        "Distribuimos equipos industriales, materiales eléctricos, tuberías y válvulas de precisión de marcas globales. Garantizamos calidad certificada, entrega oportuna y soporte técnico postventa para minimizar tiempos de inactividad y maximizar productividad.",
      icon: "mdi:package-variant-closed",
    },
    {
      id: "service-turnkey-projects",
      slug: "turnkey-projects",
      order: 3,
      title_en: "Turnkey Project Management",
      title_es: "Gestión de Proyectos Llave en Mano",
      description_en:
        "We execute projects under 'Turnkey' schemes, integrating design, procurement, and construction. We ensure compliance with deadlines, budgets, and technical specifications, backed by a multidisciplinary team with international experience.",
      description_es:
        "Ejecutamos proyectos bajo esquemas 'Turnkey', integrando diseño, procura y construcción. Aseguramos cumplimiento de plazos, presupuestos y especificaciones técnicas, respaldados por un equipo multidisciplinario con experiencia internacional.",
      icon: "mdi:key-variant",
    },
    {
      id: "service-maintenance-solutions",
      slug: "maintenance-solutions",
      order: 4,
      title_en: "Predictive and Corrective Maintenance Solutions",
      title_es: "Soluciones de Mantenimiento Predictivo y Correctivo",
      description_en:
        "We implement advanced maintenance programs to extend the lifespan of critical assets. We combine monitoring technologies with proactive protocols to reduce operating costs and prevent failures.",
      description_es:
        "Implementamos programas de mantenimiento avanzado para prolongar la vida útil de activos críticos. Combinamos tecnologías de monitoreo con protocolos proactivos para reducir costos operativos y prevenir fallas.",
      icon: "mdi:tools",
    },
  ],
  sectors: [
    {
      id: "sector-energy-hydrocarbons",
      slug: "energy-hydrocarbons",
      order: 1,
      title_en: "Energy and Hydrocarbons",
      title_es: "Energía y Hidrocarburos",
      description_en: "Power generation plants, refineries, and distribution networks.",
      description_es: "Plantas de generación, refinerías y redes de distribución.",
    },
    {
      id: "sector-civil-infrastructure",
      slug: "civil-infrastructure",
      order: 2,
      title_en: "Civil Infrastructure",
      title_es: "Infraestructura Civil",
      description_en: "Ports, airports, and urbanization projects.",
      description_es: "Puertos, aeropuertos y obras de urbanización.",
    },
    {
      id: "sector-manufacturing",
      slug: "manufacturing",
      order: 3,
      title_en: "Manufacturing Industry",
      title_es: "Industria Manufacturera",
      description_en: "Process automation and production chain optimization.",
      description_es: "Automatización de procesos y optimización de cadenas productivas.",
    },
    {
      id: "sector-telecommunications",
      slug: "telecommunications",
      order: 4,
      title_en: "Telecommunications",
      title_es: "Telecomunicaciones",
      description_en: "Passive infrastructure and support systems.",
      description_es: "Infraestructura pasiva y sistemas de soporte.",
    },
  ],
  differentiators: [
    {
      id: "diff-global-logistics",
      slug: "global-logistics",
      order: 1,
      title_en: "Global Logistics",
      title_es: "Logística Global",
      description_en:
        "Optimized supply chain with coverage across Panama, the Caribbean, and Central America.",
      description_es:
        "Cadena de suministro optimizada con cobertura en Panamá, Caribe y Centroamérica.",
    },
    {
      id: "diff-sustainability",
      slug: "sustainability",
      order: 2,
      title_en: "Sustainability",
      title_es: "Sostenibilidad",
      description_en:
        "Integration of eco-efficient practices and circular economy principles in all projects.",
      description_es:
        "Integración de prácticas ecoeficientes y economía circular en todos los proyectos.",
    },
    {
      id: "diff-international-certifications",
      slug: "international-certifications",
      order: 3,
      title_en: "International Certifications",
      title_es: "Certificaciones Internacionales",
      description_en: "Compliance with ASME, ASTM, ISO, and ANSI standards.",
      description_es: "Cumplimiento de estándares ASME, ASTM, ISO y ANSI.",
    },
  ],
  portfolio: [],
  callsToAction: [],
  seo: [
    {
      id: "seo-main",
      page: "home",
      metaTitle_en: "PIME Panama - Engineering Consulting & Industrial Equipment Supply",
      metaTitle_es: "PIME Panama - Consultoría en Ingeniería y Suministro Industrial",
      metaDescription_en:
        "PIME Panama - Engineering consulting and industrial equipment supply. We manage projects with ISO methodologies and turnkey solutions for the energy and industrial sectors. Trusted by Maersk, Svitzer, and more. Request a quote today.",
      metaDescription_es:
        "PIME Panama - Consultoría en ingeniería y suministro de equipos industriales. Gestionamos proyectos con metodologías ISO y soluciones llave en mano para el sector energético e industrial. Confianza de Maersk, Svitzer y más. Cotice hoy mismo.",
      ogImageUrl: null,
    },
  ],
};

