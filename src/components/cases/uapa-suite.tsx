// motion: none — réplica estática del tablero real con datos de muestra; se captura a imagen (scripts/capture-cases.mjs).
import "./uapa-suite.css";

type Seccion = {
  titulo: string;
  icono: string;
  abierta?: boolean;
  rutas?: string[];
};

const PRINCIPAL: Seccion[] = [
  { titulo: "Inicio", icono: "M3 8l5-4.5L13 8v5H3z" },
  { titulo: "Cifras", icono: "M3 13V8M8 13V4M13 13V9", abierta: false, rutas: ["Tablero", "Informes"] },
  {
    titulo: "Expedientes",
    icono: "M3 4.5h4l1.2 1.5H13V12H3z",
    abierta: true,
    rutas: ["Propiedades", "Obreros", "Documentos", "Asistente"],
  },
  {
    titulo: "Juntas y acuerdos",
    icono: "M3 12.5V5l5-2 5 2v7.5M6 12.5V8h4v4.5",
    abierta: true,
    rutas: ["Miembros de junta", "Organismos", "Juntas", "Acuerdos", "Votaciones", "Por revisar", "Comunicaciones"],
  },
  {
    titulo: "Mi espacio",
    icono: "M8 7.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM3.5 13.5c.4-2.4 2.2-3.5 4.5-3.5s4.1 1.1 4.5 3.5",
    rutas: ["Avisos", "Vacaciones", "Conflicto de interés", "Mis juntas", "Mis llamados", "Mis seguimientos"],
  },
];

const PIE: Seccion[] = [
  { titulo: "Ajustes", icono: "M3 5h10M3 8h10M3 11h10" },
  {
    titulo: "Administración",
    icono: "M8 2.5l5 2v3.5c0 3-2 4.7-5 5.5-3-.8-5-2.5-5-5.5V4.5z",
    rutas: ["Organización", "Usuarios", "Accesos", "Uso de IA", "Bitácora"],
  },
];

type Fila = { que: string; origen: string; estado: string; verbo: string };
type Tramo = { clave: "vencido" | "pronto" | "resto"; titulo: string; marca: string; filas: Fila[] };

const TRAMOS: Tramo[] = [
  {
    clave: "vencido",
    titulo: "Vencido o urgente",
    marca: "M8 4.6v4.6M8 11.4h.01",
    filas: [
      {
        que: "Acta 14 de 2026 de la Junta Ejecutiva",
        origen: "Actas",
        estado: "Cerrada hace 9 días, esperan las firmas",
        verbo: "Firmar",
      },
      {
        que: "Vacaciones de Marcos Quintero",
        origen: "Vacaciones",
        estado: "Solicitud del 2 de mayo, sin respuesta",
        verbo: "Firmar",
      },
    ],
  },
  {
    clave: "pronto",
    titulo: "Esta semana",
    marca: "M8 4.8V8l2.2 1.4",
    filas: [
      {
        que: "Votación: presupuesto del Colegio Betel",
        origen: "Votaciones",
        estado: "Cierra el viernes 16 de mayo",
        verbo: "Votar",
      },
      {
        que: "Agenda de la junta 15 de 2026",
        origen: "Juntas",
        estado: "Se reúne el martes 20 de mayo",
        verbo: "Aprobar la agenda",
      },
      {
        que: "3 vencimientos más en tus avisos",
        origen: "Avisos",
        estado: "Seguros y escrituras de propiedades",
        verbo: "Ver los avisos",
      },
    ],
  },
  {
    clave: "resto",
    titulo: "Cuando puedas",
    marca: "M5.4 8h5.2",
    filas: [
      {
        que: "5 cosas más esperan tu revisión",
        origen: "Por revisar",
        estado: "Documentos digitalizados sin clasificar",
        verbo: "Abrir la bandeja",
      },
      {
        que: "Tu declaración de conflicto de interés 2026",
        origen: "Mi espacio",
        estado: "Aún sin firmar",
        verbo: "Firmar",
      },
    ],
  },
];

const AMBITO = ["Unión de Muestra", "Campo Local Norte", "Campo Local Sur"];

