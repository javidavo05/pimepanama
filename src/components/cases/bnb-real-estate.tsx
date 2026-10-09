// motion: none — réplica estática del tablero real con datos de muestra; se captura a imagen (scripts/capture-cases.mjs).
import "./bnb-real-estate.css";

const P = {
  grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  pulse: "M3 12h4l3-8 4 16 3-8h4",
  doc: "M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5",
  nav: "M4 7h16M4 12h16M4 17h10",
  quote: "M6 17c0-4 1-7 4-9M14 17c0-4 1-7 4-9",
  photo: "M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4",
  building: "M5 21V4h9v17M14 9h5v12M8 8h3M8 12h3M8 16h3",
  pin: "M12 21s6-5.5 6-11a6 6 0 0 0-12 0c0 5.5 6 11 6 11zM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  tag: "M3 12V4h8l10 10-8 8zM7.5 8.5h.01",
  book: "M5 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H5zM19 4h-6v14h6z",
  mic: "M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM6 11a6 6 0 0 0 12 0M12 17v4",
  users: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M17 8a2.5 2.5 0 0 1 0 5M18 15c2 .6 3 2.4 3 5",
  hand: "M4 13l5-5 4 3 3-3 4 4-6 6-3-2-3 2z",
  chat: "M4 5h16v11H9l-5 4z",
  sync: "M20 12a8 8 0 0 0-14-5.3L4 9M4 4v5h5M4 12a8 8 0 0 0 14 5.3L20 15M20 20v-5h-5",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18",
  plug: "M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0zM12 17v4",
  calc: "M6 3h12v18H6zM9 7h6M9 12h.01M12 12h.01M15 12h.01M9 16h.01M12 16h.01M15 16h.01",
  plus: "M12 5v14M5 12h14",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4.4 3.6-8 8-8s8 3.6 8 8",
  warn: "M12 4l9 16H3zM12 10v4M12 17v.01",
  mega: "M4 10v4h3l8 4V6L7 10zM18 9a4 4 0 0 1 0 6",
  bank: "M3 10l9-6 9 6M5 10v9M9 10v9M15 10v9M19 10v9M3 21h18",
  out: "M9 4H5v16h4M16 8l4 4-4 4M20 12H9",
  chev: "M9 6l6 6-6 6",
};

