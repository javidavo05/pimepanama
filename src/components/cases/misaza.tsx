// motion: none — réplica estática del tablero real con datos de muestra; se captura a imagen (scripts/capture-cases.mjs).
import "./misaza.css";

const ICONS: Record<string, string> = {
  resumen: "M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z",
  caja: "M5 3h14v18H5zM8 7h8M8 12h2M12 12h2M16 12h0M8 16h2M12 16h2M16 16h0",
  pedidos: "M6 7h12l1 13H5zM9 7a3 3 0 016 0",
  citas: "M4 5h16v15H4zM4 10h16M8 3v4M16 3v4",
  kiosco: "M6 3h12v18H6zM11 18h2",
  clientes: "M9 11a3 3 0 100-6 3 3 0 000 6zM3 20c0-3.5 2.5-6 6-6s6 2.5 6 6M17 10a2.5 2.5 0 100-5M18 14c2 .5 3 2.5 3 5",
  mail: "M3 5h18v14H3zM3 6l9 7 9-7",
  producto: "M12 3l9 4.5v9L12 21l-9-4.5v-9zM3 7.5l9 4.5 9-4.5M12 12v9",
  inventario: "M3 9h8v6H3zM13 9h8v6h-8zM8 3h8v6H8zM8 15h8v6H8z",
  media: "M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6M16 9h.01",
  contenido: "M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7",
  paleta: "M12 3a9 9 0 100 18c1.5 0 2-1 1.5-2s0-2 1.5-2h2a3 3 0 003-3c0-6-4-11-8-11zM8 11h.01M12 8h.01M16 10h.01",
  metricas: "M4 20V10M10 20V4M16 20v-8M22 20H2",
  mayorista: "M2 13l5-4 4 2 4-3 7 5M7 9l3 7a2 2 0 003 0l4-4",
  usuarios: "M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2 20c0-4 3-6 7-6s7 2 7 6M17 5a3 3 0 010 6M19 15c2 1 3 3 3 5",
  ajustes: "M12 15a3 3 0 100-6 3 3 0 000 6zM19 12a7 7 0 00-.2-1.6l2-1.5-2-3.4-2.3 1a7 7 0 00-2.7-1.6L13.5 2h-3l-.3 2.9A7 7 0 007.5 6.5l-2.3-1-2 3.4 2 1.5A7 7 0 005 12c0 .5.1 1.1.2 1.6l-2 1.5 2 3.4 2.3-1a7 7 0 002.7 1.6l.3 2.9h3l.3-2.9a7 7 0 002.7-1.6l2.3 1 2-3.4-2-1.5c.1-.5.2-1.1.2-1.6z",
  tienda: "M14 4h6v6M20 4l-9 9M18 14v5H5V6h5",
  plegar: "M15 5l-7 7 7 7",
  ok: "M12 21a9 9 0 100-18 9 9 0 000 18zM8 12l3 3 5-6",
  alerta: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 8v5M12 16h.01",
  salir: "M10 4H4v16h6M15 8l4 4-4 4M19 12H9",
  sol: "M12 16a4 4 0 100-8 4 4 0 000 8zM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5",
};

function Icon({ name, size = 16 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  );
}

type Item = { label: string; icon: string; count?: number; active?: boolean };
const NAV: { group: string; items: Item[] }[] = [
  {
    group: "Operación",
    items: [
      { label: "Resumen", icon: "resumen", active: true },
      { label: "Caja", icon: "caja" },
      { label: "Pedidos", icon: "pedidos", count: 7 },
      { label: "Citas", icon: "citas", count: 3 },
      { label: "Kiosco de citas (iPad)", icon: "kiosco" },
      { label: "Clientes y mensajes", icon: "clientes", count: 4 },
      { label: "Comunicación", icon: "mail" },
    ],
  },
  {
    group: "Catálogo",
    items: [
      { label: "Productos", icon: "producto" },
      { label: "Inventario", icon: "inventario" },
      { label: "Biblioteca de media", icon: "media" },
    ],
  },
  {
    group: "Sitio",
    items: [
      { label: "Contenido", icon: "contenido", count: 2 },
      { label: "Apariencia", icon: "paleta" },
      { label: "Métricas", icon: "metricas" },
    ],
  },
  {
    group: "Administración",
    items: [
      { label: "Mayoristas", icon: "mayorista" },
      { label: "Usuarios del panel", icon: "usuarios" },
      { label: "Configuración", icon: "ajustes" },
    ],
  },
];

