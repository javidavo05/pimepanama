// motion: none — réplica estática del tablero real con datos de muestra; se captura a imagen (scripts/capture-cases.mjs).
// Academyx v2 («Alchemix NEW», apps/app): panel «Hoy» de una institución, copiado de [institucion]/panel/page.tsx y packages/ui.
import "./academyx.css";

function Ic({ children, size = 16 }: { children: React.ReactNode; size?: number }) {
  return (
    <svg
      className="ax-ic"
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

const IconHome = () => (
  <Ic>
    <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
    <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </Ic>
);
const IconChevron = () => (
  <Ic size={14}>
    <path d="m6 9 6 6 6-6" />
  </Ic>
);
const IconSearch = () => (
  <Ic>
    <path d="m21 21-4.34-4.34" />
    <circle cx="11" cy="11" r="8" />
  </Ic>
);
const IconPanel = () => (
  <Ic>
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="M9 3v18" />
  </Ic>
);
const IconSparkles = () => (
  <Ic>
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    <path d="M20 3v4" />
    <path d="M22 5h-4" />
    <path d="M4 17v2" />
    <path d="M5 18H3" />
  </Ic>
);
const IconBell = () => (
  <Ic size={20}>
    <path d="M10.268 21a2 2 0 0 0 3.464 0" />
    <path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" />
  </Ic>
);
const IconFilePlus = () => (
  <Ic size={20}>
    <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" />
    <path d="M14 2v5a1 1 0 0 0 1 1h5" />
    <path d="M9 15h6" />
    <path d="M12 18v-6" />
  </Ic>
);
const IconCard = () => (
  <Ic size={20}>
    <rect width="20" height="14" x="2" y="5" rx="2" />
    <line x1="2" x2="22" y1="10" y2="10" />
  </Ic>
);
const IconMegaphone = () => (
  <Ic size={20}>
    <path d="M11 6a13 13 0 0 0 8.4-2.8A1 1 0 0 1 21 4v12a1 1 0 0 1-1.6.8A13 13 0 0 0 11 14H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" />
    <path d="M6 14a12 12 0 0 0 2.4 7.2 2 2 0 0 0 3.2-2.4A8 8 0 0 1 10 14" />
    <path d="M8 6v8" />
  </Ic>
);
const IconUpDown = () => (
  <Ic>
    <path d="m7 15 5 5 5-5" />
    <path d="m7 9 5-5 5 5" />
  </Ic>
);

type Group = { label: string; badge?: number };

// Barra lateral con foldInactiveGroups: en «Hoy» solo la sección de la página actual va abierta (sin etiqueta);
// las demás quedan plegadas y suman las insignias de sus entradas (nav.ts · pendingOf).
const GROUPS: Group[] = [
  { label: "Personas", badge: 10 },
  { label: "Académico" },
  { label: "Dinero", badge: 7 },
  { label: "Comunicación", badge: 3 },
  { label: "Reportes" },
  { label: "Configuración" },
];

// Cobrado por día, del 1 al 9 de octubre (suma $19,870.00)
const DAILY = [1240, 3180, 860, 2950, 4120, 0, 0, 3220, 4300];

function Spark({ values, width = 96, height = 30 }: { values: number[]; width?: number; height?: number }) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const step = width / (values.length - 1);
  const pts = values.map((v, i) => [i * step, height - 3 - ((v - min) / span) * (height - 6)] as const);
  const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1]!;
  return (
    <svg className="ax-spark" viewBox={`0 0 ${width} ${height}`} width={width} height={height} aria-hidden="true">
      <path className="ax-spark__area" d={`${d} L${width},${height} L0,${height} Z`} />
      <path className="ax-spark__line" d={d} />
      <circle className="ax-spark__dot" cx={last[0]} cy={last[1]} r={2.5} />
    </svg>
  );
}

const RING_R = 39;
const RING_C = 2 * Math.PI * RING_R;

