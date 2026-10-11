import type { Metadata } from "next";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { TextLink } from "@/components/ui/text-link";
import { TiltCard } from "@/components/ui/tilt-card";
import { ToggleReduced } from "@/components/ui/toggle-reduced";
import { IndexRow } from "@/components/ui/index-row";
import { AccentRule, Counter, Eyebrow, LetterChip, Lines, NumChip, Pill } from "@/components/ui/primitives";
import { Replay } from "@/components/motion/replay";
import { contrast } from "@/lib/color";
import "./sistema.css";

export const metadata: Metadata = { title: "Sistema visual · Pime v2", robots: { index: false } };

const PALETA = [
  { k: "ink", c: "#0B1D3A", r: "Azul tinta: texto, bloques oscuros, botón primario, base del logo" },
  { k: "ink-soft", c: "#1C2B48", r: "Texto en listas y tablas" },
  { k: "slate", c: "#4A5A78", r: "Párrafos y bajadas" },
  { k: "slate-light", c: "#5E6B85", r: "Metadatos, cabeceras de tabla" },
  { k: "line", c: "#E4E8F0", r: "Bordes y separadores" },
  { k: "panel", c: "#F4F6FA", r: "Tarjetas y notas" },
  { k: "paper", c: "#FCFDFE", r: "Fondo de página" },
  { k: "white", c: "#FFFFFF", r: "Superficie elevada" },
  { k: "accent", c: "#1F5BFF", r: "Azul señal: eyebrows, enlaces, foco, chips. Capa media del logo" },
  { k: "accent-ink", c: "#1546D6", r: "Hover de enlaces, texto sobre acento suave" },
  { k: "accent-soft", c: "#E8EEFF", r: "Fondo de pills en curso y selección" },
  { k: "accent-on-dark", c: "#6FA8FF", r: "Azul cielo: acento sobre tinta, cima del logo" },
  { k: "ok", c: "#176B45", r: "Estado correcto" },
  { k: "run", c: "#8A4B00", r: "Estado en curso" },
  { k: "bad", c: "#A52A22", r: "Error" },
];

const TIPOS: { rol: string; cls: string; fam: string; peso: string; size: string; track: string; sample: string }[] = [
  { rol: "Display (hero)", cls: "t-display", fam: "Manrope", peso: "800", size: "clamp 44→80", track: "−0.02em", sample: "Software que una empresa opera todos los días" },
  { rol: "H1 sección", cls: "t-1", fam: "Manrope", peso: "800", size: "clamp 32→56", track: "−0.02em", sample: "Un precio, todo incluido" },
  { rol: "H2 bloque", cls: "t-2", fam: "Manrope", peso: "800", size: "clamp 28→40", track: "−0.02em", sample: "Centralizar lo que hoy está disperso" },
  { rol: "H3 tarjeta", cls: "t-3", fam: "Manrope", peso: "700", size: "20", track: "−0.01em", sample: "Panel administrativo con permisos por rol" },
  { rol: "Bajada", cls: "lead", fam: "Manrope", peso: "400", size: "20", track: "0", sample: "El valor no es una lista de módulos: es que nadie tenga que armar el proceso por su cuenta." },
  { rol: "Cuerpo", cls: "body", fam: "Manrope", peso: "400", size: "16 / 1.7", track: "0", sample: "Hoy el cliente busca por separado el vehículo, el financiamiento, el seguro y el resto. Cada paso es una conversación distinta, sin visibilidad del conjunto." },
  { rol: "Texto chico", cls: "small", fam: "Manrope", peso: "400", size: "14", track: "0", sample: "Valores aproximados, a cargo del propietario y sujetos al precio vigente de cada proveedor." },
  { rol: "Cabecera / label", cls: "caps", fam: "Manrope", peso: "700", size: "12", track: "+0.06em", sample: "Plazo estimado" },
  { rol: "Metadato", cls: "meta", fam: "Manrope", peso: "500", size: "12", track: "0", sample: "Documento confidencial · 02 / 14" },
];

const ESPACIO = [4, 8, 12, 16, 24, 32, 48, 64, 96, 128];

