// motion: none — tableros de cada plataforma del portfolio, construidos en HTML/CSS/SVG con las piezas del
// sistema visual y DATOS DE MUESTRA (nombres, cifras y fechas inventados: nunca datos reales de clientes).
// Cada tablero reproduce la estructura real del sistema: sus módulos, sus pantallas y su tipo de información.
import { LetterChip, Pill } from "@/components/ui/primitives";
import { AreaChart, Calendar, Funnel, Gantt, HBars, Heat, Ring, Stacked } from "./charts";
import type { Lang } from "../../../content/site";

const t = (lang: Lang, es: string, en: string) => (lang === "es" ? es : en);

function Frame({ app, modulo, menu, activo, children, lang, user = "MP" }: { app: string; modulo: string; menu: string[]; activo: number; children: React.ReactNode; lang: Lang; user?: string }) {
  return (
    <div className="cd" data-mock="true">
      <div className="cd-chrome">
        <span className="cd-brand"><i /><b>{app}</b></span>
        <span className="cd-crumb">{modulo}</span>
        <span className="cd-mock">{t(lang, "Datos de muestra", "Sample data")}</span>
        <span className="hw-user">{user}</span>
      </div>
      <div className="cd-body">
        <nav className="cd-side" aria-hidden="true">{menu.map((m, i) => <span key={m} className={i === activo ? "on" : ""}>{m}</span>)}</nav>
        <div className="cd-main">{children}</div>
      </div>
    </div>
  );
}

function Kpis({ items }: { items: [string, string][] }) {
  return <div className="cd-kpis">{items.map(([k, v]) => <div className="cd-kpi" key={k}><span className="hw-kpi-k">{k}</span><b className="num">{v}</b></div>)}</div>;
}

function Table({ cols, rows }: { cols: string[]; rows: (string | { t: string; tono: "ok" | "run" | "ghost" | "bad" })[][] }) {
  return (
    <div className="cd-table" style={{ "--cols": cols.length } as React.CSSProperties}>
      <div className="cd-tr cd-th">{cols.map((c) => <span key={c}>{c}</span>)}</div>
      {rows.map((r, i) => (
        <div className="cd-tr" key={i}>{r.map((c, j) => typeof c === "string" ? <span key={j} className={j === 0 ? "strong" : ""}>{c}</span> : <span key={j}><Pill variant={c.tono}>{c.t}</Pill></span>)}</div>
      ))}
    </div>
  );
}

/* ---------- Svitzer: analítica de muestras de aceite ---------- */
function Svitzer({ lang }: { lang: Lang }) {
  const es = lang === "es";
  return (
    <Frame app="OilSense" modulo={es ? "Muestras · Flota Panamá" : "Samples · Panama fleet"} menu={[es ? "Flota" : "Fleet", es ? "Muestras" : "Samples", es ? "Alertas" : "Alerts", es ? "Reportes" : "Reports"]} activo={1} lang={lang} user="LM">
      <Kpis items={[[es ? "Muestras este mes" : "Samples this month", "148"], [es ? "Fuera de límite" : "Out of limit", "6"], [es ? "Embarcaciones" : "Vessels", "23"]]} />
      <div className="cd-two">
        <div className="hw-card"><span className="hw-kpi-k">{es ? "Hierro (Fe) · Remolcador Delta 7 · ppm" : "Iron (Fe) · Tug Delta 7 · ppm"}</span><AreaChart valores={[8, 9, 11, 10, 14, 17, 21]} etiquetas={["Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct"]} unidad="ppm" id="sv-a" h={96} /><span className="hw-sub">{es ? "Límite del motor: 20 ppm" : "Engine limit: 20 ppm"}</span></div>
        <div className="hw-card"><span className="hw-kpi-k">{es ? "Alertas abiertas" : "Open alerts"}</span>
          <ul className="cd-list">{[["Delta 7", es ? "Fe por encima del límite" : "Fe above limit", "bad"], ["Orion 2", es ? "Viscosidad baja" : "Low viscosity", "run"], ["Pacífico 4", es ? "Agua en aceite" : "Water in oil", "run"]].map(([a, b, c]) => <li key={a}><b>{a}</b><span>{b}</span><Pill variant={c as "bad"}>{c === "bad" ? (es ? "Crítica" : "Critical") : (es ? "Revisar" : "Review")}</Pill></li>)}</ul></div>
      </div>
      <Table cols={[es ? "Embarcación" : "Vessel", "Motor", "Fe", "Cu", "Visc.", es ? "Estado" : "Status"]} rows={[["Delta 7", "BB", "21", "4", "14.1", { t: es ? "Crítica" : "Critical", tono: "bad" }], ["Orion 2", "EB", "9", "3", "11.8", { t: es ? "Revisar" : "Review", tono: "run" }], ["Atlas 1", "BB", "7", "2", "14.6", { t: "OK", tono: "ok" }]]} />
    </Frame>
  );
}

