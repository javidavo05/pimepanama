/**
 * Textos en inglés del catálogo, por slug. El español vive en los archivos
 * `catalog-*.ts`; aquí solo se traduce lo que el visitante lee. Las rutas se
 * indexan por `path` y las métricas por `key`, así un cambio de orden en el
 * catálogo no desalinea la traducción.
 */
export type ProjectCopyEn = {
  client?: string | null;
  industry: string;
  tagline: string;
  description: string;
  features: string[];
  routes: Record<string, string>;
  metrics: Record<string, { label: string; unit: string }>;
};

export const copyEn: Record<string, ProjectCopyEn> = {
  academyx: {
    client: "Academies and schools",
    industry: "Education and sports",
    tagline: "Multi-institution ERP for academies, schools and football clubs.",
    description:
      "Online enrollment, recurring billing with Yappy and PagueloFácil, delinquency control, payroll, a virtual classroom with exams and grades, and WhatsApp communication with families. Every institution runs isolated on the same platform, with a superadmin watching crons and collections across all of them.",
    features: [
      "Online enrollment with approval and delinquency lock",
      "Billing, installments, autopay and bank reconciliation",
      "Financial dashboard with expenses, payroll and commissions",
      "Virtual classroom: courses, exams, assignments and certificates",
      "Email templates and WhatsApp notifications",
      "Multi-academy superadmin with cron panel",
    ],
    routes: {
      "/": "Landing", "/enrollment": "Public enrollment", "/pay/[playerId]": "Payment link",
      "/dashboard": "Dashboard", "/dashboard/finance": "Finance", "/dashboard/players": "Players",
      "/teacher/courses": "Teacher classroom", "/student/exams": "Student exams", "/superadmin/cron-dashboard": "Crons",
    },
    metrics: { students: { label: "Active students", unit: "students" }, collections: { label: "Monthly collections", unit: "USD" } },
  },
  "uapa-suite": {
    client: "Panamanian Adventist Union",
    industry: "Institutional administration",
    tagline: "Single sign-on to the Union's systems: Secretariat and Visita7.",
    description:
      "Institutional archive with properties, OCR document management, workers and vacations, boards with numbered votes and indicators. Nothing is deleted: every change records who, when and why. Authorization resolves in the database with capabilities scoped to a branch of the Union → Field → church hierarchy.",
    features: [
      "Single sign-on with second factor and backup codes",
      "Properties with batch upload and index",
      "Documents with OCR, processing queue and review",
      "Boards, sessions and numbered votes",
      "AI assistant that cites its source and keeps a log",
      "Global search, notices and expirations",
    ],
    routes: {
      "/ingresar": "Sign in", "/sistemas": "Lobby", "/secretaria/tablero": "Dashboard", "/secretaria/propiedades": "Properties",
      "/secretaria/documentos": "Documents", "/secretaria/votos": "Votes", "/secretaria/asistente": "Assistant",
    },
    metrics: { documents: { label: "Documents processed", unit: "docs" }, users: { label: "Active accounts", unit: "accounts" } },
  },
  "smart-church": {
    client: "Local churches",
    industry: "Religious organizations",
    tagline: "Running a local church: ministries, services, treasury and appointments.",
    description:
      "White-label: cloning the repo and reconfiguring the church produces a new instance. Service rosters, real-time worship setlists, board mode with live voting, a visit CRM, pastoral appointments synced with Google Calendar and cron-driven reminders.",
    features: [
      "Landing with CMS and contact inbox",
      "Ministries with members, events and assignments",
      "Board mode with agenda and live voting",
      "Real-time worship setlists",
      "Pastoral appointments with Google Calendar and .ics feed",
      "T-7, T-3 and T-1 reminder cron",
    ],
    routes: {
      "/": "Landing", "/agenda-una-cita": "Book appointment", "/dashboard": "Dashboard", "/ministries": "Ministries",
      "/board/[sessionId]": "Live board", "/tesoreria": "Treasury", "/cms": "CMS",
    },
    metrics: { members: { label: "Registered members", unit: "people" }, events: { label: "Scheduled events", unit: "events" } },
  },
  visita7: {
    client: "Panamanian Adventist Union",
    industry: "Pastoral management",
    tagline: "Pastoral visitation on the Union's real hierarchy, with a mobile app.",
    description:
      "Pastors log and close visits to families and members; the Union sees metrics by field, district and church. Batch family imports, geolocated church directory, member transfers, prayer books and calendar. Shipped as a PWA and as a native app with Capacitor.",
    features: [
      "Visit flow: create, log and close",
      "Batch family import with job tracking",
      "Browsable Union → Field → district → church hierarchy",
      "Church directory with GPS",
      "Transfers, prayer books and calendar",
      "Trash with restore and notifications",
    ],
    routes: {
      "/portal": "Public portal", "/dashboard": "Dashboard", "/visits/create": "New visit", "/families/import": "Import families",
      "/hierarchy": "Hierarchy", "/iglesias": "Churches", "/calendar": "Calendar",
    },
    metrics: { visits: { label: "Visits logged", unit: "visits" }, pastors: { label: "Active pastors", unit: "accounts" } },
  },
  sembradores: {
    client: "Churches and denominations",
    industry: "Religious organizations",
    tagline: "Multi-tenant church SaaS with double-entry accounting.",
    description:
      "Each congregation lives at /t/[slug] with its own login, branding, domain and modules. People, households, attendance, ministries, donations through several gateways and accounting with chart of accounts, journal entries and periods. A platform panel onboards churches and tracks usage and subscription.",
    features: [
      "Self-service onboarding with signup status",
      "Per-tenant runtime with suspension and branding",
      "People, households and networks with Excel import",
      "Donations, reconciliation and full accounting",
      "Pastoral follow-ups and prayer requests",
      "Platform panel with runtime health",
    ],
    routes: {
      "/signup": "Sign up", "/t/[slug]/dashboard": "Dashboard", "/t/[slug]/people": "People",
      "/t/[slug]/accounting/journal-entries": "Journal entries", "/t/[slug]/portal": "Member portal", "/churches": "Churches (platform)",
    },
    metrics: { tenants: { label: "Active churches", unit: "tenants" }, donations: { label: "Donations", unit: "USD" } },
  },
  "wedding-site": {
    client: "Private wedding",
    industry: "Events",
    tagline: "Digital invitation, RSVP and day-of control for a real wedding.",
    description:
      "It started as a wedding website and became the full platform of a single event: invitation with RSVP, per-event gallery, seating chart, day-of control, budget, vendors and WhatsApp communications. It was the origin of Wedding OS.",
    features: [
      "Digital invitation and public RSVP",
      "Per-event gallery with media upload",
      "Guests with groups, Excel import and QR",
      "Seating chart and day-of control",
      "Budget, tasks, vendors and payments",
      "Wedding bingo for guests",
    ],
    routes: {
      "/": "Invitation", "/invite/rsvp": "RSVP", "/gallery/[event]": "Gallery", "/admin/guests": "Guests",
      "/admin/seating": "Seating", "/admin/wedding/day-control": "Day-of control",
    },
    metrics: { guests: { label: "Confirmed guests", unit: "people" }, photos: { label: "Photos uploaded", unit: "photos" } },
  },
  godmode: {
    client: null,
    industry: "Holding and SaaS control",
    tagline: "The holding's console: every business's finances and the SaaS control plane.",
    description:
      "One place to bill and monitor every digital business and dealership in the group. It also acts as a control plane: onboarding tenants, plans, subscriptions and usage for Church SaaS, Wedding OS and AcademyX, and issuing public payment links.",
    features: [
      "Multi-tenant with per-company RLS",
      "Companies, business units, partners and investments",
      "Recurring and one-off subscriptions and charges",
      "Vehicle inventory with per-unit expenses",
      "Public payment links",
      "Control plane for external tenants",
    ],
    routes: {
      "/": "Landing", "/dashboard": "Dashboard", "/dashboard/companies": "Companies", "/dashboard/vehicles": "Vehicles",
      "/dashboard/analytics": "Analytics", "/dashboard/control-plane/tenants": "Tenants", "/pay/[token]": "Payment link",
    },
    metrics: { mrr: { label: "Recurring revenue", unit: "USD" }, tenants: { label: "Governed tenants", unit: "tenants" } },
  },
  cifrapp: {
    client: null,
    industry: "Personal finance",
    tagline: "A household finance system that answers what should happen next.",
    description:
      "Movements, accounts, cards, budgets and goals, plus what personal finance software leaves out: plan, projection, scenarios, a debt simulator and a tax reserve. Multi-person access per household and a portal for the accountant. Monorepo with web app and admin.",
    features: [
      "Movements, accounts, cards and categories",
      "Budgets, goals and a plan with history",
      "Debts with simulator and scenario projection",
      "Assisted review: duplicates, transfers, recurring",
      "Taxes and tax reserve",
      "Accountant portal with invitation access",
    ],
    routes: {
      "/es": "Marketing", "/es/pricing": "Pricing", "/es/overview": "Overview", "/es/movements": "Movements",
      "/es/projection": "Projection", "/es/debt-simulator": "Debt simulator", "/es/access/accountants": "Accountant",
    },
    metrics: { households: { label: "Households", unit: "households" }, movements: { label: "Movements classified", unit: "mov." } },
  },
  "pime-backup": {
    client: "Grupo GRF",
    industry: "Document compliance",
    tagline: "Download, verify and certify the integrity of corporate Google Drive.",
    description:
      "Files travel directly between Google Drive and the client's machine; the cloud only coordinates and stores metadata. A Python agent installs on Windows, schedules jobs and certifies every download. Web dashboard, SDK and CLI in one monorepo.",
    features: [
      "Windows agent installed with one script",
      "Direct Drive → client machine transfer",
      "Integrity verification and certification",
      "Scheduled jobs with dedicated workers",
      "Twelve SQL migrations with RLS",
      "Own SDK and CLI",
    ],
    routes: { "/": "Dashboard", "/jobs": "Jobs", "/agents": "Agents", "/certificates": "Certificates" },
    metrics: { gb: { label: "GB verified", unit: "GB" }, files: { label: "Files certified", unit: "files" } },
  },
  misaza: {
    client: "Misaza",
    industry: "Retail and fashion",
    tagline: "Panamanian e-commerce rewritten from scratch: variants, Yappy, PayPal and CMS.",
    description:
      "Catalog with sizes, colors and nine URL parameters, prices with ITBMS and wholesale from a single source, soft stock reservation deducted at payment, special orders when there is no inventory, customer appointments and a fourteen-section CMS. Thirteen thousand 301 redirects preserve the SEO of the previous Vue store.",
    features: [
      "Catalog with relevance, counts and variants",
      "Stock reservation, deduction at payment and restitution",
      "Yappy with verified IPN and PayPal with webhook",
      "Special orders without inventory",
      "Appointments with capacity, hours and rescheduling",
      "Kardex, email queue and rate limiting in Postgres",
    ],
    routes: {
      "/": "Store", "/explore": "Browse catalog", "/product/[id]": "Product", "/checkout": "Checkout", "/mayoreo": "Wholesale",
      "/admin": "CMS", "/api/pagos/yappy/ipn": "Yappy IPN", "/api/kardex": "Kardex",
    },
    metrics: { orders: { label: "Orders", unit: "orders" }, revenue: { label: "Sales", unit: "USD" } },
  },
  "bnb-real-estate": {
    client: "B&B Real Estate",
    industry: "Real estate",
    tagline: "A trilingual real estate site built for the foreign investor.",
    description:
      "Spanish, English and Portuguese with a catalog synced from Wasi, pre-construction projects, clustered maps and owner acquisition. Internal CMS for inventory, leads and campaigns, and a restricted document verification module on R2 with RLS.",
    features: [
      "Trilingual with per-language sitemaps and llms.txt",
      "Catalog and pre-construction with maps",
      "Inventory sync with Wasi",
      "CMS for inventory, content, leads and campaigns",
      "Client document verification",
      "Image pipeline with variants and audit",
    ],
    routes: { "/": "Landing", "/propiedades": "Properties", "/proyectos": "Pre-construction", "/list-with-us": "List your property", "/cms": "CMS", "/portal": "Client portal" },
    metrics: { leads: { label: "Qualified leads", unit: "leads" }, listings: { label: "Published listings", unit: "listings" } },
  },
  "holo-realty": {
    client: "HOLO Realty & Relocation",
    industry: "Real estate and relocation",
    tagline: "Sales, rentals, relocation and investment with a real-time client portal.",
    description:
      "A rebrand on the same real estate base: the differentiator is a portal where the client sees progress, accepts or rejects decisions and follows milestones in real time. The internal CRM covers a configurable pipeline, finance, relocation files and buildings with contracts and inspections.",
    features: [
      "Client portal with progress and decisions",
      "CRM with interaction log",
      "Configurable no-code pipeline",
      "Relocation with files and checklists",
      "Buildings: units, contracts, inspections",
      "Inventory switchable between Wasi and CMS",
    ],
    routes: { "/": "Landing", "/relocation": "Relocation", "/propiedades": "Properties", "/portal": "Client portal", "/cms/crm": "CRM" },
    metrics: { cases: { label: "Active files", unit: "files" }, milestones: { label: "Milestones closed", unit: "milestones" } },
  },
  "john-henry": {
    client: "John Henry Tailoring",
    industry: "Luxury tailoring",
    tagline: "A tailoring brand with ateliers in Bogotá and Panama, and its workshop in a CMS.",
    description:
      "Editorial site with the craft, ready-to-wear and appointment booking synced with Google Calendar. Behind it, a CRM with clients and measurements, printable workshop orders, a fabric and model catalog, and finance with royalties and advisor commissions. PWA with offline mode.",
    features: [
      "Editorial landing with ateliers and appointments",
      "CRM with measurement record and history",
      "Printable workshop orders",
      "Fabric and model catalog with photos",
      "Finance: collections, royalties and commissions",
      "Editable email templates",
    ],
    routes: { "/": "Landing", "/citas": "Book appointment", "/ready-to-wear": "Ready-to-wear", "/clients/[id]/medidas": "Measurements", "/orders/[id]/orden-taller": "Workshop order", "/finance/reportes": "Reports" },
    metrics: { orders: { label: "Workshop orders", unit: "orders" }, appointments: { label: "Appointments", unit: "appts" } },
  },
};
