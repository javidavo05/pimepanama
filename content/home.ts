import type { Lang } from "./site";

export type Tono = "ok" | "run" | "ghost";
export type Fila = { cliente: string; modulo: string; responsable: string; estado: { t: string; tono: Tono }; monto: string };
export type Vista = {
  id: string;
  chip: string;
  label: string;
  titulo: string;
  accion: string;
  kpis: { k: string; v: number; prefijo?: string; sufijo?: string; serie: number[] }[];
  grafica: { tipo: "linea" | "barras"; titulo: string; unidad: string; etiquetas: string[]; periodos: { label: string; valores: number[] }[] };
  dona: { titulo: string; partes: { label: string; valor: number }[] };
  columnas: string[];
  filtros: string[];
  filas: Fila[];
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
    ventana: { app: string; buscar: string; usuario: string; hoy: string; demo: string; vistas: Vista[] };
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
        app: "Suite",
        buscar: "Buscar cliente, módulo o documento",
        usuario: "JV",
        hoy: "Miércoles 8 de octubre",
        demo: "Panel de demostración: tocá el menú, los períodos y los filtros",
        vistas: [
          {
            id: "operaciones", chip: "OP", label: "Operaciones", titulo: "Operaciones", accion: "+ Nueva operación",
            kpis: [
              { k: "Operaciones abiertas", v: 128, serie: [96, 104, 101, 112, 118, 115, 128] },
              { k: "Entregas a tiempo", v: 98, sufijo: "%", serie: [91, 93, 95, 94, 97, 97, 98] },
              { k: "Horas registradas", v: 1240, serie: [820, 900, 980, 1050, 1120, 1180, 1240] },
            ],
            grafica: { tipo: "barras", titulo: "Operaciones por módulo", unidad: "operaciones", etiquetas: ["Citas", "Cobros", "Miembros", "Sync", "Pedidos", "Actas"],
              periodos: [
                { label: "Semana", valores: [14, 22, 9, 6, 17, 11] },
                { label: "Mes", valores: [58, 84, 37, 21, 66, 42] },
                { label: "Trimestre", valores: [172, 240, 118, 64, 196, 131] },
              ] },
            dona: { titulo: "Estado de las operaciones", partes: [{ label: "Al día", valor: 72 }, { label: "En curso", valor: 41 }, { label: "Programadas", valor: 15 }] },
            columnas: ["Cliente", "Módulo", "Responsable", "Estado", "Monto"],
            filtros: ["Todas", "En curso", "Al día", "Entregado"],
            filas: [
              { cliente: "Clínica San Fernando", modulo: "Citas y expedientes", responsable: "M. Ríos", estado: { t: "En curso", tono: "run" }, monto: "US$ 6 400" },
              { cliente: "Academia Norte", modulo: "Cobros y matrícula", responsable: "L. Pérez", estado: { t: "Al día", tono: "ok" }, monto: "US$ 3 950" },
              { cliente: "Iglesia Central", modulo: "Miembros y actas", responsable: "A. Díaz", estado: { t: "Entregado", tono: "ok" }, monto: "US$ 2 100" },
              { cliente: "Inmobiliaria Sur", modulo: "Sincronización Wasi", responsable: "M. Ríos", estado: { t: "En curso", tono: "run" }, monto: "US$ 1 800" },
              { cliente: "Sastrería Rey", modulo: "Pedidos y medidas", responsable: "J. Vallejo", estado: { t: "Al día", tono: "ok" }, monto: "US$ 5 200" },
              { cliente: "Unión Adventista", modulo: "Secretaría y juntas", responsable: "L. Pérez", estado: { t: "Entregado", tono: "ok" }, monto: "US$ 7 300" },
            ],
          },
          {
            id: "cobros", chip: "CO", label: "Cobros", titulo: "Cobros", accion: "+ Nueva factura",
            kpis: [
              { k: "Cobrado este mes", v: 48250, prefijo: "US$", serie: [31, 36, 34, 41, 44, 46, 48] },
              { k: "Por cobrar", v: 12900, prefijo: "US$", serie: [21, 19, 18, 16, 15, 14, 13] },
              { k: "Facturas conciliadas", v: 94, sufijo: "%", serie: [80, 84, 86, 89, 91, 93, 94] },
            ],
            grafica: { tipo: "linea", titulo: "Cobros conciliados", unidad: "US$ miles", etiquetas: ["L", "M", "X", "J", "V", "S", "D"],
              periodos: [
                { label: "Semana", valores: [4.2, 6.1, 5.4, 7.8, 9.1, 3.2, 2.4] },
                { label: "Mes", valores: [9.5, 12.1, 11.4, 14.8, 13.2, 16.9, 18.3] },
                { label: "Trimestre", valores: [31, 36, 34, 41, 44, 46, 48] },
              ] },
            dona: { titulo: "Facturas por estado", partes: [{ label: "Pagadas", valor: 118 }, { label: "Pendientes", valor: 27 }, { label: "Vencidas", valor: 6 }] },
            columnas: ["Cliente", "Concepto", "Vence", "Estado", "Monto"],
            filtros: ["Todas", "Pagada", "Pendiente", "Vencida"],
            filas: [
              { cliente: "Academia Norte", modulo: "Matrícula octubre", responsable: "15 oct", estado: { t: "Pagada", tono: "ok" }, monto: "US$ 3 950" },
              { cliente: "Clínica San Fernando", modulo: "Fase 2 · 50 %", responsable: "20 oct", estado: { t: "Pendiente", tono: "run" }, monto: "US$ 6 400" },
              { cliente: "Sastrería Rey", modulo: "Mantenimiento", responsable: "1 oct", estado: { t: "Vencida", tono: "ghost" }, monto: "US$ 120" },
              { cliente: "Inmobiliaria Sur", modulo: "Sincronización", responsable: "30 oct", estado: { t: "Pendiente", tono: "run" }, monto: "US$ 1 800" },
              { cliente: "Unión Adventista", modulo: "Fase 1 · 50 %", responsable: "5 oct", estado: { t: "Pagada", tono: "ok" }, monto: "US$ 7 300" },
              { cliente: "Iglesia Central", modulo: "Soporte", responsable: "12 oct", estado: { t: "Pagada", tono: "ok" }, monto: "US$ 450" },
            ],
          },
          {
            id: "clientes", chip: "CL", label: "Clientes", titulo: "Clientes", accion: "+ Nuevo cliente",
            kpis: [
              { k: "Clientes activos", v: 36, serie: [22, 25, 27, 29, 31, 34, 36] },
              { k: "Nuevos este trimestre", v: 5, serie: [1, 2, 2, 3, 4, 4, 5] },
              { k: "Satisfacción", v: 97, sufijo: "%", serie: [92, 93, 95, 95, 96, 97, 97] },
            ],
            grafica: { tipo: "barras", titulo: "Clientes por industria", unidad: "clientes", etiquetas: ["Salud", "Educación", "Iglesias", "Inmob.", "Retail", "ONG"],
              periodos: [
                { label: "Activos", valores: [7, 9, 6, 5, 6, 3] },
                { label: "Nuevos", valores: [1, 2, 0, 1, 1, 0] },
                { label: "Histórico", valores: [11, 14, 9, 8, 10, 5] },
              ] },
            dona: { titulo: "Clientes por plan", partes: [{ label: "Suite completa", valor: 14 }, { label: "Módulos", valor: 16 }, { label: "Sitio", valor: 6 }] },
            columnas: ["Cliente", "Industria", "Contacto", "Estado", "Desde"],
            filtros: ["Todos", "Activo", "Onboarding", "Pausado"],
            filas: [
              { cliente: "Clínica San Fernando", modulo: "Salud", responsable: "Dra. Mendoza", estado: { t: "Activo", tono: "ok" }, monto: "2023" },
              { cliente: "Academia Norte", modulo: "Educación", responsable: "C. Ortega", estado: { t: "Activo", tono: "ok" }, monto: "2022" },
              { cliente: "Iglesia Central", modulo: "Iglesias", responsable: "Pr. Gómez", estado: { t: "Onboarding", tono: "run" }, monto: "2026" },
              { cliente: "Inmobiliaria Sur", modulo: "Inmobiliaria", responsable: "R. Castillo", estado: { t: "Activo", tono: "ok" }, monto: "2024" },
              { cliente: "Sastrería Rey", modulo: "Retail", responsable: "J. Rey", estado: { t: "Pausado", tono: "ghost" }, monto: "2021" },
              { cliente: "Unión Adventista", modulo: "ONG", responsable: "Secretaría", estado: { t: "Activo", tono: "ok" }, monto: "2020" },
            ],
          },
          {
            id: "documentos", chip: "DO", label: "Documentos", titulo: "Documentos", accion: "+ Subir documento",
            kpis: [
              { k: "Documentos este mes", v: 312, serie: [180, 210, 240, 255, 280, 296, 312] },
              { k: "Firmados", v: 89, sufijo: "%", serie: [70, 74, 78, 81, 85, 87, 89] },
              { k: "Pendientes de firma", v: 14, serie: [31, 28, 25, 22, 19, 16, 14] },
            ],
            grafica: { tipo: "linea", titulo: "Documentos firmados", unidad: "documentos", etiquetas: ["L", "M", "X", "J", "V", "S", "D"],
              periodos: [
                { label: "Semana", valores: [12, 18, 15, 22, 27, 6, 4] },
                { label: "Mes", valores: [48, 61, 57, 72, 80, 91, 96] },
                { label: "Trimestre", valores: [180, 210, 240, 255, 280, 296, 312] },
              ] },
            dona: { titulo: "Documentos por tipo", partes: [{ label: "Actas", valor: 140 }, { label: "Contratos", valor: 96 }, { label: "Facturas", valor: 76 }] },
            columnas: ["Documento", "Cliente", "Responsable", "Estado", "Fecha"],
            filtros: ["Todos", "Firmado", "Pendiente", "Borrador"],
            filas: [
              { cliente: "Acta de junta 08-10", modulo: "Unión Adventista", responsable: "L. Pérez", estado: { t: "Firmado", tono: "ok" }, monto: "8 oct" },
              { cliente: "Contrato Fase 2", modulo: "Clínica San Fernando", responsable: "J. Vallejo", estado: { t: "Pendiente", tono: "run" }, monto: "7 oct" },
              { cliente: "Factura 2026-118", modulo: "Academia Norte", responsable: "Sistema", estado: { t: "Firmado", tono: "ok" }, monto: "6 oct" },
              { cliente: "Propuesta mantenimiento", modulo: "Sastrería Rey", responsable: "J. Vallejo", estado: { t: "Borrador", tono: "ghost" }, monto: "6 oct" },
              { cliente: "Acta de miembros", modulo: "Iglesia Central", responsable: "A. Díaz", estado: { t: "Firmado", tono: "ok" }, monto: "5 oct" },
              { cliente: "Contrato sincronización", modulo: "Inmobiliaria Sur", responsable: "M. Ríos", estado: { t: "Pendiente", tono: "run" }, monto: "4 oct" },
            ],
          },
        ],
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
        app: "Suite",
        buscar: "Search client, module or document",
        usuario: "JV",
        hoy: "Wednesday, October 8",
        demo: "Demo panel: tap the menu, the periods and the filters",
        vistas: [
          {
            id: "operaciones", chip: "OP", label: "Operations", titulo: "Operations", accion: "+ New operation",
            kpis: [
              { k: "Open operations", v: 128, serie: [96, 104, 101, 112, 118, 115, 128] },
              { k: "On-time deliveries", v: 98, sufijo: "%", serie: [91, 93, 95, 94, 97, 97, 98] },
              { k: "Hours logged", v: 1240, serie: [820, 900, 980, 1050, 1120, 1180, 1240] },
            ],
            grafica: { tipo: "barras", titulo: "Operations by module", unidad: "operations", etiquetas: ["Appts", "Billing", "Members", "Sync", "Orders", "Minutes"],
              periodos: [
                { label: "Week", valores: [14, 22, 9, 6, 17, 11] },
                { label: "Month", valores: [58, 84, 37, 21, 66, 42] },
                { label: "Quarter", valores: [172, 240, 118, 64, 196, 131] },
              ] },
            dona: { titulo: "Operations by status", partes: [{ label: "Up to date", valor: 72 }, { label: "In progress", valor: 41 }, { label: "Scheduled", valor: 15 }] },
            columnas: ["Client", "Module", "Owner", "Status", "Amount"],
            filtros: ["All", "In progress", "Up to date", "Delivered"],
            filas: [
              { cliente: "San Fernando Clinic", modulo: "Appointments and records", responsable: "M. Ríos", estado: { t: "In progress", tono: "run" }, monto: "US$ 6,400" },
              { cliente: "North Academy", modulo: "Billing and enrollment", responsable: "L. Pérez", estado: { t: "Up to date", tono: "ok" }, monto: "US$ 3,950" },
              { cliente: "Central Church", modulo: "Members and minutes", responsable: "A. Díaz", estado: { t: "Delivered", tono: "ok" }, monto: "US$ 2,100" },
              { cliente: "South Realty", modulo: "Wasi sync", responsable: "M. Ríos", estado: { t: "In progress", tono: "run" }, monto: "US$ 1,800" },
              { cliente: "Rey Tailoring", modulo: "Orders and measurements", responsable: "J. Vallejo", estado: { t: "Up to date", tono: "ok" }, monto: "US$ 5,200" },
              { cliente: "Adventist Union", modulo: "Secretariat and boards", responsable: "L. Pérez", estado: { t: "Delivered", tono: "ok" }, monto: "US$ 7,300" },
            ],
          },
          {
            id: "cobros", chip: "BI", label: "Billing", titulo: "Billing", accion: "+ New invoice",
            kpis: [
              { k: "Billed this month", v: 48250, prefijo: "US$", serie: [31, 36, 34, 41, 44, 46, 48] },
              { k: "Outstanding", v: 12900, prefijo: "US$", serie: [21, 19, 18, 16, 15, 14, 13] },
              { k: "Reconciled invoices", v: 94, sufijo: "%", serie: [80, 84, 86, 89, 91, 93, 94] },
            ],
            grafica: { tipo: "linea", titulo: "Reconciled payments", unidad: "US$ thousands", etiquetas: ["M", "T", "W", "T", "F", "S", "S"],
              periodos: [
                { label: "Week", valores: [4.2, 6.1, 5.4, 7.8, 9.1, 3.2, 2.4] },
                { label: "Month", valores: [9.5, 12.1, 11.4, 14.8, 13.2, 16.9, 18.3] },
                { label: "Quarter", valores: [31, 36, 34, 41, 44, 46, 48] },
              ] },
            dona: { titulo: "Invoices by status", partes: [{ label: "Paid", valor: 118 }, { label: "Pending", valor: 27 }, { label: "Overdue", valor: 6 }] },
            columnas: ["Client", "Concept", "Due", "Status", "Amount"],
            filtros: ["All", "Paid", "Pending", "Overdue"],
            filas: [
              { cliente: "North Academy", modulo: "October enrollment", responsable: "Oct 15", estado: { t: "Paid", tono: "ok" }, monto: "US$ 3,950" },
              { cliente: "San Fernando Clinic", modulo: "Phase 2 · 50%", responsable: "Oct 20", estado: { t: "Pending", tono: "run" }, monto: "US$ 6,400" },
              { cliente: "Rey Tailoring", modulo: "Maintenance", responsable: "Oct 1", estado: { t: "Overdue", tono: "ghost" }, monto: "US$ 120" },
              { cliente: "South Realty", modulo: "Sync", responsable: "Oct 30", estado: { t: "Pending", tono: "run" }, monto: "US$ 1,800" },
              { cliente: "Adventist Union", modulo: "Phase 1 · 50%", responsable: "Oct 5", estado: { t: "Paid", tono: "ok" }, monto: "US$ 7,300" },
              { cliente: "Central Church", modulo: "Support", responsable: "Oct 12", estado: { t: "Paid", tono: "ok" }, monto: "US$ 450" },
            ],
          },
          {
            id: "clientes", chip: "CL", label: "Clients", titulo: "Clients", accion: "+ New client",
            kpis: [
              { k: "Active clients", v: 36, serie: [22, 25, 27, 29, 31, 34, 36] },
              { k: "New this quarter", v: 5, serie: [1, 2, 2, 3, 4, 4, 5] },
              { k: "Satisfaction", v: 97, sufijo: "%", serie: [92, 93, 95, 95, 96, 97, 97] },
            ],
            grafica: { tipo: "barras", titulo: "Clients by industry", unidad: "clients", etiquetas: ["Health", "Education", "Churches", "Realty", "Retail", "NGO"],
              periodos: [
                { label: "Active", valores: [7, 9, 6, 5, 6, 3] },
                { label: "New", valores: [1, 2, 0, 1, 1, 0] },
                { label: "All time", valores: [11, 14, 9, 8, 10, 5] },
              ] },
            dona: { titulo: "Clients by plan", partes: [{ label: "Full suite", valor: 14 }, { label: "Modules", valor: 16 }, { label: "Website", valor: 6 }] },
            columnas: ["Client", "Industry", "Contact", "Status", "Since"],
            filtros: ["All", "Active", "Onboarding", "Paused"],
            filas: [
              { cliente: "San Fernando Clinic", modulo: "Health", responsable: "Dr. Mendoza", estado: { t: "Active", tono: "ok" }, monto: "2023" },
              { cliente: "North Academy", modulo: "Education", responsable: "C. Ortega", estado: { t: "Active", tono: "ok" }, monto: "2022" },
              { cliente: "Central Church", modulo: "Churches", responsable: "Pr. Gómez", estado: { t: "Onboarding", tono: "run" }, monto: "2026" },
              { cliente: "South Realty", modulo: "Realty", responsable: "R. Castillo", estado: { t: "Active", tono: "ok" }, monto: "2024" },
              { cliente: "Rey Tailoring", modulo: "Retail", responsable: "J. Rey", estado: { t: "Paused", tono: "ghost" }, monto: "2021" },
              { cliente: "Adventist Union", modulo: "NGO", responsable: "Secretariat", estado: { t: "Active", tono: "ok" }, monto: "2020" },
            ],
          },
          {
            id: "documentos", chip: "DO", label: "Documents", titulo: "Documents", accion: "+ Upload document",
            kpis: [
              { k: "Documents this month", v: 312, serie: [180, 210, 240, 255, 280, 296, 312] },
              { k: "Signed", v: 89, sufijo: "%", serie: [70, 74, 78, 81, 85, 87, 89] },
              { k: "Awaiting signature", v: 14, serie: [31, 28, 25, 22, 19, 16, 14] },
            ],
            grafica: { tipo: "linea", titulo: "Signed documents", unidad: "documents", etiquetas: ["M", "T", "W", "T", "F", "S", "S"],
              periodos: [
                { label: "Week", valores: [12, 18, 15, 22, 27, 6, 4] },
                { label: "Month", valores: [48, 61, 57, 72, 80, 91, 96] },
                { label: "Quarter", valores: [180, 210, 240, 255, 280, 296, 312] },
              ] },
            dona: { titulo: "Documents by type", partes: [{ label: "Minutes", valor: 140 }, { label: "Contracts", valor: 96 }, { label: "Invoices", valor: 76 }] },
            columnas: ["Document", "Client", "Owner", "Status", "Date"],
            filtros: ["All", "Signed", "Pending", "Draft"],
            filas: [
              { cliente: "Board minutes 10-08", modulo: "Adventist Union", responsable: "L. Pérez", estado: { t: "Signed", tono: "ok" }, monto: "Oct 8" },
              { cliente: "Phase 2 contract", modulo: "San Fernando Clinic", responsable: "J. Vallejo", estado: { t: "Pending", tono: "run" }, monto: "Oct 7" },
              { cliente: "Invoice 2026-118", modulo: "North Academy", responsable: "System", estado: { t: "Signed", tono: "ok" }, monto: "Oct 6" },
              { cliente: "Maintenance proposal", modulo: "Rey Tailoring", responsable: "J. Vallejo", estado: { t: "Draft", tono: "ghost" }, monto: "Oct 6" },
              { cliente: "Members minutes", modulo: "Central Church", responsable: "A. Díaz", estado: { t: "Signed", tono: "ok" }, monto: "Oct 5" },
              { cliente: "Sync contract", modulo: "South Realty", responsable: "M. Ríos", estado: { t: "Pending", tono: "run" }, monto: "Oct 4" },
            ],
          },
        ],
      },
    },
  },
};