/* ---------- Unión Adventista: suite institucional ---------- */
function Uapa({ lang }: { lang: Lang }) {
  const es = lang === "es";
  return (
    <Frame app="Suite UAP" modulo={es ? "Actas y juntas" : "Minutes and boards"} menu={[es ? "Secretaría" : "Secretariat", es ? "Propiedades" : "Properties", es ? "Actas" : "Minutes", es ? "Juntas" : "Boards", es ? "Obreros" : "Workers", es ? "Asistente IA" : "AI assistant"]} activo={2} lang={lang} user="SG">
      <Kpis items={[[es ? "Iglesias" : "Churches", "184"], [es ? "Actas firmadas" : "Signed minutes", "96 %"], [es ? "Juntas este mes" : "Boards this month", "11"]]} />
      <Table cols={[es ? "Acta" : "Minutes", es ? "Campo" : "Field", es ? "Fecha" : "Date", es ? "Firma" : "Signature"]} rows={[[es ? "Junta directiva 09-2026" : "Board 09-2026", es ? "Metropolitano" : "Metropolitan", "28 sep", { t: es ? "Firmada" : "Signed", tono: "ok" }], [es ? "Comisión de propiedades" : "Property committee", "Chiriquí", "2 oct", { t: es ? "Pendiente" : "Pending", tono: "run" }], [es ? "Presupuesto 2027" : "Budget 2027", es ? "Unión" : "Union", "8 oct", { t: es ? "Borrador" : "Draft", tono: "ghost" }]]} />
      <div className="cd-two">
        <div className="hw-card"><span className="hw-kpi-k">{es ? "Asistente · «¿Cuándo se aprobó el templo de David?»" : "Assistant · “When was the David temple approved?”"}</span><p className="cd-answer">{es ? "El 14 de marzo de 2024, en la junta 03-2024, punto 7. Fuente: acta firmada." : "On March 14, 2024, board 03-2024, item 7. Source: signed minutes."}</p><span className="hw-sub">{es ? "Cita la fuente en el archivo con OCR" : "Cites the source in the OCR archive"}</span></div>
      <div className="hw-card"><span className="hw-kpi-k">{es ? "Calendario de juntas · octubre" : "Board calendar · October"}</span><Calendar dias={[0, 0, 2, 0, 0, 0, 0, 1, 0, 0, 3, 0, 0, 0, 0, 2, 0, 0, 1, 0, 0, 0, 0, 2, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0]} diasCorto={es ? ["L", "M", "X", "J", "V", "S", "D"] : ["M", "T", "W", "T", "F", "S", "S"]} id="ua-c" unidad={es ? "juntas" : "boards"} /></div>
      </div>
    </Frame>
  );
}

