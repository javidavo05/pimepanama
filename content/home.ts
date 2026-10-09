import type { Lang } from "./site";

export type Tono = "ok" | "run" | "ghost";

export type Ventana = {
  app: string; buscar: string; usuario: string; hoy: string; demo: string;
  menu: { id: "operaciones" | "cobros" | "clientes" | "documentos"; chip: string; label: string }[];
  operaciones: {
    titulo: string; accion: string; todos: string;
    columnas: { label: string; items: { cliente: string; modulo: string; responsable: string; dias: number }[] }[];
    cargaTitulo: string; cargaUnidad: string;
    semanaTitulo: string; dias: string[]; semana: { cliente: string; inicio: number; fin: number }[];
  };
  cobros: {
    titulo: string; accion: string; metaLabel: string; cobradoLabel: string; meta: number; cobrado: number;
    graficaTitulo: string; unidad: string; periodos: { label: string; etiquetas: string[]; valores: number[] }[];
    antiguedadTitulo: string; antiguedad: { label: string; valor: number }[];
    vencimientosTitulo: string; vencimientos: { cliente: string; concepto: string; fecha: string; monto: string; tono: Tono }[];
  };
  clientes: {
    titulo: string; accion: string; embudoTitulo: string; etapas: { label: string; n: number }[];
    saludLabel: string; clientes: { nombre: string; industria: string; salud: number; etapa: number; desde: string }[];
    calorTitulo: string; meses: string[]; industrias: string[]; calor: number[][];
  };
  documentos: {
    titulo: string; accion: string; carpetas: { label: string; n: number }[];
    docs: { nombre: string; tipo: string; carpeta: number; estado: { t: string; tono: Tono }; fecha: string }[];
    calendarioTitulo: string; calendario: number[]; diasCorto: string[];
    tipoTitulo: string; tipos: string[]; meses: string[]; porTipo: number[][];
    firmasTitulo: string; firmas: { label: string; hecho: boolean }[];
  };
};

