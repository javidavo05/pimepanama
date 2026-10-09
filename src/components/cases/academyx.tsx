// motion: none — réplica estática del tablero real con datos de muestra; se captura a imagen (scripts/capture-cases.mjs).
import "./academyx.css";

type IconName =
  | "grid" | "bell" | "cal" | "help" | "check" | "building" | "users" | "archive"
  | "user" | "shirt" | "trophy" | "trend" | "wallet" | "lock" | "heart" | "brief"
  | "file" | "mail" | "chat" | "gear" | "history" | "clock" | "grad" | "doc" | "dollar" | "chev" | "chevd" | "out";

const PATHS: Record<IconName, string> = {
  grid: "M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z",
  bell: "M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 0 0 4 0",
  cal: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  help: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17h.01",
  check: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 12l3 3 5-6",
  building: "M5 21V4h9v17M14 9h5v12M3 21h18M8 8h3M8 12h3M8 16h3",
  users: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2 20c0-3.5 3-6 7-6s7 2.5 7 6M17 4.5a3.5 3.5 0 0 1 0 6.5M19 14c2 .7 3 2.6 3 5",
  archive: "M3 5h18v4H3zM5 9v11h14V9M10 13h4",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.5-6 8-6s8 2 8 6",
  shirt: "M8 3l-5 3 2 5 3-1v11h8V10l3 1 2-5-5-3a4 4 0 0 1-8 0z",
  trophy: "M7 4h10v6a5 5 0 0 1-10 0zM7 6H3c0 3 1 4 4 5M17 6h4c0 3-1 4-4 5M12 15v4M8 21h8",
  trend: "M3 17l6-6 4 4 8-8M15 7h6v6",
  wallet: "M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l12-3v3M16 14h2",
  lock: "M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4",
  heart: "M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z",
  brief: "M3 8h18v12H3zM9 8V5h6v3M3 13h18",
  file: "M6 3h8l5 5v13H6zM14 3v5h5M9 13h6M9 17h6",
  mail: "M3 5h18v14H3zM3 6l9 7 9-7",
  chat: "M4 5h16v11H9l-5 4z",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12l2-1-2-4-2 .6-1.5-1L15 4h-4l-.5 2.6-1.5 1L7 7l-2 4 2 1v1l-2 1 2 4 2-.6 1.5 1L11 20h4l.5-2.6 1.5-1 2 .6 2-4-2-1z",
  history: "M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  grad: "M2 9l10-5 10 5-10 5zM6 11v5c3 2.5 9 2.5 12 0v-5",
  doc: "M6 3h12v18H6zM9 8h6M9 12h6M9 16h4",
  dollar: "M12 3v18M16 7.5c-1-1-2.4-1.5-4-1.5-2.2 0-4 1-4 2.8 0 4 8 2 8 6 0 1.8-1.8 2.7-4 2.7-1.8 0-3.2-.6-4.2-1.700",
  chev: "M9 6l6 6-6 6",
  chevd: "M6 9l6 6 6-6",
  out: "M9 4H4v16h5M16 8l4 4-4 4M20 12H9",
};

function Ic({ n, s = 14 }: { n: IconName; s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[n]} />
    </svg>
  );
}

type NavItem = { label: string; icon: IconName; badge?: number; active?: boolean };
type NavGroup = { label: string; open?: boolean; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    label: "Resumen",
    open: true,
    items: [
      { label: "Dashboard", icon: "grid", active: true },
      { label: "Notificaciones", icon: "bell" },
      { label: "Calendario", icon: "cal" },
      { label: "Guía del sistema", icon: "help" },
      { label: "Aprobaciones", icon: "check", badge: 7 },
    ],
  },
  {
    label: "Jugadores",
    items: [
      { label: "Matrícula", icon: "building" },
      { label: "Jugadores", icon: "users" },
      { label: "Estudiantes históricos", icon: "archive" },
      { label: "Tutores", icon: "user" },
      { label: "Familias", icon: "users" },
    ],
  },
  { label: "Productos y eventos", items: [{ label: "Productos", icon: "shirt" }, { label: "Torneos", icon: "trophy" }] },
  {
    label: "Finanzas",
    items: [
      { label: "Finanzas", icon: "trend" },
      { label: "Depósitos y ACH", icon: "wallet", badge: 3 },
      { label: "Cuentas bloqueadas", icon: "lock" },
    ],
  },
  { label: "Aliados y equipo", items: [{ label: "Padrinos", icon: "heart" }, { label: "Personal", icon: "brief" }] },
  { label: "Reportes", items: [{ label: "Reportes", icon: "file" }] },
  { label: "Comunicación", items: [{ label: "Correos", icon: "mail" }, { label: "WhatsApp", icon: "chat" }] },
  { label: "Configuración", items: [{ label: "Configuración", icon: "gear" }, { label: "Bitácora", icon: "history" }] },
];

type Kpi = { label: string; value: string; meta: string; icon: IconName; warn?: boolean };