/* ---------- Academyx: CRM SaaS para academias ---------- */
function Academyx({ lang }: { lang: Lang }) {
  const es = lang === "es";
  return (
    <Frame app="Academyx" modulo={es ? "Academia Norte · Matrícula" : "North Academy · Enrollment"} menu={[es ? "Matrícula" : "Enrollment", es ? "Jugadores" : "Players", es ? "Familias" : "Families", es ? "Cobros" : "Billing", es ? "Torneos" : "Tournaments", es ? "Correos" : "Email"]} activo={0} lang={lang} user="AN">
      <Kpis items={[[es ? "Jugadores activos" : "Active players", "236"], [es ? "Cobrado octubre" : "Collected October", "US$ 14 920"], [es ? "Morosidad" : "Overdue", "4 %"]]} />
      <Table cols={[es ? "Jugador" : "Player", es ? "Categoría" : "Category", es ? "Familia" : "Family", es ? "Cobro" : "Billing"]} rows={[["Mateo R.", "Sub-12", "Rodríguez", { t: es ? "Al día" : "Paid", tono: "ok" }], ["Diego C.", "Sub-14", "Castillo", { t: es ? "Vence 15 oct" : "Due Oct 15", tono: "run" }], ["Valeria P.", "Sub-8", "Pérez", { t: es ? "Pendiente" : "Pending", tono: "ghost" }]]} />
      <div className="cd-two">
        <div className="hw-card"><span className="hw-kpi-k">{es ? "Asistencia por categoría · semana" : "Attendance by category · week"}</span><Heat filas={["Sub-8", "Sub-10", "Sub-12", "Sub-14"]} cols={es ? ["L", "M", "X", "J", "V"] : ["M", "T", "W", "T", "F"]} datos={[[18, 20, 17, 21, 19], [24, 22, 25, 23, 26], [30, 28, 31, 29, 33], [22, 24, 21, 25, 23]]} id="ax-h" unidad={es ? "asistentes" : "attendees"} /></div>
        <div className="hw-card"><span className="hw-kpi-k">{es ? "Cobros por medio de pago" : "Payments by method"}</span><HBars items={[{ label: "Yappy", valor: 6240 }, { label: "PagueloFácil", valor: 4810 }, { label: "Stripe", valor: 2390 }, { label: es ? "Efectivo" : "Cash", valor: 1480 }]} unidad="US$" id="ax-b" /></div>
      </div>
    </Frame>
  );
}

/* ---------- B&B Real Estate: CMS inmobiliario con Wasi ---------- */
function Bnb({ lang }: { lang: Lang }) {
  const es = lang === "es";
  return (
    <Frame app="B&B CMS" modulo={es ? "Propiedades · Sincronizadas con Wasi" : "Properties · Synced with Wasi"} menu={[es ? "Propiedades" : "Properties", es ? "Proyectos" : "Projects", "Leads", es ? "Campañas" : "Campaigns", es ? "Documentos" : "Documents", es ? "Traducciones" : "Translations"]} activo={0} lang={lang} user="BB">
      <Kpis items={[[es ? "Publicadas" : "Published", "312"], [es ? "Leads esta semana" : "Leads this week", "27"], [es ? "Última sincronización" : "Last sync", es ? "hace 12 min" : "12 min ago"]]} />
      <div className="cd-props">
        {[[es ? "Apartamento · Costa del Este" : "Apartment · Costa del Este", "US$ 385 000", "ok"], [es ? "Casa · Clayton" : "House · Clayton", "US$ 720 000", "ok"], [es ? "Oficina · Obarrio" : "Office · Obarrio", "US$ 2 400 / mes", "run"], [es ? "Lote · Coronado" : "Lot · Coronado", "US$ 149 000", "ghost"]].map(([n, p, s]) => (
          <div className="cd-prop" key={n}><i className="cd-photo" /><b>{n}</b><span className="num">{p}</span><Pill variant={s as "ok"}>{s === "ok" ? (es ? "Publicada" : "Published") : s === "run" ? (es ? "Revisión" : "Review") : (es ? "Borrador" : "Draft")}</Pill></div>
        ))}
      </div>
      <div className="cd-two">
        <div className="hw-card"><span className="hw-kpi-k">{es ? "Leads por origen" : "Leads by source"}</span><HBars items={[{ label: "Google", valor: 11 }, { label: "Instagram", valor: 8 }, { label: "WhatsApp", valor: 6 }, { label: es ? "Referido" : "Referral", valor: 2 }]} unidad="leads" id="bb-l" /></div>
        <div className="hw-card"><span className="hw-kpi-k">{es ? "Idiomas del sitio" : "Site languages"}</span><ul className="cd-list">{[["ES", es ? "Español" : "Spanish", "100 %"], ["EN", es ? "Inglés" : "English", "98 %"], ["PT", es ? "Portugués" : "Portuguese", "91 %"]].map(([c, n, p]) => <li key={c}><LetterChip>{c}</LetterChip><span>{n}</span><b className="num">{p}</b></li>)}</ul></div>
      </div>
    </Frame>
  );
}

