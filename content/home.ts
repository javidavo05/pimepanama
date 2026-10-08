import type { Lang } from "./site";

type Tono = "ok" | "run" | "ghost";

/** Copy de la home. Titulares de 8 palabras o menos; una línea de apoyo. */
export const HOME: Record<Lang, {
  hero: {
    eyebrow: string;
    titulo: string[]; // una entrada por línea
    bajada: string;
    cta: { href: string; label: string };
    secundario: { href: string; label: string };
    metadatos: { k: string; v: string }[];
    /** Pantalla completa de un sistema de Pime, construida en HTML/CSS/SVG. */
    ventana: {
      app: string;
      ruta: string[];
      buscar: string;
      usuario: string;
      menu: { chip: string; label: string }[];
      activo: number;
      titulo: string;
      hoy: string;
      kpis: { k: string; v: number; prefijo?: string; sufijo?: string }[];
      columnas: string[];
      filas: { cliente: string; modulo: string; responsable: string; antes: { t: string; tono: Tono }; despues: { t: string; tono: Tono }; monto: string }[];
      grafica: { titulo: string; sub: string };
      actividad: { titulo: string; items: { chip: string; t: string; h: string }[] };
      aviso: { titulo: string; texto: string };
    };
  };
}> = {
  es: {
    hero: {
      eyebrow: "Desarrollo de software · Panamá",
      titulo: ["Software que", "su empresa opera", "todos los días"],
      bajada: "Sistemas a medida entregados en producción, con precio cerrado y tres meses de garantía.",
      cta: { href: "/es/contacto", label: "Pedir una propuesta" },
      secundario: { href: "/es/portfolio", label: "Ver el trabajo" },
      metadatos: [
        { k: "Qué hacemos", v: "Sistemas internos, SaaS y plataformas" },
        { k: "Para quién", v: "Empresas e instituciones en Panamá" },
        { k: "Cómo", v: "Precio llave en mano, fases independientes" },
      ],
      ventana: {
        app: "Suite",
        ruta: ["Operaciones", "Hoy"],
        buscar: "Buscar cliente, módulo o documento",
        usuario: "JV",
        menu: [
          { chip: "IN", label: "Inicio" },
          { chip: "OP", label: "Operaciones" },
          { chip: "CL", label: "Clientes" },
          { chip: "CO", label: "Cobros" },
          { chip: "DO", label: "Documentos" },
          { chip: "AJ", label: "Ajustes" },
        ],
        activo: 1,
        titulo: "Operaciones",
        hoy: "Miércoles 8 de octubre",
        kpis: [
          { k: "Operaciones abiertas", v: 128 },
          { k: "Cobrado este mes", v: 48250, prefijo: "US$" },
          { k: "Entregas a tiempo", v: 98, sufijo: "%" },
        ],
        columnas: ["Cliente", "Módulo", "Responsable", "Estado", "Monto"],
        filas: [
          { cliente: "Clínica San Fernando", modulo: "Citas y expedientes", responsable: "M. Ríos", antes: { t: "En curso", tono: "run" }, despues: { t: "Entregado", tono: "ok" }, monto: "US$ 6 400" },
          { cliente: "Academia Norte", modulo: "Cobros y matrícula", responsable: "L. Pérez", antes: { t: "Programado", tono: "ghost" }, despues: { t: "En curso", tono: "run" }, monto: "US$ 3 950" },
          { cliente: "Iglesia Central", modulo: "Miembros y actas", responsable: "A. Díaz", antes: { t: "Al día", tono: "ok" }, despues: { t: "Al día", tono: "ok" }, monto: "US$ 2 100" },
          { cliente: "Inmobiliaria Sur", modulo: "Sincronización Wasi", responsable: "M. Ríos", antes: { t: "Programado", tono: "ghost" }, despues: { t: "Al día", tono: "ok" }, monto: "US$ 1 800" },
          { cliente: "Sastrería Rey", modulo: "Pedidos y medidas", responsable: "J. Vallejo", antes: { t: "En curso", tono: "run" }, despues: { t: "Entregado", tono: "ok" }, monto: "US$ 5 200" },
          { cliente: "Unión Adventista", modulo: "Secretaría y juntas", responsable: "L. Pérez", antes: { t: "Al día", tono: "ok" }, despues: { t: "Al día", tono: "ok" }, monto: "US$ 7 300" },
        ],
        grafica: { titulo: "Cobros por semana", sub: "Facturado y conciliado" },
        actividad: {
          titulo: "Actividad",
          items: [
            { chip: "F2", t: "Fase 2 aprobada · Panel de proveedores", h: "09:12" },
            { chip: "CO", t: "Cobro conciliado · Academia Norte", h: "08:40" },
            { chip: "DO", t: "Acta firmada · Iglesia Central", h: "08:05" },
          ],
        },
        aviso: { titulo: "Fase 2 aprobada", texto: "Panel de proveedores pasa a producción" },
      },
    },
  },
  en: {
    hero: {
      eyebrow: "Software development · Panama",
      titulo: ["Software your", "company runs", "every day"],
      bajada: "Custom systems delivered to production, at a fixed price, with three months of warranty.",
      cta: { href: "/en/contacto", label: "Request a proposal" },
      secundario: { href: "/en/portfolio", label: "See the work" },
      metadatos: [
        { k: "What we build", v: "Internal systems, SaaS and platforms" },
        { k: "For whom", v: "Companies and institutions in Panama" },
        { k: "How", v: "Turnkey price, independent phases" },
      ],
      ventana: {
        app: "Suite",
        ruta: ["Operations", "Today"],
        buscar: "Search client, module or document",
        usuario: "JV",
        menu: [
          { chip: "HO", label: "Home" },
          { chip: "OP", label: "Operations" },
          { chip: "CL", label: "Clients" },
          { chip: "BI", label: "Billing" },
          { chip: "DO", label: "Documents" },
          { chip: "SE", label: "Settings" },
        ],
        activo: 1,
        titulo: "Operations",
        hoy: "Wednesday, October 8",
        kpis: [
          { k: "Open operations", v: 128 },
          { k: "Billed this month", v: 48250, prefijo: "US$" },
          { k: "On-time deliveries", v: 98, sufijo: "%" },
        ],
        columnas: ["Client", "Module", "Owner", "Status", "Amount"],
        filas: [
          { cliente: "San Fernando Clinic", modulo: "Appointments and records", responsable: "M. Ríos", antes: { t: "In progress", tono: "run" }, despues: { t: "Delivered", tono: "ok" }, monto: "US$ 6,400" },
          { cliente: "North Academy", modulo: "Billing and enrollment", responsable: "L. Pérez", antes: { t: "Scheduled", tono: "ghost" }, despues: { t: "In progress", tono: "run" }, monto: "US$ 3,950" },
          { cliente: "Central Church", modulo: "Members and minutes", responsable: "A. Díaz", antes: { t: "Up to date", tono: "ok" }, despues: { t: "Up to date", tono: "ok" }, monto: "US$ 2,100" },
          { cliente: "South Realty", modulo: "Wasi sync", responsable: "M. Ríos", antes: { t: "Scheduled", tono: "ghost" }, despues: { t: "Up to date", tono: "ok" }, monto: "US$ 1,800" },
          { cliente: "Rey Tailoring", modulo: "Orders and measurements", responsable: "J. Vallejo", antes: { t: "In progress", tono: "run" }, despues: { t: "Delivered", tono: "ok" }, monto: "US$ 5,200" },
          { cliente: "Adventist Union", modulo: "Secretariat and boards", responsable: "L. Pérez", antes: { t: "Up to date", tono: "ok" }, despues: { t: "Up to date", tono: "ok" }, monto: "US$ 7,300" },
        ],
        grafica: { titulo: "Billing per week", sub: "Invoiced and reconciled" },
        actividad: {
          titulo: "Activity",
          items: [
            { chip: "P2", t: "Phase 2 approved · Supplier panel", h: "09:12" },
            { chip: "BI", t: "Payment reconciled · North Academy", h: "08:40" },
            { chip: "DO", t: "Minutes signed · Central Church", h: "08:05" },
          ],
        },
        aviso: { titulo: "Phase 2 approved", texto: "Supplier panel goes to production" },
      },
    },
  },
};
