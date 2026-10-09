// motion: none — réplica estática del tablero real con datos de muestra; se captura a imagen (scripts/capture-cases.mjs).
import "./godmode.css";

function Ic({ children, size = 16 }: { children: React.ReactNode; size?: number }) {
  return (
    <svg
      className="gm-ic"
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
      {children}
    </svg>
  );
}

const ICONS: Record<string, React.ReactNode> = {
  dashboard: (
    <>
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </>
  ),
  institutions: (
    <>
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      <path d="M10 6h4M10 10h4M10 14h4M10 18h4" />
    </>
  ),
  organizations: (
    <>
      <rect x="16" y="16" width="6" height="6" rx="1" />
      <rect x="2" y="16" width="6" height="6" rx="1" />
      <rect x="9" y="2" width="6" height="6" rx="1" />
      <path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3M12 12V8" />
    </>
  ),
  alerts: (
    <>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </>
  ),
  library: <path d="m16 6 4 14M12 6v14M8 8v12M4 4v16" />,
  megaphone: (
    <>
      <path d="m3 11 18-5v12L3 14v-3z" />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </>
  ),
  lightbulb: (
    <>
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
      <path d="M9 18h6M10 22h4" />
    </>
  ),
  billing: (
    <>
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8M12 17.5v-11" />
    </>
  ),
  "file-text": (
    <>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4M10 9H8M16 13H8M16 17H8" />
    </>
  ),
  wallet: (
    <>
      <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
      <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
    </>
  ),
  "list-checks": <path d="m3 17 2 2 4-4M3 7l2 2 4-4M13 6h8M13 12h8M13 18h8" />,
  shield: (
    <>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  events: (
    <>
      <rect width="8" height="8" x="3" y="3" rx="2" />
      <path d="M7 11v4a2 2 0 0 0 2 2h4" />
      <rect width="8" height="8" x="13" y="13" rx="2" />
    </>
  ),
  timer: (
    <>
      <path d="M10 2h4" />
      <path d="m12 14 3-3" />
      <circle cx="12" cy="14" r="8" />
    </>
  ),
  "life-buoy": (
    <>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="4" />
      <path d="m4.93 4.93 4.24 4.24M14.83 9.17l4.24-4.24M14.83 14.83l4.24 4.24M9.17 14.83l-4.24 4.24" />
    </>
  ),
  operators: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  audit: (
    <>
      <path d="M15 12h-5M15 8h-5" />
      <path d="M19 17V5a2 2 0 0 0-2-2H4" />
      <path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  panel: (
    <>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M9 3v18" />
    </>
  ),
  plus: <path d="M5 12h14M12 5v14" />,
};

type NavItem = { icon: string; label: string; active?: boolean; badge?: number; tone?: "warning" | "brand" };
type NavGroup = { label?: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    items: [
      { icon: "dashboard", label: "Inicio", active: true },
      { icon: "institutions", label: "Instituciones" },
      { icon: "organizations", label: "Organizaciones" },
      { icon: "alerts", label: "Alertas", badge: 5, tone: "warning" },
    ],
  },
  {
    label: "Producto",
    items: [
      { icon: "library", label: "Catálogos" },
      { icon: "megaphone", label: "Avisos" },
      { icon: "lightbulb", label: "Solicitudes", badge: 3, tone: "brand" },
    ],
  },
  {
    label: "Facturación",
    items: [
      { icon: "billing", label: "Resumen" },
      { icon: "file-text", label: "Facturas" },
      { icon: "wallet", label: "Pagos" },
      { icon: "list-checks", label: "Planes" },
      { icon: "shield", label: "Cumplimiento" },
    ],
  },
  {
    label: "Operación",
    items: [
      { icon: "events", label: "Eventos" },
      { icon: "timer", label: "Procesos" },
      { icon: "life-buoy", label: "Soporte" },
    ],
  },
  {
    label: "Administración",
    items: [
      { icon: "operators", label: "Operadores" },
      { icon: "audit", label: "Bitácora" },
    ],
  },
];

const QUICK = [
  { icon: "plus", label: "Nueva institución", hint: "Siete pasos; queda en provisión", tone: "brand" },
  { icon: "alerts", label: "Alertas", hint: "Las críticas primero", count: 5, tone: "warning" },
  { icon: "file-text", label: "Borradores de factura", hint: "Se emiten solos a las 48 h", count: 3, tone: "info" },
  { icon: "shield", label: "Cumplimiento", hint: "Instituciones con mora", count: 2, tone: "danger" },
  { icon: "events", label: "Eventos", hint: "En la cola de muertos", count: 1, tone: "danger" },
];

function Spark({ pts, tone }: { pts: number[]; tone: string }) {
  const w = 72;
  const h = 28;
  const max = Math.max(...pts, 1);
  const xy = pts.map((v, i) => [(i / (pts.length - 1)) * w, h - 3 - (v / max) * (h - 8)] as const);
  const line = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const last = xy[xy.length - 1];
  return (
    <svg className="gm-spark" data-tone={tone} width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <path d={`${line} L${w} ${h} L0 ${h} Z`} className="gm-spark__area" />
      <path d={line} className="gm-spark__line" />
      <circle cx={last[0]} cy={last[1]} r="3" className="gm-spark__dot" />
    </svg>
  );
}

const METRICS = [
  {
    label: "Instituciones activas",
    value: "29",
    hint: "4 en prueba o provisión",
    pts: [1, 0, 2, 1, 1, 0, 3, 1, 2, 2, 1, 3, 2, 4],
    tone: "brand",
  },
  {
    label: "Con restricción por mora",
    value: "2",
    hint: "solo lectura o suspendidas",
    delta: { text: "Revisar cumplimiento", tone: "danger" },
    tone: "",
  },
  {
    label: "Facturado en octubre",
    value: "$18,420.00",
    hint: "cobrado $14,980.00",
    pts: [0, 900, 0, 1200, 640, 0, 2100, 450, 0, 1800, 980, 0, 2400, 1500],
    tone: "brand",
  },
  {
    label: "Alertas abiertas",
    value: "5",
    hint: "las críticas primero",
    delta: { text: "5 abiertas", tone: "danger" },
    pts: [0, 1, 0, 0, 2, 1, 0, 1, 0, 3, 1, 0, 1, 2],
    tone: "warning",
  },
];

const ATTENTION = [
  { label: "Falla de provisión: migración 0042", desc: "/colegio-santa-fe · 2 veces · 08 oct, 07:42", badge: "Crítica", tone: "danger" },
  { label: "Instituto Valle Verde", desc: "/valle-verde · Activa", badge: "Solo lectura", tone: "warning" },
];

const LINES = [
  { label: "Colegios", desc: "14 activas · 2 en prueba · 1 restringida", n: 17 },
  { label: "Formación", desc: "6 activas · 1 en prueba", n: 7 },
  { label: "Academias", desc: "9 activas · 1 en prueba · 1 restringida · 1 archivada", n: 12 },
];

const TIMELINE = [
  { title: "institution.activate", desc: "Marina Quiroz · /colegio-del-istmo", when: "hace 12 min", tone: "success" },
  { title: "invoice.issue", desc: "Marina Quiroz · /academia-delta", when: "hace 48 min", tone: "brand" },
  { title: "tenant.state.changed", desc: "Entrante · /valle-verde", when: "hace 2 h", tone: "success" },
];

export default function CaseGodmode() {
  return (
    <div className="case case-godmode">
      <aside className="gm-sidebar">
        <div className="gm-sidebar__top">
          <div className="gm-switcher">
            <span className="gm-mark" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dcc495" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" />
              </svg>
            </span>
            <span className="gm-switcher__text">
              <span className="gm-switcher__name">GodMode</span>
              <span className="gm-switcher__detail">Academyx School System</span>
            </span>
          </div>
        </div>
        <div className="gm-sidebar__search">
          <Ic>{ICONS.search}</Ic>
          <span className="gm-sidebar__search-text">Buscar instituciones o páginas</span>
          <span className="gm-kbd">⌘K</span>
        </div>
        <div className="gm-sidebar__nav">
          {NAV.map((g, gi) => (
            <div className="gm-nav-group" key={g.label ?? `g${gi}`}>
              {g.label ? <p className="gm-nav-group__label">{g.label}</p> : null}
              {g.items.map((it) => (
                <div className="gm-nav-item" data-active={it.active ? "true" : undefined} key={it.label}>
                  <Ic>{ICONS[it.icon]}</Ic>
                  <span className="gm-nav-item__label">{it.label}</span>
                  {it.badge ? (
                    <span className="gm-nav-item__badge" data-tone={it.tone}>
                      {it.badge}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="gm-sidebar__bottom">
          <div className="gm-nav-item">
            <Ic>{ICONS.panel}</Ic>
            <span className="gm-nav-item__label">Contraer</span>
          </div>
        </div>
      </aside>

      <div className="gm-main">
        <header className="gm-topbar">
          <span className="gm-spacer" />
          <span className="gm-user">
            <span className="gm-avatar">MQ</span>
            <span className="gm-user__text">
              <span className="gm-user__name">Marina Quiroz</span>
              <span className="gm-user__role">Administradora</span>
            </span>
          </span>
        </header>

        <main className="gm-content">
          <section className="gm-hero">
            <div className="gm-hero__body">
              <p className="gm-eyebrow">Jueves, 8 de octubre · GodMode</p>
              <h1 className="gm-hero__title">Buenos días, Marina</h1>
              <p className="gm-hero__desc">
                29 instituciones activas · 4 en prueba o provisión · 5 alertas abiertas · 2 con restricción por mora
              </p>
              <div className="gm-hero__actions">
                <span className="gm-btn gm-btn--primary">Nueva institución</span>
                <span className="gm-btn gm-btn--secondary">Revisar 5 alertas</span>
              </div>
            </div>
            <div className="gm-hero__aside">
              <div className="gm-ring">
                <svg width="84" height="84" viewBox="0 0 84 84" aria-hidden="true">
                  <circle cx="42" cy="42" r="36" className="gm-ring__track" />
                  <circle
                    cx="42"
                    cy="42"
                    r="36"
                    className="gm-ring__value"
                    strokeDasharray="226.2"
                    strokeDashoffset="43"
                    transform="rotate(-90 42 42)"
                  />
                </svg>
                <span className="gm-ring__label">81%</span>
              </div>
              <div className="gm-hero__aside-text">
                <span className="gm-eyebrow">Cobrado en octubre</span>
                <span className="gm-hero__money">$14,980.00</span>
                <span className="gm-hero__sub">de $18,420.00 facturados</span>
              </div>
            </div>
          </section>

          <div className="gm-quick">
            {QUICK.map((q) => (
              <div className="gm-quick__tile" data-tone={q.tone} key={q.label}>
                <span className="gm-quick__icon">
                  <Ic size={18}>{ICONS[q.icon]}</Ic>
                </span>
                <span className="gm-quick__text">
                  <span className="gm-quick__label">{q.label}</span>
                  <span className="gm-quick__hint">{q.hint}</span>
                </span>
                {q.count ? <span className="gm-quick__count">{q.count}</span> : null}
              </div>
            ))}
          </div>

          <div className="gm-metrics">
            {METRICS.map((m) => (
              <div className="gm-metric" key={m.label}>
                <div className="gm-metric__head">
                  <p className="gm-metric__label">{m.label}</p>
                  {m.pts ? <Spark pts={m.pts} tone={m.tone} /> : null}
                </div>
                <p className="gm-metric__value">{m.value}</p>
                <p className="gm-metric__meta">
                  <span>{m.hint}</span>
                  {m.delta ? (
                    <span className="gm-delta" data-tone={m.delta.tone}>
                      {m.delta.text}
                    </span>
                  ) : null}
                </p>
              </div>
            ))}
          </div>

          <div className="gm-cols">
            <div className="gm-col">
              <section className="gm-card">
                <h2 className="gm-card__title">Necesita atención</h2>
                <p className="gm-card__desc">
                  Alertas, mora, jobs fallidos y eventos sin entregar, en orden de urgencia.
                </p>
                <div className="gm-list">
                  {ATTENTION.map((a) => (
                    <div className="gm-row" key={a.label}>
                      <span className="gm-row__text">
                        <span className="gm-row__label">{a.label}</span>
                        <span className="gm-row__desc">{a.desc}</span>
                      </span>
                      <span className="gm-badge" data-tone={a.tone}>
                        {a.badge}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="gm-card">
                <h2 className="gm-card__title">Instituciones por línea</h2>
                <p className="gm-card__desc">Cada línea abre su lista filtrada.</p>
                <div className="gm-list">
                  {LINES.map((l) => (
                    <div className="gm-row" key={l.label}>
                      <span className="gm-row__text">
                        <span className="gm-row__label">{l.label}</span>
                        <span className="gm-row__desc">{l.desc}</span>
                      </span>
                      <span className="gm-row__num">{l.n}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="gm-col">
              <section className="gm-card">
                <h2 className="gm-card__title">Actividad reciente</h2>
                <p className="gm-card__desc">Lo último en la bitácora de la plataforma.</p>
                <ul className="gm-timeline">
                  {TIMELINE.map((t) => (
                    <li className="gm-timeline__item" key={t.title}>
                      <span className="gm-timeline__dot" data-tone={t.tone} />
                      <span className="gm-timeline__body">
                        <span className="gm-timeline__head">
                          <span className="gm-timeline__title">{t.title}</span>
                          <span className="gm-timeline__when">{t.when}</span>
                        </span>
                        <span className="gm-timeline__desc">{t.desc}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="gm-card">
                <h2 className="gm-card__title">Conexión con la app</h2>
                <dl className="gm-kv">
                  <div className="gm-kv__row">
                    <dt>Último latido</dt>
                    <dd>
                      08 oct 2026, 09:14 · <span className="gm-kv__dim">v2.14.0</span>
                    </dd>
                  </div>
                  <div className="gm-kv__row">
                    <dt>Eventos pendientes</dt>
                    <dd>3</dd>
                  </div>
                  <div className="gm-kv__row">
                    <dt>Cola de muertos</dt>
                    <dd>
                      <span className="gm-badge" data-tone="danger">
                        1
                      </span>
                    </dd>
                  </div>
                </dl>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