/* ---------- Smart Church (Revive): operación de la iglesia ---------- */
function SmartChurch({ lang }: { lang: Lang }) {
  const es = lang === "es";
  return (
    <Frame app="Smart Church" modulo={es ? "Panel · Iglesia Revive" : "Dashboard · Revive Church"} menu={[es ? "Ministerios" : "Ministries", "Roster", es ? "Calendario" : "Calendar", es ? "Visitas" : "Visits", es ? "Junta" : "Board", es ? "Alabanza" : "Worship", es ? "Tesorería" : "Treasury"]} activo={2} lang={lang} user="RV">
      <Kpis items={[[es ? "Miembros" : "Members", "412"], [es ? "Visitas del mes" : "Visits this month", "38"], [es ? "Ofrenda octubre" : "October offering", "US$ 9 340"]]} />
      <div className="cd-two">
        <div className="hw-card"><span className="hw-kpi-k">{es ? "Roster · domingo 12" : "Roster · Sunday 12"}</span><Gantt filas={[{ cliente: es ? "Alabanza" : "Worship", inicio: 0, fin: 1 }, { cliente: es ? "Ujieres" : "Ushers", inicio: 0, fin: 3 }, { cliente: es ? "Niños" : "Kids", inicio: 1, fin: 2 }, { cliente: es ? "Audio" : "Sound", inicio: 0, fin: 3 }]} dias={["8", "9", "10", "11", "12"]} id="sc-g" /></div>
        <div className="hw-card"><span className="hw-kpi-k">{es ? "Ofrendas por mes" : "Offerings by month"}</span><Stacked series={[[6.1, 6.8, 7.4, 7.9], [1.2, 1.4, 1.1, 1.5]]} tipos={[es ? "Diezmo" : "Tithe", es ? "Misiones" : "Missions"]} meses={["Jul", "Ago", "Sep", "Oct"]} id="sc-s" unidad="US$ miles" /></div>
      </div>
      <Table cols={[es ? "Visita pastoral" : "Pastoral visit", es ? "Familia" : "Family", es ? "Responsable" : "Owner", es ? "Estado" : "Status"]} rows={[[es ? "Hospital · oración" : "Hospital · prayer", "Gómez", "Pr. Díaz", { t: es ? "Hecha" : "Done", tono: "ok" }], [es ? "Nuevo miembro" : "New member", "Lara", "Hna. Ruiz", { t: es ? "Programada" : "Scheduled", tono: "run" }], [es ? "Seguimiento" : "Follow-up", "Pinto", "Pr. Díaz", { t: es ? "Pendiente" : "Pending", tono: "ghost" }]]} />
    </Frame>
  );
}