const MOTION_TOKENS = [
  ["--dur-fast", "160 ms", "hover, foco, toque"],
  ["--dur-base", "280 ms", "pills, menús, cambios de estado"],
  ["--dur-slow", "600 ms", "entradas (rise, líneas)"],
  ["--dur-reveal", "900 ms", "trazos y contadores"],
  ["--ease-out", "cubic-bezier(.2,.8,.2,1)", "salida precisa, sin rebote"],
  ["--ease-draw", "cubic-bezier(.4,0,.2,1)", "trazos"],
  ["--ease-press", "cubic-bezier(.2,0,0,1)", "presión"],
  ["--stagger", "70 ms", "entre líneas de titular (60–90)"],
  ["--stagger-row", "50 ms", "entre filas"],
  ["--rise", "24 px", "desplazamiento de entrada"],
  ["--press", "0.97", "escala al tocar"],
  ["--magnet", "0.35", "fuerza del imán"],
  ["--tilt", "6°", "inclinación 3D máxima"],
  ["--parallax-1/2/3", "0.02 / 0.05 / 0.09", "planos del hero"],
];

export default function Sistema() {
  return (
    <main className="wrap sys" data-motion="sistema">
      <header className="sys-head">
        <div className="logo-row"><Logo height={32} /></div>
        <Eyebrow eager>02 · Sistema visual</Eyebrow>
        <Lines eager as="h1" className="t-1" lines={["Papel, tinta y", "un solo acento"]} />
        <AccentRule eager delay={300} />
        <p className="lead eager-rise" style={{ "--delay": "200ms" } as React.CSSProperties}>Todo sale del sistema de propuestas comerciales de Pime: documentos blancos, serios, con Manrope y un acento que ocupa menos del cinco por ciento de la página.</p>
        <div className="row">
          <TextLink href="/avance">Volver al tablero</TextLink>
          <ToggleReduced />
        </div>
      </header>

      <section className="sys-sec" id="referencia">
        <header>
          <Eyebrow>Resumen de la referencia</Eyebrow>
          <h2 className="t-2">Lo que dice la referencia</h2>
          <p className="lead">Extraído de los 37 archivos de design-system. El documento completo es docs/01-referencia.md.</p>
        </header>
        <ol className="sys-ref" data-reveal="rise-row">
          <li style={{ "--i": 0 } as React.CSSProperties}><b>Papel y tinta.</b> Fondo blanco, texto azul tinta #0B1D3A, gris para el cuerpo. El color es un acento, «no un papel tapiz».</li>
          <li style={{ "--i": 1 } as React.CSSProperties}><b>Portada clara, nunca oscura ni neón.</b> Decisión de marca registrada en la guía. El primer pantallazo del sitio es claro.</li>
          <li style={{ "--i": 2 } as React.CSSProperties}><b>Un bloque oscuro por documento.</b> Cifras clave y cierre. En el sitio: cifras y footer.</li>
          <li style={{ "--i": 3 } as React.CSSProperties}><b>Jerarquía por tamaño y peso.</b> Manrope 800 con −0.02em para títulos y cifras; Manrope 400 a 700 para todo lo demás. El acento nunca va en el titular.</li>
          <li style={{ "--i": 4 } as React.CSSProperties}><b>Densidad editorial.</b> Filas con separador de 1 px, tarjetas de fondo panel sin sombra, radios de 8, 10 y 12 px. Nunca 0.</li>
          <li style={{ "--i": 5 } as React.CSSProperties}><b>Iconografía por letras.</b> Chips cuadrados con una o dos letras, chips numerados en círculo, cuadrados de 4 mm como viñeta. No hay íconos de librería.</li>
          <li style={{ "--i": 6 } as React.CSSProperties}><b>Sin fotos.</b> El producto se explica con tablas, filas y chips. En el sitio la UI de producto se construye con esas mismas piezas.</li>
          <li style={{ "--i": 7 } as React.CSSProperties}><b>Marca nueva, «Capas abiertas».</b> Desde el 11 de octubre el logo y la paleta salen del manual de marca (design-system/brand/manual.html), línea Normal: azul tinta, azul señal y azul cielo. El sitio usa solo la línea Normal; la Premium (negro y oro) es para clientes premium.</li>
        </ol>
      </section>

      <section className="sys-sec" id="paleta">
        <header>
          <Eyebrow>Paleta</Eyebrow>
          <h2 className="t-2">Quince colores, un acento</h2>
          <p className="lead">Cada muestra dice su contraste sobre papel y sobre tinta. Los textos usan solo los que pasan 4.5.</p>
        </header>
        <div className="swatches" data-reveal="rise-row">
          {PALETA.map((p, i) => (
            <div className="sw" key={p.k} style={{ "--c": p.c, "--i": i } as React.CSSProperties}>
              <div className="chip" />
              <div className="in">
                <div className="k">--{p.k}</div>
                <div className="hex num">{p.c}</div>
                <div className="r">{p.r}</div>
                <div className="cr">
                  <span className="meta num">papel {contrast(p.c, "#FCFDFE")}</span>
                  <span className="meta num">tinta {contrast(p.c, "#0B1D3A")}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="banned">
          <b>Prohibidos por mandato</b>
          <span>#0586FE (azul), #552EFF (púrpura) y cualquier gradiente entre ambos. No existen como token ni como valor suelto en el código.</span>
        </div>
        <div className="row">
          <div className="logo-row"><Logo height={28} title="Logo de Pime" /><span className="meta">color</span></div>
          <div className="logo-row logo-mono"><Logo height={28} title="Logo de Pime en un solo color" /><span className="meta">un solo color</span></div>
        </div>
      </section>

      <section className="sys-sec" id="tipografia">
        <header>
          <Eyebrow>Tipografía</Eyebrow>
          <h2 className="t-2">Una sola familia: Manrope</h2>
          <p className="lead">Una fuente variable autohospedada, con fallback ajustado para que nada salte al cargar.</p>
        </header>
        <div data-reveal="rise-row">
          {TIPOS.map((t, i) => (
            <div className="spec" key={t.rol} style={{ "--i": i } as React.CSSProperties}>
              <div className="meta">
                <span>{t.rol}</span><span>{t.fam} {t.peso}</span><span className="num">{t.size} px</span><span className="num">{t.track}</span>
              </div>
              <div className={`sample ${t.cls}`}>{t.sample}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="sys-sec" id="espacio">
        <header>
          <Eyebrow>Espacio, radios y líneas</Eyebrow>
          <h2 className="t-2">Una escala fija y tres radios</h2>
          <p className="lead">Nada fuera de 4, 8, 12, 16, 24, 32, 48, 64, 96 y 128. Las secciones separan 96 px en teléfono y 128 en escritorio. Sin sombras, salvo en lo que flota.</p>
        </header>
        <div className="sys-grid two">
          <ul className="space" data-reveal="rise-row">
            {ESPACIO.map((s, i) => (
              <li key={s} style={{ "--i": i } as React.CSSProperties}><span className="num">{s} px</span><i style={{ "--w": `${s * 2}px` } as React.CSSProperties} /></li>
            ))}
          </ul>
          <div className="stack">
            <div className="radii">
              <div style={{ "--r": "8px" } as React.CSSProperties}>8</div>
              <div style={{ "--r": "10px" } as React.CSSProperties}>10</div>
              <div style={{ "--r": "12px" } as React.CSSProperties}>12</div>
              <div style={{ "--r": "999px" } as React.CSSProperties}>pill</div>
            </div>
            <div className="table-wrap"><table className="clean">
              <thead><tr><th>Línea</th><th>Uso</th></tr></thead>
              <tbody>
                <tr><td className="strong">1 px --line</td><td>Tarjetas, separadores, pills outline</td></tr>
                <tr><td className="strong">1.4 px --ink</td><td>Cabecera de tabla, fase activa, chip numerado</td></tr>
                <tr><td className="strong">2 px acento</td><td>Guion del eyebrow, línea bajo el H1, subrayado de enlaces</td></tr>
                <tr><td className="strong">Sombra</td><td>Solo menú móvil, paleta ⌘K y hojas: 0 24 64 al 16 %</td></tr>
              </tbody>
            </table></div>
          </div>
        </div>
      </section>

      <section className="sys-sec" id="componentes">
        <header>
          <Eyebrow>Componentes base</Eyebrow>
          <h2 className="t-2">Las piezas de la propuesta, en pantalla</h2>
          <p className="lead">Cada una tiene su fila en docs/02-mapa-referencia.md. Están construidas con la peor data: títulos largos, cifras grandes, listas vacías.</p>
        </header>

        <div className="sys-grid">
          <div className="card" data-reveal="rise">
            <span className="caps">Eyebrow y línea de acento</span>
            <Eyebrow>03 · Resumen ejecutivo</Eyebrow>
            <AccentRule />
          </div>
          <div className="card" data-reveal="rise" style={{ "--delay": "70ms" } as React.CSSProperties}>
            <span className="caps">Chips de letra y numerados</span>
            <div className="row"><LetterChip>UI</LetterChip><LetterChip>DB</LetterChip><LetterChip size="lg">IN</LetterChip><NumChip n={1} /><NumChip n={12} /><NumChip n={3} ink /></div>
            <span className="hint">La iconografía del sistema: letras, no íconos.</span>
          </div>
          <div className="card" data-reveal="rise" style={{ "--delay": "140ms" } as React.CSSProperties}>
            <span className="caps">Pills</span>
            <div className="row"><Pill>Fase 1</Pill><Pill variant="ghost">Fase 2 · opcional</Pill><Pill variant="accent">Más elegido</Pill><Pill variant="soft">En revisión</Pill><Pill variant="ok">Aprobado</Pill><Pill variant="run">Con cambios</Pill><Pill variant="bad">Error</Pill></div>
          </div>
        </div>

        <div className="sys-grid">
          <div className="card" data-reveal="rise">
            <span className="caps">Botones</span>
            <div className="row">
              <Button arrow>Pedir una propuesta</Button>
              <Button variant="secondary">Ver el portfolio</Button>
              <Button variant="accent" size="sm">Siguiente paso</Button>
            </div>
            <span className="hint">Imán al cursor en escritorio, presión al toque, el texto sube al hover.</span>
          </div>
          <div className="card" data-reveal="rise" style={{ "--delay": "70ms" } as React.CSSProperties}>
            <span className="caps">Enlaces</span>
            <p className="body">Un enlace <TextLink href="#componentes">se subraya desde el lado por donde entra el cursor</TextLink> y se retira por el otro. Sirve también para <TextLink href="#paleta">el pie de página</TextLink>.</p>
          </div>
          <div className="card" data-reveal="rise" style={{ "--delay": "140ms" } as React.CSSProperties}>
            <span className="caps">Campo y opciones</span>
            <div className="field">
              <label htmlFor="demo-nombre">Nombre de la empresa</label>
              <input id="demo-nombre" className="input" placeholder="Ej.: Clínica San Fernando" defaultValue="Pime Panamá" />
              <span className="hint">Pre-rellenado cuando se puede inferir.</span>
            </div>
            <div className="row">
              <label className="choice"><input type="radio" name="demo-tipo" defaultChecked />Sistema interno</label>
              <label className="choice"><input type="radio" name="demo-tipo" />SaaS</label>
              <label className="choice"><input type="radio" name="demo-tipo" />Sitio</label>
            </div>
          </div>
        </div>

        <div className="sys-grid two">
          <div className="card raised" data-reveal="rise">
            <span className="caps">Filas de índice</span>
            <div data-reveal="rise-row">
              <IndexRow n={1} i={0} title="Resumen ejecutivo" sub="Qué construimos y la inversión en una mirada" right="03" />
              <IndexRow n={2} i={1} title="Arquitectura y tecnología explicada sin jerga para un comité que no programa" sub="Stack explicado sin jerga" right="05" />
              <IndexRow n={3} i={2} title="Inversión" sub="Un precio todo incluido, pagado 50 % y 50 %" right="10" />
            </div>
          </div>
          <div className="card raised" data-reveal="rise" style={{ "--delay": "70ms" } as React.CSSProperties}>
            <span className="caps">Tabla limpia</span>
            <div className="table-wrap"><table className="clean">
              <thead><tr><th>Módulo</th><th>Qué hace</th><th className="right">Fase</th></tr></thead>
              <tbody data-reveal="rise-row">
                <tr style={{ "--i": 0 } as React.CSSProperties}><td className="strong">Registro y perfil</td><td>Crea su cuenta y guarda sus datos de contacto.</td><td className="right"><Pill variant="ghost">Fase 1</Pill></td></tr>
                <tr style={{ "--i": 1 } as React.CSSProperties}><td className="strong">Cotizaciones</td><td>Solicita y compara las ofertas que presentan los concesionarios.</td><td className="right"><Pill variant="ghost">Fase 1</Pill></td></tr>
                <tr style={{ "--i": 2 } as React.CSSProperties}><td className="strong">Financiamiento</td><td>Solicita y da seguimiento a una solicitud.</td><td className="right"><Pill variant="ghost">Fase 2</Pill></td></tr>
              </tbody>
            </table></div>
          </div>
        </div>

        <div className="sys-grid two">
          <div className="card raised" data-reveal="rise">
            <span className="caps">Listas de incluye y no incluye</span>
            <div className="sys-grid two">
              <ul className="check-list" data-reveal="rise-row">
                <li style={{ "--i": 0 } as React.CSSProperties}>Diseño de todas las pantallas de la fase aprobada</li>
                <li style={{ "--i": 1 } as React.CSSProperties}>Código, base de datos y diseños a nombre del propietario</li>
                <li style={{ "--i": 2 } as React.CSSProperties}>Garantía de corrección de errores por 3 meses tras la entrega</li>
              </ul>
              <ul className="x-list" data-reveal="rise-row">
                <li style={{ "--i": 0 } as React.CSSProperties}>Costos de hosting, dominio y servicios de terceros</li>
                <li style={{ "--i": 1 } as React.CSSProperties}>Mantenimiento mensual (se contrata aparte)</li>
              </ul>
            </div>
          </div>
          <div className="stack">
            <div className="phase-card active" data-reveal="rise">
              <div className="row"><Pill>Fase 1</Pill></div>
              <h3 className="t-3">Base y panel</h3>
              <div className="price num">Precio llave en mano</div>
              <span className="meta">Estimado: 45–60 días</span>
              <p className="small">Registro, perfil, cotizaciones, seguimiento, documentos y panel administrativo.</p>
              <div className="row"><Pill variant="ghost">Punto de partida del proyecto</Pill></div>
            </div>
            <ul className="journey" data-reveal="rise-row">
              {["1 · Registro", "2 · Preferencias", "3 · Comparación", "4 · Cotizaciones", "5 · Entrega"].map((s, i) => (
                <li key={s} style={{ "--i": i } as React.CSSProperties}><Pill variant={i === 0 || i === 4 ? "accent" : "ghost"}>{s}</Pill></li>
              ))}
            </ul>
          </div>
        </div>

        <div className="ink-block" data-theme="ink" data-reveal="rise">
          <div className="row"><Pill variant="accent">Cifras clave</Pill></div>
          <div className="stat-grid">
            <div className="stat"><div className="v"><Counter value={7} suffix="+" /></div><div className="l">años construyendo software para empresas en Panamá</div></div>
            <div className="stat"><div className="v"><Counter value={30} suffix="+" /></div><div className="l">proyectos entregados en producción</div></div>
            <div className="stat"><div className="v"><Counter value={3} /></div><div className="l">meses de garantía después de cada entrega</div></div>
          </div>
          <p className="small" style={{ color: "var(--fg-3)" }}>Único bloque oscuro permitido fuera del footer. El monto desarrollado se agrega cuando Javier lo confirme.</p>
        </div>
      </section>

      <section className="sys-sec" id="movimiento">
        <header>
          <Eyebrow>Movimiento</Eyebrow>
          <h2 className="t-2">Preciso y corto. Nada rebota.</h2>
          <p className="lead">Lo que en papel es un trazo se dibuja; lo que es una fila entra en orden; lo que es una cifra cuenta. Con movimiento reducido todo pasa a fundidos de 160 ms sin desplazamiento.</p>
        </header>
        <div className="table-wrap"><table className="clean motion-table">
          <thead><tr><th>Token</th><th>Valor</th><th>Para qué</th></tr></thead>
          <tbody data-reveal="rise-row">
            {MOTION_TOKENS.map(([k, v, u], i) => (
              <tr key={k} style={{ "--i": i } as React.CSSProperties}><td className="strong"><code>{k}</code></td><td className="num">{v}</td><td>{u}</td></tr>
            ))}
          </tbody>
        </table></div>

        <div className="sys-grid">
          <Replay>
            <div className="demo-head"><h3 className="t-3">lines · titular por línea</h3><span className="hint">Máscara con clip-path, stagger de 70 ms, 600 ms por línea.</span></div>
            <Lines as="p" className="t-2" lines={["Un precio,", "todo incluido"]} />
          </Replay>
          <Replay>
            <div className="demo-head"><h3 className="t-3">draw · trazos</h3><span className="hint">El guion del eyebrow y la línea de acento se dibujan con scaleX en 900 ms.</span></div>
            <Eyebrow>05 · Arquitectura y stack</Eyebrow>
            <AccentRule delay={200} />
          </Replay>
          <Replay>
            <div className="demo-head"><h3 className="t-3">rise · entrada</h3><span className="hint">Sube 24 px y aparece en 600 ms.</span></div>
            <div className="card" data-reveal="rise" style={{ width: "100%" }}><LetterChip>UI</LetterChip><span className="t-3">Interfaz</span><span className="small">Next.js, React y TypeScript.</span></div>
          </Replay>
          <Replay>
            <div className="demo-head"><h3 className="t-3">rise-row · filas en orden</h3><span className="hint">Stagger de 50 ms entre filas.</span></div>
            <div data-reveal="rise-row" style={{ width: "100%" }}>
              <IndexRow n={1} i={0} title="Registro y perfil" right="F1" />
              <IndexRow n={2} i={1} title="Cotizaciones" right="F1" />
              <IndexRow n={3} i={2} title="Financiamiento" right="F2" />
            </div>
          </Replay>
          <Replay>
            <div className="demo-head"><h3 className="t-3">count · dígitos que ruedan</h3><span className="hint">Tabulares, 900 ms, cada dígito 60 ms después del anterior. El HTML ya trae el valor final.</span></div>
            <div className="t-1 num"><Counter value={2250} prefix="US$" /></div>
          </Replay>
          <Replay>
            <div className="demo-head"><h3 className="t-3">ring · chip que se completa</h3><span className="hint">El borde del chip numerado se traza al activarse.</span></div>
            <div className="row"><NumChip n={1} /><NumChip n={2} /><NumChip n={3} /></div>
          </Replay>
          <div className="demo" data-motion="demo">
            <div className="demo-head"><h3 className="t-3">magnetic · press · swap</h3><span className="hint">Acercá el cursor: el botón lo sigue. Tocá: se comprime a 0.97. Hover: el texto sube.</span></div>
            <div className="demo-stage"><Button arrow>Pedir una propuesta</Button></div>
          </div>
          <div className="demo" data-motion="demo">
            <div className="demo-head"><h3 className="t-3">underline · dirección del cursor</h3><span className="hint">Entrá por la izquierda y por la derecha.</span></div>
            <div className="demo-stage"><p className="lead"><TextLink href="#movimiento">Ver cómo se dibuja el subrayado</TextLink></p></div>
          </div>
          <div className="demo" data-motion="demo">
            <div className="demo-head"><h3 className="t-3">tilt · spotlight</h3><span className="hint">Inclinación de 6° máximo y luz que sigue el puntero. Solo con mouse.</span></div>
            <div className="demo-stage" style={{ justifyItems: "stretch" }}>
              <TiltCard><LetterChip>AX</LetterChip><span className="t-3">Academyx</span><span className="small">CRM SaaS multi-tenant para academias.</span></TiltCard>
            </div>
          </div>
          <div className="demo" data-motion="demo" style={{ gridColumn: "1 / -1" }}>
            <div className="demo-head"><h3 className="t-3">marquee · clientes</h3><span className="hint">Infinito, se pausa al pasar el cursor. En el sitio la velocidad se liga al scroll.</span></div>
            <div className="marquee">
              <div className="marquee-track" aria-hidden="true">
                {[...Array(2)].map((_, k) => ["Svitzer", "Academyx", "Smart Church", "HOLO Realty", "John Henry", "B&B Real Estate", "MedSuite", "Sembradores"].map((n) => <Pill key={`${k}-${n}`} variant="ghost">{n}</Pill>))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
