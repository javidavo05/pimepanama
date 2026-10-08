# 01 · Lo que dice la referencia

Fuente: `/Users/javiervallejo/Documents/Websites/design-system` (37 archivos vistos el 2026-10-08:
`PROMPT_CLAUDE_CODE.md`, `assets/style.css`, `assets/logo.png`, `assets/logo_icon.png`, 11 `.woff2`,
`template/build_template.py`, `template/render.py`, y la propuesta AutoMatch completa: `index.html`,
`style.css`, `build.py`, `build_por_fase.py`, `render.py` y las 14 páginas del PDF).

La referencia es el sistema de **propuestas comerciales** de Pime: documentos A4 que un comité no técnico
lee para decidir una compra de software. Es un sistema de papel, serio, con una sola voz. De ahí salen
todas las decisiones del sitio nuevo.

## 1. Carácter

- **Papel blanco y tinta.** Fondo blanco, tipografía negra-azulada (`#0B0D14`), gris para el cuerpo. El color
  aparece solo como acento pequeño (barra de 5 mm, chips de 9 mm, puntos de lista). La guía lo dice
  literalmente: "es un acento, no un papel tapiz".
- **Nunca oscuro ni neón en portada.** Una decisión de marca registrada en la guía: la primera versión
  oscura con blobs se descartó. El sitio nuevo hereda la regla: el primer pantallazo es claro y corporativo.
- **Un único bloque oscuro por documento** (`--ink`) para cifras clave y para la página de cierre. En el
  sitio: la sección de cifras y el footer son los dos únicos bloques oscuros.
- **Jerarquía por tamaño y peso, no por color.** Los títulos son Manrope 800 negros; el acento nunca va en
  el titular.
- **Densidad editorial.** Mucho texto corto ordenado en filas con separadores de 1 px; pocas tarjetas, y
  cuando las hay, con fondo `--panel` y borde `--line`, sin sombra.

## 2. Paleta exacta y roles

| Token | Valor | Rol en la referencia | Rol en el sitio nuevo |
|---|---|---|---|
| `--ink` | `#0B0D14` | Texto principal, bloques de énfasis, portada de cierre | Texto, bloques oscuros (cifras, footer), botón primario |
| `--ink-soft` | `#1B1F2B` | Celdas de tabla, checks | Texto en listas y tablas |
| `--slate` | `#4B5468` | Párrafos de cuerpo | Párrafos de cuerpo, bajadas |
| `--slate-light` | `#8A93A6` → `#667087` | Metadatos, labels, números de página | Metadatos, cabeceras de tabla, placeholders. Oscurecido a 4.8:1 sobre papel para cumplir AA en texto de 12 px |
| `--line` | `#E7E9EF` | Bordes y separadores | Bordes y separadores |
| `--paper` | `#FCFCFD` | Fondo de documento | Fondo de página |
| `--panel` | `#F5F6F9` | Fondo de tarjetas neutras | Superficie de tarjetas y notas |
| `--white` | `#FFFFFF` | Página | Superficie elevada |
| `--blue` `#0586FE`, `--purple` `#552EFF`, `--grad` | | Acento de la referencia | **Prohibidos por mandato.** Ver abajo. |

**Derivación del acento.** El mandato pide una paleta 100 % derivada de la referencia y a la vez prohíbe
sus dos colores de acento y su gradiente. El logo, único elemento de marca que se conserva, tiene un
tercer color: el solape de los dos triángulos, donde el azul y el púrpura se multiplican. Ese color,
`#2306D4`, es el acento del sitio nuevo. Javier lo aprobó el 2026-10-08.

| Token | Valor | Rol |
|---|---|---|
| `--accent` | `#2306D4` | Eyebrows, enlaces, foco, chips de letra, indicador de navegación |
| `--accent-ink` | `#15037F` | Acento sobre fondos de acento suave, hover de enlaces |
| `--accent-soft` | `#E9E6FB` | Fondo de pills de estado "en curso", selección |
| `--accent-on-dark` | `#8E7BFF` | Acento sobre `--ink` (bloques oscuros y footer) |