const STATS = [
  { label: "Ventas últimos 7 días", value: "$8,420.00", hint: "19 pedidos", tone: "accent" },
  { label: "Por preparar", value: "7", hint: "Pagados o en preparación", tone: "warning" },
  { label: "Esperando pago", value: "3", hint: "Se cancelan solos si no llega el pago", tone: "" },
  { label: "Últimas unidades", value: "5", hint: "Variantes con 1 en stock", tone: "" },
];

type Tone = "success" | "warning" | "info" | "neutral" | "danger" | "accent";
const ORDERS: { n: string; who: string; st: string; tone: Tone; total: string; when: string }[] = [
  { n: "MZ-1047", who: "Valentina Rojas", st: "Pago confirmado", tone: "success", total: "$640.00", when: "hace 12 min" },
  { n: "MZ-1046", who: "Camila Arosemena", st: "Confirmar pago", tone: "warning", total: "$385.00", when: "hace 48 min" },
  { n: "MZ-1045", who: "Daniela Quintero", st: "Preparando", tone: "info", total: "$1,120.00", when: "hace 2 h" },
  { n: "MZ-1044", who: "Mariana Pinzón", st: "Listo para retiro", tone: "info", total: "$520.00", when: "hace 3 h" },
  { n: "MZ-1043", who: "Isabella Mora", st: "Pago confirmado", tone: "success", total: "$890.00", when: "hace 5 h" },
  { n: "MZ-1042", who: "Lucía Barría", st: "Completado", tone: "neutral", total: "$450.00", when: "ayer" },
  { n: "MZ-1041", who: "Gabriela Cedeño", st: "Cancelado", tone: "danger", total: "$295.00", when: "ayer" },
  { n: "MZ-1040", who: "Sofía Batista", st: "Completado", tone: "neutral", total: "$760.00", when: "hace 2 días" },
];

const CHECKS = [
  { ok: true, label: "Almacenamiento de imágenes (R2)" },
  { ok: true, label: "Correos transaccionales (Brevo)" },
  { ok: false, label: "Yappy en producción", hint: "Credenciales del comercio en Banco General." },
  { ok: false, label: "PayPal en producción", hint: "Client ID y secret de la cuenta de Misaza." },
  { ok: true, label: "Tareas diarias (cron)" },
];

const APPTS = [
  { who: "Andrea Villalaz", kind: "Prueba de vestido", mod: "tienda", when: "9 oct, 10:00", ok: true },
  { who: "Natalia Espino", kind: "Asesoría de gala", mod: "video", when: "9 oct, 15:30", ok: false },
  { who: "Paola Sandoval", kind: "Ajuste final", mod: "tienda", when: "10 oct, 11:00", ok: true },
];

const MSGS = [
  { who: "Boutique Aurora", wholesale: true, when: "hace 20 min" },
  { who: "Elena Carrizo", wholesale: false, when: "hace 1 h" },
  { who: "Atelier Costa Sur", wholesale: true, when: "hace 4 h" },
];

