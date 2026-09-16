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
  geogenius: {
    client: "Schools and players",
    industry: "Gamified education",
    tagline: "Geography game with passports, classroom leagues and a school CMS.",
    description:
      "Students learn countries and flags earning XP, stamps and badges; teachers follow each classroom and the leagues between classes. Multi-tenant per school with billing, device caps and a full CMS for content, testimonials and newsletter. Spanish and English with verified parity.",
    features: [
      "Game with hints, normalized mastery and a stamp passport",
      "Classrooms, leagues and teacher and student dashboards",
      "Multi-tenant with per-school isolation and billing",
      "Twelve-section CMS with rich text editor",
      "Device cap per account",
      "ES/EN bilingual with parity checks in CI",
    ],
    routes: {
      "/site/es": "Public site", "/site/es/explorador": "Explorer", "/schools/panel/jugar": "Play",
      "/schools/panel/liga": "League", "/schools/panel/pasaporte": "Passport", "/cms/finanzas": "Finance", "/cms/contenido": "Content",
    },
    metrics: { games: { label: "Games played", unit: "games" }, schools: { label: "Active schools", unit: "schools" } },
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
  "church-translate": {
    client: "Multicultural churches",
    industry: "Live translation",
    tagline: "Real-time translated captions for religious services.",
    description:
      "The pastor speaks Spanish and attendees read the English or Portuguese translation on a public screen without signing in. Operator console per event, an organization glossary that feeds context, and transcript export to DOCX and PDF. Swappable speech-to-text and translation engines.",
    features: [
      "Live operator console per event",
      "Public screen per language, no login",
      "Sentence segmentation and per-organization glossary",
      "Customizable projection backgrounds",
      "Multi-tenant by organization with onboarding",
      "Transcript export to DOCX and PDF",
    ],
    routes: {
      "/display/[event]/en": "Public screen", "/operator/[eventId]": "Operator", "/[org]/events": "Events",
      "/[org]/settings/glossary": "Glossary", "/onboarding": "Onboarding",
    },
    metrics: { minutes: { label: "Minutes translated", unit: "min" }, viewers: { label: "Viewers per event", unit: "people" } },
  },
  "wedding-os": {
    client: "Wedding planners",
    industry: "Events",
    tagline: "SaaS for planners: every wedding, couple and guest with its own access.",
    description:
      "Three portals on one base: the planner manages a portfolio of weddings, the couple follows budget, tasks and seating, and guests RSVP from a link. Subscriptions, plans and usage are governed from a super-admin. Internationalized by locale.",
    features: [
      "Multi-tenant planner → wedding → couple → guest",
      "Subscriptions, plans, packages and usage",
      "Budget, tasks, timeline and vendors",
      "Drag-and-drop seating chart",
      "RSVP with token activation",
      "Public invitation and live event view",
    ],
    routes: {
      "/es/planner": "Planner portal", "/es/planner/weddings/[id]/tasks": "Tasks", "/es/couple/weddings/[id]/seating": "Seating chart",
      "/es/guest/weddings/[id]/rsvp": "RSVP", "/es/invite/[slug]": "Invitation", "/es/super/saas/plans": "Plans",
    },
    metrics: { weddings: { label: "Active weddings", unit: "weddings" }, rsvp: { label: "Confirmations", unit: "RSVP" } },
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
  tdp: {
    client: "Ground transportation",
    industry: "Transportation",
    tagline: "Online bus tickets, dual-screen POS and a GPS-tracked fleet.",
    description:
      "Public sales portal, POS terminals with a customer-facing screen packaged in Electron, QR boarding scanner, departure displays and live GPS tracking. Five Panamanian gateways: Yappy, PagueloFácil, Tilopay, PayU and Banesco.",
    features: [
      "Web and mobile ticket search and purchase",
      "POS with a secondary customer screen",
      "QR boarding scanner with signed validation",
      "Buses, routes, schedules and real-time seats",
      "GPS tracking and departure displays",
      "Fiscal, thermal printer and loyalty settings",
    ],
    routes: {
      "/search": "Find a trip", "/checkout": "Checkout", "/pos/[terminalId]": "POS terminal", "/scanner": "Scanner",
      "/displays/departures": "Departures display", "/dashboard/control-center": "Control center", "/dashboard/routes": "Routes",
    },
    metrics: { tickets: { label: "Tickets sold", unit: "tickets" }, buses: { label: "Buses on route", unit: "buses" } },
  },
  tickets: {
    client: "Event producers",
    industry: "Entertainment",
    tagline: "Signed-QR tickets and cashless payments with NFC wristbands.",
    description:
      "A re-brandable platform sized for 50,000+ daily transactions: versioned themes from the database, swappable gateways, cryptographically signed QRs, a cashless wallet, an offline scanning PWA and full audit of access and money.",
    features: [
      "Database-driven theming with versions",
      "Gateways: Yappy, PagueloFácil and bank transfer",
      "Cryptographically signed QRs",
      "Cashless wallet and NFC access control",
      "RBAC with roles, permissions and constraints",
      "Scanning PWA with offline support",
    ],
    routes: {
      "/events/[slug]": "Event", "/events/[slug]/checkout": "Checkout", "/profile/wallet": "Wallet", "/admin/scanner": "Scanner",
      "/admin/nfc/bind": "Bind NFC", "/super/themes": "Themes", "/super/audit/logs": "Audit",
    },
    metrics: { sales: { label: "Tickets sold", unit: "tickets" }, cashless: { label: "Cashless spend", unit: "USD" } },
  },
  medsuite: {
    client: "Clinics and practices",
    industry: "Healthcare",
    tagline: "White-label clinic management: one config file per client.",
    description:
      "Each clinic gets its own cloned deployment; brand, copy, colors, contacts and features are controlled from a single file. Public site with appointment booking and token-based cancellation rules in the email, plus a panel with patients, doctors, services and schedules.",
    features: [
      "Client configuration in a single file",
      "Public booking with window and cancellation rules",
      "Confirm and cancel by email token",
      "Patient CRM with clinical record",
      "Doctors, services and schedules",
      "Appointment and document PDFs",
    ],
    routes: {
      "/": "Clinic site", "/appointments/confirm/[token]": "Confirm appointment", "/admin": "Panel",
      "/admin/patients": "Patients", "/admin/appointments": "Schedule",
    },
    metrics: { appointments: { label: "Appointments booked", unit: "appts" }, patients: { label: "Patients", unit: "people" } },
  },
  "house-booking": {
    client: "Short-term rental owners",
    industry: "Hospitality",
    tagline: "Direct bookings with no platform fee, synced with Airbnb via iCal.",
    description:
      "White-label multi-tenant system for short-term rental owners: a public site per property with gallery and calendar, a booking flow with confirmation, a private CMS, iCal sync with Airbnb and payments through Yappy and Panamanian banks.",
    features: [
      "Public site per property with calendar",
      "Booking with confirmation and transactional email",
      "Owner CMS: properties, availability, leads",
      "iCal sync with Airbnb",
      "Per-tenant themes",
      "Yappy and Panamanian bank payments",
    ],
    routes: {
      "/propiedades/[slug]": "Property", "/reservar/[slug]": "Book", "/cms": "Panel",
      "/cms/disponibilidad/[id]": "Availability", "/cms/reservas": "Bookings",
    },
    metrics: { nights: { label: "Nights booked", unit: "nights" }, occupancy: { label: "Occupancy", unit: "%" } },
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
  "pime-social": {
    client: null,
    industry: "Digital marketing",
    tagline: "Copy with Claude, images with DALL·E and automatic Instagram publishing.",
    description:
      "Generates each post's copy with Claude and its image with DALL·E 3, queues them and publishes to Instagram through the Graph API with renewable long-lived tokens. Per-post analytics and an OpenClaw integration as the agent layer.",
    features: [
      "Copy generation with Claude",
      "DALL·E 3 images saved to Storage",
      "Scheduled post queue with auto publishing",
      "Instagram OAuth and token renewal",
      "Per-post analytics",
      "OpenClaw agent view",
    ],
    routes: { "/posts": "Post queue", "/posts/[id]": "Post", "/analytics": "Analytics", "/openclaw": "Agent", "/api/instagram/callback": "OAuth" },
    metrics: { posts: { label: "Posts", unit: "posts" }, reach: { label: "Reach", unit: "accounts" } },
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
  "bright-tale-store": {
    client: "Authors and creators",
    industry: "Digital products",
    tagline: "A store for books, courses and downloads with a block-based CMS.",
    description:
      "The public frontend is assembled from a registry of editable blocks in the admin, with Zod schemas that generate the forms automatically. Storefront, checkout, buyer library and admin for products, orders and customers.",
    features: [
      "Storefront for books and courses",
      "Checkout with success and cancel",
      "Library and orders per user",
      "Block-based CMS with generated forms",
      "Admin for products, orders, customers and media",
    ],
    routes: { "/books": "Books", "/books/[slug]": "Book page", "/checkout": "Checkout", "/account/library": "Library", "/admin/content": "Blocks" },
    metrics: { downloads: { label: "Downloads", unit: "downloads" }, readers: { label: "Readers", unit: "accounts" } },
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
  "chivas-parranderas": {
    client: "Chivas Parranderas Panamá",
    industry: "Tourism and entertainment",
    tagline: "Private party bus bookings: packages, gallery and admin.",
    description:
      "Luxury landing with featured packages from Supabase, gallery, FAQ and a WhatsApp lead form. Booking flow and a panel for products and reservations. Brand centralized in one config file and local business JSON-LD.",
    features: ["Hero with CTA and WhatsApp", "Featured packages from Supabase", "Gallery and FAQ", "Booking flow", "Product and reservation admin"],
    routes: { "/": "Landing", "/book": "Book", "/admin/products": "Packages", "/admin/reservations": "Reservations" },
    metrics: { bookings: { label: "Bookings", unit: "bookings" }, leads: { label: "Leads", unit: "leads" } },
  },
  "mision-cristiana": {
    client: "Misión Cristiana",
    industry: "Religious organizations",
    tagline: "A church's institutional site: welcome, video and ministries.",
    description:
      "Single page with scroll animations, institutional video, ministries and social links. No backend: a static Vue and Vite build. The oldest project in the catalog, still receiving touch-ups.",
    features: ["One-page landing with animations", "Institutional video", "Ministries section", "Social media buttons"],
    routes: { "/": "Home" },
    metrics: { visits: { label: "Visits", unit: "visits" }, contacts: { label: "Contacts", unit: "messages" } },
  },
  "muro-anatolia": {
    client: "Brand activation",
    industry: "Marketing and gaming",
    tagline: "A 3D WebGL penalty game for a banking campaign.",
    description:
      "The player saves penalties from the goalkeeper's camera with physics in real meters and a FIFA-regulation goal split into nine zones. Five levels, audio, mobile-first and no backend. Custom engine on Three.js.",
    features: ["3D engine with physics in meters", "Nine-zone goal and five levels", "Real FIFA measurements", "Audio and ball assets", "Campaign branding with glassmorphism"],
    routes: { "/": "Play" },
    metrics: { sessions: { label: "Game sessions", unit: "sessions" }, saves: { label: "Saves", unit: "saves" } },
  },
  "country-card-game": {
    client: "Anita Gawecka",
    industry: "Board games",
    tagline: "A bilingual digital companion for a country card game.",
    description:
      "Commercial proposal: an interactive country guide with card-flip animation, a timed quiz engine, email signup, a subscriber portal with export and an installable PWA with no app store. No recurring licenses.",
    features: ["Interactive country guide with card flip", "Quiz with timer and bonus rounds", "Email signup without login", "Admin portal with metrics and CSV export", "Installable PWA on iOS and Android"],
    routes: { "/countries": "Guide", "/quiz": "Quiz", "/admin": "Subscribers" },
    metrics: { quizzes: { label: "Quizzes completed", unit: "quizzes" }, subs: { label: "Subscribers", unit: "people" } },
  },
  "roblox-sandbox": {
    client: null,
    industry: "Gaming",
    tagline: "A procedural water world in Roblox with boats and NPCs.",
    description:
      "Technical exploration prototype synced with Rojo: procedurally generated water and islands, drivable boats with client-server input, NPCs and an animation system.",
    features: ["Procedural water and island generation", "Boats with boarding and control", "Client-server input via RemoteEvents", "NPC spawner and billboards"],
    routes: { "/": "World" },
    metrics: { islands: { label: "Islands generated", unit: "islands" }, players: { label: "Players", unit: "players" } },
  },
  "futbol-control": {
    client: "Football academies",
    industry: "Youth sports",
    tagline: "Academy management in Google Sheets that grew into a web app with payments.",
    description:
      "Players, families with discounts, categories by year, payments and tournaments inside the spreadsheet, plus a web app with public enrollment, PagueloFácil and Yappy payment links, an email queue with tracking and per-client install scripts. A replicable product.",
    features: [
      "Players, families and automatic categories",
      "Enrollment, monthly fees, tournaments and expenses",
      "Public enrollment form and payment link",
      "Email engine with queue and tracking",
      "History, exporters and embedded manual",
      "Validated per-client installation",
    ],
    routes: { "Dashboard.html": "Dashboard", "PlayersManager.html": "Players", "FinancialDashboard.html": "Finance", TournamentManagerWindow: "Tournaments", "/enrollment": "Web enrollment" },
    metrics: { players: { label: "Players", unit: "players" }, fees: { label: "Monthly fees collected", unit: "USD" } },
  },
  "academia-suarez": {
    client: "Academia Suárez",
    industry: "Youth sports",
    tagline: "The first academy system inside Google Sheets, with form-based approvals.",
    description:
      "Player registration with automatic age category, family groups with a 15 % discount, financial movements, pending approvals from Google Forms, search and validations. Two generations: the JavaScript original and the Git-versioned refactor.",
    features: ["Eleven categories by year and gender", "Family groups with discount", "Approvals from Google Forms", "Search and validation system", "Automated script tests"],
    routes: { "Dashboard.html": "Dashboard", "PendingApprovals.html": "Approvals", "FamilyGroupsManager.html": "Families" },
    metrics: { players: { label: "Players", unit: "players" }, approvals: { label: "Approvals", unit: "requests" } },
  },
  "sd-autosales": {
    client: "Sara & Davo",
    industry: "Vehicle resale",
    tagline: "Real profit per car and per partner, inside a spreadsheet.",
    description:
      "Each car records who contributed capital, its expenses and the sale price; the system splits net profit and ROI between partners. Chronological timeline, balance and automatic charts.",
    features: ["Partners with available capital", "Purchase investment split between partners", "Per-car expenses with attribution", "Net profit and ROI per partner", "Sales and balance charts"],
    routes: { MainPage: "Timeline", CarProfile: "Car profile", BalancePage: "Balance", ChartsPage: "Charts" },
    metrics: { cars: { label: "Cars sold", unit: "cars" }, roi: { label: "Cumulative ROI", unit: "%" } },
  },
  "git-pime": {
    client: null,
    industry: "Internal tooling",
    tagline: "One GitHub and Vercel identity per project, never publishing with the wrong account.",
    description:
      "CLI and local portal that applies profile, SSH key, host alias and commit signing per repository, wraps commit and push, checks sync with the remote and validates Vercel and Supabase before deploying. Manages per-project MCPs with credentials outside every repo.",
    features: [
      "Per-repo identity profiles: apply, verify, doctor",
      "Signed commit and push funnel",
      "Web portal at localhost:3847",
      "Identity, Vercel, Supabase and git preflight",
      "Per-project MCPs with 0600 permissions",
      "macOS installer",
    ],
    routes: { "localhost:3847": "Portal", "pime-git menu": "Terminal menu", "pime-git preflight": "Preflight" },
    metrics: { pushes: { label: "Verified pushes", unit: "pushes" }, repos: { label: "Governed repos", unit: "repos" } },
  },
  "cajon-revelado": {
    client: null,
    industry: "Components",
    tagline: "A mobile menu that never overlaps: the page shrinks and reveals what is beneath.",
    description:
      "A React component decoupled from UAPA Suite. The menu always lives underneath at full screen; what moves is the page, which rounds off and leaves a visible strip to come back with one tap. Plain CSS, no Tailwind, router-agnostic.",
    features: ["Reveal animation with the page as the actor", "A single peer dependency", "Two-line adapter for the App Router", "Example with grouped sections"],
    routes: { "CajonRevelado.tsx": "Component", "ejemplo/App.tsx": "Example" },
    metrics: { installs: { label: "Projects using it", unit: "projects" }, fps: { label: "Smoothness", unit: "fps" } },
  },
  "integraciones-panama": {
    client: null,
    industry: "Payments and invoicing",
    tagline: "Knowledge base for Yappy, PagueloFácil, electronic invoicing and Cloudflare R2.",
    description:
      "Manuals, swagger files, Postman collections and JSON examples reused in every product that charges in Panama: Yappy by API and web component, Yappy at the register, electronic invoicing for end consumer, government, foreign buyers and credit notes, and an R2 helper.",
    features: ["Yappy API and web component integration manual", "Yappy integration at physical registers", "Electronic invoicing swagger with eight examples", "R2 helper for objects, folders and ZIP"],
    routes: { "yappy/swagger.yml": "Yappy API", "facturacion/swagger.json": "e-Invoice", "r2Manager.py": "R2" },
    metrics: { products: { label: "Products integrating", unit: "products" }, gateways: { label: "Gateways documented", unit: "gateways" } },
  },
};
