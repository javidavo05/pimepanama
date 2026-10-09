// motion: none — réplica estática del tablero real con datos de muestra; se captura a imagen (scripts/capture-cases.mjs).
import "./holo-realty.css";

type IconProps = { children: React.ReactNode; size?: number };

function Ic({ children, size = 16 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
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
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </>
  ),
  crm: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <circle cx="12" cy="10" r="3" />
      <path d="M7 18c1-2.5 3-3.5 5-3.5s4 1 5 3.5" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.8-3.4 3.4-5 6.5-5s5.7 1.6 6.5 5" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8" />
      <path d="M18 15.3c1.9.6 3.1 2.1 3.5 4.7" />
    </>
  ),
  workflow: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <path d="M6.5 10v4.5a2 2 0 0 0 2 2H14" />
    </>
  ),
  advisor: (
    <>
      <circle cx="10" cy="8" r="3.5" />
      <path d="M3 20c.8-3.4 3.4-5 7-5 1.2 0 2.2.2 3.2.6" />
      <circle cx="18" cy="17" r="2.2" />
      <path d="M18 12.8v1M18 20.2v1M14.4 14.9l.9.5M20.7 19.1l.9.5M14.4 19.1l.9-.5M20.7 14.9l.9-.5" />
    </>
  ),
  landmark: (
    <>
      <path d="M3 21h18" />
      <path d="M5 21V10M10 21V10M14 21V10M19 21V10" />
      <path d="M12 3 3 8h18z" />
    </>
  ),
  warehouse: (
    <>
      <path d="M3 21V9l9-5 9 5v12" />
      <path d="M8 21v-7h8v7M8 17.5h8" />
    </>
  ),
  inbox: (
    <>
      <path d="M3 13h5l1.5 3h5L16 13h5" />
      <path d="M5.5 5h13L21 13v6H3v-6z" />
    </>
  ),
  building: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="1.5" />
      <path d="M9 8h2M13 8h2M9 12h2M13 12h2M10 21v-4h4v4" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  file: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 7 8.5 6 8.5-6" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </>
  ),
  chevron: <path d="m9 6 6 6-6 6" />,
  bell: (
    <>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 8.5 3 8.5H3S6 15 6 8" />
      <path d="M10.3 20a2 2 0 0 0 3.4 0" />
    </>
  ),
  userplus: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.8-3.4 3.4-5 6.5-5s5.7 1.6 6.5 5M19 8v6M16 11h6" />
    </>
  ),
  megaphone: (
    <>
      <path d="m3 11 15-6v14L3 13z" />
      <path d="M7 13.5V18a2 2 0 0 0 4 0v-2.5" />
    </>
  ),
  alert: (
    <>
      <path d="M10.3 4 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 4a2 2 0 0 0-3.4 0z" />
      <path d="M12 9.5v4M12 17h.01" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 12a8 8 0 0 0-14-5.3L4 9" />
      <path d="M4 4v5h5" />
      <path d="M4 12a8 8 0 0 0 14 5.3L20 15" />
      <path d="M20 20v-5h-5" />
    </>
  ),
};

function Icon({ name, size }: { name: string; size?: number }) {
  return <Ic size={size}>{ICONS[name]}</Ic>;
}

const NAV_GROUPS = [
  {
    label: "CRM",
    items: [
      { label: "Dashboard ejecutivo", icon: "dashboard" },
      { label: "CRM (tablero)", icon: "crm" },
      { label: "Clientes", icon: "users" },
      { label: "Procesos", icon: "workflow" },
      { label: "Asesores", icon: "advisor" },
    ],
  },
  {
    label: "Operaciones",
    items: [
      { label: "Financiero", icon: "landmark" },
      { label: "Edificios", icon: "warehouse" },
      { label: "Documentos", icon: "inbox" },
    ],
  },
  {
    label: "Inventario",
    items: [
      { label: "Propiedades", icon: "building" },
      { label: "Zonas", icon: "pin" },
    ],
  },
  {
    label: "Sistema",
    items: [
      { label: "Páginas", icon: "file" },
      { label: "Comunicación", icon: "mail" },
      { label: "Configuración", icon: "settings" },
    ],
  },
];

type Tone = "default" | "warning" | "success";