/* ---------- John Henry: sastrería ---------- */
function JohnHenry({ lang }: { lang: Lang }) {
  const es = lang === "es";
  return (
    <Frame app="John Henry" modulo={es ? "Pedidos · Sede Panamá" : "Orders · Panama branch"} menu={[es ? "Citas" : "Appointments", es ? "Clientes" : "Clients", es ? "Pedidos" : "Orders", es ? "Telas" : "Fabrics", es ? "Modelos" : "Models", es ? "Finanzas" : "Finance", es ? "Sedes" : "Branches"]} activo={2} lang={lang} user="JH">
      <Kpis items={[[es ? "Pedidos en taller" : "Orders in workshop", "14"], [es ? "Citas esta semana" : "Appointments this week", "9"], [es ? "Ventas octubre" : "October sales", "US$ 31 600"]]} />
      <Table cols={[es ? "Pedido" : "Order", es ? "Prenda" : "Garment", es ? "Tela" : "Fabric", es ? "Etapa" : "Stage"]} rows={[["#2041", es ? "Traje 2 piezas" : "2-piece suit", "Loro Piana 110s", { t: es ? "Corte" : "Cutting", tono: "run" }], ["#2044", es ? "Esmoquin" : "Tuxedo", "Vitale Barberis", { t: es ? "Prueba" : "Fitting", tono: "run" }], ["#2039", es ? "Camisa" : "Shirt", "Thomas Mason", { t: es ? "Entregado" : "Delivered", tono: "ok" }]]} />
      <div className="cd-two">
        <div className="hw-card cd-measures"><span className="hw-kpi-k">{es ? "Medidas · cliente #118" : "Measurements · client #118"}</span>
          <svg viewBox="0 0 80 120" className="cd-mannequin" aria-hidden="true"><path d="M40 6a8 8 0 1 0 0 16a8 8 0 1 0 0-16zM26 26h28l10 40h-9l-3-22v70h-8V74h-8v40h-8V44l-3 22h-9z" /></svg>
          <ul className="cd-list tight">{[[es ? "Pecho" : "Chest", "102 cm"], [es ? "Cintura" : "Waist", "88 cm"], [es ? "Largo saco" : "Jacket length", "74 cm"], [es ? "Manga" : "Sleeve", "63 cm"]].map(([k, v]) => <li key={k}><span>{k}</span><b className="num">{v}</b></li>)}</ul></div>
        <div className="hw-card"><span className="hw-kpi-k">{es ? "Ventas por sede · US$ miles" : "Sales by branch · US$ thousands"}</span><HBars items={[{ label: "Panamá", valor: 31.6 }, { label: "Bogotá", valor: 27.2 }, { label: "Medellín", valor: 18.9 }]} unidad="US$ miles" id="jh-b" /></div>
      </div>
    </Frame>
  );
}

/* ---------- Resto de sistemas: tablero genérico con sus módulos reales ---------- */
function Generico({ lang, nombre, modulos }: { lang: Lang; nombre: string; modulos: string[] }) {
  const es = lang === "es";
  return (
    <Frame app={nombre} modulo={modulos[0] ?? ""} menu={modulos.slice(0, 6)} activo={0} lang={lang}>
      <Kpis items={[[es ? "Registros" : "Records", "1 284"], [es ? "Activos" : "Active", "96 %"], [es ? "Este mes" : "This month", "+128"]]} />
      <div className="cd-two">
        <div className="hw-card"><span className="hw-kpi-k">{es ? "Actividad" : "Activity"}</span><AreaChart valores={[12, 18, 15, 22, 27, 24, 31]} etiquetas={["1", "2", "3", "4", "5", "6", "7"]} unidad={es ? "registros" : "records"} id="g-a" h={96} /></div>
        <div className="hw-card"><span className="hw-kpi-k">{es ? "Por estado" : "By status"}</span><Funnel etapas={[{ label: es ? "Nuevos" : "New", n: 48 }, { label: es ? "En curso" : "In progress", n: 31 }, { label: es ? "Cerrados" : "Closed", n: 122 }]} activa={1} onPick={() => {}} id="g-f" /></div>
      </div>
      <div className="hw-card cd-ring"><Ring valor={72} meta={100} label={es ? "Avance" : "Progress"} id="g-r" /><span className="hw-sub">{es ? "72 % de la meta del mes" : "72% of the monthly goal"}</span></div>
    </Frame>
  );
}

export function CaseDashboard({ slug, lang, nombre, modulos }: { slug: string; lang: Lang; nombre: string; modulos: string[] }) {
  switch (slug) {
    case "svitzer": return <Svitzer lang={lang} />;
    case "uapa-suite": return <Uapa lang={lang} />;
    case "academyx": return <Academyx lang={lang} />;
    case "bnb-real-estate": return <Bnb lang={lang} />;
    case "smart-church": return <SmartChurch lang={lang} />;
    case "john-henry": return <JohnHenry lang={lang} />;
    default: return <Generico lang={lang} nombre={nombre} modulos={modulos} />;
  }
}