function Trazo({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

function Grupo({ s, activa }: { s: Seccion; activa?: boolean }) {
  const cls = `cs-item${activa ? " cs-item-activo" : ""}${s.rutas ? " cs-item-grupo" : ""}`;
  return (
    <li>
      <div className={cls}>
        <span className="cs-ico"><Trazo d={s.icono} /></span>
        <span className="cs-txt">{s.titulo}</span>
        {s.rutas ? (
          <span className={`cs-chev${s.abierta ? " cs-chev-abierto" : ""}`}><Trazo d="m4 6.2 4 3.6 4-3.6" /></span>
        ) : null}
      </div>
      {s.rutas && s.abierta ? (
        <ul className="cs-sub">
          {s.rutas.map((r) => (
            <li key={r} className="cs-item cs-item-sub">
              <span className="cs-txt">{r}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export default function CaseUapaSuite() {
  return (
    <div className="case case-uapa-suite">
      <header className="cs-cab">
        <div className="cs-marca">
          <svg viewBox="0 0 28 28" className="cs-simbolo" aria-hidden="true">
            <path d="M14 3 L22 24 L14 19 L6 24 Z" fill="currentColor" />
          </svg>
          <span className="cs-marca-nombre">UAPA Suite</span>
          <span className="cs-marca-sep">/</span>
          <span className="cs-marca-sis">Secretaría</span>
        </div>
        <div className="cs-busca">
          <Trazo d="M7 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM11 11l3 3" />
          <span>Buscar en todo…</span>
          <kbd>⌘K</kbd>
        </div>
        <div className="cs-cab-der">
          <span className="cs-campana">
            <Trazo d="M5 6.6a3 3 0 0 1 6 0c0 2.9 1 3.9 1 3.9H4s1-1 1-3.9ZM6.7 12.6a1.5 1.5 0 0 0 2.6 0" />
            <span className="cs-badge">3</span>
          </span>
          <span className="cs-quien">
            <strong>Ana Beatriz Cedeño</strong>
            <small>Secretaria de Unión</small>
          </span>
          <span className="cs-vsep" />
          <span className="cs-tema">
            <i className="cs-tema-on" /><i /><i />
          </span>
          <span className="cs-enlace">Cambiar de sistema</span>
          <span className="cs-enlace">Mi perfil</span>
          <span className="cs-btn">Salir</span>
        </div>
      </header>

      <div className="cs-cuerpo">
        <aside className="cs-estante">
          <nav aria-label="Secciones de Secretaría">
            <ul className="cs-menu">
              {PRINCIPAL.map((s) => (
                <Grupo key={s.titulo} s={s} activa={s.titulo === "Inicio"} />
              ))}
            </ul>
            <span className="cs-filete" />
            <ul className="cs-menu">
              {PIE.map((s) => (
                <Grupo key={s.titulo} s={s} />
              ))}
            </ul>
          </nav>
        </aside>

        <main className="cs-main">
          <div className="cs-encabezado">
            <h1>Hola, Ana</h1>
            <p>
              Aquí ves lo que te toca hoy, de todos los módulos: primero lo vencido, después lo de esta semana. Cada
              botón te lleva directo a resolverlo.
            </p>
          </div>

          <section className="cs-lista">
            <div className="cs-lista-cab">
              <h2>Lo que te toca</h2>
              <p>7 pendientes</p>
            </div>
            {TRAMOS.map((t) => (
              <div key={t.clave} className="cs-tramo">
                <h3>{t.titulo}</h3>
                <ul>
                  {t.filas.map((f) => (
                    <li key={f.que} className="cs-fila">
                      <span className={`cs-marca-tramo cs-${t.clave}`}>
                        <Trazo d={t.marca} />
                      </span>
                      <div className="cs-fila-txt">
                        <p className="cs-que">{f.que}</p>
                        <p className="cs-meta">
                          <span>{f.origen}</span> · {f.estado}
                        </p>
                      </div>
                      <span className="cs-btn">{f.verbo}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>

          <section className="cs-sesion">
            <h2>Tu sesión</h2>
            <dl>
              <div>
                <dt>Rol</dt>
                <dd className="cs-rol">Secretaria de Unión</dd>
              </div>
              <div>
                <dt>Ámbito · las unidades cuya información puedes ver</dt>
                <dd className="cs-chips">
                  {AMBITO.map((a) => (
                    <span key={a}>{a}</span>
                  ))}
                </dd>
              </div>
              <div>
                <dt>Último ingreso</dt>
                <dd className="cs-enlace-u">12 may 2026, 8:14 a. m.</dd>
              </div>
            </dl>
          </section>
        </main>
      </div>
    </div>
  );
}