/** Copy de la home. Titulares de 8 palabras o menos; una línea de apoyo. */
export const HOME: Record<Lang, {
  hero: {
    eyebrow: string;
    titulo: string[];
    bajada: string;
    cta: { href: string; label: string };
    secundario: { href: string; label: string };
    metadatos: { k: string; v: string }[];
    ventana: Ventana;
  };
}> = {
  es: {
    hero: {
      eyebrow: "ERP y CRM a medida · Panamá",
      titulo: ["Su ERP o CRM,", "construido desde cero", "para su empresa"],
      bajada: "Nada de plantillas: diseñamos y programamos el sistema que su empresa opera todos los días, con precio cerrado y tres meses de garantía.",
      cta: { href: "/es/contacto", label: "Pedir una propuesta" },
      secundario: { href: "/es/portfolio", label: "Ver sistemas entregados" },
      metadatos: [
        { k: "Qué hacemos", v: "ERP, CRM, SaaS y plataformas internas" },
        { k: "Cómo", v: "A medida, desde cero, sin licencias ajenas" },
        { k: "Entrega", v: "Precio llave en mano, fases independientes" },
      ],
      ventana: {
        app: "Suite", buscar: "Buscar cliente, módulo o documento", usuario: "JV", hoy: "Miércoles 8 de octubre",
        demo: "Panel de demostración: tocá el menú, los filtros, las etapas y las carpetas",
        menu: [
          { id: "operaciones", chip: "OP", label: "Operaciones" },
          { id: "cobros", chip: "CO", label: "Cobros" },
          { id: "clientes", chip: "CL", label: "Clientes" },
          { id: "documentos", chip: "DO", label: "Documentos" },
        ],
        operaciones: {
          titulo: "Tablero de operaciones", accion: "+ Nueva operación", todos: "Todos",
          columnas: [
            { label: "Programadas", items: [
              { cliente: "Inmobiliaria Sur", modulo: "Sincronización Wasi", responsable: "M. Ríos", dias: 3 },
              { cliente: "Academia Norte", modulo: "Reportes de matrícula", responsable: "L. Pérez", dias: 5 },
            ] },
            { label: "En curso", items: [
              { cliente: "Clínica San Fernando", modulo: "Citas y expedientes", responsable: "M. Ríos", dias: 12 },
              { cliente: "Sastrería Rey", modulo: "Pedidos y medidas", responsable: "J. Vallejo", dias: 8 },
              { cliente: "Unión Adventista", modulo: "Actas de junta", responsable: "L. Pérez", dias: 2 },
            ] },
            { label: "Entregadas", items: [
              { cliente: "Iglesia Central", modulo: "Miembros", responsable: "A. Díaz", dias: 0 },
              { cliente: "Academia Norte", modulo: "Cobros", responsable: "L. Pérez", dias: 0 },
            ] },
          ],
          cargaTitulo: "Carga por responsable", cargaUnidad: "horas esta semana",
          semanaTitulo: "Semana en curso", dias: ["L", "M", "X", "J", "V"],
          semana: [
            { cliente: "Clínica San Fernando", inicio: 0, fin: 3 },
            { cliente: "Sastrería Rey", inicio: 1, fin: 4 },
            { cliente: "Unión Adventista", inicio: 2, fin: 2 },
            { cliente: "Inmobiliaria Sur", inicio: 3, fin: 4 },
          ],
        },
        cobros: {
          titulo: "Cobros", accion: "+ Nueva factura", metaLabel: "Meta del mes", cobradoLabel: "Cobrado hasta hoy", meta: 60000, cobrado: 48250,
          graficaTitulo: "Cobros conciliados", unidad: "US$ miles",
          periodos: [
            { label: "Semana", etiquetas: ["L", "M", "X", "J", "V", "S", "D"], valores: [4.2, 6.1, 5.4, 7.8, 9.1, 3.2, 2.4] },
            { label: "Mes", etiquetas: ["S1", "S2", "S3", "S4"], valores: [9.5, 12.1, 11.4, 15.2] },
            { label: "Año", etiquetas: ["E", "F", "M", "A", "M", "J", "J", "A", "S", "O"], valores: [31, 36, 34, 41, 44, 46, 48, 52, 50, 48] },
          ],
          antiguedadTitulo: "Por cobrar, por antigüedad",
          antiguedad: [{ label: "0–30 días", valor: 8400 }, { label: "31–60 días", valor: 3100 }, { label: "61–90 días", valor: 1400 }],
          vencimientosTitulo: "Próximos vencimientos",
          vencimientos: [
            { cliente: "Clínica San Fernando", concepto: "Fase 2 · 50 %", fecha: "20 oct", monto: "US$ 6 400", tono: "run" },
            { cliente: "Inmobiliaria Sur", concepto: "Sincronización", fecha: "30 oct", monto: "US$ 1 800", tono: "run" },
            { cliente: "Sastrería Rey", concepto: "Mantenimiento", fecha: "1 oct", monto: "US$ 120", tono: "ghost" },
            { cliente: "Academia Norte", concepto: "Matrícula noviembre", fecha: "5 nov", monto: "US$ 3 950", tono: "ok" },
          ],
        },
        clientes: {
          titulo: "Clientes", accion: "+ Nuevo cliente", embudoTitulo: "Embudo comercial",
          etapas: [{ label: "Prospectos", n: 18 }, { label: "Propuesta", n: 9 }, { label: "Negociación", n: 4 }, { label: "Clientes", n: 36 }],
          saludLabel: "Salud de la cuenta",
          clientes: [
            { nombre: "Clínica San Fernando", industria: "Salud", salud: 92, etapa: 3, desde: "2023" },
            { nombre: "Academia Norte", industria: "Educación", salud: 88, etapa: 3, desde: "2022" },
            { nombre: "Iglesia Central", industria: "Iglesias", salud: 64, etapa: 3, desde: "2026" },
            { nombre: "Laboratorio Delta", industria: "Salud", salud: 40, etapa: 2, desde: "—" },
            { nombre: "Colegio Horizonte", industria: "Educación", salud: 55, etapa: 1, desde: "—" },
            { nombre: "Hotel Bahía", industria: "Turismo", salud: 30, etapa: 0, desde: "—" },
          ],
          calorTitulo: "Satisfacción por industria y mes", meses: ["May", "Jun", "Jul", "Ago", "Sep", "Oct"],
          industrias: ["Salud", "Educación", "Iglesias", "Inmobiliaria"],
          calor: [[88, 90, 91, 93, 95, 96], [84, 86, 85, 89, 92, 94], [80, 82, 86, 88, 90, 91], [78, 81, 83, 85, 88, 90]],
        },
        documentos: {
          titulo: "Documentos", accion: "+ Subir documento",
          carpetas: [{ label: "Todas", n: 312 }, { label: "Contratos", n: 96 }, { label: "Actas", n: 140 }, { label: "Facturas", n: 76 }],
          docs: [
            { nombre: "Contrato Fase 2 · Clínica San Fernando", tipo: "CT", carpeta: 1, estado: { t: "Pendiente de firma", tono: "run" }, fecha: "7 oct" },
            { nombre: "Acta de junta 08-10 · Unión Adventista", tipo: "AC", carpeta: 2, estado: { t: "Firmada", tono: "ok" }, fecha: "8 oct" },
            { nombre: "Factura 2026-118 · Academia Norte", tipo: "FA", carpeta: 3, estado: { t: "Emitida", tono: "ok" }, fecha: "6 oct" },
            { nombre: "Acta de miembros · Iglesia Central", tipo: "AC", carpeta: 2, estado: { t: "Firmada", tono: "ok" }, fecha: "5 oct" },
            { nombre: "Contrato sincronización · Inmobiliaria Sur", tipo: "CT", carpeta: 1, estado: { t: "Borrador", tono: "ghost" }, fecha: "4 oct" },
            { nombre: "Factura 2026-117 · Sastrería Rey", tipo: "FA", carpeta: 3, estado: { t: "Vencida", tono: "ghost" }, fecha: "1 oct" },
          ],
          calendarioTitulo: "Documentos por día", diasCorto: ["L", "M", "X", "J", "V", "S", "D"],
          calendario: [3, 5, 2, 7, 4, 0, 0, 6, 8, 4, 9, 5, 1, 0, 7, 10, 6, 12, 8, 2, 0, 9, 11, 7, 14, 9, 1, 0, 8, 12, 10, 15, 6, 0, 0],
          tipoTitulo: "Por tipo y mes", tipos: ["Actas", "Contratos", "Facturas"], meses: ["Jul", "Ago", "Sep", "Oct"],
          porTipo: [[30, 34, 38, 38], [18, 22, 26, 30], [14, 18, 20, 24]],
          firmasTitulo: "Pendientes de firma",
          firmas: [{ label: "Contrato Fase 2 · Clínica", hecho: false }, { label: "Acta 08-10 · Unión", hecho: true }, { label: "Adenda · Academia Norte", hecho: false }, { label: "NDA · Laboratorio Delta", hecho: true }],
        },
      },
    },
  },
  en: {
    hero: {
      eyebrow: "Custom ERP and CRM · Panama",
      titulo: ["Your ERP or CRM,", "built from scratch", "for your company"],
      bajada: "No templates: we design and build the system your company runs every day, at a fixed price, with three months of warranty.",
      cta: { href: "/en/contacto", label: "Request a proposal" },
      secundario: { href: "/en/portfolio", label: "See delivered systems" },
      metadatos: [
        { k: "What we build", v: "ERP, CRM, SaaS and internal platforms" },
        { k: "How", v: "Custom, from scratch, no third-party licenses" },
        { k: "Delivery", v: "Turnkey price, independent phases" },
      ],
      ventana: {
        app: "Suite", buscar: "Search client, module or document", usuario: "JV", hoy: "Wednesday, October 8",
        demo: "Demo panel: tap the menu, the filters, the stages and the folders",
        menu: [
          { id: "operaciones", chip: "OP", label: "Operations" },
          { id: "cobros", chip: "BI", label: "Billing" },
          { id: "clientes", chip: "CL", label: "Clients" },
          { id: "documentos", chip: "DO", label: "Documents" },
        ],
        operaciones: {
          titulo: "Operations board", accion: "+ New operation", todos: "All",
          columnas: [
            { label: "Scheduled", items: [
              { cliente: "South Realty", modulo: "Wasi sync", responsable: "M. Ríos", dias: 3 },
              { cliente: "North Academy", modulo: "Enrollment reports", responsable: "L. Pérez", dias: 5 },
            ] },
            { label: "In progress", items: [
              { cliente: "San Fernando Clinic", modulo: "Appointments and records", responsable: "M. Ríos", dias: 12 },
              { cliente: "Rey Tailoring", modulo: "Orders and measurements", responsable: "J. Vallejo", dias: 8 },
              { cliente: "Adventist Union", modulo: "Board minutes", responsable: "L. Pérez", dias: 2 },
            ] },
            { label: "Delivered", items: [
              { cliente: "Central Church", modulo: "Members", responsable: "A. Díaz", dias: 0 },
              { cliente: "North Academy", modulo: "Billing", responsable: "L. Pérez", dias: 0 },
            ] },
          ],
          cargaTitulo: "Load by owner", cargaUnidad: "hours this week",
          semanaTitulo: "Current week", dias: ["M", "T", "W", "T", "F"],
          semana: [
            { cliente: "San Fernando Clinic", inicio: 0, fin: 3 },
            { cliente: "Rey Tailoring", inicio: 1, fin: 4 },
            { cliente: "Adventist Union", inicio: 2, fin: 2 },
            { cliente: "South Realty", inicio: 3, fin: 4 },
          ],
        },
        cobros: {
          titulo: "Billing", accion: "+ New invoice", metaLabel: "Monthly goal", cobradoLabel: "Collected so far", meta: 60000, cobrado: 48250,
          graficaTitulo: "Reconciled payments", unidad: "US$ thousands",
          periodos: [
            { label: "Week", etiquetas: ["M", "T", "W", "T", "F", "S", "S"], valores: [4.2, 6.1, 5.4, 7.8, 9.1, 3.2, 2.4] },
            { label: "Month", etiquetas: ["W1", "W2", "W3", "W4"], valores: [9.5, 12.1, 11.4, 15.2] },
            { label: "Year", etiquetas: ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O"], valores: [31, 36, 34, 41, 44, 46, 48, 52, 50, 48] },
          ],
          antiguedadTitulo: "Outstanding, by age",
          antiguedad: [{ label: "0–30 days", valor: 8400 }, { label: "31–60 days", valor: 3100 }, { label: "61–90 days", valor: 1400 }],
          vencimientosTitulo: "Upcoming due dates",
          vencimientos: [
            { cliente: "San Fernando Clinic", concepto: "Phase 2 · 50%", fecha: "Oct 20", monto: "US$ 6,400", tono: "run" },
            { cliente: "South Realty", concepto: "Sync", fecha: "Oct 30", monto: "US$ 1,800", tono: "run" },
            { cliente: "Rey Tailoring", concepto: "Maintenance", fecha: "Oct 1", monto: "US$ 120", tono: "ghost" },
            { cliente: "North Academy", concepto: "November enrollment", fecha: "Nov 5", monto: "US$ 3,950", tono: "ok" },
          ],
        },
        clientes: {
          titulo: "Clients", accion: "+ New client", embudoTitulo: "Sales funnel",
          etapas: [{ label: "Prospects", n: 18 }, { label: "Proposal", n: 9 }, { label: "Negotiation", n: 4 }, { label: "Clients", n: 36 }],
          saludLabel: "Account health",
          clientes: [
            { nombre: "San Fernando Clinic", industria: "Health", salud: 92, etapa: 3, desde: "2023" },
            { nombre: "North Academy", industria: "Education", salud: 88, etapa: 3, desde: "2022" },
            { nombre: "Central Church", industria: "Churches", salud: 64, etapa: 3, desde: "2026" },
            { nombre: "Delta Laboratory", industria: "Health", salud: 40, etapa: 2, desde: "—" },
            { nombre: "Horizonte School", industria: "Education", salud: 55, etapa: 1, desde: "—" },
            { nombre: "Bahía Hotel", industria: "Tourism", salud: 30, etapa: 0, desde: "—" },
          ],
          calorTitulo: "Satisfaction by industry and month", meses: ["May", "Jun", "Jul", "Aug", "Sep", "Oct"],
          industrias: ["Health", "Education", "Churches", "Realty"],
          calor: [[88, 90, 91, 93, 95, 96], [84, 86, 85, 89, 92, 94], [80, 82, 86, 88, 90, 91], [78, 81, 83, 85, 88, 90]],
        },
        documentos: {
          titulo: "Documents", accion: "+ Upload document",
          carpetas: [{ label: "All", n: 312 }, { label: "Contracts", n: 96 }, { label: "Minutes", n: 140 }, { label: "Invoices", n: 76 }],
          docs: [
            { nombre: "Phase 2 contract · San Fernando Clinic", tipo: "CT", carpeta: 1, estado: { t: "Awaiting signature", tono: "run" }, fecha: "Oct 7" },
            { nombre: "Board minutes 10-08 · Adventist Union", tipo: "MN", carpeta: 2, estado: { t: "Signed", tono: "ok" }, fecha: "Oct 8" },
            { nombre: "Invoice 2026-118 · North Academy", tipo: "IN", carpeta: 3, estado: { t: "Issued", tono: "ok" }, fecha: "Oct 6" },
            { nombre: "Members minutes · Central Church", tipo: "MN", carpeta: 2, estado: { t: "Signed", tono: "ok" }, fecha: "Oct 5" },
            { nombre: "Sync contract · South Realty", tipo: "CT", carpeta: 1, estado: { t: "Draft", tono: "ghost" }, fecha: "Oct 4" },
            { nombre: "Invoice 2026-117 · Rey Tailoring", tipo: "IN", carpeta: 3, estado: { t: "Overdue", tono: "ghost" }, fecha: "Oct 1" },
          ],
          calendarioTitulo: "Documents per day", diasCorto: ["M", "T", "W", "T", "F", "S", "S"],
          calendario: [3, 5, 2, 7, 4, 0, 0, 6, 8, 4, 9, 5, 1, 0, 7, 10, 6, 12, 8, 2, 0, 9, 11, 7, 14, 9, 1, 0, 8, 12, 10, 15, 6, 0, 0],
          tipoTitulo: "By type and month", tipos: ["Minutes", "Contracts", "Invoices"], meses: ["Jul", "Aug", "Sep", "Oct"],
          porTipo: [[30, 34, 38, 38], [18, 22, 26, 30], [14, 18, 20, 24]],
          firmasTitulo: "Awaiting signature",
          firmas: [{ label: "Phase 2 contract · Clinic", hecho: false }, { label: "Minutes 10-08 · Union", hecho: true }, { label: "Addendum · North Academy", hecho: false }, { label: "NDA · Delta Laboratory", hecho: true }],
        },
      },
    },
  },
};

/** Capacidades: lo que construimos, con una escena de producto por capacidad. */
export type Capacidad = { id: string; n: string; titulo: string; apoyo: string; modulos: string[] };
export const CAPACIDADES: Record<Lang, { eyebrow: string; titulo: string[]; bajada: string; items: Capacidad[] }> = {
  es: {
    eyebrow: "03 · Capacidades",
    titulo: ["Un sistema para cada", "parte de la operación"],
    bajada: "Cinco tipos de sistema que ya entregamos en producción. Cada uno se diseña desde cero para su empresa.",
    items: [
      { id: "erp", n: "01", titulo: "ERP y sistemas internos", apoyo: "Operaciones, inventario, cobros y reportes en un solo lugar, con permisos por rol.", modulos: ["Operaciones", "Inventario", "Cobros", "Reportes", "Roles"] },
      { id: "crm", n: "02", titulo: "CRM y ventas", apoyo: "Del prospecto al cliente: embudo, seguimiento, propuestas y cotizaciones con historial.", modulos: ["Embudo", "Seguimiento", "Cotizaciones", "Historial"] },
      { id: "saas", n: "03", titulo: "SaaS multi-tenant y white-label", apoyo: "Una plataforma, muchas empresas: cada una con su marca, sus datos aislados y su plan.", modulos: ["Tenants", "Marca propia", "Planes", "Facturación"] },
      { id: "portal", n: "04", titulo: "Portales, CMS y apps de clientes", apoyo: "Lo que ve el público: catálogo, reservas, citas y contenido que su equipo edita sin programar.", modulos: ["Catálogo", "Reservas", "Citas", "Editor"] },
      { id: "ia", n: "05", titulo: "Integraciones y automatización con IA", apoyo: "Conectamos con Wasi, Google Workspace, WhatsApp y bancos, y automatizamos lo repetitivo con IA.", modulos: ["APIs", "Google Workspace", "WhatsApp", "Modelos de IA"] },
    ],
  },
  en: {
    eyebrow: "03 · Capabilities",
    titulo: ["One system for every", "part of the operation"],
    bajada: "Five kinds of system we have already delivered to production. Each one is designed from scratch for your company.",
    items: [
      { id: "erp", n: "01", titulo: "ERP and internal systems", apoyo: "Operations, inventory, billing and reports in one place, with role-based permissions.", modulos: ["Operations", "Inventory", "Billing", "Reports", "Roles"] },
      { id: "crm", n: "02", titulo: "CRM and sales", apoyo: "From prospect to client: funnel, follow-up, proposals and quotes with history.", modulos: ["Funnel", "Follow-up", "Quotes", "History"] },
      { id: "saas", n: "03", titulo: "Multi-tenant and white-label SaaS", apoyo: "One platform, many companies: each with its brand, isolated data and plan.", modulos: ["Tenants", "Own brand", "Plans", "Billing"] },
      { id: "portal", n: "04", titulo: "Portals, CMS and client apps", apoyo: "What the public sees: catalog, bookings, appointments and content your team edits without code.", modulos: ["Catalog", "Bookings", "Appointments", "Editor"] },
      { id: "ia", n: "05", titulo: "Integrations and AI automation", apoyo: "We connect Wasi, Google Workspace, WhatsApp and banks, and automate the repetitive with AI.", modulos: ["APIs", "Google Workspace", "WhatsApp", "AI models"] },
    ],
  },
};

/** Proceso (paso 8). Origen: "Cómo comenzamos" (pasos en círculos) y la tarjeta de fase de la propuesta.
 *  Precio llave en mano y garantía post-entrega salen de SITE.cifras; no hay plazos inventados. */
export const PROCESO: Record<Lang, {
  eyebrow: string; titulo: string[]; bajada: string;
  pasos: { titulo: string; texto: string; marca: string }[];
  cierre: { titulo: string; texto: string; pills: string[] }[];
  cta: { href: string; label: string };
}> = {
  es: {
    eyebrow: "05 · Proceso",
    titulo: ["Un precio cerrado,", "fases que se entregan solas"],
    bajada: "Así trabajamos cada sistema: primero entendemos la operación, después fijamos el precio y recién entonces programamos. Cada fase se usa desde que se entrega.",
    pasos: [
      { titulo: "Conversación inicial", texto: "Una reunión para entender cómo opera hoy su empresa: qué se hace en hojas de cálculo, qué se repite a mano, dónde se pierde información.", marca: "Sin costo" },
      { titulo: "Propuesta con precio cerrado", texto: "Un documento con el alcance por módulo, el precio de cada fase y lo que incluye. Las fases son independientes: usted decide cuáles y en qué orden.", marca: "Llave en mano" },
      { titulo: "Diseño de pantallas", texto: "Antes de programar, las pantallas del sistema se diseñan y se aprueban con quienes lo van a usar todos los días.", marca: "Aprobación suya" },
      { titulo: "Construcción por fases", texto: "Cada fase se programa, se prueba con sus datos reales y se entrega funcionando. No hay que esperar al final para empezar a usar el sistema.", marca: "Entregas que se usan" },
      { titulo: "Entrega, capacitación y garantía", texto: "Capacitamos al equipo, dejamos el sistema en su propio dominio y respondemos por él durante la garantía. El código y los datos son suyos.", marca: "3 meses de garantía" },
    ],
    cierre: [
      { titulo: "Precio llave en mano", texto: "El precio de cada fase se fija en la propuesta y no cambia durante el proyecto. Incluye diseño, programación, pruebas, puesta en marcha y capacitación.", pills: ["Sin licencias ajenas", "Sin cobros por usuario", "Fases independientes"] },
      { titulo: "Garantía de tres meses", texto: "Después de entregar, cualquier error se corrige sin costo durante tres meses. Después, usted elige si quiere soporte continuo.", pills: ["Correcciones incluidas", "Código y datos suyos", "Soporte opcional"] },
    ],
    cta: { href: "/es/contacto", label: "Pedir una propuesta" },
  },
  en: {
    eyebrow: "05 · Process",
    titulo: ["A fixed price,", "phases that deliver themselves"],
    bajada: "This is how we build every system: first we understand the operation, then we fix the price, and only then we code. Each phase is in use from the day it ships.",
    pasos: [
      { titulo: "First conversation", texto: "One meeting to understand how your company runs today: what lives in spreadsheets, what is repeated by hand, where information gets lost.", marca: "Free" },
      { titulo: "Proposal with a fixed price", texto: "A document with the scope per module, the price of each phase and what it includes. Phases are independent: you choose which ones and in what order.", marca: "Turnkey" },
      { titulo: "Screen design", texto: "Before coding, the system's screens are designed and approved with the people who will use them every day.", marca: "Your approval" },
      { titulo: "Build in phases", texto: "Each phase is coded, tested with your real data and delivered working. You don't wait until the end to start using the system.", marca: "Deliveries you use" },
      { titulo: "Handover, training and warranty", texto: "We train the team, leave the system on your own domain and stand behind it during the warranty. The code and the data are yours.", marca: "3-month warranty" },
    ],
    cierre: [
      { titulo: "Turnkey price", texto: "The price of each phase is set in the proposal and does not change during the project. It covers design, coding, testing, launch and training.", pills: ["No third-party licenses", "No per-user fees", "Independent phases"] },
      { titulo: "Three-month warranty", texto: "After delivery, any defect is fixed at no cost for three months. After that, you decide whether you want ongoing support.", pills: ["Fixes included", "Your code and data", "Optional support"] },
    ],
    cta: { href: "/en/contacto", label: "Request a proposal" },
  },
};

/** Industrias (paso 9). Las industrias y los sistemas salen de content/portfolio.ts: nada inventado. */
export const INDUSTRIAS_SEC: Record<Lang, { eyebrow: string; titulo: string[]; bajada: string; sistemas: (n: number) => string; ver: string }> = {
  es: { eyebrow: "06 · Industrias", titulo: ["Operaciones distintas,", "el mismo rigor"], bajada: "Cada industria tiene su propia forma de cobrar, de atender y de rendir cuentas. Estos son los sectores donde ya hay un sistema de Pime en producción.", sistemas: (n) => (n === 1 ? "1 sistema" : `${n} sistemas`), ver: "Ver los casos" },
  en: { eyebrow: "06 · Industries", titulo: ["Different operations,", "the same rigor"], bajada: "Every industry has its own way of billing, serving and reporting. These are the sectors where a Pime system is already in production.", sistemas: (n) => (n === 1 ? "1 system" : `${n} systems`), ver: "See the cases" },
};

/** Cierre y contacto (paso 9). Origen: la página de cierre de la propuesta (único fondo oscuro, pasos
 *  numerados en círculos, nombre y dominio). Teléfono de SITE. */
export const CIERRE: Record<Lang, { eyebrow: string; titulo: string[]; bajada: string; pasos: { titulo: string; texto: string }[]; cta: { href: string; label: string }; llamar: string; horario: string; gracias: string }> = {
  es: {
    eyebrow: "07 · Hablemos",
    titulo: ["Cuéntenos cómo opera", "hoy su empresa"],
    bajada: "En una conversación de media hora sabemos si un sistema a medida le conviene y qué fase tendría sentido primero.",
    pasos: [
      { titulo: "Cuéntenos su operación", texto: "Qué hace su equipo todos los días y dónde se traba." },
      { titulo: "Reciba una propuesta", texto: "Precio cerrado por fase, alcance claro, sin letra chica." },
      { titulo: "Empiece por lo urgente", texto: "La primera fase se usa desde que se entrega." },
    ],
    cta: { href: "/es/contacto", label: "Pedir una propuesta" },
    llamar: "Llamar al",
    horario: "Panamá",
    gracias: "Gracias por la confianza.",
  },
  en: {
    eyebrow: "07 · Let's talk",
    titulo: ["Tell us how your", "company runs today"],
    bajada: "In a half-hour conversation we know whether a custom system makes sense for you and which phase should come first.",
    pasos: [
      { titulo: "Tell us about your operation", texto: "What your team does every day and where it gets stuck." },
      { titulo: "Get a proposal", texto: "Fixed price per phase, clear scope, no fine print." },
      { titulo: "Start with what's urgent", texto: "The first phase is in use from the day it ships." },
    ],
    cta: { href: "/en/contacto", label: "Request a proposal" },
    llamar: "Call",
    horario: "Panama",
    gracias: "Thank you for your trust.",
  },
};

/** Footer (paso 10). Origen: cabecera y pie de documento de la propuesta + wordmark "PIME" en Manrope 800. */
export const FOOTER: Record<Lang, { lema: string; secciones: string; paginas: string; contacto: string; idioma: { href: string; label: string }; derechos: string; hecho: string; gracias: string }> = {
  es: { lema: "ERP y CRM a medida, construidos desde cero en Panamá.", secciones: "Inicio", paginas: "Páginas", contacto: "Contacto", idioma: { href: "/en", label: "English" }, derechos: "Todos los derechos reservados", hecho: "Panamá", gracias: "Gracias por la confianza." },
  en: { lema: "Custom ERP and CRM, built from scratch in Panama.", secciones: "Home", paginas: "Pages", contacto: "Contact", idioma: { href: "/es", label: "Español" }, derechos: "All rights reserved", hecho: "Panama", gracias: "Thank you for your trust." },
};