const KPIS: {
  title: string;
  value: string;
  icon: string;
  sub: string;
  tone: Tone;
  delta?: string;
}[] = [
  {
    title: "Inventario activo",
    value: "148",
    icon: "building",
    sub: "163 registros en cartera",
    tone: "default",
    delta: "+6% vs semana anterior (altas)",
  },
  {
    title: "Leads nuevos hoy",
    value: "7",
    icon: "users",
    sub: "31 en los últimos 7 días",
    tone: "warning",
  },
  {
    title: "Sin seguimiento (+48 h)",
    value: "5",
    icon: "alert",
    sub: "Requieren acción comercial",
    tone: "warning",
  },
  {
    title: "Campañas activas",
    value: "3",
    icon: "megaphone",
    sub: "Programadas o en envío",
    tone: "default",
  },
  {
    title: "Leads urgentes (proyectos)",
    value: "2",
    icon: "landmark",
    sub: "Prioridad alta en landings",
    tone: "warning",
  },
  {
    title: "Última actualización de inventario",
    value: "08 oct, 06:15",
    icon: "refresh",
    sub: "Listado actualizado correctamente",
    tone: "success",
  },
];

const PIPELINE = [
  { label: "Nuevos", count: 18, pct: 31 },
  { label: "Contactados", count: 21, pct: 36 },
  { label: "Calificados", count: 12, pct: 21 },
  { label: "Cerrados / Archivados", count: 7, pct: 12 },
];

export default function CaseHoloRealty() {
  return (
    <div className="case case-holo-realty">
      <aside className="hr-sidebar">
        <div className="hr-brand">
          <div className="hr-brand-mark">
            <span>H</span>
          </div>
          <div className="hr-brand-text">
            <span className="hr-brand-name">HOLO CMS</span>
            <span className="hr-brand-sub">Realty &amp; Relocation</span>
          </div>
        </div>

        <nav className="hr-nav">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="hr-nav-group">
              <p className="hr-nav-label">{group.label}</p>
              <ul className="hr-nav-list">
                {group.items.map((item) => (
                  <li key={item.label} className="hr-nav-item">
                    <span className="hr-nav-icon">
                      <Icon name={item.icon} />
                    </span>
                    <span className="hr-nav-text">{item.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="hr-signout">
          <div className="hr-nav-item">
            <span className="hr-nav-icon">
              <Icon name="logout" />
            </span>
            <span className="hr-nav-text">Cerrar sesión</span>
          </div>
        </div>
      </aside>

      <div className="hr-main-col">
        <header className="hr-topbar">
          <div className="hr-bell">
            <Icon name="bell" size={20} />
            <span className="hr-bell-dot" />
          </div>
        </header>

        <main className="hr-main">
          <div className="hr-page">
            <div className="hr-head">
              <div>
                <p className="hr-date">jueves, 08 de octubre de 2026</p>
                <h1 className="hr-title">Hola, Valeria Montenegro</h1>
                <p className="hr-intro">
                  Resumen comercial del día: inventario, leads y actividad reciente en un solo vistazo.
                </p>
              </div>
              <div className="hr-actions">
                <div className="hr-btn hr-btn-outline-bg">
                  <Icon name="userplus" />
                  Nuevo lead
                </div>
                <div className="hr-btn hr-btn-primary">
                  <Icon name="building" />
                  Nueva propiedad
                </div>
                <div className="hr-btn hr-btn-outline">
                  <Icon name="megaphone" />
                  Crear campaña
                </div>
              </div>
            </div>

            <div className="hr-kpis">
              {KPIS.map((k) => (
                <div key={k.title} className="hr-kpi">
                  <div className="hr-kpi-top">
                    <p className="hr-kpi-title">{k.title}</p>
                    <div className={`hr-kpi-icon hr-tone-${k.tone}`}>
                      <Icon name={k.icon} />
                    </div>
                  </div>
                  <div>
                    <p className="hr-kpi-value">{k.value}</p>
                    <p className="hr-kpi-sub">{k.sub}</p>
                    {k.delta ? <p className="hr-kpi-delta">{k.delta}</p> : null}
                  </div>
                </div>
              ))}
            </div>

            <section className="hr-panel">
              <div className="hr-panel-head">
                <div>
                  <h2 className="hr-panel-title">Embudo de leads</h2>
                  <p className="hr-panel-sub">Distribución por etapa comercial</p>
                </div>
                <span className="hr-link">2 urgentes en proyectos →</span>
              </div>
              <div className="hr-funnel">
                {PIPELINE.map((c) => (
                  <div key={c.label} className="hr-funnel-col">
                    <p className="hr-funnel-label">{c.label}</p>
                    <p className="hr-funnel-count">{c.count}</p>
                    <p className="hr-funnel-pct">{c.pct}% del total</p>
                    <span className="hr-link hr-funnel-link">Ver leads</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
