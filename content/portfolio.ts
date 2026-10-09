import type { Lang } from "./site";

/** Un caso del portfolio. `publicable` arranca en false para los que Javier no ha confirmado.
 *  `visual` elige la composición en HTML/CSS que representa la UI del sistema (nunca capturas ajenas). */
export type Caso = {
  slug: string;
  nombre: string;
  cliente: string;
  industria: { es: string; en: string };
  tipo: { es: string; en: string };
  resumen: { es: string; en: string };
  problema: { es: string; en: string };
  solucion: { es: string; en: string };
  modulos: { es: string[]; en: string[] };
  stack: string[];
  visual: "tabla" | "calendario" | "mapa" | "tenants" | "catalogo" | "documentos" | "respaldo" | "control" | "reservas" | "analitica" | "invitacion";
  estado: { es: string; en: string };
  publicable: boolean;
  destacado?: boolean;
  logo?: string;
  /** Enlace público VERIFICADO con una petición real (2026-10-09). null = sin enlace confirmado: no se muestra. */
  urlPublica?: string | null;
  /** Por qué no hay enlace público, cuando urlPublica es null. */
  urlNota?: { es: string; en: string };
};

export const CASOS: Caso[] = [
  {
    slug: "svitzer", nombre: "Analítica de muestras de aceite", cliente: "Svitzer",
    industria: { es: "Marítimo", en: "Maritime" }, tipo: { es: "Analítica con IA", en: "AI analytics" },
    resumen: { es: "Lectura automática de reportes de laboratorio de aceite de remolcadores y alertas de mantenimiento.", en: "Automatic reading of tugboat oil lab reports with maintenance alerts." },
    problema: { es: "Los reportes llegaban como PDF y se revisaban a mano, uno por uno.", en: "Reports arrived as PDFs and were reviewed by hand, one by one." },
    solucion: { es: "Un sistema que extrae los valores con IA, los compara con los límites de cada motor y avisa a tiempo.", en: "A system that extracts the values with AI, compares them with each engine's limits and alerts on time." },
    modulos: { es: ["Carga de reportes", "Extracción con IA", "Límites por motor", "Alertas", "Historial por embarcación"], en: ["Report upload", "AI extraction", "Limits per engine", "Alerts", "History per vessel"] },
    stack: ["Next.js", "Supabase", "OpenAI"], visual: "analitica",
    estado: { es: "En producción", en: "In production" }, publicable: true, destacado: true, logo: "/logos/svitzer.svg",
    urlPublica: null, urlNota: { es: "Sistema interno del cliente: sin enlace público.", en: "Client internal system: no public link." },
  },
  {
    slug: "geogenius", nombre: "GeoGenius", cliente: "GeoGenius",
    industria: { es: "Educación", en: "Education" }, tipo: { es: "Plataforma para colegios", en: "School platform" },
    resumen: { es: "Plataforma de geografía interactiva para colegios: cada estudiante tiene su perfil con progreso, emblemas y estadísticas del juego.", en: "Interactive geography platform for schools: every student has a profile with progress, emblems and game statistics." },
    problema: { es: "Enseñar geografía a estudiantes que se aburren con los mapas de papel.", en: "Teaching geography to students who get bored with paper maps." }, solucion: { es: "Un juego de geografía mundial que se vende a colegios: cada clase es una expedición, el estudiante sube de nivel, sella países en su pasaporte y compite en una liga.", en: "A world geography game sold to schools: every class is an expedition, students level up, stamp countries in their passport and compete in a league." },
    modulos: { es: ["Perfil del estudiante", "Camino de la GeoGuía", "Pasaporte de sellos", "Liga de exploradores", "Panel de colegios", "Facturación", "CMS"], en: ["Student profile", "GeoGuide path", "Stamp passport", "Explorers league", "Schools panel", "Billing", "CMS"] },
    stack: ["Next.js 16", "React 19", "Tailwind 4", "Supabase", "Cloudflare R2", "MailerSend", "Turnstile", "i18n es/en"], visual: "mapa",
    estado: { es: "En producción", en: "In production" }, publicable: true, destacado: true,
    urlPublica: "https://www.geogenius.online",
  },
  {
    slug: "uapa-suite", nombre: "Suite institucional", cliente: "Unión Adventista Panameña",
    industria: { es: "Instituciones", en: "Institutions" }, tipo: { es: "ERP institucional", en: "Institutional ERP" },
    resumen: { es: "Secretaría, propiedades, actas y juntas de una organización con decenas de iglesias, en un solo sistema.", en: "Secretariat, properties, minutes and boards of an organization with dozens of churches, in one system." },
    problema: { es: "El archivo institucional debe encontrarse rápido, sin borrarse ni perderse.", en: "The institutional archive must be found fast, without being deleted or lost." },
    solucion: { es: "Un solo acceso, archivo con OCR, un asistente que cita la fuente y permisos por ámbito: Unión, campo e iglesia.", en: "One login, an OCR archive, an assistant that cites its source and permissions by scope: Union, field and church." },
    modulos: { es: ["Acceso único", "Secretaría", "Propiedades", "Obreros y vacaciones", "Actas", "Asistente con IA", "Visitas pastorales"], en: ["Single sign-on", "Secretariat", "Properties", "Workers and leave", "Minutes", "AI assistant", "Pastoral visits"] },
    stack: ["Next.js 16", "Supabase", "OCR + OpenAI", "Capacitor", "Twilio"], visual: "documentos",
    estado: { es: "En producción", en: "In production" }, publicable: true, destacado: true, logo: "/logos/adventista.png",
    urlPublica: null, urlNota: { es: "Sistema institucional con acceso por cuenta: sin enlace público confirmado.", en: "Institutional system with account access: no confirmed public link." },
  },
  {
    slug: "academyx", nombre: "Academyx", cliente: "Academyx",
    industria: { es: "Educación", en: "Education" }, tipo: { es: "CRM SaaS multi-tenant", en: "Multi-tenant SaaS CRM" },
    resumen: { es: "Reconstrucción de Academyx: gestión de colegios, centros de formación y academias con un motor único de cuentas, panel de «Hoy» y consola de plataforma.", en: "Rebuild of Academyx: management for schools, training centers and academies with a single accounts engine, a “Today” panel and a platform console." },
    problema: { es: "Sin documentar.", en: "Not documented." },
    solucion: { es: "Instituciones por ruta con un motor único de cuentas (cuenta, calendario, plan, movimientos), dinero en centavos enteros, RLS auditada, pagos en línea, portal del acudiente y GodMode como consola de plataforma operada por MCP.", en: "Institutions by route with a single accounts engine (account, calendar, plan, movements), integer-cent money, audited RLS, online payments, a guardian portal and GodMode as a platform console operated by MCP." },
    modulos: { es: ["Hoy", "Personas", "Matrícula", "Dinero y cobros", "Comunicación", "Reportes", "Calificaciones MEDUCA", "GodMode"], en: ["Today", "People", "Enrollment", "Money and billing", "Communication", "Reports", "MEDUCA grades", "GodMode"] },
    stack: ["Next.js 16", "Supabase (RLS por tenant)", "Monorepo pnpm + Turbo", "MCP de control", "Eventos firmados", "PagueloFácil y Yappy"], visual: "tenants",
    estado: { es: "En producción", en: "In production" }, publicable: true, destacado: true, logo: "/logos/academyx.svg",
    urlPublica: "https://academyx-app.vercel.app",
  },
  {
    slug: "godmode", nombre: "GodMode", cliente: "Pime",
    industria: { es: "Tecnología", en: "Technology" }, tipo: { es: "Superadministración", en: "Super-admin" },
    resumen: { es: "Consola de plataforma de Academyx: instituciones, facturación de plataforma, cumplimiento y alertas, operada por MCP.", en: "Academyx platform console: institutions, platform billing, compliance and alerts, operated by MCP." },
    problema: { es: "Sin documentar.", en: "Not documented." }, solucion: { es: "Una consola en su propio dominio y con base de datos propia que opera las instituciones por el MCP de control; el estado de cada institución se replica por eventos firmados.", en: "A console on its own domain and database that operates institutions through the control MCP; each institution's state is replicated by signed events." },
    modulos: { es: ["Instituciones", "Facturación de plataforma", "Cumplimiento", "Alertas", "Eventos firmados", "Cliente MCP"], en: ["Institutions", "Platform billing", "Compliance", "Alerts", "Signed events", "MCP client"] },
    stack: ["Next.js 16", "Supabase propio", "MCP de control", "Eventos firmados (HMAC)", "Monorepo pnpm + Turbo"], visual: "control",
    estado: { es: "En producción", en: "In production" }, publicable: true, destacado: true,
    urlPublica: "https://academyx-godmode.vercel.app", urlNota: { es: "Consola privada: el enlace abre el inicio de sesión.", en: "Private console: the link opens the sign-in." },
  },
  {
    slug: "bnb-real-estate", nombre: "CMS inmobiliario", cliente: "B&B Real Estate",
    industria: { es: "Inmobiliaria", en: "Real estate" }, tipo: { es: "CMS con integración", en: "CMS with integration" },
    resumen: { es: "Sitio trilingüe que capta y califica leads de inversionistas, con CMS propio sincronizado con Wasi.", en: "Trilingual site that captures and qualifies investor leads, with its own CMS synced with Wasi." },
    problema: { es: "El inversionista extranjero evalúa a distancia y necesita confiar en el intermediario antes de invertir.", en: "Foreign investors evaluate remotely and need to trust the intermediary before investing." },
    solucion: { es: "Sitio en español, inglés y portugués que capta y califica leads y los lleva a un asesor, con un CMS conectado a Wasi por cron y contacto por WhatsApp.", en: "A Spanish, English and Portuguese site that captures and qualifies leads and routes them to an advisor, with a CMS connected to Wasi by cron and WhatsApp contact." },
    modulos: { es: ["Propiedades", "Proyectos", "Leads", "Campañas", "Documentos", "Traducciones", "Sincronización Wasi", "Analítica"], en: ["Properties", "Projects", "Leads", "Campaigns", "Documents", "Translations", "Wasi sync", "Analytics"] },
    stack: ["Next.js 15", "Supabase", "Cloudflare R2", "API Wasi", "react-pdf", "Vercel Cron"], visual: "catalogo",
    estado: { es: "En producción", en: "In production" }, publicable: true, destacado: true, logo: "/logos/bb-real-estate.png",
    urlPublica: null, urlNota: { es: "Dominio por confirmar: bbrealestate.com.pa no resuelve.", en: "Domain to be confirmed: bbrealestate.com.pa does not resolve." },
  },
  {
    slug: "holo-realty", nombre: "Gestión de propiedades", cliente: "HOLO Realty",
    industria: { es: "Inmobiliaria", en: "Real estate" }, tipo: { es: "Plataforma con API", en: "Platform with API" },
    resumen: { es: "CRM inmobiliario con pipeline, finanzas, reubicación y un portal del cliente en tiempo real.", en: "Real estate CRM with pipeline, finance, relocation and a real-time client portal." },
    problema: { es: "Los sitios inmobiliarios solo listan propiedades, y la reubicación va por separado.", en: "Real estate sites only list properties, and relocation is handled separately." },
    solucion: { es: "Cinco servicios con un solo asesor y un portal del cliente con el avance en tiempo real.", en: "Five services with a single advisor and a client portal with real-time progress." },
    modulos: { es: ["Dashboard ejecutivo", "CRM", "Pipeline", "Finanzas", "Relocation", "Edificios", "Documentos", "Portal del cliente"], en: ["Executive dashboard", "CRM", "Pipeline", "Finance", "Relocation", "Buildings", "Documents", "Client portal"] },
    stack: ["Next.js 15", "Supabase Realtime", "Cloudflare R2", "API Wasi"], visual: "mapa",
    estado: { es: "En producción", en: "In production" }, publicable: true, destacado: true, logo: "/logos/holo-realty.png",
    urlPublica: "https://holorealty.com",
  },
  {
    slug: "smart-church", nombre: "Smart Church", cliente: "Revive",
    industria: { es: "Iglesias", en: "Churches" }, tipo: { es: "Gestión y CMS white-label", en: "White-label management and CMS" },
    resumen: { es: "La operación completa de una iglesia: ministerios, calendario, visitas, junta, alabanza y tesorería, más su sitio público.", en: "A church's whole operation: ministries, calendar, visits, board, worship and treasury, plus its public site." },
    problema: { es: "La operación de la iglesia vive en la memoria de tres personas y en chats que se pierden.", en: "The church's operation lives in three people's memory and in chats that get lost." },
    solucion: { es: "Un registro consultable, auditable y automático, más un sitio público editable. White-label por instancia con Google Calendar.", en: "A searchable, auditable, automatic record plus an editable public site. White-label per instance with Google Calendar." },
    modulos: { es: ["Ministerios", "Roster", "Calendario", "Visitas", "Citas pastorales", "Junta", "Alabanza", "Tesorería"], en: ["Ministries", "Roster", "Calendar", "Visits", "Pastoral appointments", "Board", "Worship", "Treasury"] },
    stack: ["Next.js 16", "Supabase Realtime", "Cloudflare R2", "Google Calendar", "Brevo", "PWA"], visual: "calendario",
    estado: { es: "En producción", en: "In production" }, publicable: true, destacado: true, logo: "/logos/revive.png",
    urlPublica: "https://www.revivepanama.com",
  },
  {
    slug: "john-henry", nombre: "CMS y CRM de sastrería", cliente: "John Henry",
    industria: { es: "Moda y lujo", en: "Fashion and luxury" }, tipo: { es: "CMS y CRM", en: "CMS and CRM" },
    resumen: { es: "Sitio público y CMS/CRM de una sastrería de alta costura con sedes en Colombia y Panamá, y un maniquí 3D para las medidas.", en: "Public site and CMS/CRM for a haute couture tailor with branches in Colombia and Panama, with a 3D mannequin for measurements." },
    problema: { es: "Sin documentar.", en: "Not documented." },
    solucion: { es: "Sistema completo: sitio público, citas con Google Calendar, pedidos, telas, modelos de prenda y finanzas multi-sede.", en: "A complete system: public site, Google Calendar appointments, orders, fabrics, garment models and multi-branch finance." },
    modulos: { es: ["Citas", "Clientes", "Pedidos", "Telas", "Modelos de prenda", "Finanzas", "Correos", "Sedes"], en: ["Appointments", "Clients", "Orders", "Fabrics", "Garment models", "Finance", "Email", "Branches"] },
    stack: ["Next.js 16", "Supabase", "Cloudflare R2", "Google Calendar", "Three.js", "Turnstile"], visual: "catalogo",
    estado: { es: "En producción", en: "In production" }, publicable: true, destacado: true, logo: "/logos/john-henry.svg",
    urlPublica: "https://www.johnhenryoficial.com",
  },
  {
    slug: "medsuite", nombre: "MedSuite", cliente: "MedSuite",
    industria: { es: "Salud", en: "Health" }, tipo: { es: "Clínicas white-label", en: "White-label clinics" },
    resumen: { es: "Citas, doctores, pacientes y expedientes en PDF para clínicas: una instalación por clínica, configurada en un archivo.", en: "Appointments, doctors, patients and PDF records for clinics: one deployment per clinic, configured in a single file." },
    problema: { es: "Sin documentar.", en: "Not documented." },
    solucion: { es: "Clonar el repositorio, editar un archivo de configuración y desplegar una clínica nueva en unos 25 minutos, con recordatorios por WhatsApp y correo.", en: "Clone the repository, edit one configuration file and deploy a new clinic in about 25 minutes, with WhatsApp and email reminders." },
    modulos: { es: ["Citas", "Doctores", "Pacientes", "Servicios", "Expediente en PDF", "Configuración"], en: ["Appointments", "Doctors", "Patients", "Services", "PDF record", "Settings"] },
    stack: ["Next.js 16", "Supabase", "react-pdf", "Brevo", "WhatsApp"], visual: "calendario",
    estado: { es: "En producción", en: "In production" }, publicable: true,
  },
  {
    slug: "misaza", nombre: "Misaza Designs", cliente: "Misaza Designs",
    industria: { es: "Diseño", en: "Design" }, tipo: { es: "Sitio y plataforma serverless", en: "Website and serverless platform" },
    resumen: { es: "Tienda y ERP de una casa de vestidos de gala: catálogo, citas, mayoreo, pedidos, inventario, caja y portal de proveedores.", en: "Store and ERP for a gala dress house: catalog, appointments, wholesale, orders, inventory, register and supplier portal." },
    problema: { es: "La tienda anterior corría sobre Vue, Apex y Flask y había que reescribirla desde cero.", en: "The previous store ran on Vue, Apex and Flask and had to be rewritten from scratch." },
    solucion: { es: "Reescritura completa con pagos por Yappy, WhatsApp y un kiosco en tienda.", en: "A complete rewrite with Yappy payments, WhatsApp and an in-store kiosk." },
    modulos: { es: ["Tienda", "Catálogo", "Citas", "Mayoreo", "Pedidos", "Inventario", "Caja", "Portal de proveedores"], en: ["Store", "Catalog", "Appointments", "Wholesale", "Orders", "Inventory", "Register", "Supplier portal"] },
    stack: ["Next.js 15", "Supabase", "Cloudflare R2", "Tiptap", "Yappy"], visual: "catalogo",
    estado: { es: "En producción", en: "In production" }, publicable: true, destacado: true, logo: "/logos/misaza.svg",
    urlPublica: "https://misaza.com",
  },
  {
    slug: "sembradores", nombre: "Sembradores", cliente: "Sembradores",
    industria: { es: "Iglesias", en: "Churches" }, tipo: { es: "Gestión multi-tenant", en: "Multi-tenant management" },
    resumen: { es: "Gestión de iglesias multi-tenant.", en: "Multi-tenant church management." },
    problema: { es: "Sin documentar.", en: "Not documented." }, solucion: { es: "Sin documentar.", en: "Not documented." },
    modulos: { es: ["Personas", "Familias", "Pastoral", "Eventos", "Asistencia", "Comunicaciones", "Donaciones", "Contabilidad"], en: ["People", "Families", "Pastoral", "Events", "Attendance", "Communications", "Donations", "Accounting"] },
    stack: ["Next.js 15", "Supabase", "Monorepo pnpm + Turbo", "Multi-tenant por subdominio"], visual: "tenants",
    estado: { es: "En producción", en: "In production" }, publicable: false,
  },
  {
    slug: "wedding-cms", nombre: "Wedding CMS", cliente: "Wedding CMS",
    industria: { es: "Eventos", en: "Events" }, tipo: { es: "SaaS de invitaciones", en: "Invitations SaaS" },
    resumen: { es: "Invitaciones digitales y gestión de eventos como servicio.", en: "Digital invitations and event management as a service." },
    problema: { es: "Sin documentar.", en: "Not documented." }, solucion: { es: "Sin documentar.", en: "Not documented." },
    modulos: { es: ["Invitaciones", "Invitados y RSVP", "Asientos", "Galería", "Presupuesto", "Planificación", "Control del día"], en: ["Invitations", "Guests and RSVP", "Seating", "Gallery", "Budget", "Planning", "Day-of control"] },
    stack: ["Next.js 16", "Supabase", "next-intl", "Cloudflare R2", "Brevo", "WhatsApp", "PWA"], visual: "invitacion",
    estado: { es: "En producción", en: "In production" }, publicable: false,
  },
  {
    slug: "pime-backup", nombre: "Pime Backup Enterprise", cliente: "Grupo GRF",
    industria: { es: "Empresas", en: "Companies" }, tipo: { es: "Respaldo y auditoría", en: "Backup and audit" },
    resumen: { es: "Descarga, verificación y certificación de grandes volúmenes de Google Workspace con un agente local.", en: "Download, verification and certification of large Google Workspace volumes with a local agent." },
    problema: { es: "Sin documentar.", en: "Not documented." }, solucion: { es: "Un SaaS multi-organización con agente en Windows: los archivos nunca pasan por la nube de Pime, se verifican con SHA256 y se certifican con reportes.", en: "A multi-organization SaaS with a Windows agent: files never pass through Pime's cloud, they are SHA256-verified and certified with reports." },
    modulos: { es: ["Dashboard", "Agentes", "Proyectos", "Jobs", "Logs", "Reportes"], en: ["Dashboard", "Agents", "Projects", "Jobs", "Logs", "Reports"] },
    stack: ["Next.js 16", "Supabase Realtime", "Python + FastAPI", "Google Drive y Gmail"], visual: "respaldo",
    estado: { es: "En producción", en: "In production" }, publicable: true, destacado: true,
    urlPublica: null, urlNota: { es: "Sistema privado de la organización cliente: sin enlace público.", en: "Private system of the client organization: no public link." },
  },
  {
    slug: "direct-booking", nombre: "Direct booking", cliente: "Pime",
    industria: { es: "Hospitalidad", en: "Hospitality" }, tipo: { es: "SaaS de reservas", en: "Booking SaaS" },
    resumen: { es: "Reservas directas para propietarios de alquiler vacacional, cada uno con su CMS privado y su dominio.", en: "Direct bookings for vacation rental owners, each with a private CMS and their own domain." },
    problema: { es: "Depender de Airbnb.", en: "Depending on Airbnb." }, solucion: { es: "White-label multi-tenant por subdominio o dominio propio, sincronizado con iCal y Airbnb, con pagos por Yappy y pasarelas bancarias panameñas.", en: "White-label multi-tenant by subdomain or own domain, synced with iCal and Airbnb, with Yappy and Panamanian bank gateways." },
    modulos: { es: ["Propiedades", "Reservar", "Disponibilidad", "Reservas", "Leads", "Configuración"], en: ["Properties", "Book", "Availability", "Bookings", "Leads", "Settings"] },
    stack: ["Next.js 15", "Supabase Realtime", "Cloudflare R2", "iCal", "Yappy"], visual: "reservas",
    estado: { es: "En producción", en: "In production" }, publicable: false,
  },
];

export const INDUSTRIAS = (lang: Lang) => Array.from(new Set(CASOS.filter((c) => c.publicable).map((c) => c.industria[lang])));
export const TIPOS = (lang: Lang) => Array.from(new Set(CASOS.filter((c) => c.publicable).map((c) => c.tipo[lang])));
export const DESTACADOS = CASOS.filter((c) => c.publicable && c.destacado);
