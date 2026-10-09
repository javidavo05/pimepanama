// motion: none — réplica estática del tablero real con datos de muestra; se captura a imagen (scripts/capture-cases.mjs).
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
const IconUsers = () => (
  <Ic>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </Ic>
);
const IconGrad = () => (
  <Ic>
    <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
    <path d="M22 10v6" />
    <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
  </Ic>
);
const IconWallet = () => (
  <Ic>
    <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
    <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
  </Ic>
);
const IconMessages = () => (
  <Ic>
    <path d="M16 10a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 14.286V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    <path d="M20 9a2 2 0 0 1 2 2v10.286a.71.71 0 0 1-1.212.502l-2.202-2.202A2 2 0 0 0 17.172 19H10a2 2 0 0 1-2-2v-1" />
  </Ic>
);
const IconList = () => (
  <Ic>
    <path d="M3 5h.01" />
    <path d="M3 12h.01" />
    <path d="M3 19h.01" />
    <path d="M8 5h13" />
    <path d="M8 12h13" />
    <path d="M8 19h13" />
  </Ic>
);
const IconSettings = () => (
  <Ic>
    <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" />
    <circle cx="12" cy="12" r="3" />
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

const GROUPS: { label: string; icon: React.ReactNode; badge?: number }[] = [
  { label: "Personas", icon: <IconUsers />, badge: 7 },
  { label: "Académico", icon: <IconGrad /> },
  { label: "Dinero", icon: <IconWallet />, badge: 5 },
  { label: "Comunicación", icon: <IconMessages />, badge: 2 },
  { label: "Reportes", icon: <IconList /> },
  { label: "Configuración", icon: <IconSettings /> },
];

// Cobrado por día, del 1 al 8 de octubre (centavos de muestra, en dólares aquí)
const DAILY = [1240, 3180, 860, 2950, 4120, 0, 1480, 4810];

function sparkPath(values: number[], w: number, h: number) {
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => [
    (i / (values.length - 1)) * (w - 4) + 2,
    h - 4 - (v / max) * (h - 8),
  ]);
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]?.toFixed(1)} ${p[1]?.toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1] ?? [0, 0];
  const area = `${line} L${last[0]?.toFixed(1)} ${h} L2 ${h} Z`;
  return { line, area, last };
}

export default function CaseAcademyx() {
  const spark = sparkPath(DAILY, 96, 32);
  const circ = 2 * Math.PI * 40;
  return (
    <div className="case case-academyx">
      <div className="ax-shell">
        <aside className="ax-sidebar">
          <div className="ax-sidebar__top">
            <div className="ax-switcher">
              <span className="ax-switcher__avatar">C</span>
              <span className="ax-switcher__text">
                <span className="ax-switcher__name">Colegio Costa Verde</span>
                <span className="ax-switcher__detail">Colegio</span>
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
              <div className="ax-nav-item" data-current="">
                <IconHome />
                <span className="ax-nav-item__label">Hoy</span>
                <span className="ax-nav-item__badge">9</span>
              </div>
            </div>
            {GROUPS.map((g) => (
              <div className="ax-nav-group" key={g.label}>
                <div className="ax-nav-group__toggle">
                  <span className="ax-nav-group__label">{g.label}</span>
                  {g.badge ? <span className="ax-nav-item__badge">{g.badge}</span> : null}
                  <span className="ax-chevron">
                    <IconChevron />
                  </span>
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
            <span className="ax-btn ax-btn--ghost">
              <IconSparkles />
              Asistente
            </span>
            <span className="ax-iconbtn">
              <IconBell />
              <span className="ax-iconbtn__dot" />
            </span>
            <span className="ax-avatar">MQ</span>
          </header>

          <main className="ax-page">
            <section className="ax-hero-card">
              <span className="ax-hero-card__light ax-hero-card__light--a" />
              <span className="ax-hero-card__light ax-hero-card__light--b" />
              <div className="ax-hero-card__body">
                <p className="ax-hero-card__eyebrow">jueves, 8 de octubre · Colegio Costa Verde</p>
                <h2 className="ax-hero-card__title">Buenos días, Mariela</h2>
                <p className="ax-hero-card__desc">Hoy tienes 2 cosas por resolver. 412 estudiantes activos.</p>
              </div>
              <div className="ax-hero-card__aside">
                <div className="ax-ring">
                  <svg width="88" height="88" viewBox="0 0 88 88" aria-hidden="true">
                    <circle className="ax-ring__track" cx="44" cy="44" r="40" />
                    <circle
                      className="ax-ring__value"
                      cx="44"
                      cy="44"
                      r="40"
                      strokeDasharray={circ.toFixed(1)}
                      strokeDashoffset={(circ * 0.6).toFixed(1)}
                      transform="rotate(-90 44 44)"
                    />
                  </svg>
                  <span className="ax-ring__label">40 %</span>
                </div>
                <div className="ax-hero-card__money">
                  <span className="ax-hero-card__eyebrow">Cobrado en octubre</span>
                  <span className="ax-hero-card__amount">$18,640.00</span>
                  <span className="ax-hero-card__sub">de $46,200.00 previstos</span>
                </div>
              </div>
            </section>

            <section className="ax-today">
              <div className="ax-today__item" data-tone="urgent">
                <span className="ax-today__dot" />
                <div className="ax-today__text">
                  <p className="ax-today__title">5 pagos por verificar</p>
                  <p className="ax-today__detail">
                    Transferencias y comprobantes: la familia espera que se reflejen en su cuenta.
                  </p>
                </div>
                <span className="ax-btn ax-btn--primary">Verificar 5 pagos</span>
              </div>
              <div className="ax-today__item" data-tone="today">
                <span className="ax-today__dot" />
                <div className="ax-today__text">
                  <p className="ax-today__title">4 solicitudes de matrícula por revisar</p>
                  <p className="ax-today__detail">Familias que llenaron el formulario en línea y esperan respuesta.</p>
                </div>
                <span className="ax-btn ax-btn--secondary">Revisar solicitudes</span>
              </div>
              <div className="ax-today__item" data-tone="later">
                <span className="ax-today__dot" />
                <div className="ax-today__text">
                  <p className="ax-today__title">11 cuotas vencen en los próximos 7 días</p>
                  <p className="ax-today__detail">
                    $3,260.00 en total. Los recordatorios salen solos tres días antes.
                  </p>
                </div>
                <span className="ax-btn ax-btn--secondary">Ver cuentas</span>
              </div>
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
                <p className="ax-metric__value">412</p>
                <div className="ax-metric__foot">
                  <span className="ax-metric__meta">&nbsp;</span>
                </div>
              </div>
              <div className="ax-metric">
                <div className="ax-metric__head">
                  <p className="ax-metric__label">Cobrado en octubre</p>
                  <svg className="ax-spark" width="96" height="32" viewBox="0 0 96 32" aria-hidden="true">
                    <path className="ax-spark__area" d={spark.area} />
                    <path className="ax-spark__line" d={spark.line} />
                    <circle className="ax-spark__dot" cx={spark.last[0]} cy={spark.last[1]} r="2.5" />
                  </svg>
                </div>
                <p className="ax-metric__value">$18,640.00</p>
                <div className="ax-metric__foot">
                  <span className="ax-metric__meta">de $46,200.00 previstos</span>
                </div>
              </div>
              <div className="ax-metric">
                <div className="ax-metric__head">
                  <p className="ax-metric__label">Cuentas con acceso pausado</p>
                </div>
                <p className="ax-metric__value">6</p>
                <div className="ax-metric__foot">
                  <span className="ax-metric__meta">de 187 cuentas</span>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