type Today = { id: string; tone: "urgent" | "today" | "later"; title: string; detail: string; action: string };
const TODAY: Today[] = [
  {
    id: "pagos",
    tone: "urgent",
    title: "7 pagos por verificar",
    detail: "Transferencias y comprobantes: la familia espera que se reflejen en su cuenta.",
    action: "Verificar 7 pagos",
  },
  {
    id: "solicitudes",
    tone: "today",
    title: "4 solicitudes de matrícula por revisar",
    detail: "Familias que llenaron el formulario en línea y esperan respuesta.",
    action: "Revisar solicitudes",
  },
  {
    id: "vence",
    tone: "later",
    title: "11 cuotas vencen en los próximos 7 días",
    detail: "$3,240.00 en total. Los recordatorios salen solos tres días antes.",
    action: "Ver cuentas",
  },
];

type Event = { id: string; tone: "brand" | "success" | "warning"; title: string; desc: string; when: string };
const EVENTS: Event[] = [
  { id: "e1", tone: "success", title: "Pago registrado", desc: "Mensualidad de octubre · Hogar Barrios Quintero · $185.00", when: "hace 12 min" },
  { id: "e2", tone: "brand", title: "Matrícula aprobada", desc: "Santiago Arosemena · 7.º B, año escolar 2027", when: "hace 1 h" },
];

