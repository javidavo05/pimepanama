-- Seed data for PIME Panama

-- Insert Admin User
INSERT INTO "AdminUser" (id, email, "passwordHash", role, "createdAt", "updatedAt")
VALUES (
  'admin-owner',
  'founder@pimepanama.com',
  '$2b$12$QAWPjpYopJNun5/fUCclouLdLFqCqd7E6FnBYC0mFavmWZcllGlZa',
  'OWNER',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (email) DO UPDATE SET "passwordHash" = EXCLUDED."passwordHash";

-- Insert Hero
INSERT INTO "Hero" (
  id, headline_en, headline_es, subheadline_en, subheadline_es,
  highlight_en, highlight_es, "ctaPrimaryLabel_en", "ctaPrimaryLabel_es",
  "ctaPrimaryLink", "ctaSecondaryLabel_en", "ctaSecondaryLabel_es",
  "ctaSecondaryLink", "createdAt", "updatedAt"
) VALUES (
  'hero-main',
  'Experts in Comprehensive Engineering and Industrial Supply Solutions',
  'Expertos en Soluciones Integrales de Ingeniería y Suministros Industriales',
  'Leaders across Panama and Latin America in specialized consulting, world-class equipment sourcing, and turnkey project management with international standards. We transform industrial challenges into sustainable competitive advantages.',
  'Líderes en Panamá y Latinoamérica en consultoría especializada, suministro de equipos de alta gama y gestión de proyectos con estándares internacionales. Transformamos desafíos industriales en ventajas competitivas sostenibles.',
  'Trusted by global leaders: Maersk, Svitzer, Seventh-day Adventist Church, and more.',
  'Confianza de líderes globales: Maersk, Svitzer, Iglesia Adventista del Séptimo Día y más.',
  'Request Free Technical Assessment',
  'Solicite Evaluación Gratuita',
  '#contact',
  'Download Success Portfolio',
  'Descargue Nuestro Portafolio',
  '#contact',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE SET
  headline_en = EXCLUDED.headline_en,
  headline_es = EXCLUDED.headline_es,
  subheadline_en = EXCLUDED.subheadline_en,
  subheadline_es = EXCLUDED.subheadline_es;

-- Insert Page Sections
INSERT INTO "PageSection" (id, slug, title_en, title_es, subtitle_en, subtitle_es, body_en, body_es, "createdAt", "updatedAt")
VALUES
  ('section-services', 'services', 'Professional Services', 'Servicios Profesionalizados', 
   'Comprehensive engineering expertise for complex industrial operations.', 
   'Experiencia integral en ingeniería para operaciones industriales complejas.',
   NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('section-value', 'value', 'Corporate Value Proposition', 'Propuesta de Valor Corporativa',
   NULL, NULL,
   'At PIME Panama, we merge technological innovation with local knowledge to deliver scalable solutions tailored to industrial, energy, and infrastructure sectors. Our strategic alliance network with leading manufacturers enables us to respond with agility to the most demanding requirements in the Latin American market.',
   'En PIME Panama, fusionamos innovación tecnológica con conocimiento local para ofrecer soluciones escalables adaptadas a sectores industriales, energéticos y de infraestructura. Nuestra red de alianzas estratégicas con fabricantes líderes nos permite responder con agilidad a los requerimientos más exigentes del mercado latinoamericano.',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('section-sectors', 'sectors', 'Sectors of Specialization', 'Sectores de Especialización',
   'Proven track record across critical industries and large-scale infrastructure.',
   'Trayectoria comprobada en industrias críticas e infraestructura de gran escala.',
   NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('section-differentials', 'differentials', 'Competitive Differentiators', 'Diferenciales Competitivos',
   'Excellence from strategy to lifecycle support.',
   'Excelencia desde la estrategia hasta el soporte de ciclo de vida.',
   NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (slug) DO NOTHING;

-- Insert Services
INSERT INTO "Service" (id, slug, "order", title_en, title_es, description_en, description_es, icon, "createdAt", "updatedAt")
VALUES
  ('service-strategic-consulting', 'strategic-consulting', 1,
   'Strategic Engineering Consulting', 'Consultoría Estratégica en Ingeniería',
   'Specialized technical advisory to optimize industrial and construction processes. We develop feasibility studies, strategic planning, and technical audits using internationally recognized methodologies, ensuring efficiency and profitability in every project.',
   'Asesoría técnica especializada para optimizar procesos industriales y de construcción. Desarrollamos estudios de viabilidad, planificación estratégica y auditorías técnicas con metodologías avaladas por normas internacionales, garantizando eficiencia y rentabilidad en cada proyecto.',
   'mdi:strategy', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('service-equipment-supply', 'equipment-supply', 2,
   'Premium Equipment and Materials Supply', 'Suministro de Equipos y Materiales de Alta Gama',
   'We distribute industrial equipment, electrical materials, precision pipes and valves from global brands. We guarantee certified quality, timely delivery, and post-sale technical support to minimize downtime and maximize productivity.',
   'Distribuimos equipos industriales, materiales eléctricos, tuberías y válvulas de precisión de marcas globales. Garantizamos calidad certificada, entrega oportuna y soporte técnico postventa para minimizar tiempos de inactividad y maximizar productividad.',
   'mdi:package-variant-closed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('service-turnkey-projects', 'turnkey-projects', 3,
   'Turnkey Project Management', 'Gestión de Proyectos Llave en Mano',
   'We execute projects under ''Turnkey'' schemes, integrating design, procurement, and construction. We ensure compliance with deadlines, budgets, and technical specifications, backed by a multidisciplinary team with international experience.',
   'Ejecutamos proyectos bajo esquemas ''Turnkey'', integrando diseño, procura y construcción. Aseguramos cumplimiento de plazos, presupuestos y especificaciones técnicas, respaldados por un equipo multidisciplinario con experiencia internacional.',
   'mdi:key-variant', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('service-maintenance-solutions', 'maintenance-solutions', 4,
   'Predictive and Corrective Maintenance Solutions', 'Soluciones de Mantenimiento Predictivo y Correctivo',
   'We implement advanced maintenance programs to extend the lifespan of critical assets. We combine monitoring technologies with proactive protocols to reduce operating costs and prevent failures.',
   'Implementamos programas de mantenimiento avanzado para prolongar la vida útil de activos críticos. Combinamos tecnologías de monitoreo con protocolos proactivos para reducir costos operativos y prevenir fallas.',
   'mdi:tools', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (slug) DO NOTHING;

-- Insert Sectors
INSERT INTO "Sector" (id, slug, "order", title_en, title_es, description_en, description_es, "createdAt", "updatedAt")
VALUES
  ('sector-energy-hydrocarbons', 'energy-hydrocarbons', 1,
   'Energy and Hydrocarbons', 'Energía y Hidrocarburos',
   'Power generation plants, refineries, and distribution networks.',
   'Plantas de generación, refinerías y redes de distribución.',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sector-civil-infrastructure', 'civil-infrastructure', 2,
   'Civil Infrastructure', 'Infraestructura Civil',
   'Ports, airports, and urbanization projects.',
   'Puertos, aeropuertos y obras de urbanización.',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sector-manufacturing', 'manufacturing', 3,
   'Manufacturing Industry', 'Industria Manufacturera',
   'Process automation and production chain optimization.',
   'Automatización de procesos y optimización de cadenas productivas.',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sector-telecommunications', 'telecommunications', 4,
   'Telecommunications', 'Telecomunicaciones',
   'Passive infrastructure and support systems.',
   'Infraestructura pasiva y sistemas de soporte.',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (slug) DO NOTHING;

-- Insert Differentiators
INSERT INTO "Differentiator" (id, slug, "order", title_en, title_es, description_en, description_es, "createdAt", "updatedAt")
VALUES
  ('diff-global-logistics', 'global-logistics', 1,
   'Global Logistics', 'Logística Global',
   'Optimized supply chain with coverage across Panama, the Caribbean, and Central America.',
   'Cadena de suministro optimizada con cobertura en Panamá, Caribe y Centroamérica.',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('diff-sustainability', 'sustainability', 2,
   'Sustainability', 'Sostenibilidad',
   'Integration of eco-efficient practices and circular economy principles in all projects.',
   'Integración de prácticas ecoeficientes y economía circular en todos los proyectos.',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('diff-international-certifications', 'international-certifications', 3,
   'International Certifications', 'Certificaciones Internacionales',
   'Compliance with ASME, ASTM, ISO, and ANSI standards.',
   'Cumplimiento de estándares ASME, ASTM, ISO y ANSI.',
   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (slug) DO NOTHING;

-- Insert SEO Settings
INSERT INTO "SeoSetting" (id, page, "metaTitle_en", "metaTitle_es", "metaDescription_en", "metaDescription_es", "createdAt", "updatedAt")
VALUES (
  'seo-main',
  'home',
  'PIME Panama - Engineering Consulting & Industrial Equipment Supply',
  'PIME Panama - Consultoría en Ingeniería y Suministro Industrial',
  'PIME Panama - Engineering consulting and industrial equipment supply. We manage projects with ISO methodologies and turnkey solutions for the energy and industrial sectors. Trusted by Maersk, Svitzer, and more. Request a quote today.',
  'PIME Panama - Consultoría en ingeniería y suministro de equipos industriales. Gestionamos proyectos con metodologías ISO y soluciones llave en mano para el sector energético e industrial. Confianza de Maersk, Svitzer y más. Cotice hoy mismo.',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (page) DO UPDATE SET
  "metaTitle_en" = EXCLUDED."metaTitle_en",
  "metaTitle_es" = EXCLUDED."metaTitle_es";

