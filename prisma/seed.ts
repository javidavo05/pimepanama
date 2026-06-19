import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// DEPRECATED: industrial-era content. Use `npm run db:setup-supabase` or
// `npm run db:update-content` instead. Kept for reference only.

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_SEED_EMAIL ?? "founder@pimepanama.com";
  const rawPassword = process.env.ADMIN_SEED_PASSWORD ?? "ChangeMe123!";
  const passwordHash = await bcrypt.hash(rawPassword, 12);

  await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: { passwordHash },
    create: {
      id: "admin-owner",
      email: adminEmail,
      passwordHash,
      role: "OWNER",
    },
  });

  await prisma.hero.upsert({
    where: { id: "hero-main" },
    update: {
      headline_en: "Experts in Comprehensive Engineering and Industrial Supply Solutions",
      headline_es: "Expertos en Soluciones Integrales de Ingeniería y Suministros Industriales",
      subheadline_en:
        "Leaders across Panama and Latin America in specialized consulting, world-class equipment sourcing, and turnkey project management with international standards. We transform industrial challenges into sustainable competitive advantages.",
      subheadline_es:
        "Líderes en Panamá y Latinoamérica en consultoría especializada, suministro de equipos de alta gama y gestión de proyectos con estándares internacionales. Transformamos desafíos industriales en ventajas competitivas sostenibles.",
      highlight_en: "Trusted by global leaders: Maersk, Svitzer, Seventh-day Adventist Church, and more.",
      highlight_es: "Confianza de líderes globales: Maersk, Svitzer, Iglesia Adventista del Séptimo Día y más.",
      ctaPrimaryLabel_en: "Request Free Technical Assessment",
      ctaPrimaryLabel_es: "Solicite Evaluación Gratuita",
      ctaPrimaryLink: "#contact",
      ctaSecondaryLabel_en: "Download Success Portfolio",
      ctaSecondaryLabel_es: "Descargue Nuestro Portafolio",
      ctaSecondaryLink: "#portfolio",
    },
    create: {
      id: "hero-main",
      headline_en: "Experts in Comprehensive Engineering and Industrial Supply Solutions",
      headline_es: "Expertos en Soluciones Integrales de Ingeniería y Suministros Industriales",
      subheadline_en:
        "Leaders across Panama and Latin America in specialized consulting, world-class equipment sourcing, and turnkey project management with international standards. We transform industrial challenges into sustainable competitive advantages.",
      subheadline_es:
        "Líderes en Panamá y Latinoamérica en consultoría especializada, suministro de equipos de alta gama y gestión de proyectos con estándares internacionales. Transformamos desafíos industriales en ventajas competitivas sostenibles.",
      highlight_en: "Trusted by global leaders: Maersk, Svitzer, Seventh-day Adventist Church, and more.",
      highlight_es: "Confianza de líderes globales: Maersk, Svitzer, Iglesia Adventista del Séptimo Día y más.",
      ctaPrimaryLabel_en: "Request Free Technical Assessment",
      ctaPrimaryLabel_es: "Solicite Evaluación Gratuita",
      ctaPrimaryLink: "#contact",
      ctaSecondaryLabel_en: "Download Success Portfolio",
      ctaSecondaryLabel_es: "Descargue Nuestro Portafolio",
      ctaSecondaryLink: "#portfolio",
    },
  });

  const sections = [
    {
      slug: "services",
      title_en: "Professional Services",
      title_es: "Servicios Profesionalizados",
      subtitle_en: "Comprehensive engineering expertise for complex industrial operations.",
      subtitle_es: "Experiencia integral en ingeniería para operaciones industriales complejas.",
    },
    {
      slug: "value",
      title_en: "Corporate Value Proposition",
      title_es: "Propuesta de Valor Corporativa",
      body_en:
        "At PIME Panama, we merge technological innovation with local knowledge to deliver scalable solutions tailored to industrial, energy, and infrastructure sectors. Our strategic alliance network with leading manufacturers enables us to respond with agility to the most demanding requirements in the Latin American market.",
      body_es:
        "En PIME Panama, fusionamos innovación tecnológica con conocimiento local para ofrecer soluciones escalables adaptadas a sectores industriales, energéticos y de infraestructura. Nuestra red de alianzas estratégicas con fabricantes líderes nos permite responder con agilidad a los requerimientos más exigentes del mercado latinoamericano.",
    },
    {
      slug: "sectors",
      title_en: "Sectors of Specialization",
      title_es: "Sectores de Especialización",
      subtitle_en: "Proven track record across critical industries and large-scale infrastructure.",
      subtitle_es: "Trayectoria comprobada en industrias críticas e infraestructura de gran escala.",
    },
    {
      slug: "differentials",
      title_en: "Competitive Differentiators",
      title_es: "Diferenciales Competitivos",
      subtitle_en: "Excellence from strategy to lifecycle support.",
      subtitle_es: "Excelencia desde la estrategia hasta el soporte de ciclo de vida.",
    },
    {
      slug: "portfolio",
      title_en: "Success Cases",
      title_es: "Casos de Éxito",
      subtitle_en: "Proven solutions powering operations for multinational corporations.",
      subtitle_es: "Soluciones probadas impulsando operaciones de corporaciones multinacionales.",
    },
    {
      slug: "cta",
      title_en: "Partner With Us",
      title_es: "Conecte con Nosotros",
      subtitle_en: "Let's transform your industrial challenges into competitive advantages.",
      subtitle_es: "Transformemos sus desafíos industriales en ventajas competitivas.",
    },
  ];

  for (const section of sections) {
    await prisma.pageSection.upsert({
      where: { slug: section.slug },
      update: section,
      create: {
        id: `section-${section.slug}`,
        ...section,
      },
    });
  }

  const services = [
    {
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
  ];

  for (const service of services) {
    await prisma.service.upsert({
      where: { slug: service.slug },
      update: service,
      create: {
        id: `service-${service.slug}`,
        ...service,
      },
    });
  }

  const sectors = [
    {
      slug: "energy-hydrocarbons",
      order: 1,
      title_en: "Energy and Hydrocarbons",
      title_es: "Energía y Hidrocarburos",
      description_en: "Power generation plants, refineries, and distribution networks.",
      description_es: "Plantas de generación, refinerías y redes de distribución.",
    },
    {
      slug: "civil-infrastructure",
      order: 2,
      title_en: "Civil Infrastructure",
      title_es: "Infraestructura Civil",
      description_en: "Ports, airports, and urbanization projects.",
      description_es: "Puertos, aeropuertos y obras de urbanización.",
    },
    {
      slug: "manufacturing",
      order: 3,
      title_en: "Manufacturing Industry",
      title_es: "Industria Manufacturera",
      description_en: "Process automation and production chain optimization.",
      description_es: "Automatización de procesos y optimización de cadenas productivas.",
    },
    {
      slug: "telecommunications",
      order: 4,
      title_en: "Telecommunications",
      title_es: "Telecomunicaciones",
      description_en: "Passive infrastructure and support systems.",
      description_es: "Infraestructura pasiva y sistemas de soporte.",
    },
  ];

  for (const sector of sectors) {
    await prisma.sector.upsert({
      where: { slug: sector.slug },
      update: sector,
      create: {
        id: `sector-${sector.slug}`,
        ...sector,
      },
    });
  }

  const differentiators = [
    {
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
      slug: "international-certifications",
      order: 3,
      title_en: "International Certifications",
      title_es: "Certificaciones Internacionales",
      description_en: "Compliance with ASME, ASTM, ISO, and ANSI standards.",
      description_es: "Cumplimiento de estándares ASME, ASTM, ISO y ANSI.",
    },
  ];

  for (const diff of differentiators) {
    await prisma.differentiator.upsert({
      where: { slug: diff.slug },
      update: diff,
      create: {
        id: `diff-${diff.slug}`,
        ...diff,
      },
    });
  }

  const portfolio = [
    {
      slug: "maersk-logistics",
      order: 1,
      title_en: "Maersk - Logistics Infrastructure",
      title_es: "Maersk - Infraestructura Logística",
      summary_en:
        "Comprehensive supply and maintenance solutions for port operations and logistics facilities across Panama. Delivered critical equipment and ongoing technical support for one of the world's largest shipping companies.",
      summary_es:
        "Soluciones integrales de suministro y mantenimiento para operaciones portuarias e instalaciones logísticas en Panamá. Entrega de equipos críticos y soporte técnico continuo para una de las compañías navieras más grandes del mundo.",
      outcome_en:
        "Reduced equipment downtime by 40% and improved operational efficiency through predictive maintenance programs.",
      outcome_es:
        "Reducción del 40% en tiempos de inactividad de equipos y mejora en eficiencia operativa mediante programas de mantenimiento predictivo.",
      clientName: "Maersk",
      industry_en: "Maritime Logistics",
      industry_es: "Logística Marítima",
      imageUrl: null,
      caseStudyUrl: null,
    },
    {
      slug: "svitzer-marine",
      order: 2,
      title_en: "Svitzer - Marine Operations",
      title_es: "Svitzer - Operaciones Marítimas",
      summary_en:
        "Specialized engineering consulting and equipment supply for tugboat fleet operations. Provided precision components and technical advisory for vessel maintenance and optimization.",
      summary_es:
        "Consultoría especializada en ingeniería y suministro de equipos para operaciones de flota de remolcadores. Provisión de componentes de precisión y asesoría técnica para mantenimiento y optimización de embarcaciones.",
      outcome_en:
        "Enhanced fleet reliability and extended vessel lifecycle through strategic maintenance planning.",
      outcome_es:
        "Mejora en confiabilidad de la flota y extensión del ciclo de vida de embarcaciones mediante planificación estratégica de mantenimiento.",
      clientName: "Svitzer",
      industry_en: "Marine Services",
      industry_es: "Servicios Marítimos",
      imageUrl: null,
      caseStudyUrl: null,
    },
    {
      slug: "adventist-church",
      order: 3,
      title_en: "Seventh-day Adventist Church - Facility Infrastructure",
      title_es: "Iglesia Adventista - Infraestructura de Instalaciones",
      summary_en:
        "Turnkey project management for institutional facilities including electrical systems, HVAC, and building infrastructure. Delivered comprehensive engineering solutions for educational and administrative complexes.",
      summary_es:
        "Gestión de proyectos llave en mano para instalaciones institucionales incluyendo sistemas eléctricos, HVAC e infraestructura edilicia. Entrega de soluciones integrales de ingeniería para complejos educativos y administrativos.",
      outcome_en:
        "Completed multiple facility upgrades on time and within budget, improving energy efficiency by 35%.",
      outcome_es:
        "Completadas múltiples mejoras de instalaciones a tiempo y dentro del presupuesto, mejorando eficiencia energética en 35%.",
      clientName: "Seventh-day Adventist Church",
      industry_en: "Institutional Infrastructure",
      industry_es: "Infraestructura Institucional",
      imageUrl: null,
      caseStudyUrl: null,
    },
    {
      slug: "energy-sector",
      order: 4,
      title_en: "Regional Energy Provider - Distribution Network",
      title_es: "Proveedor Energético Regional - Red de Distribución",
      summary_en:
        "Supply of high-voltage electrical equipment and materials for power distribution infrastructure. Provided technical specifications compliance and quality assurance for critical grid components.",
      summary_es:
        "Suministro de equipos y materiales eléctricos de alta tensión para infraestructura de distribución eléctrica. Provisión de cumplimiento de especificaciones técnicas y aseguramiento de calidad para componentes críticos de la red.",
      outcome_en:
        "Enabled grid expansion serving 50,000+ new connections with 99.8% uptime reliability.",
      outcome_es:
        "Habilitada expansión de red sirviendo 50,000+ nuevas conexiones con 99.8% de confiabilidad operativa.",
      clientName: "Confidential",
      industry_en: "Energy Distribution",
      industry_es: "Distribución Energética",
      imageUrl: null,
      caseStudyUrl: null,
    },
    {
      slug: "manufacturing-automation",
      order: 5,
      title_en: "Manufacturing Plant - Process Automation",
      title_es: "Planta Manufacturera - Automatización de Procesos",
      summary_en:
        "Implementation of industrial automation systems and control equipment for production line optimization. Integrated sensors, PLCs, and monitoring systems for real-time process control.",
      summary_es:
        "Implementación de sistemas de automatización industrial y equipos de control para optimización de líneas de producción. Integración de sensores, PLCs y sistemas de monitoreo para control de procesos en tiempo real.",
      outcome_en:
        "Increased production throughput by 28% while reducing defect rates and operational costs.",
      outcome_es:
        "Incremento del 28% en capacidad de producción mientras se reducen tasas de defectos y costos operativos.",
      clientName: "Confidential",
      industry_en: "Manufacturing",
      industry_es: "Manufactura",
      imageUrl: null,
      caseStudyUrl: null,
    },
    {
      slug: "port-infrastructure",
      order: 6,
      title_en: "Port Authority - Infrastructure Modernization",
      title_es: "Autoridad Portuaria - Modernización de Infraestructura",
      summary_en:
        "Comprehensive engineering consulting and equipment procurement for port facility upgrades. Coordinated international suppliers for specialized maritime equipment and structural components.",
      summary_es:
        "Consultoría integral en ingeniería y procura de equipos para mejoras de instalaciones portuarias. Coordinación de proveedores internacionales para equipos marítimos especializados y componentes estructurales.",
      outcome_en:
        "Modernized cargo handling capacity by 45% and reduced vessel turnaround time.",
      outcome_es:
        "Modernizada capacidad de manejo de carga en 45% y reducido tiempo de rotación de embarcaciones.",
      clientName: "Confidential",
      industry_en: "Port Operations",
      industry_es: "Operaciones Portuarias",
      imageUrl: null,
      caseStudyUrl: null,
    },
  ];

  for (const item of portfolio) {
    await prisma.portfolioItem.upsert({
      where: { slug: item.slug },
      update: item,
      create: {
        id: `portfolio-${item.slug}`,
        ...item,
      },
    });
  }

  const ctas = [
    {
      slug: "free-assessment",
      order: 1,
      eyebrow_en: "No Commitment Required",
      eyebrow_es: "Sin Compromiso",
      title_en: "Request a Free Technical Assessment",
      title_es: "Solicite una Evaluación Gratuita de sus Necesidades Técnicas",
      description_en:
        "Our engineering experts will analyze your requirements and provide tailored recommendations.",
      description_es:
        "Nuestros expertos en ingeniería analizarán sus requerimientos y proveerán recomendaciones personalizadas.",
      buttonLabel_en: "Get Free Assessment",
      buttonLabel_es: "Obtener Evaluación Gratuita",
      buttonLink: "#contact",
    },
    {
      slug: "portfolio-download",
      order: 2,
      eyebrow_en: "Success Stories",
      eyebrow_es: "Casos de Éxito",
      title_en: "Download Our Portfolio of Success Cases",
      title_es: "Descargue Nuestro Portafolio de Casos de Éxito",
      description_en:
        "Explore detailed case studies of projects delivered for multinational corporations.",
      description_es:
        "Explore estudios detallados de proyectos entregados para corporaciones multinacionales.",
      buttonLabel_en: "Download Portfolio",
      buttonLabel_es: "Descargar Portafolio",
      buttonLink: "#portfolio",
    },
    {
      slug: "quick-quote",
      order: 3,
      eyebrow_en: "Fast Response",
      eyebrow_es: "Respuesta Rápida",
      title_en: "Get a Personalized Quote in 24 Hours",
      title_es: "Contáctenos para Cotizaciones Personalizadas en 24 Horas",
      description_en:
        "Share your project requirements and receive a detailed proposal within one business day.",
      description_es:
        "Comparta los requerimientos de su proyecto y reciba una propuesta detallada en un día hábil.",
      buttonLabel_en: "Request Quote",
      buttonLabel_es: "Solicitar Cotización",
      buttonLink: "#contact",
    },
  ];

  for (const cta of ctas) {
    await prisma.callToAction.upsert({
      where: { slug: cta.slug },
      update: cta,
      create: {
        id: `cta-${cta.slug}`,
        ...cta,
      },
    });
  }

  await prisma.seoSetting.upsert({
    where: { page: "home" },
    update: {
      metaTitle_en: "PIME Panama - Engineering Consulting & Industrial Equipment Supply",
      metaTitle_es: "PIME Panama - Consultoría en Ingeniería y Suministro Industrial",
      metaDescription_en:
        "PIME Panama - Engineering consulting and industrial equipment supply. We manage projects with ISO methodologies and turnkey solutions for the energy and industrial sectors. Trusted by Maersk, Svitzer, and more. Request a quote today.",
      metaDescription_es:
        "PIME Panama - Consultoría en ingeniería y suministro de equipos industriales. Gestionamos proyectos con metodologías ISO y soluciones llave en mano para el sector energético e industrial. Confianza de Maersk, Svitzer y más. Cotice hoy mismo.",
    },
    create: {
      id: "seo-main",
      page: "home",
      metaTitle_en: "PIME Panama - Engineering Consulting & Industrial Equipment Supply",
      metaTitle_es: "PIME Panama - Consultoría en Ingeniería y Suministro Industrial",
      metaDescription_en:
        "PIME Panama - Engineering consulting and industrial equipment supply. We manage projects with ISO methodologies and turnkey solutions for the energy and industrial sectors. Trusted by Maersk, Svitzer, and more. Request a quote today.",
      metaDescription_es:
        "PIME Panama - Consultoría en ingeniería y suministro de equipos industriales. Gestionamos proyectos con metodologías ISO y soluciones llave en mano para el sector energético e industrial. Confianza de Maersk, Svitzer y más. Cotice hoy mismo.",
    },
  });

  console.log("✅ Database seeded successfully with updated PIME Panama content!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