export default function CaseAcademyx() {
  return (
    <div className="case case-academyx">
      <div className="ax-frame">
        <div className="ax-shell">
          <aside className="ax-sidebar">
            <div className="ax-sidebar__top">
              <div className="ax-switcher">
                <span className="ax-avatar">CV</span>
                <span className="ax-switcher__text">
                  <span className="ax-switcher__name">Colegio Costa Verde</span>
                </span>
                <IconUpDown />
              </div>
            </div>
            <div className="ax-sidebar__search">
              <IconSearch />
              <span className="ax-sidebar__search-text">Buscar páginas, personas o cuentas</span>
              <span className="ax-kbd">⌘K</span>
            </div>
            <div className="ax-sidebar__nav">
              <div className="ax-nav-group">
                <div className="ax-nav-item" data-active="">
                  <IconHome />
                  <span className="ax-nav-item__label">Hoy</span>
                  <span className="ax-nav-item__badge ax-num">11</span>
                </div>
              </div>
              {GROUPS.map((g) => (
                <div className="ax-nav-group" key={g.label}>
                  <div className="ax-nav-group__toggle">
                    <span className="ax-nav-group__label">{g.label}</span>
                    {g.badge ? <span className="ax-nav-item__badge ax-num">{g.badge}</span> : null}
                    <IconChevron />
                  </div>
                </div>
              ))}
            </div>
            <div className="ax-sidebar__bottom">
              <div className="ax-nav-item">
                <IconPanel />
                <span className="ax-nav-item__label">Contraer</span>
              </div>
            </div>
          </aside>

          <div className="ax-main">
            <header className="ax-topbar">
              <span className="ax-topbar__spacer" />
              <span className="ax-btn" data-variant="ghost">
                <IconSparkles />
                Asistente
              </span>
              <span className="ax-btn ax-icon-btn" data-variant="ghost">
                <IconBell />
                <span className="ax-bell-dot" />
              </span>
              <span className="ax-btn ax-icon-btn" data-variant="ghost">
                <span className="ax-avatar ax-avatar--user">MR</span>
              </span>
            </header>

            <div className="ax-content">
              <div className="ax-page">
                <section className="ax-hero-card">
                  <span className="ax-hero-card__light ax-hero-card__light--a" />
                  <span className="ax-hero-card__light ax-hero-card__light--b" />
                  <div className="ax-hero-card__body">
                    <p className="ax-hero-card__eyebrow">viernes, 9 de octubre · Colegio Costa Verde</p>
                    <h2 className="ax-hero-card__title">Buenos días, Mariela</h2>
                    <p className="ax-hero-card__desc">Hoy tienes 2 cosas por resolver. 412 estudiantes activos.</p>
                  </div>
                  <div className="ax-hero-card__aside">
                    <div className="ax-hero-aside">
                      <div className="ax-ring">
                        <svg viewBox="0 0 88 88" width="88" height="88" aria-hidden="true">
                          <circle className="ax-ring__track" cx="44" cy="44" r={RING_R} />
                          <circle
                            className="ax-ring__value"
                            cx="44"
                            cy="44"
                            r={RING_R}
                            strokeDasharray={RING_C}
                            strokeDashoffset={RING_C * (1 - 0.82)}
                            transform="rotate(-90 44 44)"
                          />
                        </svg>
                        <span className="ax-ring__label">82 %</span>
                      </div>
                      <div className="ax-hero-aside__text">
                        <span className="ax-hero-card__eyebrow">Cobrado en octubre</span>
                        <span className="ax-hero-aside__value ax-num">$19,870.00</span>
                        <span className="ax-hero-aside__sub">de $24,300.00 previstos</span>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="ax-today" aria-label="Lo que tienes para hoy">
                  <ul className="ax-today__list">
                    {TODAY.map((t) => (
                      <li className="ax-today__item" data-tone={t.tone} key={t.id}>
                        <span className="ax-today__dot" />
                        <div className="ax-today__text">
                          <p className="ax-today__title">{t.title}</p>
                          <p className="ax-today__detail">{t.detail}</p>
                        </div>
                        <span className="ax-btn ax-today__action" data-variant={t.tone === "urgent" ? "primary" : "secondary"}>
                          {t.action}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>

                <div className="ax-quick-grid">
                  <div className="ax-quick">
                    <span className="ax-quick__icon" data-tone="brand">
                      <IconFilePlus />
                    </span>
                    <span className="ax-quick__text">
                      <span className="ax-quick__label">Matricular estudiante</span>
                      <span className="ax-quick__hint">Tres pasos, todo se guarda al final</span>
                    </span>
                  </div>
                  <div className="ax-quick">
                    <span className="ax-quick__icon" data-tone="success">
                      <IconCard />
                    </span>
                    <span className="ax-quick__text">
                      <span className="ax-quick__label">Cobrar</span>
                      <span className="ax-quick__hint">Por nombre, cédula o código de pago</span>
                    </span>
                  </div>
                  <div className="ax-quick">
                    <span className="ax-quick__icon" data-tone="brand">
                      <IconMegaphone />
                    </span>
                    <span className="ax-quick__text">
                      <span className="ax-quick__label">Comunicar</span>
                      <span className="ax-quick__hint">A toda la institución o a un grupo</span>
                    </span>
                  </div>
                </div>

                <div className="ax-metrics">
                  <div className="ax-metric">
                    <div className="ax-metric__head">
                      <p className="ax-metric__label">Estudiantes activos</p>
                    </div>
                    <p className="ax-metric__value ax-num">412</p>
                    <div className="ax-metric__foot" />
                  </div>
                  <div className="ax-metric">
                    <div className="ax-metric__head">
                      <p className="ax-metric__label">Cobrado en octubre</p>
                      <Spark values={DAILY} />
                    </div>
                    <p className="ax-metric__value ax-num">$19,870.00</p>
                    <div className="ax-metric__foot">
                      <p className="ax-metric__meta">
                        <span>de $24,300.00 previstos</span>
                      </p>
                    </div>
                  </div>
                  <div className="ax-metric">
                    <div className="ax-metric__head">
                      <p className="ax-metric__label">Cuentas con acceso pausado</p>
                    </div>
                    <p className="ax-metric__value ax-num">6</p>
                    <div className="ax-metric__foot">
                      <p className="ax-metric__meta">
                        <span>de 388 cuentas</span>
                      </p>
                    </div>
                  </div>
                </div>

                <section className="ax-card">
                  <div className="ax-card__header">
                    <div className="ax-card__heading">
                      <h3 className="ax-card__title">Actividad reciente</h3>
                      <p className="ax-card__desc">Lo último que pasó en la institución.</p>
                    </div>
                  </div>
                  <ol className="ax-timeline">
                    {EVENTS.map((e) => (
                      <li className="ax-timeline__item" key={e.id}>
                        <div className="ax-timeline__link">
                          <span className="ax-timeline__dot" data-tone={e.tone} />
                          <span className="ax-timeline__body">
                            <span className="ax-timeline__title">{e.title}</span>
                            <span className="ax-timeline__desc">{e.desc}</span>
                            <span className="ax-timeline__when">{e.when}</span>
                          </span>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
