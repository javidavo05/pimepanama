// motion: none — réplica estática del tablero real con datos de muestra; se captura a imagen (scripts/capture-cases.mjs).
import "./smart-church.css";

type IconKey =
  | "home"
  | "space"
  | "ministries"
  | "roster"
  | "calendar"
  | "users"
  | "visits"
  | "pastor"
  | "board"
  | "publish"
  | "forms"
  | "messages"
  | "settings"
  | "cms"
  | "mail"
  | "bell";

const ICONS: Record<IconKey, string> = {
  home: "M3 11l9-7 9 7M5 10v10h14V10",
  space: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 4-6 8-6s8 2 8 6",
  ministries: "M8 11a3 3 0 100-6 3 3 0 000 6zM16 11a3 3 0 100-6 3 3 0 000 6zM2 20c0-3 3-5 6-5s6 2 6 5M14 15c4-1 8 1 8 5",
  roster: "M5 4h14v16H5zM9 9h6M9 13h6M9 17h3",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  users: "M3 11l9-7 9 7M6 10v10h12V10M10 20v-5h4v5",
  visits: "M12 21s-7-6-7-11a7 7 0 0114 0c0 5-7 11-7 11zM12 12a2 2 0 100-4 2 2 0 000 4z",
  pastor: "M4 5h16v11H9l-5 4zM8 9h8M8 12h5",
  board: "M4 20V9l8-5 8 5v11M9 20v-6h6v6M4 20h16",
  publish: "M4 12l16-8-6 16-3-7z",
  forms: "M6 3h12v18H6zM9 8h6M9 12h6M9 16h3",
  messages: "M3 6h18v12H3zM3 7l9 7 9-7",
  settings: "M12 15a3 3 0 100-6 3 3 0 000 6zM12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1",
  cms: "M3 5h18v14H3zM3 9h18M7 7h.01",
  mail: "M3 6h18v12H3zM3 7l9 6 9-6",
  bell: "M6 17V11a6 6 0 0112 0v6l2 2H4zM10 21h4",
};