const KPIS_A: Kpi[] = [
  { label: "Total de jugadores", value: "248", meta: "212 activos · 19 becados", icon: "users" },
  { label: "Jugadores activos", value: "212", meta: "85,5 % del padrón · 17 inactivos", icon: "check" },
  { label: "Aprobaciones pendientes", value: "7", meta: "Requieren revisión administrativa", icon: "clock", warn: true },
  { label: "Becados", value: "19", meta: "Estudiantes con estatus de beca", icon: "grad" },
];

const KPIS_B: Kpi[] = [
  { label: "Familias activas", value: "164", meta: "Con al menos un estudiante activo o becado", icon: "users" },
  { label: "Temporadas activas", value: "2", meta: "Periodos operativos abiertos en temporadas", icon: "cal" },
  { label: "Asignación de materias pendiente", value: "0", meta: "Todas las matrículas tienen materias", icon: "doc" },
];

type Action = { title: string; desc: string; icon: IconName; badge?: string };

const ACTIONS: Action[] = [
  { title: "Revisar aprobaciones", desc: "7 solicitudes en cola de aprobación", icon: "clock", badge: "7" },
  { title: "Directorio de jugadores", desc: "248 registros en el padrón institucional", icon: "users" },
  { title: "Centro financiero", desc: "Cobros, pagos, estados de cuenta y reportes", icon: "dollar" },
  { title: "Familias", desc: "164 familias con estudiantes activos", icon: "users" },
  { title: "Configuración", desc: "Precios, temporadas, cobros y parámetros operativos", icon: "cal" },
];

function KpiCard({ k }: { k: Kpi }) {
  return (
    <div className="ax-panel ax-kpi">
      <div className="ax-kpi-top">
        <p className="ax-kpi-label">{k.label}</p>
        <span className="ax-kpi-ic"><Ic n={k.icon} s={16} /></span>
      </div>
      <p className={k.warn ? "ax-kpi-value ax-warn" : "ax-kpi-value"}>{k.value}</p>
      <p className="ax-kpi-meta">{k.meta}</p>
    </div>
  );
}

export default function CaseAcademyx() {
  return (
    <div className="case case-academyx">
      <aside className="ax-side" aria-label="Navegación principal">
        <div className="ax-brand">
          <div className="ax-logo">A</div>
          <div className="ax-brand-txt">
            <span className="ax-brand-name">Academia Halcones</span>
            <span className="ax-badge">Academia</span>
          </div>
          <span className="ax-collapse"><Ic n="chev" s={16} /></span>
        </div>

        <nav className="ax-nav">
          {NAV.map((g) => (
            <div key={g.label} className="ax-group">
              <div className={g.open ? "ax-ghead is-open" : "ax-ghead"}>
                <Ic n={g.open ? "chevd" : "chev"} s={12} />
                <span>{g.label}</span>
              </div>
              {g.open && (
                <div className="ax-links">
                  {g.items.map((it) => (
                    <div key={it.label} className={it.active ? "ax-link is-active" : "ax-link"}>
                      <Ic n={it.icon} s={14} />
                      <span>{it.label}</span>
                      {it.badge ? <em className="ax-nbadge">{it.badge}</em> : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="ax-foot">
          <div className="ax-user">
            <span className="ax-bell"><Ic n="bell" s={16} /></span>
            <span className="ax-avatar">D</span>
            <div className="ax-user-txt">
              <span className="ax-email">direccion@halcones.example</span>
              <span className="ax-role">Administrador</span>
            </div>
          </div>
          <div className="ax-logout"><Ic n="out" s={16} /> Cerrar Sesión</div>
        </div>
      </aside>

      <main className="ax-main">
        <div className="ax-surface">
          <header className="ax-head">
            <p className="ax-eyebrow">Panel de administración</p>
            <h1 className="ax-title">Academia Halcones</h1>
            <p className="ax-sub">Resumen operativo · jueves, 8 de octubre de 2026</p>
          </header>

          <section>
            <div className="ax-sec-head">
              <h2>Indicadores de matrícula</h2>
              <p>Conteos en tiempo real de la academia activa.</p>
            </div>
            <div className="ax-grid4">{KPIS_A.map((k) => <KpiCard key={k.label} k={k} />)}</div>
          </section>

          <section>
            <div className="ax-sec-head">
              <h2>Operación institucional</h2>
              <p>Familias, ciclo académico y cuentas de representantes.</p>
            </div>
            <div className="ax-grid4">{KPIS_B.map((k) => <KpiCard key={k.label} k={k} />)}</div>
          </section>

          <section>
            <div className="ax-sec-head">
              <h2>Accesos directos</h2>
              <p>Tareas frecuentes de administración académica y financiera.</p>
            </div>
            <div className="ax-grid2">
              {ACTIONS.map((a) => (
                <div key={a.title} className="ax-action">
                  <span className="ax-action-ic"><Ic n={a.icon} s={20} /></span>
                  <div className="ax-action-txt">
                    <p className="ax-action-title">
                      {a.title}
                      {a.badge ? <em className="ax-pill">{a.badge}</em> : null}
                    </p>
                    <p className="ax-action-desc">{a.desc}</p>
                  </div>
                  <Ic n="chev" s={16} />
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
