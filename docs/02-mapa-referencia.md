# 02 · Mapa componente → referencia

Ningún componente existe sin una fila aquí. Cada fila dice qué elemento de la referencia lo origina
(ver `docs/01-referencia.md`, sección 7) y qué movimiento le toca. Se amplía en cada paso.

## Primitivos (src/components/ui)

| Componente | Origen en la referencia | Movimiento (`data-motion`) |
|---|---|---|
| `Eyebrow` | `.eyebrow`: guion 16×2 + mayúsculas 0.14em numeradas | `draw` — el guion se dibuja con `scaleX` al entrar |
| `AccentRule` | Línea de 22 mm × 2 px bajo el H1 de portada | `draw` |
| `LetterChip` | `.icon-chip`: cuadrado radio 8, 1–2 letras Manrope 800 | `rise` — entra 8 px abajo con la tarjeta |
| `NumChip` | `.num-chip`: círculo con borde 1.4 px y número | `ring` — el borde se completa (stroke) al activarse |
| `Pill` | `.pill`, `.pill.outline`, `.pill.grad` (→ `accent`) | `swap` — cambio de estado con cross-fade |
| `Button` | Tarjeta de plan destacada (fondo `--ink`, texto blanco) + pill | `magnetic` — imán al cursor, presión al toque, texto que sube |
| `TextLink` | Dominio en el footer de página / `--blue` en celdas | `underline` — subrayado que se dibuja en la dirección del cursor |
| `Card` | `.card`: fondo panel, borde line, radio 10 | `rise` — entra con stagger; borde a `--line-strong` en hover |
| `IndexRow` | Fila de índice: chip + título + subtítulo + número a la derecha | `rise-row` — entra en orden, stagger 50 ms |
| `CleanTable` | `table.clean` | `rise-row` por fila |
| `CheckList` | `.check-list` / `.x-list`: cuadrados 4 mm | `rise-row`, el cuadrado escala de 0 a 1 |
| `StatBlock` | Bloque oscuro de cifras clave | `count` — dígitos tabulares que ruedan |
| `PhaseCard` | Tarjeta de fase independiente | `rise`, `tilt` en escritorio |
| `Journey` | Fila de pills numeradas del recorrido | `rise-row`, la pill activa se desliza |
| `Input` / `Choice` | No existe en la referencia; se deriva de `.pill.outline` (opción) y de la tabla (campo) | `press` y `swap` |

## Secciones y páginas (se completan en cada paso)

| Componente | Origen en la referencia | Movimiento (`data-motion`) |
|---|---|---|
| `Avance` (tablero) | Índice de la propuesta: filas numeradas con subtítulo y dato a la derecha | `avance` — filas en orden |
| `Sistema` (/avance/sistema) | Página de "Arquitectura": eyebrow + título + grillas de tarjetas con chips | `sistema` — demos vivas |
| `Nav` (paso 3) | `.doc-header`: ícono 16 px + PIME, sección actual a la derecha, línea abajo | `nav` |
| `Hero` (paso 4) | Portada: barra superior de 5 mm, eyebrow, H1 33 pt, línea de acento, bajada, tres metadatos | `hero` |
| `Proof` (paso 5) | Bloque oscuro de cifras + fila de pills (recorrido) como marquee | `count`, `marquee` |
| `Capabilities` (paso 6) | Página "El sistema en detalle": tabla de módulos con pills de fase | `sticky-morph` |
| `FeaturedWork` (paso 7) | Tarjetas de fase independientes en fila | `pin-scroll`, `tilt`, `spotlight` |
| `Process` (paso 8) | "Fases y cronograma" + "Cómo comenzamos" (pasos en círculos) | `draw-path` |
| `Industries` (paso 9) | "Quiénes la usan": tarjetas 2×2 con chip de letra | `rise` |
| `Closing` (paso 9) | Página de cierre: pasos numerados + nombre + dominio | `rise`, `magnetic` |
| `Footer` (paso 10) | Cabecera/pie de documento + wordmark "PIME" en Manrope 800 | `wordmark-reveal` |
