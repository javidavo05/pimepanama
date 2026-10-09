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
