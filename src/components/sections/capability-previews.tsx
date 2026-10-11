// motion: none — vistas previas estáticas y simétricas de cada capacidad para el carrusel de teléfono y tableta.
// En escritorio va la pantalla funcional (capability-scenes.tsx); aquí cada tarjeta muestra una composición de
// UI de la misma altura y el mismo ritmo (barra, tres cifras, un bloque), con las piezas del sistema (.cv-*).
import type { Lang } from "../../../content/site";
import { Logo } from "@/components/ui/logo";

const t = (lang: Lang, es: string, en: string) => (lang === "es" ? es : en);

function Kpis({ items }: { items: [string, string][] }) {
  return <div className="cv-grid3">{items.map(([k, v]) => <div className="cv-kpi" key={k}><span>{k}</span><b>{v}</b></div>)}</div>;
}
function Rows({ rows }: { rows: [string, string, "ok" | "run" | ""][] }) {
  return <div className="cv-rows">{rows.map(([a, b, p]) => <div className="cv-row" key={a}><span className="cv-dot" /><span>{a}</span><span className={`cv-pill ${p}`}>{b}</span></div>)}</div>;
}

export function CapsPreview({ id, lang }: { id: string; lang: Lang }) {
  if (id === "erp") return (
    <div className="cv" aria-hidden="true">
      <div className="cv-bar"><Logo variant="simbolo" height={12} /><span>{t(lang, "Operaciones · Tablero", "Operations · Board")}</span><span className="cv-pill run">{t(lang, "Hoy", "Today")}</span></div>
      <Kpis items={[[t(lang, "Órdenes", "Orders"), "5"], [t(lang, "En curso", "Running"), "2"], [t(lang, "Facturado", "Billed"), "US$ 48 250"]]} />
      <Rows rows={[[t(lang, "Inmobiliaria Sur · Wasi", "South Realty · Wasi"), t(lang, "Programada", "Scheduled"), ""], [t(lang, "Academia Norte · Reportes", "North Academy · Reports"), t(lang, "En curso", "Running"), "run"], [t(lang, "Clínica San Fernando", "San Fernando Clinic"), t(lang, "En curso", "Running"), "run"], [t(lang, "Iglesia Central · Miembros", "Central Church · Members"), t(lang, "Entregada", "Delivered"), "ok"]]} />
    </div>
  );
  if (id === "crm") return (
    <div className="cv" aria-hidden="true">
      <div className="cv-bar"><Logo variant="simbolo" height={12} /><span>{t(lang, "Ventas · Embudo", "Sales · Funnel")}</span><span className="cv-pill">{t(lang, "Mes", "Month")}</span></div>
      <Kpis items={[[t(lang, "En embudo", "In funnel"), "US$ 80 k"], [t(lang, "Cierres", "Closed"), "32"], [t(lang, "Tasa", "Rate"), "41 %"]]} />
      <div className="cv-rows">{[[t(lang, "Prospectos", "Prospects"), 21, 100], [t(lang, "Propuesta", "Proposal"), 10, 48], [t(lang, "Negociación", "Negotiation"), 3, 22], [t(lang, "Cerrados", "Closed"), 32, 70]].map(([k, n, w]) => <div className="cv-prog" key={String(k)}><span>{k}</span><i style={{ "--w": `${w}%` } as React.CSSProperties} /><b>{n}</b></div>)}</div>
    </div>
  );
  if (id === "saas") return (
    <div className="cv" aria-hidden="true">
      <div className="cv-bar"><Logo variant="simbolo" height={12} /><span>{t(lang, "Plataforma · Empresas", "Platform · Companies")}</span><span className="cv-pill ok">{t(lang, "6 activas", "6 active")}</span></div>
      <Kpis items={[[t(lang, "Empresas", "Companies"), "6"], [t(lang, "Ingreso mensual", "Monthly revenue"), "US$ 1 860"], [t(lang, "Cuentas", "Accounts"), "212"]]} />
      <div className="cv-grid3">{["AC", "SE", "MS"].map((c, i) => <div className="cv-tenant" key={c}><b>{c}</b><em /><i /><em className={`cv-pill ${i === 2 ? "run" : "ok"}`} /></div>)}</div>
    </div>
  );
  if (id === "portal") return (
    <div className="cv" aria-hidden="true">
      <div className="cv-bar"><Logo variant="simbolo" height={12} /><span>{t(lang, "Catálogo · Borrador", "Catalog · Draft")}</span><span className="cv-pill">{t(lang, "Publicar", "Publish")}</span></div>
      <Kpis items={[[t(lang, "Productos", "Products"), "148"], [t(lang, "Reservas", "Bookings"), "7"], [t(lang, "Citas", "Appointments"), "5"]]} />
      <div className="cv-grid3">{[0, 1, 2].map((i) => <div className="cv-item" key={i}><i /><em /><b /></div>)}</div>
    </div>
  );
  return (
    <div className="cv" aria-hidden="true">
      <div className="cv-bar"><Logo variant="simbolo" height={12} /><span>{t(lang, "Documentos · Lectura con IA", "Documents · AI reading")}</span><span className="cv-pill ok">{t(lang, "Al día", "Up to date")}</span></div>
      <Kpis items={[[t(lang, "Leídos hoy", "Read today"), "148"], [t(lang, "Con alerta", "Flagged"), "6"], [t(lang, "Tiempo", "Time"), "9 s"]]} />
      <div className="cv-rows">{[[t(lang, "Reporte de laboratorio.pdf", "Lab report.pdf"), t(lang, "Extraído", "Extracted"), "ok"], [t(lang, "Factura 0042.pdf", "Invoice 0042.pdf"), t(lang, "Clasificado", "Classified"), "ok"], [t(lang, "Acta de junta.docx", "Board minutes.docx"), t(lang, "Revisar", "Review"), "run"], [t(lang, "Contrato marco.pdf", "Master agreement.pdf"), t(lang, "Extraído", "Extracted"), "ok"]].map(([a, b, p]) => <div className="cv-row" key={a}><span className="cv-doc" /><span>{a}</span><span className={`cv-pill ${p}`}>{b}</span></div>)}</div>
    </div>
  );
}