export default function CaseMisaza() {
  return (
    <div className="case case-misaza">
      <aside className="mz-side">
        <div className="mz-brand">
          <span className="mz-logo">M</span>
          <span className="mz-brand-text">
            <span className="mz-brand-name">Misaza</span>
            <span className="mz-brand-sub">Panel</span>
          </span>
        </div>
        <nav className="mz-nav">
          {NAV.map((g) => (
            <div key={g.group} className="mz-group">
              <p className="mz-group-label">{g.group}</p>
              {g.items.map((i) => (
                <div key={i.label} className={i.active ? "mz-item is-active" : "mz-item"}>
                  <Icon name={i.icon} />
                  <span className="mz-item-label">{i.label}</span>
                  {i.count ? <span className="mz-badge">{i.count}</span> : null}
                </div>
              ))}
            </div>
          ))}
        </nav>
        <div className="mz-side-foot">
          <div className="mz-item">
            <Icon name="tienda" />
            <span className="mz-item-label">Ver la tienda</span>
          </div>
          <div className="mz-item mz-muted">
            <Icon name="plegar" />
            <span className="mz-item-label">Plegar</span>
          </div>
        </div>
      </aside>

      <div className="mz-main">
        <header className="mz-top">
          <span className="mz-top-spacer" />
          <span className="mz-round"><Icon name="sol" /></span>
          <span className="mz-user">
            <span className="mz-user-name">Marcela Díaz</span>
            <span className="mz-user-role">Dueño</span>
          </span>
          <span className="mz-round"><Icon name="salir" /></span>
        </header>

        <main className="mz-content">
          <div className="mz-page-head">
            <h1>Hola, Marcela</h1>
            <p>jueves, 8 de octubre de 2026, 10:42 · 6 personas en la tienda ahora mismo</p>
          </div>

          <div className="mz-stats">
            {STATS.map((s) => (
              <div key={s.label} className="mz-stat">
                <p className="mz-stat-label">{s.label}</p>
                <p className={`mz-stat-value ${s.tone}`}>{s.value}</p>
                <p className="mz-stat-hint">{s.hint}</p>
              </div>
            ))}
          </div>

          <div className="mz-grid">
            <section className="mz-card">
              <header className="mz-card-head">
                <h2>Últimos pedidos</h2>
                <span className="mz-link">Ver todos</span>
              </header>
              <table className="mz-table">
                <thead>
                  <tr>
                    <th>Pedido</th>
                    <th>Cliente</th>
                    <th>Estado</th>
                    <th className="r">Total</th>
                    <th className="r">Cuándo</th>
                  </tr>
                </thead>
                <tbody>
                  {ORDERS.map((o) => (
                    <tr key={o.n}>
                      <td className="mz-num">{o.n}</td>
                      <td>{o.who}</td>
                      <td><span className={`mz-pill ${o.tone}`}>{o.st}</span></td>
                      <td className="r mz-num">{o.total}</td>
                      <td className="r mz-soft">{o.when}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <div className="mz-col">
              <section className="mz-card">
                <header className="mz-card-head">
                  <div>
                    <h2>Puesta en marcha</h2>
                    <p className="mz-card-desc">2 pendientes para vender en producción.</p>
                  </div>
                </header>
                <ul className="mz-checks">
                  {CHECKS.map((c) => (
                    <li key={c.label}>
                      <span className={c.ok ? "mz-ic ok" : "mz-ic warn"}><Icon name={c.ok ? "ok" : "alerta"} size={16} /></span>
                      <span className="mz-check-text">
                        <span className={c.ok ? "mz-soft2" : "mz-strong"}>{c.label}</span>
                        {c.ok ? null : <span className="mz-hint">{c.hint}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="mz-card">
                <header className="mz-card-head">
                  <h2>Próximas citas</h2>
                  <span className="mz-link">Ver agenda</span>
                </header>
                <ul className="mz-list">
                  {APPTS.map((a) => (
                    <li key={a.who}>
                      <span className="mz-two">
                        <span className="mz-strong">{a.who}</span>
                        <span className="mz-hint">{a.kind} · {a.mod}</span>
                      </span>
                      <span className="mz-two r">
                        <span className="mz-num mz-hint">{a.when}</span>
                        <span className={`mz-pill ${a.ok ? "success" : "warning"}`}>{a.ok ? "Confirmada" : "Pendiente"}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="mz-card">
                <header className="mz-card-head">
                  <h2>Mensajes nuevos</h2>
                  <span className="mz-link">Ver todos</span>
                </header>
                <ul className="mz-list tight">
                  {MSGS.map((m) => (
                    <li key={m.who}>
                      <span className="mz-strong">{m.who}</span>
                      <span className="mz-right">
                        {m.wholesale ? <span className="mz-pill accent">Mayoreo</span> : null}
                        <span className="mz-hint">{m.when}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