function Ic({ d, size = 16 }: { d: string; size?: number }) {
  return (
    <svg
      className="ic"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

const NAV: { label: string; items: { t: string; i: string; on?: boolean }[] }[] = [
  { label: "Inicio", items: [{ t: "Resumen", i: P.grid, on: true }, { t: "Analítica", i: P.pulse }] },
  {
    label: "Sitio web",
    items: [
      { t: "Contenido del sitio", i: P.doc },
      { t: "Secciones y fotos", i: P.doc },
      { t: "Menú", i: P.nav },
      { t: "Reseñas", i: P.quote },
      { t: "Fotos y archivos", i: P.photo },
    ],
  },
  {
    label: "Catálogo",
    items: [
      { t: "Propiedades", i: P.building },
      { t: "Proyectos", i: P.bank },
      { t: "Zonas", i: P.pin },
      { t: "Etiquetas", i: P.tag },
    ],
  },
  { label: "Publicaciones", items: [{ t: "Journal", i: P.book }, { t: "Podcast", i: P.mic }] },
  {
    label: "Operaciones",
    items: [
      { t: "Leads", i: P.users },
      { t: "Leads de proyectos", i: P.users },
      { t: "Referidos", i: P.hand },
      { t: "Equipo", i: P.user },
      { t: "Campañas de WhatsApp", i: P.chat },
      { t: "Sincronizar con Wasi", i: P.sync },
    ],
  },
  {
    label: "Ajustes",
    items: [
      { t: "Ajustes del sitio", i: P.gear },
      { t: "Idiomas y traducción automática", i: P.globe },
      { t: "Integraciones", i: P.plug },
      { t: "Proforma y simulador", i: P.calc },
    ],
  },
];

const KPIS: { t: string; v: string; s: string; i: string; tone: string; d?: string }[] = [
  { t: "Inventario activo", v: "148", s: "163 registros en cartera", i: P.building, tone: "default", d: "+6% vs semana anterior (altas)" },
  { t: "Leads nuevos hoy", v: "7", s: "34 en los últimos 7 días", i: P.users, tone: "warning" },
  { t: "Sin seguimiento (+48 h)", v: "5", s: "Requieren acción comercial", i: P.warn, tone: "warning" },
  { t: "Campañas activas", v: "2", s: "Programadas o en envío", i: P.mega, tone: "default" },
  { t: "Leads urgentes (proyectos)", v: "3", s: "Prioridad alta en landings", i: P.bank, tone: "warning" },
  { t: "Última actualización de inventario", v: "08 oct, 06:30", s: "Listado actualizado correctamente", i: P.sync, tone: "success" },
];

const PIPE = [
  { l: "Nuevos", c: 42, p: 31 },
  { l: "Contactados", c: 51, p: 38 },
  { l: "Calificados", c: 23, p: 17 },
  { l: "Cerrados / Archivados", c: 19, p: 14 },
];

const LEADS = [
  { n: "Mariela Quintero", c: "mquintero@correo.example · +507 6000-1234", p: "Apartamento 2 hab. en Costa del Este", a: "Asesor: Daniela R.", h: "Hace 52 h" },
  { n: "Ricardo Almanza", c: "ralmanza@correo.example · +507 6000-5678", p: "Casa en Altos de Panamá", a: "Asesor: Luis M.", h: "Hace 3 d" },
];

const SPARK = "M0 34 L16 28 L32 31 L48 20 L64 24 L80 12 L96 16 L112 6";

export default function CaseBnbRealEstate() {
  return (
    <div className="case case-bnb-real-estate">
      <aside className="bb-side">
        <div className="bb-brand">
          <div className="bb-logo">B</div>
          <div className="bb-brand-t">
            <strong>B&amp;B CMS</strong>
            <span>Real Estate</span>
          </div>
        </div>
        <nav className="bb-nav">
          {NAV.map((g) => (
            <div className="bb-group" key={g.label}>
              <p className="bb-group-l">{g.label}</p>
              <ul>
                {g.items.map((it) => (
                  <li key={it.t} className={it.on ? "bb-item is-on" : "bb-item"}>
                    <Ic d={it.i} size={14} />
                    <span className="bb-item-t">{it.t}</span>
                    {it.on ? <Ic d={P.chev} size={12} /> : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="bb-foot">
          <div className="bb-item">
            <Ic d={P.out} size={14} />
            <span className="bb-item-t">Cerrar sesión</span>
          </div>
        </div>
      </aside>

      <main className="bb-main">
        <header className="bb-head">
          <div>
            <p className="bb-date">jueves, 08 de octubre de 2026</p>
            <h1>Hola, Andrea</h1>
            <p className="bb-sub">Resumen comercial del día: inventario, leads y actividad reciente en un solo vistazo.</p>
          </div>
          <div className="bb-actions">
            <span className="bb-btn">
              <Ic d={P.user} size={14} />
              Nuevo lead
            </span>
            <span className="bb-btn is-primary">
              <Ic d={P.building} size={14} />
              Nueva propiedad
            </span>
            <span className="bb-btn">
              <Ic d={P.mega} size={14} />
              Crear campaña
            </span>
          </div>
        </header>

        <section className="bb-kpis">
          {KPIS.map((k) => (
            <div className="bb-kpi" key={k.t}>
              <div className="bb-kpi-top">
                <p>{k.t}</p>
                <span className={`bb-chip is-${k.tone}`}>
                  <Ic d={k.i} size={14} />
                </span>
              </div>
              <strong className={k.v.length > 4 ? "is-text" : ""}>{k.v}</strong>
              <small>{k.s}</small>
              {k.d ? <em>{k.d}</em> : null}
            </div>
          ))}
        </section>

        <section className="bb-panel">
          <div className="bb-panel-h">
            <div>
              <h2>Embudo de leads</h2>
              <p>Distribución por etapa comercial</p>
            </div>
            <span className="bb-link">3 urgentes en proyectos →</span>
          </div>
          <div className="bb-pipe">
            {PIPE.map((c) => (
              <div className="bb-pipe-c" key={c.l}>
                <p>{c.l}</p>
                <strong>{c.c}</strong>
                <small>{c.p}% del total</small>
                <span className="bb-link">Ver leads</span>
              </div>
            ))}
          </div>
        </section>

        <section className="bb-panel">
          <div className="bb-panel-h">
            <div>
              <h2>Requieren seguimiento</h2>
              <p>Prioriza contacto o actualización de estado</p>
            </div>
            <span className="bb-link">Ver todos</span>
          </div>
          <ul className="bb-leads">
            {LEADS.map((l) => (
              <li key={l.n}>
                <div>
                  <b>{l.n}</b>
                  <p>{l.c}</p>
                  <p className="bb-prop">{l.p}</p>
                  <p className="bb-adv">{l.a}</p>
                  <p className="bb-age">{l.h}</p>
                </div>
                <div className="bb-lead-a">
                  <span className="bb-btn">Marcar contactado</span>
                  <span className="bb-link">Abrir →</span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="bb-panel">
          <div className="bb-panel-h">
            <div>
              <h2>Analítica comercial</h2>
              <p>Tráfico y captación reciente</p>
            </div>
          </div>
          <div className="bb-ana">
            <div className="bb-mini">
              <p>Visitas hoy</p>
              <strong>312</strong>
            </div>
            <div className="bb-mini">
              <p>Visitas 7 días</p>
              <strong>2.140</strong>
              <svg viewBox="0 0 112 40" width="112" height="40" aria-hidden="true">
                <path d={SPARK} fill="none" stroke="var(--c-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="bb-mini">
              <p>Propiedad más vista</p>
              <b>Penthouse en Punta Pacífica</b>
            </div>
            <div className="bb-mini">
              <p>Zona con más interés</p>
              <b>Costa del Este</b>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
