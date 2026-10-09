// motion: none — réplica estática del tablero real con datos de muestra; se captura a imagen (scripts/capture-cases.mjs).
import "./geogenius.css";

function Ic({ children, size = 16 }: { children: React.ReactNode; size?: number }) {
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

const IcTent = (
  <>
    <path d="M3 20 12 5l9 15" />
    <path d="M9 20l3-6 3 6" />
    <path d="M2 20h20" />
  </>
);
const IcBook = (
  <>
    <path d="M5 4h12a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2z" />
    <path d="M9 4v7l2-1.5 2 1.5V4" />
  </>
);
const IcRoute = (
  <>
    <circle cx="6" cy="18" r="2" />
    <circle cx="18" cy="6" r="2" />
    <path d="M8 18h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7" />
  </>
);
const IcTrophy = (
  <>
    <path d="M8 4h8v6a4 4 0 0 1-8 0z" />
    <path d="M8 6H5a2 2 0 0 0 2 4M16 6h3a2 2 0 0 1-2 4" />
    <path d="M12 14v4M8 20h8" />
  </>
);
const IcFlame = (
  <path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z" />
);
const IcTarget = (
  <>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="12" cy="12" r="0.8" />
  </>
);
const IcCompass = (
  <>
    <circle cx="12" cy="12" r="8" />
    <path d="m15.5 8.5-2 5-5 2 2-5z" />
  </>
);
const IcGlobe = (
  <>
    <circle cx="12" cy="12" r="8" />
    <path d="M4 12h16M12 4c3 3 3 13 0 16M12 4c-3 3-3 13 0 16" />
  </>
);
const IcCheck = <path d="m5 12.5 4.5 4.5L19 7.5" />;
const IcLock = (
  <>
    <rect x="6" y="11" width="12" height="9" rx="2" />
    <path d="M9 11V8a3 3 0 0 1 6 0v3" />
  </>
);
const IcVolume = (
  <>
    <path d="M4 10v4h4l5 4V6L8 10z" />
    <path d="M16 9a4 4 0 0 1 0 6" />
  </>
);
const IcOut = (
  <>
    <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
    <path d="M15 8l4 4-4 4M19 12H9" />
  </>
);

/** Emblema del explorador: anillo de nivel con el icono dentro. */
function LevelRing({ size, progress, level }: { size: number; progress: number; level: number }) {
  const stroke = Math.max(2, size * 0.055);
  const r = 50 - stroke;
  const circ = 2 * Math.PI * r;
  return (
    <span className="gg-ring" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="gg-ring-svg" aria-hidden="true">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth={stroke} />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="var(--c-gold)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circ * progress} ${circ}`}
        />
      </svg>
      <span className="gg-ring-core" style={{ width: size * 0.74, height: size * 0.74 }}>
        <svg
          width={size * 0.44}
          height={size * 0.44}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#71b9ac"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
      </span>
      <span
        className="gg-ring-badge"
        style={{ minWidth: size * 0.38, height: size * 0.38, fontSize: size * 0.22 }}
      >
        {level}
      </span>
    </span>
  );
}

/** Sello de pasaporte: aro dorado, papel crema y tinta oscura. */
function Stamp({ id, name, iso, date }: { id: string; name: string; iso: string; date: string }) {
  const arc = `gg-arc-${id}`;
  return (
    <svg viewBox="0 0 100 100" className="gg-stamp" role="img" aria-label={`Sello de ${name}`}>
      <circle cx="50" cy="50" r="47" fill="#f7f1e2" />
      <circle cx="50" cy="50" r="45" fill="none" stroke="#d4af37" strokeWidth="2.4" strokeDasharray="30 2 22 3" />
      <circle cx="50" cy="50" r="38" fill="none" stroke="#0b1f3a" strokeWidth="0.9" opacity="0.7" />
      <path id={arc} d="M 19 50 A 31 31 0 0 1 81 50" fill="none" />
      <text fontSize="8.6" fontWeight="700" letterSpacing="1.2" fill="#0b1f3a" textAnchor="middle">
        <textPath href={`#${arc}`} startOffset="50%">
          {name.toUpperCase()}
        </textPath>
      </text>
      <text x="50" y="56" fontSize="20" fontWeight="800" textAnchor="middle" fill="#0b1f3a" letterSpacing="1">
        {iso}
      </text>
      <path d="M33 66h34" stroke="#0b1f3a" strokeWidth="0.8" opacity="0.6" />
      <text x="50" y="76" fontSize="6.4" fontWeight="700" textAnchor="middle" fill="#0b1f3a" letterSpacing="0.8">
        {date}
      </text>
      <text x="50" y="86" fontSize="4.6" fontWeight="700" textAnchor="middle" fill="#9a7b17" letterSpacing="1.4">
        GEOGENIUS
      </text>
    </svg>
  );
}

const STAMPS = [
  { id: "pe", name: "Perú", iso: "PE", date: "14 SEP 26" },
  { id: "jp", name: "Japón", iso: "JP", date: "12 SEP 26" },
  { id: "ke", name: "Kenia", iso: "KE", date: "09 SEP 26" },
  { id: "no", name: "Noruega", iso: "NO", date: "05 SEP 26" },
  { id: "br", name: "Brasil", iso: "BR", date: "02 SEP 26" },
  { id: "eg", name: "Egipto", iso: "EG", date: "29 AGO 26" },
];

const LEAGUE = [
  { pos: 1, name: "Mateo Quiroga", stats: "58 dominados · 91% de acierto", xp: "2.480 XP", color: "#8fa1d1", me: false },
  { pos: 2, name: "Camila Herrera", stats: "47 dominados · 87% de acierto", xp: "2.140 XP", color: "#71b9ac", me: true },
  { pos: 3, name: "Sofía Arango", stats: "44 dominados · 84% de acierto", xp: "1.960 XP", color: "#df8791", me: false },
];

export default function CaseGeoGenius() {
  return (
    <div className="case case-geogenius">
      <svg className="gg-backdrop" viewBox="0 0 1280 800" aria-hidden="true">
        <g fill="none" stroke="#9fb4d6" strokeWidth="1">
          <ellipse cx="640" cy="420" rx="560" ry="300" />
          <ellipse cx="640" cy="420" rx="360" ry="300" />
          <ellipse cx="640" cy="420" rx="140" ry="300" />
          <path d="M80 420h1120M120 300h1040M120 540h1040M200 200h880M200 640h880" />
          <path d="M640 120v600" />
        </g>
      </svg>

      <div className="gg-hud">
        <div className="gg-hud-in">
          <LevelRing size={44} progress={0.52} level={6} />
          <div className="gg-hud-main">
            <p className="gg-hud-name">
              Camila
              <span className="gg-hud-rank">Nv. 6 · Navegante</span>
            </p>
            <div className="gg-hud-bar">
              <span className="gg-track">
                <span className="gg-fill" style={{ width: "52%" }} />
              </span>
              <span className="gg-hud-xp">2.140 XP</span>
            </div>
          </div>
          <span className="gg-streak">
            <Ic size={14}>{IcFlame}</Ic>9
          </span>
          <span className="gg-locale">ES</span>
          <span className="gg-round">
            <Ic>{IcVolume}</Ic>
          </span>
          <span className="gg-round">
            <Ic>{IcOut}</Ic>
          </span>
        </div>
      </div>

      <div className="gg-main">
        <div className="gg-col gg-left">
          <div className="gg-who">
            <LevelRing size={72} progress={0.52} level={6} />
            <div className="gg-who-text">
              <h1 className="gg-h1">Hola, Explorador Camila</h1>
              <p className="gg-sub">¿A dónde viajamos hoy?</p>
              <p className="gg-eyebrow gg-gold">Navegante</p>
            </div>
            <span className="gg-school" aria-label="Colegio Bahía Azul">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#163c74" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 10 12 5l9 5M5 10v8M19 10v8M9 18v-6M15 18v-6M3 20h18" />
              </svg>
            </span>
          </div>

          <div className="gg-panel gg-guide">
            <div className="gg-guide-head">
              <div>
                <p className="gg-eyebrow gg-gold">Tu camino</p>
                <h2 className="gg-h2">Nivel 6 · Navegante</h2>
              </div>
              <span className="gg-quiet">
                <Ic size={14}>{IcRoute}</Ic>GeoGuía
              </span>
            </div>

            <div className="gg-path">
              <svg viewBox="0 0 320 296" preserveAspectRatio="none" className="gg-path-svg" aria-hidden="true">
                <path d="M160 49 C160 82, 233 82, 233 115" fill="none" stroke="#d4af37" strokeWidth="9" strokeLinecap="round" opacity="0.25" />
                <path d="M160 49 C160 82, 233 82, 233 115" fill="none" stroke="#d4af37" strokeWidth="3" strokeLinecap="round" />
                <path
                  d="M233 115 C233 148, 233 148, 233 181 C233 214, 160 214, 160 247"
                  fill="none"
                  stroke="rgba(255,255,255,0.22)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray="4 10"
                />
              </svg>

              <div className="gg-stop" style={{ left: "50%", top: 49 }}>
                <span className="gg-camp gg-camp-done">
                  <Ic size={20}>{IcCompass}</Ic>
                  <span className="gg-camp-tag gg-camp-tag-done">
                    <Ic size={10}>{IcCheck}</Ic>
                  </span>
                </span>
                <span className="gg-label gg-label-right">
                  <span className="gg-label-t">Navegante</span>
                  <span className="gg-label-s">Nivel 5</span>
                </span>
              </div>

              <div className="gg-stop" style={{ left: "72.8%", top: 115 }}>
                <span className="gg-pulse" />
                <LevelRing size={64} progress={0.52} level={6} />
                <span className="gg-label gg-label-left">
                  <span className="gg-label-t gg-gold">Estás aquí</span>
                  <span className="gg-label-s">Nivel 6</span>
                </span>
              </div>

              <div className="gg-stop" style={{ left: "72.8%", top: 181 }}>
                <span className="gg-camp">
                  <Ic size={20}>{IcGlobe}</Ic>
                  <span className="gg-camp-tag">
                    <Ic size={10}>{IcLock}</Ic>
                  </span>
                </span>
                <span className="gg-label gg-label-left">
                  <span className="gg-label-t">Trotamundos</span>
                  <span className="gg-label-s">Nivel 7</span>
                </span>
              </div>

              <div className="gg-stop" style={{ left: "50%", top: 247 }}>
                <span className="gg-way">8</span>
              </div>
            </div>

            <div className="gg-next">
              <p className="gg-next-t">Te faltan 310 puntos para el Nivel 7</p>
              <div className="gg-next-bar">
                <span className="gg-track gg-track-s">
                  <span className="gg-fill" style={{ width: "52%" }} />
                </span>
                <span className="gg-next-n">340 / 650</span>
              </div>
              <p className="gg-next-s">Nivel 7 · Trotamundos</p>
            </div>
          </div>
        </div>

        <div className="gg-col gg-right">
          <div className="gg-panel gg-panel-glow gg-play">
            <div className="gg-play-text">
              <p className="gg-eyebrow gg-dim">Expedición 6.º B</p>
              <h2 className="gg-h2 gg-h2-l">Sal a explorar</h2>
              <div className="gg-chips">
                <span className="gg-chip">Reto Contrarreloj</span>
                <span className="gg-chip">Misión Continentes</span>
                <span className="gg-chip">Silueta Secreta</span>
              </div>
            </div>
            <span className="gg-play-btn">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </div>

          <div className="gg-panel gg-progress">
            <div className="gg-progress-head">
              <div>
                <p className="gg-eyebrow gg-dim">Mi progreso</p>
                <p className="gg-big">
                  47 <span className="gg-big-s">/ 195 países dominados</span>
                </p>
              </div>
              <span className="gg-quiet">
                <Ic size={14}>{IcBook}</Ic>Mi pasaporte
              </span>
            </div>
            <span className="gg-track">
              <span className="gg-fill" style={{ width: "24.1%" }} />
            </span>
            <p className="gg-hint">Tus últimos sellos · tócalos para verlos de cerca</p>
            <div className="gg-stamps">
              {STAMPS.map((s) => (
                <Stamp key={s.id} {...s} />
              ))}
            </div>
          </div>

          <div className="gg-minis">
            <div className="gg-panel gg-mini">
              <span className="gg-gold">
                <Ic size={16}>{IcTrophy}</Ic>
              </span>
              <p className="gg-mini-v">2.140</p>
              <p className="gg-mini-l">XP</p>
            </div>
            <div className="gg-panel gg-mini">
              <span className="gg-gold">
                <Ic size={16}>{IcTarget}</Ic>
              </span>
              <p className="gg-mini-v">87%</p>
              <p className="gg-mini-l">Acierto</p>
            </div>
            <div className="gg-panel gg-mini">
              <span className="gg-gold">
                <Ic size={16}>{IcFlame}</Ic>
              </span>
              <p className="gg-mini-v">9</p>
              <p className="gg-mini-l">Racha</p>
            </div>
          </div>

          <div className="gg-league">
            <div className="gg-league-head">
              <h2 className="gg-h3">Mi expedición</h2>
              <span className="gg-quiet">
                <Ic size={14}>{IcTrophy}</Ic>Liga de Exploradores
              </span>
            </div>
            <div className="gg-rows">
              {LEAGUE.map((r) => (
                <div key={r.pos} className={r.me ? "gg-row gg-row-me" : "gg-row"}>
                  <span className={r.pos === 1 ? "gg-pos gg-gold" : "gg-pos"}>{r.pos}</span>
                  <span className="gg-emblem" style={{ background: `${r.color}2e`, color: r.color }}>
                    <Ic size={16}>{IcCompass}</Ic>
                  </span>
                  <span className="gg-row-main">
                    <span className="gg-row-name">
                      {r.name}
                      {r.me ? <span className="gg-row-you">tú</span> : null}
                    </span>
                    <span className="gg-row-stats">{r.stats}</span>
                  </span>
                  <span className="gg-row-xp">{r.xp}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="gg-dock">
        <div className="gg-dock-in">
          <span className="gg-dock-item gg-dock-on">
            <Ic size={20}>{IcTent}</Ic>
            <span>Base</span>
          </span>
          <span className="gg-dock-item">
            <Ic size={20}>{IcBook}</Ic>
            <span>Mi pasaporte</span>
          </span>
          <span className="gg-dock-play">
            <span className="gg-dock-play-b">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
            <span className="gg-dock-play-l">Explorar</span>
          </span>
          <span className="gg-dock-item">
            <Ic size={20}>{IcRoute}</Ic>
            <span>GeoGuía</span>
          </span>
          <span className="gg-dock-item">
            <Ic size={20}>{IcTrophy}</Ic>
            <span>Liga de Exploradores</span>
          </span>
        </div>
      </div>
    </div>
  );
}