function Icon({ name }: { name: IconKey }) {
  return (
    <svg
      className="sc-ico"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

type NavEntry = {
  label: string;
  icon: IconKey;
  badge?: number;
  active?: boolean;
  sub?: string[];
};

const GROUPS: { label: string | null; items: NavEntry[] }[] = [
  { label: null, items: [{ label: "Hoy", icon: "home", active: true }] },
  { label: "Mi servicio", items: [{ label: "Mi espacio", icon: "space" }] },
  {
    label: "Mis equipos",
    items: [
      { label: "Equipos", icon: "ministries", sub: ["Alabanza", "Niños", "Recepción"] },
      { label: "Turnos del sábado", icon: "roster", badge: 2 },
    ],
  },
  {
    label: "Iglesia",
    items: [
      { label: "Calendario", icon: "calendar" },
      { label: "Familias", icon: "users" },
      { label: "Visitas", icon: "visits", badge: 3 },
      { label: "Citas del pastor", icon: "pastor", badge: 1 },
      { label: "Junta", icon: "board" },
    ],
  },
  {
    label: "Comunicar",
    items: [
      { label: "Publicar", icon: "publish" },
      { label: "Formularios", icon: "forms" },
      { label: "Mensajes del sitio web", icon: "messages", badge: 4 },
    ],
  },
  {
    label: "Administrar",
    items: [
      { label: "Personas", icon: "users" },
      { label: "Configuración", icon: "settings" },
      { label: "Sitio web", icon: "cms" },
      { label: "Correos automáticos", icon: "mail" },
      { label: "Historial de envíos", icon: "bell" },
    ],
  },
];

const STATS = [
  { label: "Visitas pendientes", value: 3, hint: "por contactar", hot: true },
  { label: "Mensajes del sitio web", value: 4, hint: "sin leer", hot: true },
  { label: "Citas del pastor", value: 1, hint: "por confirmar", hot: true },
  { label: "Personas nuevas", value: 2, hint: "sin asignar aún", hot: true },
  { label: "Turnos del sábado", value: 2, hint: "bloques sin cubrir", hot: true },
];

const WEEK = [
  { title: "Ensayo de alabanza", when: "lun 12 oct · 19:00 · Templo" },
  { title: "Reunión de líderes de niños", when: "mié 14 oct · 18:30 · Salón 2" },
  { title: "Célula de jóvenes", when: "jue 15 oct · 19:30 · Casa Mendoza" },
  { title: "Servicio de oración", when: "vie 16 oct · 20:00 · Templo" },
];

const ACTIONS = [
  ["Turnos del sábado", "Quién sirve en cada momento del culto"],
  ["Calendario de la iglesia", "Lo de tus equipos y la iglesia"],
  ["Publicar", "Anuncios y eventos"],
  ["Visitas", "Acompañar a quien lo pidió"],
  ["Citas del pastor", "Confirmar conversaciones"],
  ["Junta", "Agenda y votaciones"],
];

export default function CaseSmartChurch() {
  return (
    <div className="case case-smart-church">
      <aside className="sc-side">
        <div className="sc-brand" role="img" aria-label="Iglesia Esperanza Viva">
          <span className="sc-brand-mark">Esperanza</span>
          <span>Viva</span>
        </div>
        <div className="sc-search">
          <svg className="sc-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="6" />
            <path d="M20 20l-4-4" />
          </svg>
          <span>Buscar</span>
          <kbd>Ctrl K</kbd>
        </div>
        <nav className="sc-nav" aria-label="Secciones">
          {GROUPS.map((group, gi) => (
            <div key={gi} className={group.label && gi > 0 ? "sc-group sc-group-sep" : "sc-group"}>
              {group.label && (
                <div className="sc-group-head">
                  <span>{group.label}</span>
                  <svg className="sc-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>
              )}
              {group.items.map((item) => (
                <div key={item.label}>
                  <div className={item.active ? "sc-item sc-item-on" : "sc-item"}>
                    <Icon name={item.icon} />
                    <span className="sc-item-label">{item.label}</span>
                    {item.badge ? <span className="sc-badge">{item.badge}</span> : null}
                  </div>
                  {item.sub && (
                    <div className="sc-sub">
                      {item.sub.map((s) => (
                        <div key={s} className="sc-subitem">
                          {s}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </nav>
        <div className="sc-foot">
          <div>
            <div className="sc-foot-name">Marcos Delgado</div>
            <div className="sc-foot-role">Administrador</div>
          </div>
          <span className="sc-foot-out">Salir</span>
        </div>
      </aside>

      <main className="sc-main">
        <header className="sc-head">
          <h1>Buenos días, Marcos</h1>
          <p>Hay personas esperando respuesta — esto es lo primero que conviene revisar.</p>
        </header>

        <section className="sc-turn">
          <div>
            <p className="sc-eyebrow">Tu próximo turno</p>
            <p className="sc-turn-date">Sábado 17 de octubre</p>
            <p className="sc-turn-sub">Predicación y Apertura · Alabanza</p>
          </div>
          <span className="sc-btn sc-btn-2">Mis turnos y cambios</span>
        </section>

        <div className="sc-stats">
          {STATS.map((s) => (
            <div key={s.label} className={s.hot ? "sc-stat sc-stat-hot" : "sc-stat"}>
              <span className="sc-stat-label">{s.label}</span>
              <span className="sc-stat-value">{s.value}</span>
              <span className="sc-stat-hint">{s.hint}</span>
            </div>
          ))}
        </div>

        <div className="sc-row">
          <section className="sc-card">
            <div className="sc-card-top">
              <div>
                <h2>Próximo culto</h2>
                <p className="sc-muted">Sábado 17 de octubre · 9:45 am – 12:00 md</p>
                <p className="sc-body">Quedan 2 bloques del programa sin asignar.</p>
                <p className="sc-warn">1 conflicto de horario entre asignaciones.</p>
              </div>
              <span className="sc-btn sc-btn-1">Ver turnos del sábado</span>
            </div>
          </section>
        </div>

        <section className="sc-card">
          <div className="sc-card-top sc-card-top-c">
            <h2>Esta semana</h2>
            <span className="sc-link">Ver calendario →</span>
          </div>
          <ul className="sc-week">
            {WEEK.map((e) => (
              <li key={e.title}>
                <span className="sc-week-t">{e.title}</span>
                <span className="sc-week-w">{e.when}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="sc-h2">Acciones rápidas</h2>
          <div className="sc-actions">
            {ACTIONS.map(([t, d]) => (
              <div key={t} className="sc-action">
                <p className="sc-action-t">{t}</p>
                <p className="sc-action-d">{d}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
