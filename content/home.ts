import type { Lang } from "./site";

/** Copy de la home. Titulares de 8 palabras o menos; una línea de apoyo. */
export const HOME: Record<Lang, {
  hero: {
    eyebrow: string;
    titulo: string[]; // una entrada por línea
    bajada: string;
    cta: { href: string; label: string };
    secundario: { href: string; label: string };
    metadatos: { k: string; v: string }[];
    ui: {
      operaciones: { titulo: string; estado: string; filas: { cliente: string; modulo: string; antes: { t: string; tono: "ok" | "run" | "ghost" }; despues: { t: string; tono: "ok" | "run" | "ghost" } }[] };
      cobros: { titulo: string; sub: string; prefijo: string; valor: string; delta: string };
      aprobacion: { titulo: string; texto: string; antes: string; despues: string };
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
      ui: {
        operaciones: {
          titulo: "Operaciones",
          estado: "Hoy",
          filas: [
            { cliente: "Clínica San Fernando", modulo: "Citas", antes: { t: "En curso", tono: "run" }, despues: { t: "Al día", tono: "ok" } },
            { cliente: "Academia Norte", modulo: "Cobros", antes: { t: "Programado", tono: "ghost" }, despues: { t: "En curso", tono: "run" } },
            { cliente: "Iglesia Central", modulo: "Miembros", antes: { t: "Al día", tono: "ok" }, despues: { t: "Al día", tono: "ok" } },
            { cliente: "Inmobiliaria Sur", modulo: "Sincronización", antes: { t: "Programada", tono: "ghost" }, despues: { t: "Al día", tono: "ok" } },
            { cliente: "Sastrería Rey", modulo: "Pedidos", antes: { t: "En curso", tono: "run" }, despues: { t: "Entregado", tono: "ok" } },
          ],
        },
        cobros: { titulo: "Cobros del mes", sub: "Facturado y conciliado", prefijo: "US$", valor: "48 250", delta: "+12 % vs. mes anterior" },
        aprobacion: { titulo: "Fase 2", texto: "Panel de proveedores", antes: "Pendiente", despues: "Aprobada" },
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
      ui: {
        operaciones: {
          titulo: "Operations",
          estado: "Today",
          filas: [
            { cliente: "San Fernando Clinic", modulo: "Appointments", antes: { t: "In progress", tono: "run" }, despues: { t: "Up to date", tono: "ok" } },
            { cliente: "North Academy", modulo: "Billing", antes: { t: "Scheduled", tono: "ghost" }, despues: { t: "In progress", tono: "run" } },
            { cliente: "Central Church", modulo: "Members", antes: { t: "Up to date", tono: "ok" }, despues: { t: "Up to date", tono: "ok" } },
            { cliente: "South Realty", modulo: "Sync", antes: { t: "Scheduled", tono: "ghost" }, despues: { t: "Up to date", tono: "ok" } },
            { cliente: "Rey Tailoring", modulo: "Orders", antes: { t: "In progress", tono: "run" }, despues: { t: "Delivered", tono: "ok" } },
          ],
        },
        cobros: { titulo: "Billing this month", sub: "Invoiced and reconciled", prefijo: "US$", valor: "48 250", delta: "+12% vs. last month" },
        aprobacion: { titulo: "Phase 2", texto: "Supplier panel", antes: "Pending", despues: "Approved" },
      },
    },
  },
};