Reglas de uso heredadas: el acento ocupa menos del 5 % de cualquier pantalla; nunca es fondo de sección;
nunca va en el titular; nunca hay gradiente.

Estados (no existen en la referencia; se derivan con la misma saturación contenida): `--ok #176B45`,
`--run #8A4B00`, `--bad #A52A22`, cada uno con su fondo suave.

## 3. Tipografía

La referencia usa literalmente **Manrope** (títulos, cifras, wordmark) e **Inter** (cuerpo, labels,
números). El mandato las permite justo por eso. Se cargan como dos fuentes variables autohospedadas
(`public/fonts`, 73 KB en total), con fallback ajustado para CLS 0.

| Rol | Familia y peso | Tamaño ref. (pt) | Tracking | Sitio (px) |
|---|---|---|---|---|
| H1 portada | Manrope 800 | 33 | −0.02em, lh 1.1 | `--text-display`: clamp 44→80 |
| H2 sección | Manrope 800 | 24 | −0.02em, lh 1.15 | `--text-2xl` 40 / `--text-3xl` 56 |
| H4 tarjeta | Manrope 700 | 11 | −0.02em | `--text-lg` 20 |
| Cifra clave | Manrope 800 | 19–33 | −0.02em, tabular | `--text-3xl` / `--text-4xl` |
| Bajada | Inter 400 | 10.5–11 | 0, lh 1.6 | `--text-lg` 20, color `--slate` |
| Cuerpo | Inter 400 | 9.6 | 0, lh 1.7 | `--text-md` 16 |
| Tabla | Inter 400/600 | 9 | 0 | `--text-sm` 14 |
| Eyebrow | Inter 700, mayúsculas | 9.5 | +0.14em | `--text-xs` 12 |
| Cabecera de tabla | Inter 700, mayúsculas | 7.8 | +0.06em | `--text-xs` 12 |
| Pill | Inter 700 | 7.8 | +0.04em | `--text-xs` 12 |
| Metadato | Inter 500 | 7.6–8 | 0 | `--text-xs` 12 |

