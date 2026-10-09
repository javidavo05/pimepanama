// motion: none — réplica estática del tablero real con datos de muestra; se captura a imagen (scripts/capture-cases.mjs).
import "./john-henry.css";

const NAV = [
  { label: "Dashboard", d: "M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z" },
  { label: "Citas", d: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4" },
  { label: "Clientes", d: "M9 11a4 4 0 100-8 4 4 0 000 8zM2 21c0-4 3-6 7-6s7 2 7 6M17 4a4 4 0 010 7M22 21c0-3-2-5-4-5.5" },
  { label: "Telas", d: "M4 4h16v16H4zM4 9h16M4 14h16M9 4v16" },
  { label: "Modelos", d: "M8 3l-5 4 3 3 2-1v12h8V9l2 1 3-3-5-4a4 4 0 01-8 0z" },
  { label: "Órdenes", d: "M6 3a3 3 0 100 6 3 3 0 000-6zM6 15a3 3 0 100 6 3 3 0 000-6zM8 8l12 11M8 16L20 5" },
  { label: "Finanzas", d: "M3 7h18v13H3zM3 7l2-3h14l2 3M16 13h2" },
  { label: "Correos", d: "M3 5h18v14H3zM3 6l9 7 9-7" },
  { label: "Ajustes", d: "M12 9a3 3 0 100 6 3 3 0 000-6zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" },
];

const KPIS = [
  { label: "Citas hoy", value: "7", sub: "31 esta semana", d: NAV[1].d },
  { label: "Ingresos del mes (consolidado)", value: "$48,320 USD", sub: "Ticket promedio: $1,610", d: NAV[6].d },
  { label: "Clientes nuevos", value: "12", sub: "18 recurrentes este mes", d: NAV[2].d },
  { label: "Órdenes activas", value: "26", sub: "4 en borrador", d: NAV[5].d },
];

const MONTHS = [
  { m: "May", v: 31200 },
  { m: "Jun", v: 36800 },
  { m: "Jul", v: 29500 },
  { m: "Ago", v: 41400 },
  { m: "Sep", v: 44900 },
  { m: "Oct", v: 48320 },
];

const SEDES = [
  { n: "Bogotá", v: "$27,450" },
  { n: "Medellín", v: "$11,070" },
  { n: "Ciudad de Panamá", v: "$9,800" },
];

const ESTADOS = [
  "Orden creada: 4",
  "Aceptada: 9",
  "En preparación: 11",
  "Lista para entrega: 6",
  "Entregada: 58",
  "Cancelada: 2",
];

function Icon({ d, size = 16 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export default function CaseJohnHenry() {
  const max = 50000;
  const ch = 180;
  const bw = 44;
  const gap = 28;
  return (
    <div className="case case-john-henry">
      <aside className="jh-side">
        <div className="jh-brand">
          <svg width="22" height="20" viewBox="0 0 24 22" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M3 2h7M14 2h7M8 2v13c0 3 2 4 4 5M16 2v13c0 3-2 4-4 5" />
          </svg>
          <span>John Henry</span>
        </div>
        <nav className="jh-nav">
          {NAV.map((it, i) => (
            <div key={it.label} className={i === 0 ? "jh-item jh-item-on" : "jh-item"}>
              <Icon d={it.d} />
              <span>{it.label}</span>
            </div>
          ))}
        </nav>
        <div className="jh-foot">
          <div className="jh-user">
            <b>Camila Restrepo</b>
            <span>Administrador</span>
          </div>
          <div className="jh-logout">Cerrar sesión</div>
        </div>
      </aside>

      <div className="jh-main">
        <header className="jh-head">
          <span className="jh-trigger">
            <Icon d="M3 4h18v16H3zM9 4v16" />
          </span>
          <span className="jh-sep" />
          <span className="jh-badge">Todas las sedes</span>
          <span className="jh-install">Instalar app</span>
        </header>

        <main className="jh-body">
          <h1>Dashboard</h1>
          <p className="jh-lead">Resumen general del negocio.</p>

          <div className="jh-kpis">
            {KPIS.map((k) => (
              <div key={k.label} className="jh-card">
                <div className="jh-card-top">
                  <span>{k.label}</span>
                  <Icon d={k.d} />
                </div>
                <div className="jh-val">{k.value}</div>
                <div className="jh-sub">{k.sub}</div>
              </div>
            ))}
          </div>

          <div className="jh-row">
            <div className="jh-card jh-wide">
              <h2>Tendencia de ingresos (últimos 6 meses, USD consolidado)</h2>
              <svg viewBox="0 0 560 230" width="100%" height="230" role="img" aria-label="Ingresos mensuales">
                {[0, 1, 2, 3, 4].map((i) => {
                  const y = 10 + (i * ch) / 4;
                  return (
                    <g key={i}>
                      <line x1="58" x2="552" y1={y} y2={y} className="jh-grid" />
                      <text x="50" y={y + 4} textAnchor="end" className="jh-tick">
                        ${(((4 - i) * max) / 4).toLocaleString("en-US")}
                      </text>
                    </g>
                  );
                })}
                {MONTHS.map((b, i) => {
                  const h = (b.v / max) * ch;
                  const x = 76 + i * (bw + gap + 8);
                  return (
                    <g key={b.m}>
                      <rect x={x} y={10 + ch - h} width={bw + 8} height={h} rx="3" className="jh-bar" />
                      <text x={x + (bw + 8) / 2} y="214" textAnchor="middle" className="jh-tick">
                        {b.m}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="jh-card">
              <h2>Ingresos del mes por sede</h2>
              <ul className="jh-sedes">
                {SEDES.map((s) => (
                  <li key={s.n}>
                    <span>{s.n}</span>
                    <b>{s.v}</b>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="jh-card jh-states">
            <h2>Órdenes por estado</h2>
            <div className="jh-chips">
              {ESTADOS.map((e) => (
                <span key={e} className="jh-chip">
                  {e}
                </span>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
