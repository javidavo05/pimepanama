export type Lang = "en" | "es";

export const content = {
  en: {
    hero: {
      eyebrow: "Panama City, Panama  ·  Available for Corporate Opportunities",
      name: "Javier Vallejo",
      title: "CEO  ·  Senior Software Developer  ·  Technology Solutions Architect",
      tagline:
        "Building scalable web platforms, SaaS products, and automation tools that help organizations move faster and grow with technology.",
      ctaView: "View Projects",
      ctaDownload: "Download as PDF",
      stats: [
        { value: "8+", label: "Production Systems" },
        { value: "$1.1M+", label: "Software Delivered" },
        { value: "5+", label: "Payment Gateways" },
        { value: "53K+", label: "TypeScript Files" },
      ],
    },
    summary: {
      sectionLabel: "Executive Summary",
      heading: "Strategic technologist. Founder-level executor.",
      p1: "Javier Vallejo is the CEO and Lead Developer of PIME Panama, an independent software consultancy responsible for 8+ enterprise-grade SaaS platforms serving organizations across Panama and Latin America.",
      p2: "Over the past 5 years, Javier has led the end-to-end delivery of systems that collectively represent over $1.1M in software value — including national transport ticketing, church management, sports CRMs, real estate marketplaces, and multi-tenant wedding platforms.",
      p3: "Beyond writing code, Javier manages client relationships, defines product roadmaps, runs a team of 5 developers, and leads every critical architectural decision in the systems he builds. He integrates AI tools into his daily workflow to achieve 3–5× development velocity on scoped tasks.",
      p4: "Bilingual in English and Spanish. Available for corporate technology leadership, senior software development roles, and strategic digital transformation projects.",
      tags: [
        "Software Architecture",
        "Full-Stack Dev",
        "Product Strategy",
        "Team Leadership",
        "AI Dev",
        "Business Strategy",
        "SaaS Platforms",
        "Digital Transformation",
      ],
    },
    stats: {
      systems: { label: "Production Systems", sublabel: "Built for real clients" },
      mrr: { label: "Software Delivered", sublabel: "USD across all projects" },
      gateways: { label: "Payment Gateways", sublabel: "Stripe, Yappy, PagueloFacil…" },
      files: { label: "TypeScript Files", sublabel: "Across all codebases" },
    },
    valueProp: {
      sectionLabel: "Core Value",
      heading: "Where Business Strategy Meets Software Execution",
      subheading:
        "The value isn't just writing code — it's understanding the business context, making the right architectural choices, and delivering systems that keep working as the organization scales.",
      cards: [
        {
          title: "Full-Stack Mastery",
          description:
            "TypeScript from database schema to UI component — zero context-switching between layers. Complete ownership of the stack means faster delivery and fewer integration surprises.",
        },
        {
          title: "Multi-Tenant SaaS",
          description:
            "Row-Level Security enforced, domain-isolated multi-tenant architectures that scale from a single client to hundreds without re-architecture. Built this way from the start.",
        },
        {
          title: "Payment Integrations",
          description:
            "5+ payment gateways in production: Stripe, Yappy, PagueloFacil, Tilopay, and Banco General. Knows the edge cases, failure modes, and reconciliation patterns for each.",
        },
        {
          title: "Bilingual Delivery",
          description:
            "Native Spanish, fluent English — client communication, technical documentation, product demos, and stakeholder presentations delivered clearly in both languages.",
        },
        {
          title: "Offline-First PWA",
          description:
            "Service workers, IndexedDB, and Serwist for true offline capability. From QR ticket scanners to field data collection — if the network drops, the product keeps working.",
        },
        {
          title: "Rapid Iteration",
          description:
            "Eight production platforms shipped in three years. Tight feedback loops, clear scoping, and AI-accelerated development cycles mean concepts reach production faster without shortcuts.",
        },
      ],
    },
    projects: {
      sectionLabel: "Selected Work",
      heading: "8 Enterprise Systems in Production",
      disclaimer:
        "The following represents a selection of active systems. These are a small part of a broader portfolio of 30+ digital products delivered across Panama and the region.",
      viewSystem: "View System",
      liveDemo: "Open Live Demo",
      previewBadge: "Interactive Preview",
    },
    print: {
      summary: "Professional Summary",
      metrics: "Key Metrics",
      competencies: "Core Competencies",
      experience: "Professional Experience",
      projects: "Selected Projects",
      skills: "Technical Skills",
      education: "Education",
      languages: "Languages",
      languagesList: "Spanish (Native) · English (Fluent)",
      demoNote: "Live interactive demo available at",
      generated: "Full interactive portfolio",
    },
    tech: {
      sectionLabel: "Technical Expertise",
      heading: "Full-Spectrum Technical Skills",
      groups: [
        { title: "Frontend", skills: ["Next.js 15", "React 19", "TypeScript", "Tailwind CSS", "Admin Dashboards", "Landing Pages", "UI/UX Implementation", "Responsive Design"] },
        { title: "Backend & Data", skills: ["Supabase", "PostgreSQL", "Prisma ORM", "Drizzle ORM", "API Routes", "Authentication", "RBAC + RLS", "Database Modeling", "Cron Jobs", "Serverless"] },
        { title: "Cloud & Integrations", skills: ["Vercel", "Cloudflare R2", "AWS S3", "Brevo", "Payment Gateways", "WhatsApp API", "PDF Generation", "Third-Party Sync"] },
        { title: "AI & Tooling", skills: ["Claude API", "GPT-4 Integration", "Prompt Engineering", "AI Dev Acceleration", "Turborepo", "pnpm Workspaces", "Vitest", "Playwright E2E"] },
        { title: "Creative", skills: ["Adobe Photoshop", "Adobe Illustrator", "Adobe After Effects", "Brand Identity", "Video Production", "Motion Graphics"] },
        { title: "Business", skills: ["Product Roadmapping", "Proposal Writing", "Investor Presentations", "Business Planning", "MBA E-commerce (ENEB)", "Client Strategy"] },
      ],
    },
    ai: {
      sectionLabel: "AI-Accelerated Development",
      heading: "Building with AI\nat the Core",
      p1: "Javier integrates AI-assisted development workflows into his engineering process to accelerate delivery, improve debugging, structure technical plans, generate documentation, and increase overall development efficiency.",
      p2: "His approach combines senior-level technical judgment with modern AI tools — using Claude, GPT-4, and purpose-built prompts to move from concept to production faster while maintaining clarity, scalability, and business alignment. AI is the accelerator; engineering judgment is the driver.",
      p3: "Every PIME Panama system delivered in 2024 incorporated AI tooling at some level — from AI-driven features inside the product to AI-assisted architecture planning and code review during development.",
      quote: "\"AI doesn't replace senior engineering judgment — it amplifies it. The difference is knowing which problems to hand off and which ones to own.\"",
      quoteAttrib: "— Javier Vallejo",
      cards: [
        { title: "Claude API", desc: "Integrated in production for content generation, data classification, and review workflows." },
        { title: "GPT-4 Integration", desc: "Used for code review assistance, documentation generation, and smart search features." },
        { title: "AI in Products", desc: "AI features delivered as product requirements, not afterthoughts — in 2024 systems." },
        { title: "Prompt Engineering", desc: "Structured prompt design for reliable, testable, and maintainable AI outputs." },
        { title: "LLM Cost Control", desc: "Token optimization and output caching strategies for cost-effective production AI." },
        { title: "Dev Acceleration", desc: "3–5× velocity increase on scoped tasks using AI pair programming as a force multiplier." },
      ],
    },
    experience: {
      sectionLabel: "Experience",
      heading: "Career Timeline",
      entries: [
        {
          period: "2022 — Present",
          role: "Founder, CEO & Lead Developer",
          company: "PIME Panama",
          description: "Founded and leads an independent software consultancy delivering 8+ enterprise SaaS platforms across Panama and Latin America. Manages a team of 5 developers, client relationships, product roadmaps, and end-to-end delivery of business-critical systems representing $1.1M+ in software value.",
          highlight: "$1.1M+ in delivered software",
        },
        {
          period: "2019 — 2021",
          role: "General Manager",
          company: "Ultracinemas",
          description: "Managed a $500K+ movie theater investment project including full remodeling, staff hiring, permits, equipment procurement, investor presentations, and business planning from concept to opening.",
          highlight: "$500K+ investment managed",
        },
        {
          period: "2017 — 2019",
          role: "Lead Video Producer, Graphic Designer & IT Coordinator",
          company: "Sparks United",
          description: "Led creative production, commercial video projects, branding, campaign assets, and IT coordination for multiple clients — including the Panama Tourism Authority and major local brands.",
          highlight: null,
        },
        {
          period: "2023 — Present",
          role: "MBA in E-commerce",
          company: "ENEB — Escuela de Negocios Europea de Barcelona",
          description: "Business and e-commerce education complementing extensive entrepreneurial and technical experience. Focus on digital business strategy, e-commerce operations, and international business management.",
          highlight: null,
        },
      ],
    },
    industries: {
      sectionLabel: "Industries Served",
      heading: "Cross-Industry Experience",
      subheading: "Delivered production software across a wide range of industries, with deep operational understanding of the domain problems each sector faces.",
      items: [
        { label: "Transportation & Logistics", primary: true },
        { label: "Events & Entertainment", primary: true },
        { label: "Churches & Non-profits", primary: true },
        { label: "Sports & Education", primary: true },
        { label: "Real Estate", primary: true },
        { label: "Hospitality & Weddings", primary: true },
        { label: "Business Intelligence", primary: true },
        { label: "Finance & Payments", primary: true },
        { label: "E-commerce", primary: false },
        { label: "Healthcare", primary: false },
        { label: "Media & Radio", primary: false },
        { label: "Corporate Internal Tools", primary: false },
      ],
    },
    contact: {
      sectionLabel: "Get in Touch",
      heading: "Let's build what's next.",
      description:
        "Open to corporate technology opportunities, senior software development roles, product leadership positions, digital transformation projects, and strategic technology collaborations.",
      downloadPdf: "Download as PDF",
      footer: "Javier Vallejo · PIME Panama",
      items: [
        { icon: "ph:envelope", label: "Email", value: "javier@pimepanama.com", href: "mailto:javier@pimepanama.com", external: false },
        { icon: "ph:linkedin-logo", label: "LinkedIn", value: "linkedin.com/in/javier-vallejo", href: "https://www.linkedin.com/in/javier-vallejo-502062240/", external: true },
        { icon: "ph:globe", label: "Website", value: "pimepanama.com", href: "https://pimepanama.com", external: true },
        { icon: "ph:whatsapp-logo", label: "WhatsApp", value: "+507 64 795 352", href: "https://wa.me/50764795352", external: true },
      ],
    },
  },

  es: {
    hero: {
      eyebrow: "Ciudad de Panamá, Panamá  ·  Disponible para Oportunidades Corporativas",
      name: "Javier Vallejo",
      title: "CEO  ·  Desarrollador de Software Senior  ·  Arquitecto de Soluciones Tecnológicas",
      tagline:
        "Construyendo plataformas web escalables, productos SaaS y herramientas de automatización que ayudan a las organizaciones a crecer más rápido con tecnología.",
      ctaView: "Ver Proyectos",
      ctaDownload: "Descargar como PDF",
      stats: [
        { value: "8+", label: "Sistemas en Producción" },
        { value: "$1.1M+", label: "Software Entregado" },
        { value: "5+", label: "Pasarelas de Pago" },
        { value: "53K+", label: "Archivos TypeScript" },
      ],
    },
    summary: {
      sectionLabel: "Resumen Ejecutivo",
      heading: "Estratega tecnológico. Ejecutor de nivel fundador.",
      p1: "Javier Vallejo es el CEO y Lead Developer de PIME Panama, una consultora de software independiente responsable de más de 8 plataformas SaaS de nivel empresarial que sirven a organizaciones en Panamá y América Latina.",
      p2: "En los últimos 5 años, Javier ha liderado la entrega integral de sistemas que representan colectivamente más de $1.1M en valor de software — incluyendo ticketing nacional de transporte, gestión de iglesias, CRMs deportivos, marketplaces inmobiliarios y plataformas de bodas multi-tenant.",
      p3: "Más allá de escribir código, Javier gestiona relaciones con clientes, define hojas de ruta de producto, dirige un equipo de 5 desarrolladores y lidera cada decisión arquitectónica crítica en los sistemas que construye. Integra herramientas de IA en su flujo de trabajo diario para lograr 3–5× de velocidad de desarrollo en tareas delimitadas.",
      p4: "Bilingüe en inglés y español. Disponible para liderazgo tecnológico corporativo, roles de desarrollo de software senior y proyectos estratégicos de transformación digital.",
      tags: [
        "Arquitectura de Software",
        "Full-Stack Dev",
        "Estrategia de Producto",
        "Liderazgo de Equipo",
        "Dev con IA",
        "Estrategia Empresarial",
        "Plataformas SaaS",
        "Transformación Digital",
      ],
    },
    stats: {
      systems: { label: "Sistemas en Producción", sublabel: "Construidos para clientes reales" },
      mrr: { label: "Software Entregado", sublabel: "USD en todos los proyectos" },
      gateways: { label: "Pasarelas de Pago", sublabel: "Stripe, Yappy, PagueloFacil…" },
      files: { label: "Archivos TypeScript", sublabel: "En todos los codebases" },
    },
    valueProp: {
      sectionLabel: "Propuesta de Valor",
      heading: "Donde la Estrategia Empresarial se Une a la Ejecución de Software",
      subheading:
        "El valor no es solo escribir código — es entender el contexto del negocio, tomar las decisiones arquitectónicas correctas y entregar sistemas que sigan funcionando conforme la organización escala.",
      cards: [
        {
          title: "Dominio Full-Stack",
          description:
            "TypeScript desde el esquema de base de datos hasta el componente de UI — cero cambios de contexto entre capas. La propiedad completa del stack significa entrega más rápida y menos sorpresas de integración.",
        },
        {
          title: "SaaS Multi-Tenant",
          description:
            "Arquitecturas multi-tenant con Row-Level Security aplicado y aislamiento por dominio, que escalan de un solo cliente a cientos sin re-arquitectura. Construidas así desde el inicio.",
        },
        {
          title: "Integraciones de Pago",
          description:
            "5+ pasarelas de pago en producción: Stripe, Yappy, PagueloFacil, Tilopay y Banco General. Conoce los casos límite, modos de fallo y patrones de reconciliación de cada una.",
        },
        {
          title: "Entrega Bilingüe",
          description:
            "Español nativo, inglés fluido — comunicación con clientes, documentación técnica, demos de producto y presentaciones a stakeholders entregadas con claridad en ambos idiomas.",
        },
        {
          title: "PWA Offline-First",
          description:
            "Service workers, IndexedDB y Serwist para capacidad offline real. Desde escáneres de tickets QR hasta recolección de datos en campo — si cae la red, el producto sigue funcionando.",
        },
        {
          title: "Iteración Rápida",
          description:
            "Ocho plataformas en producción entregadas en tres años. Ciclos de retroalimentación ajustados, alcances claros y ciclos de desarrollo acelerados por IA significan que los conceptos llegan a producción más rápido sin atajos.",
        },
      ],
    },
    projects: {
      sectionLabel: "Trabajo Seleccionado",
      heading: "8 Sistemas Empresariales en Producción",
      disclaimer:
        "Lo siguiente representa una selección de sistemas activos. Estos son una pequeña parte de un portafolio más amplio de 30+ productos digitales entregados en Panamá y la región.",
      viewSystem: "Ver Sistema",
      liveDemo: "Abrir Demo en Vivo",
      previewBadge: "Vista Previa Interactiva",
    },
    print: {
      summary: "Resumen Profesional",
      metrics: "Métricas Clave",
      competencies: "Competencias Clave",
      experience: "Experiencia Profesional",
      projects: "Proyectos Seleccionados",
      skills: "Habilidades Técnicas",
      education: "Educación",
      languages: "Idiomas",
      languagesList: "Español (Nativo) · Inglés (Fluido)",
      demoNote: "Demo interactiva disponible en",
      generated: "Portafolio interactivo completo",
    },
    tech: {
      sectionLabel: "Experiencia Técnica",
      heading: "Habilidades Técnicas de Amplio Espectro",
      groups: [
        { title: "Frontend", skills: ["Next.js 15", "React 19", "TypeScript", "Tailwind CSS", "Dashboards Admin", "Landing Pages", "Implementación UI/UX", "Diseño Responsivo"] },
        { title: "Backend & Datos", skills: ["Supabase", "PostgreSQL", "Prisma ORM", "Drizzle ORM", "API Routes", "Autenticación", "RBAC + RLS", "Modelado de BD", "Cron Jobs", "Serverless"] },
        { title: "Cloud & Integraciones", skills: ["Vercel", "Cloudflare R2", "AWS S3", "Brevo", "Pasarelas de Pago", "API de WhatsApp", "Generación de PDF", "Sincronización Externa"] },
        { title: "IA & Herramientas", skills: ["Claude API", "Integración GPT-4", "Ingeniería de Prompts", "Aceleración con IA", "Turborepo", "pnpm Workspaces", "Vitest", "Playwright E2E"] },
        { title: "Diseño Creativo", skills: ["Adobe Photoshop", "Adobe Illustrator", "Adobe After Effects", "Identidad de Marca", "Producción de Video", "Motion Graphics"] },
        { title: "Negocios", skills: ["Hoja de Ruta de Producto", "Escritura de Propuestas", "Presentaciones para Inversores", "Planificación Empresarial", "MBA E-commerce (ENEB)", "Estrategia con Clientes"] },
      ],
    },
    ai: {
      sectionLabel: "Desarrollo Acelerado por IA",
      heading: "Construyendo con IA\nen el Centro",
      p1: "Javier integra flujos de trabajo de desarrollo asistido por IA en su proceso de ingeniería para acelerar la entrega, mejorar la depuración, estructurar planes técnicos, generar documentación y aumentar la eficiencia de desarrollo en general.",
      p2: "Su enfoque combina el juicio técnico de nivel senior con herramientas modernas de IA — usando Claude, GPT-4 y prompts diseñados a propósito para pasar de concepto a producción más rápido, manteniendo claridad, escalabilidad y alineación con el negocio. La IA es el acelerador; el juicio de ingeniería es el conductor.",
      p3: "Cada sistema de PIME Panama entregado en 2024 incorporó herramientas de IA en algún nivel — desde características impulsadas por IA dentro del producto hasta planificación de arquitectura y revisión de código asistidas por IA durante el desarrollo.",
      quote: "\"La IA no reemplaza el juicio de ingeniería senior — lo amplifica. La diferencia está en saber qué problemas delegar y cuáles asumir.\"",
      quoteAttrib: "— Javier Vallejo",
      cards: [
        { title: "Claude API", desc: "Integrado en producción para generación de contenido, clasificación de datos y flujos de revisión." },
        { title: "Integración GPT-4", desc: "Usado para asistencia en revisión de código, generación de documentación y búsqueda inteligente." },
        { title: "IA en Productos", desc: "Características de IA entregadas como requisitos del producto, no como añadidos — en sistemas del 2024." },
        { title: "Ingeniería de Prompts", desc: "Diseño estructurado de prompts para salidas de IA confiables, testeables y mantenibles." },
        { title: "Control de Costos LLM", desc: "Optimización de tokens y estrategias de caché de salida para IA en producción rentable." },
        { title: "Aceleración de Dev", desc: "Aumento de velocidad 3–5× en tareas delimitadas usando programación en pareja con IA como multiplicador de fuerza." },
      ],
    },
    experience: {
      sectionLabel: "Experiencia",
      heading: "Trayectoria Profesional",
      entries: [
        {
          period: "2022 — Presente",
          role: "Fundador, CEO y Lead Developer",
          company: "PIME Panama",
          description: "Fundó y lidera una consultora de software independiente que entrega 8+ plataformas SaaS empresariales en Panamá y América Latina. Gestiona un equipo de 5 desarrolladores, relaciones con clientes, hojas de ruta de producto y entrega integral de sistemas de misión crítica que representan $1.1M+ en valor de software.",
          highlight: "$1.1M+ en software entregado",
        },
        {
          period: "2019 — 2021",
          role: "Gerente General",
          company: "Ultracinemas",
          description: "Gestionó un proyecto de inversión de $500K+ en un cine, incluyendo remodelación completa, contratación de personal, permisos, adquisición de equipos, presentaciones a inversores y planificación empresarial desde el concepto hasta la apertura.",
          highlight: "$500K+ de inversión gestionada",
        },
        {
          period: "2017 — 2019",
          role: "Productor de Video, Diseñador Gráfico y Coordinador de TI",
          company: "Sparks United",
          description: "Lideró la producción creativa, proyectos de video comercial, branding, activos de campaña y coordinación de TI para múltiples clientes — incluyendo la Autoridad de Turismo de Panamá y grandes marcas locales.",
          highlight: null,
        },
        {
          period: "2023 — Presente",
          role: "MBA en E-commerce",
          company: "ENEB — Escuela de Negocios Europea de Barcelona",
          description: "Educación en negocios y e-commerce que complementa la amplia experiencia emprendedora y técnica. Enfoque en estrategia de negocios digitales, operaciones de e-commerce y gestión empresarial internacional.",
          highlight: null,
        },
      ],
    },
    industries: {
      sectionLabel: "Industrias Atendidas",
      heading: "Experiencia Multisectorial",
      subheading: "Software en producción entregado en una amplia gama de industrias, con profundo entendimiento operativo de los problemas de dominio que enfrenta cada sector.",
      items: [
        { label: "Transporte y Logística", primary: true },
        { label: "Eventos y Entretenimiento", primary: true },
        { label: "Iglesias y Organizaciones sin Fines de Lucro", primary: true },
        { label: "Deportes y Educación", primary: true },
        { label: "Bienes Raíces", primary: true },
        { label: "Hospitalidad y Bodas", primary: true },
        { label: "Inteligencia de Negocios", primary: true },
        { label: "Finanzas y Pagos", primary: true },
        { label: "E-commerce", primary: false },
        { label: "Salud", primary: false },
        { label: "Medios y Radio", primary: false },
        { label: "Herramientas Corporativas Internas", primary: false },
      ],
    },
    contact: {
      sectionLabel: "Contacto",
      heading: "Construyamos lo que sigue.",
      description:
        "Abierto a oportunidades de liderazgo tecnológico corporativo, roles de desarrollo de software senior, posiciones de liderazgo de producto, proyectos de transformación digital y colaboraciones estratégicas en tecnología.",
      downloadPdf: "Descargar como PDF",
      footer: "Javier Vallejo · PIME Panama",
      items: [
        { icon: "ph:envelope", label: "Email", value: "javier@pimepanama.com", href: "mailto:javier@pimepanama.com", external: false },
        { icon: "ph:linkedin-logo", label: "LinkedIn", value: "linkedin.com/in/javier-vallejo", href: "https://www.linkedin.com/in/javier-vallejo-502062240/", external: true },
        { icon: "ph:globe", label: "Sitio Web", value: "pimepanama.com", href: "https://pimepanama.com", external: true },
        { icon: "ph:whatsapp-logo", label: "WhatsApp", value: "+507 64 795 352", href: "https://wa.me/50764795352", external: true },
      ],
    },
  },
} as const;

export type Content = typeof content.en;