Rasgos: los titulares son **cortos** (3 a 6 palabras: "Un precio, todo incluido", "Centralizar lo que hoy
está disperso"); siempre con un eyebrow numerado arriba y una bajada gris de una o dos líneas debajo;
ancho máximo de bajada 145 mm (~60 caracteres).

## 4. Grid, márgenes y densidad

- Página A4 con margen lateral de 18 mm (8.6 % del ancho). En el sitio: contenedor de 1200 px con
  gutter de 16 px en teléfono, 32 px en tableta y 48 px en escritorio.
- Grillas de 2, 3 y 4 columnas iguales con gap de 4.5–5 mm (~2.4 % del ancho). En el sitio: gap 16/24/32.
- Ritmo vertical: 6–8 mm entre bloques (≈ 24–32 px), 12 mm bajo cabeceras (48 px), 20 mm arriba del
  contenido (≈ 80–96 px). En el sitio, las secciones separan 96 px en móvil y 128 px en escritorio.
- Filas de lista (índice, módulos): 3.3 mm de padding vertical con separador de 1 px (≈ 12–16 px).
- Todo alinea a la izquierda. Nada centrado salvo el contenido de los chips.

## 5. Radios, bordes, sombras

- Radios: 8 px en chips de ícono, 10 px en tarjetas y paneles, 12 px en bloques oscuros grandes,
  20 px (pill) en etiquetas, 50 % en chips numerados. Nunca 0.
- Bordes: `1px solid --line` en tarjetas, pills outline y separadores; `1.4px solid --ink` bajo cabeceras de
  tabla y `1.4px solid --blue` en chips numerados (en el sitio, `--accent`). La fase activa lleva
  `1.4px solid --ink`.
- Sombras: **ninguna** en la referencia. El sitio solo usa una sombra en superficies flotantes (menú móvil,
  paleta ⌘K, hoja inferior) y es suave y grande (`0 24px 64px rgba(11,13,20,.16)`).

## 6. Tratamiento de imágenes y de UI de producto

- La referencia **no usa fotografías**. Cero stock. El producto se explica con texto, tablas y chips.
- En el sitio, la UI de producto se construye en HTML/CSS/SVG con las mismas piezas del sistema: filas con
  separador, chips de letra, pills de estado, tablas limpias, cifras en Manrope. Una "pantalla" de un
  sistema de Pime se ve como una página de la propuesta: ordenada, sin color de fondo, con un solo acento.
- Capturas de casos (portfolio): enmarcadas en un panel `--panel` con borde `--line` y radio 10 px, sin
  cromo de navegador, con placeholder de color `--panel`.

## 7. Componentes firma (de donde sale todo)

| Componente | Cómo es en la referencia |
|---|---|
| **Eyebrow** | Guion de 16×2 px en acento + texto en mayúsculas 0.14em, numerado ("03 · Resumen ejecutivo"). |
| **Línea de acento** | Trazo de 22 mm × 2 px bajo el H1 de portada. |
| **Chip de letra** (`.icon-chip`) | Cuadrado 9×9 mm, radio 8, fondo de acento, 1–2 letras en Manrope 800 blancas. Es la iconografía del sistema: **letras, no íconos**. |
| **Chip numerado** (`.num-chip`) | Círculo 8 mm, borde 1.4 px acento, número Manrope 800 en acento. |
| **Pill** | Fondo `--ink` texto blanco 7.8 pt; variante outline; variante de acento para "más elegido". |
| **Tarjeta** | Fondo `--panel`, borde `--line`, radio 10, padding 6 mm, chip arriba, h4, párrafo. |
| **Fila de índice** | Chip numerado + título + subtítulo gris + número de página a la derecha, separador 1 px. |
| **Tabla limpia** | Sin bordes verticales, cabecera mayúsculas gris con línea 1.4 px negra, filas con 1 px. |
| **Lista de check** | Cuadrado 4 mm radio 4 en acento (incluye) o gris 40 % (no incluye). Sin viñetas. |
| **Bloque de cifras** | Fondo `--ink`, pill de acento arriba, 3 cifras Manrope 800 32 pt con leyenda gris. |
| **Tarjeta de fase** | Pill "FASE N", nombre, precio en acento Manrope 800, plazo en rango, alcance, pill de cierre. Fases independientes, nunca una línea de tiempo obligatoria. |
| **Recorrido** | Fila de pills numeradas ("1 · Registro … 10 · Mi Garaje"), primera y última rellenas. |
| **Cabecera de documento** | Ícono 16 px + "PIME" Manrope 800 a la izquierda, sección en mayúsculas gris a la derecha, línea abajo. |
| **Cierre** | Único fondo oscuro, pasos numerados en círculos outline, nombre + dominio + "Gracias por la confianza". |

## 8. Patrones de movimiento (derivados)

La referencia es impresa: no se mueve. El movimiento del sitio se deriva de su carácter, no de su
ausencia de movimiento:

- **Preciso y corto.** Nada rebota. Curvas de salida (`cubic-bezier(.2,.8,.2,1)`); duraciones 160 ms para
  interacción, 280 ms para estados, 600 ms para revelados, 900 ms para trazos largos.
- **Lo que en papel es un trazo, en pantalla se dibuja.** El guion del eyebrow, la línea de acento bajo el
  H1, los separadores de 1 px y las líneas de proceso aparecen con `scaleX`/`stroke-dashoffset`.
- **Lo que en papel es una fila, en pantalla entra en orden.** Filas de índice, módulos y tablas entran una
  tras otra con stagger de 70 ms y 24 px de subida.
- **Lo que en papel es una cifra, en pantalla cuenta.** Dígitos tabulares que ruedan hacia arriba.
- **Los titulares se revelan por línea** con máscara, porque así se lee un título largo en voz alta.
- **Reducción de movimiento:** todo pasa a fundidos de 160 ms sin desplazamiento.

## 9. Tono de copy

Español neutro, ejecutivo, sin jerga. Frases cortas que afirman ("Un precio, todo incluido"). Rangos en vez
de promesas exactas. Decir qué no incluye. Nunca "soluciones innovadoras". Ese tono es el del sitio.
