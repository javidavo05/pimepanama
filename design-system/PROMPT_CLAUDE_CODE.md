# Sistema de dise\u00f1o de propuestas comerciales — Pime Panam\u00e1

Instrucciones para Claude Code. L\u00e9elas completas antes de generar cualquier propuesta.
El objetivo no es "una propuesta bonita": es que **cualquier propuesta que se genere, para
cualquier proyecto, tenga exactamente el mismo look & feel** — mismos colores, misma
tipograf\u00eda, mismos componentes, misma estructura de p\u00e1ginas, mismo tono. El cliente debe
poder reconocer una propuesta de Pime Panam\u00e1 sin leer el logo.

Este documento es la fuente de verdad del sistema de dise\u00f1o. No lo reinventes en cada
proyecto: reutiliza los assets de la carpeta `assets/` (fuentes, logo, `style.css`) tal cual
vienen, y sigue esta gu\u00eda al pie de la letra.

---

## 0. Resumen del m\u00e9todo de trabajo

1. La propuesta se construye como **HTML + CSS**, no directamente en PDF.
2. Se renderiza a PDF con **Playwright (Chromium)**, imprimiendo cada `div.page` como una
   p\u00e1gina A4 exacta con fondo impreso (`print_background: true`).
3. Las fuentes (Inter y Manrope) se autohospedan como `.woff2` locales — nunca se referencian
   fuentes de Google Fonts por URL, porque el entorno de generaci\u00f3n normalmente no tiene
   salida a internet hacia `fonts.googleapis.com`.
4. El logo se usa en dos versiones: el lockup completo (para materiales de marketing) y un
   **recorte solo del \u00edcono** (`logo_icon.png`) para headers, footers y portada — el
   wordmark "PIME" se escribe en texto real (Manrope 800), no como parte de la imagen.
5. Cada propuesta es un \u00fanico archivo `index.html` compuesto por `N` divs `.page`
   (uno por p\u00e1gina), concatenados, con un `style.css` compartido.
6. **Regla no negociable de paginado:** cada `.page` debe medir exactamente 297mm de alto.
   Si el contenido de una p\u00e1gina se desborda, Playwright genera una p\u00e1gina extra en blanco
   o con texto cortado de forma fea. Antes de entregar cualquier PDF, cuenta las p\u00e1ginas
   generadas y verifica que coincidan con las p\u00e1ginas de dise\u00f1o (ver \u00a75 "Control de
   desbordes").

---

## 1. Identidad de marca — tokens exactos

No inventes variantes de estos colores. Son los \u00fanicos colores de marca:

```css
:root{
  --blue:   #0586FE;   /* azul primario */
  --purple: #552EFF;   /* p\u00farpura primario */
  --ink:        #0B0D14;   /* texto principal / fondos oscuros */
  --ink-soft:   #1B1F2B;   /* texto secundario oscuro (tablas) */
  --slate:      #4B5468;   /* p\u00e1rrafos de cuerpo */
  --slate-light:#8A93A6;   /* metadatos, labels, n\u00fameros de p\u00e1gina */
  --line:       #E7E9EF;   /* bordes, separadores */
  --paper:      #FCFCFD;
  --panel:      #F5F6F9;   /* fondo de tarjetas neutras */
  --white:      #FFFFFF;
  --grad: linear-gradient(120deg, var(--blue) 0%, var(--purple) 100%);
}
```

Reglas de uso:
- El **gradiente azul→p\u00farpura** (`--grad`) se usa como acento: la barra superior de portada,
  el icono-chip de las tarjetas, los checks de las listas, el badge "M\u00c1S ELEGIDO" de pricing,
  el punto del eyebrow. **Nunca** como fondo de p\u00e1gina completo ni como fondo de bloques
  grandes de texto — es un acento, no un papel tapiz.
- `--ink` (#0B0D14) se usa para bloques de \u00e9nfasis fuerte (cajas de cifras clave, la portada
  de cierre) y para texto. Evita usar negro puro (#000000).
- Nunca uses colores fuera de esta paleta (nada de verdes, dorados, rojos) salvo que el
  cliente explicite lo contrario para un proyecto puntual. Si un proyecto anterior de Pime
  Panam\u00e1 usaba otra paleta (verde bosque / dorado), **no la mezcles** con esta: este sistema
  reemplaza esa paleta para todo el material comercial nuevo, salvo instrucci\u00f3n expl\u00edcita.

### Portada — nunca oscura ni "neon"

La primera versi\u00f3n de este sistema usaba una portada oscura con blobs de gradiente estilo
"SaaS de consumo". Se descart\u00f3 por decisi\u00f3n de marca: **la portada debe verse seria y
corporativa**, no llamativa. Usa siempre el patr\u00f3n de portada blanca descrito en \u00a74.1.

---

## 2. Tipograf\u00eda

Dos familias, autohospedadas desde `assets/fonts/*.woff2` (ya incluidas en este paquete,
extra\u00eddas de `@fontsource/inter` y `@fontsource/manrope`, subset `latin`):

| Familia | Pesos incluidos | Uso |
|---|---|---|
| **Inter** | 300, 400, 500, 600, 700, 800, 900 | Cuerpo de texto, labels, n\u00fameros, UI |
| **Manrope** | 500, 600, 700, 800 | T\u00edtulos (`h1-h4`), cifras grandes, nombres de plan, wordmark del logo |

Reglas:
- T\u00edtulos y cifras destacadas → `font-family:'Manrope'; font-weight:800;` con
  `letter-spacing:-0.02em`.
- Cuerpo de texto → `'Inter'`, peso 400-500, `color:var(--slate)`, `line-height:1.6-1.75`.
- Eyebrows / labels en may\u00fascula → Inter 700, `font-size:9.5pt`,
  `letter-spacing:0.14em`, `text-transform:uppercase`, color `var(--blue)`.
- Nunca declares `@import url(fonts.googleapis.com...)` ni enlaces a CDNs de fuentes: el
  render se hace sin acceso a internet garantizado. Siempre `@font-face` con `.woff2` local.
- Si el paquete de fuentes no est\u00e1 disponible en el entorno nuevo, reg\u00e9neralo as\u00ed:
  ```bash
  npm pack @fontsource/inter@5.0.16
  npm pack @fontsource/manrope@5.0.16
  tar xzf fontsource-inter-5.0.16.tgz && mv package inter_pkg
  tar xzf fontsource-manrope-5.0.16.tgz && mv package manrope_pkg
  # copiar los archivos latin-{peso}-normal.woff2 de cada /files a assets/fonts/
  ```

---

## 3. Sistema de espaciado y grid

- Formato de p\u00e1gina: **A4** — `210mm x 297mm`, siempre vertical (retrato).
- M\u00e1rgenes de contenido: `.pad { padding: 20mm 18mm 18mm 18mm; }` en la primera p\u00e1gina de
  cada secci\u00f3n justo debajo del header; en p\u00e1ginas internas se ajusta a
  `padding-top: 12mm` porque el `.doc-header` ya aporta separaci\u00f3n.
- Unidad de medida: **siempre mil\u00edmetros (`mm`)**, nunca `px` ni `rem`, porque el documento
  se piensa como una pieza impresa, no como una p\u00e1gina web. Excepci\u00f3n: `border` de 1px y
  tama\u00f1os tipogr\u00e1ficos en `pt`.
- Grillas de tarjetas reutilizables ya definidas en `style.css`:
  `.grid2`, `.grid3`, `.grid4` (con `gap` de 4.5–5mm).
- Radios de borde: 10px para tarjetas/paneles, 12px para bloques destacados grandes, 20px
  para pills, 50% para chips circulares. No uses esquinas totalmente cuadradas (`border-radius:0`)
  — eso pertenece a otra l\u00ednea de marca de Pime (proyectos "luxury minimalist" con Cormorant
  Garamond); este sistema es el de **propuestas comerciales SaaS**, con esquinas suavemente
  redondeadas.

---

## 4. Cat\u00e1logo de componentes (usar tal cual, no reinventar)

Todos estos componentes ya est\u00e1n definidos en `assets/style.css`. Reutiliza las clases;
si necesitas una variante, ext́iéndela con un `style=""` inline puntual en vez de crear una
clase nueva paralela.

### 4.1 Portada (`page` 1)
- Fondo blanco. Barra superior de 5mm de alto con `background: var(--grad)`.
- Logo (\u00edcono + wordmark en texto) arriba a la izquierda; tagline de la empresa arriba a la
  derecha en may\u00fasculas peque\u00f1as.
- Eyebrow con la categor\u00eda del documento ("Propuesta comercial · [tipo de proyecto]").
- T\u00edtulo `h1` Manrope 800, 33pt, `max-width:150mm`.
- Peque\u00f1a l\u00ednea de acento de 22mm de ancho y 2px de alto con `--grad` bajo el t\u00edtulo.
- P\u00e1rrafo de bajada de 11pt, `color:var(--slate)`, `max-width:122mm`.
- Bloque de tres metadatos al pie del bloque central: "Preparado para" / "Preparado por" /
  "Fecha".
- Footer con l\u00ednea superior `1px solid var(--line)`: aviso de confidencialidad a la izquierda,
  dominio de la empresa a la derecha.

### 4.2 Header de p\u00e1gina interna (`.doc-header`)
Logo peque\u00f1o (\u00edcono 16px + "PIME" en Manrope 800 11pt) a la izquierda; nombre de la secci\u00f3n
actual en may\u00fasculas, 8pt, `--slate-light`, a la derecha. L\u00ednea `border-bottom:1px solid var(--line)`.

### 4.3 Footer de p\u00e1gina interna (`.doc-footer`)
Posicionado absoluto al fondo de cada `.page`. Izquierda: "Pime Panam\u00e1 · [Tipo de documento]
Confidencial". Derecha: `NN / TOTAL` con ceros a la izquierda (`02 / 14`).

### 4.4 Eyebrow + t\u00edtulo de secci\u00f3n
```html
<div class="eyebrow">03 &middot; Nombre de la secci\u00f3n</div>
<h2 class="section-title">T\u00edtulo principal de la p\u00e1gina</h2>
<p class="section-sub">Bajada de una o dos l\u00edneas explicando la secci\u00f3n.</p>
```

### 4.5 \u00cdndice (p\u00e1gina 2)
Filas con: chip circular numerado (`.num-chip`), t\u00edtulo Manrope 700 10pt + subt\u00edtulo Inter
8pt, n\u00famero de p\u00e1gina a la derecha en Manrope 700. **Cuidado**: con m\u00e1s de 10 \u00edtems el
padding vertical de cada fila debe bajar a ~3.3mm o se desborda la p\u00e1gina (ver \u00a75).

### 4.6 Tarjetas (`.card`)
Fondo `--panel`, borde `1px solid var(--line)`, radio 10px, padding 6mm. Encabezadas por un
`.icon-chip` (cuadrado 9x9mm, radio 8px, `background:var(--grad)`, contenido = 1-2 letras o
s\u00edmbolo en blanco Manrope 800). T\u00edtulo `h4` 11pt, cuerpo 8.7pt `--slate`.

### 4.7 Pills (`.pill`, `.pill.outline`, `.pill.grad`)
Etiquetas peque\u00f1as (badges de estado, "OPCIONAL", "M\u00c1S ELEGIDO", nombres de fase). Variante
s\u00f3lida oscura por defecto, `outline` para estados secundarios, `grad` para destacar la opci\u00f3n
recomendada.

### 4.8 Listas de check / x (`.check-list`, `.x-list`)
Vi\u00f1eta cuadrada de 4mm con `--grad` (incluye) o gris al 40% de opacidad (no incluye), en vez
de bullets tradicionales. \u00danico patr\u00f3n aceptado para lista de "incluye / no incluye" y para
features.

### 4.9 Tablas (`table.clean`)
Sin bordes verticales. Encabezado en may\u00fasculas peque\u00f1as `--slate-light` con
`border-bottom:1.4px solid var(--ink)`. Filas separadas por `1px solid var(--line)`. \u00danico
formato de tabla aceptado (nunca tablas con rejilla completa tipo Excel).

### 4.10 Tarjetas de precio / plan (patr\u00f3n "pricing card")
Fila flex de 3-4 tarjetas de igual altura (`align-items:stretch`, `display:flex; flex-direction:column`).
La opci\u00f3n recomendada usa fondo `--ink` + texto blanco + badge `.pill.grad` "M\u00c1S ELEGIDO"; el
resto usa fondo blanco con borde `--line`. Precio en Manrope 800, ~19pt, con "/mes" en Inter
peque\u00f1o al lado. Ver el generador `plan_card()` en `template/build_template.py`.

### 4.11 Fases / cronograma — patr\u00f3n "tarjetas independientes" (NO timeline vertical)
**Importante — decisi\u00f3n de negocio, no solo de dise\u00f1o:** las fases de un proyecto en Pime
Panam\u00e1 se aprueban y facturan **de forma independiente**. Nunca representes las fases como
una l\u00ednea de tiempo conectada que implique secuencia obligatoria ("hay que terminar la
Fase 1 para que exista la Fase 2"). El patr\u00f3n correcto es:
- Fila de tarjetas (`.grid3` o `.grid2` seg\u00fan cantidad de fases), cada una con:
  - Pill de fase — la primera fase (la de arranque del proyecto) sin la etiqueta "OPCIONAL";
    el resto con `.pill.outline` que diga "FASE N · OPCIONAL".
  - Nombre de la fase, precio en Manrope 800 ~14.5pt color `--blue`, plazo estimado
    ("Promedio: NN d\u00edas" o rango "60–90 d\u00edas" — nunca prometas una fecha exacta).
  - P\u00e1rrafo de alcance.
  - Pill de cierre: "Punto de partida del proyecto" en la primera fase, "Se aprueba por
    separado" en las siguientes.
- Encima de las tarjetas, un bloque `--panel` con la nota de metodolog\u00eda: se aclara
  expl\u00edcitamente que (a) ninguna fase es obligatoria para avanzar, (b) las fases opcionales
  se aprueban cuando el cliente decide, y (c) **los cronogramas pueden traslaparse** — no es
  necesario cerrar una fase por completo para iniciar la siguiente.
- En la p\u00e1gina de inversi\u00f3n, la tabla de fases nunca debe cerrar con una caja de "inversi\u00f3n
  total" sumando todas las fases como si fueran un solo paquete obligatorio. Si se quiere dar
  una referencia de inversi\u00f3n conjunta, debe decir expl\u00edcitamente que es una referencia y
  que cada fase se factura solo si el cliente la aprueba.

### 4.12 Bloques de \u00e9nfasis oscuro
Para cifras clave o contrastes (p. ej. "Fase 1 hoy" vs "Fase 2 tras aprobar"), usa un bloque
`border-radius:10-12px; background:var(--ink); color:white;` con un `.pill` o `.pill.grad`
dentro para etiquetar el estado. \u00danico lugar donde se permite texto blanco sobre fondo s\u00f3lido
oscuro fuera de portada/cierre.

### 4.13 P\u00e1gina de cierre
Misma composici\u00f3n que la portada pero en fondo oscuro (`--ink`) con blobs de gradiente sutiles
(esto s\u00ed se permite en el cierre, no en la portada — es la \u00fanica p\u00e1gina oscura del
documento). Contiene: eyebrow, t\u00edtulo "C\u00f3mo comenzamos" o equivalente, pasos numerados en
c\u00edrculos outline, y pie con nombre de empresa + dominio + agradecimiento.

---

## 5. Control de desbordes (p\u00e1ginas fantasma) — checklist obligatorio

Este fue el error m\u00e1s costoso al construir el primer documento: `.page` usa `min-height:297mm`,
no `height` fija, as\u00ed que si el contenido de una p\u00e1gina es m\u00e1s alto que 297mm, el div crece,
Playwright genera una p\u00e1gina extra para el sobrante, y esa p\u00e1gina extra sale con texto
cortado/mal alineado (car\u00e1cter por car\u00e1cter en filas flex que perdieron su ancho).

Antes de entregar cualquier PDF:

1. Genera el PDF y cuenta las p\u00e1ginas con pypdfium2 o pypdf. Compara contra el n\u00famero de
   `.page` divs esperado.
2. Si el conteo no coincide, extrae el texto de cada p\u00e1gina f\u00edsica (`get_text_range()`) y
   busca la p\u00e1gina cuyo contenido es solo un fragmento corto — esa es la p\u00e1gina que se
   desbord\u00f3. La p\u00e1gina *anterior* es la que hay que comprimir.
3. Para comprimir sin romper el sistema visual, en este orden de preferencia:
   a. Reduce el `padding` vertical de las tarjetas/filas repetidas (de 5-6mm a 3.3-4.8mm).
   b. Reduce el `font-size` del cuerpo 0.5-1pt (nunca por debajo de 7.6pt).
   c. Reduce `margin-top`/`margin-bottom` entre bloques.
   d. Si nada de eso alcanza, mueve contenido secundario a la p\u00e1gina siguiente en vez de
      forzarlo — nunca dejes `overflow` sin resolver.
4. Vuelve a renderizar y repite hasta que el conteo de p\u00e1ginas sea exacto.
5. Como \u00faltima verificaci\u00f3n visual, renderiza a im\u00e1gen (pypdfium2, `scale=1.6`) al menos la
   portada, el \u00edndice y una p\u00e1gina de cada tipo de layout (tarjetas, tabla, pricing, cierre)
   y rev\u00edsalas antes de entregar.

---

## 6. Pipeline de generaci\u00f3n (reproducible)

Estructura de carpetas recomendada por proyecto:

```
proposal-<cliente>/
├── assets/
│   ├── fonts/*.woff2       (copiar tal cual de este paquete)
│   ├── logo.png            (lockup completo, si aplica)
│   └── logo_icon.png       (\u00edcono recortado, uso principal)
├── style.css                (copiar tal cual de este paquete; NO modificar tokens de marca)
├── build.py, build2.py...   (uno o varios scripts que arman las p\u00e1ginas como strings HTML)
├── index.html                (salida ensamblada: <link rel="stylesheet" href="style.css"> + todas las .page)
└── render.py                 (Playwright → PDF)
```

`render.py` de referencia (incluido en `template/render.py`):
```python
from playwright.sync_api import sync_playwright
import pathlib

html_path = pathlib.Path("index.html").resolve()
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.goto(f"file://{html_path}")
    page.wait_for_timeout(400)
    page.pdf(
        path="Propuesta_<Cliente>.pdf",
        width="210mm", height="297mm",
        print_background=True,
        margin={"top":"0mm","bottom":"0mm","left":"0mm","right":"0mm"},
    )
    browser.close()
```

Reglas del pipeline:
- Nunca uses ReportLab/fpdf para este tipo de propuesta "premium visual" — no dan el control
  de grid/flex/gradientes que este sistema necesita. ReportLab se reserva para documentos
  legales/contratos de texto plano de Pime Panam\u00e1, no para estas propuestas de dise\u00f1o.
  Tampoco uses WeasyPrint salvo que Playwright no est\u00e9 disponible en el entorno.
  la  fidelidad visual con Playwright+Chromium siempre es mejor.
- Cada p\u00e1gina es una funci\u00f3n o bloque que retorna un string `f'<div class="page">...</div>'`,
  usando los helpers `header(tag)` y `footer(n)`. Mant\u00e9n `TOTAL` (n\u00famero total de p\u00e1ginas)
  como constante al inicio del script y \u00fasala en el footer.
- Nombra el PDF final como `Propuesta_<NombreCliente_o_Proyecto>.pdf`, sin espacios.
- Genera siempre en espa\u00f1ol neutro, tono ejecutivo (ver \u00a77), salvo que el cliente pida otro
  idioma expl\u00edcitamente.

---

## 7. Tono y estructura de contenido (para que el texto tambi\u00e9n sea consistente)

Independientemente del tipo de proyecto (SaaS, e-commerce, sistema interno, app m\u00f3vil,
CRM, etc.), toda propuesta de Pime Panam\u00e1 sigue esta estructura de 12-14 p\u00e1ginas:

1. **Portada** — nombre del proyecto, para qui\u00e9n, fecha.
2. **\u00cdndice**.
3. **Resumen ejecutivo** — 3 pilares del proyecto en tarjetas + 2 columnas de contexto
   ("Qu\u00e9 estamos construyendo" / "Por qu\u00e9 este enfoque") + 3 cifras clave (nunca un total
   forzado de todas las fases, ver \u00a74.11).
4. **Contexto y objetivo** del proyecto (el problema que resuelve, para qui\u00e9n).
5. **Arquitectura y stack tecnol\u00f3gico** — explicado en lenguaje ejecutivo, no en jerga.
   Agrupar en 3 bloques: interfaz / datos-backend / infraestructura, + pills de atributos
   (PWA, responsive, SEO, velocidad) + nota de costos de infraestructura si aplica.
6. **El sistema en detalle** — funcionalidades vistas por el usuario final.
7. **Panel administrativo** — funcionalidades de gesti\u00f3n/CMS/CRM.
8. **Planes / modelo de monetizaci\u00f3n** (si aplica al proyecto).
9. **Arquitectura de pagos** (si aplica).
10. **Landing page / cara p\u00fablica** (si aplica).
11. **Fases y cronograma** — patr\u00f3n de tarjetas independientes, ver \u00a74.11.
12. **Inversi\u00f3n** — tabla por fase + notas de forma de pago y costos no incluidos.
13. **Alcance** — "incluye" vs "no incluye" en dos columnas con check-list/x-list.
14. **Cierre / pr\u00f3ximos pasos** — 3 pasos num\u00e9ricos + agradecimiento.

Si el proyecto no tiene alguna de estas secciones (p. ej. no hay app m\u00f3vil, no hay
monetizaci\u00f3n por planes), omite la p\u00e1gina correspondiente y renumera el \u00edndice y los
footers — no dejes una p\u00e1gina vac\u00eda ni fuerces contenido que no aplica.

Reglas de redacci\u00f3n:
- Espa\u00f1ol neutro, ejecutivo, sin tecnicismos innecesarios (el lector suele ser un comit\u00e9 o
  cliente no t\u00e9cnico).
- Nunca prometer plazos exactos e inflexibles: usar rangos ("60–90 d\u00edas") o promedios
  ("promedio 30 d\u00edas") y aclarar cuando el plazo depende de terceros (ej. revisi\u00f3n de Apple/
  Google).
- Ser expl\u00edcito sobre qu\u00e9 no incluye el precio (licencias de terceros, dominios, cuentas de
  desarrollador, hosting premium futuro).
- Cuando el proyecto tenga fases opcionales, seguir siempre la regla de \u00a74.11: nunca
  presentarlas como un paquete obligatorio ni sumar un "total" que las combine sin aclarar
  que es referencial.

---

## 8. Checklist final antes de entregar cualquier propuesta

- [ ] Colores usados = exactamente los tokens de \u00a71 (nada fuera de esa paleta).
- [ ] Tipograf\u00edas = solo Inter y Manrope, cargadas desde `.woff2` locales.
- [ ] Portada blanca/seria, sin gradientes de fondo tipo "app de consumo".
- [ ] Header/footer id\u00e9nticos en todas las p\u00e1ginas internas (logo + secci\u00f3n / empresa + `NN/TOTAL`).
- [ ] N\u00famero de p\u00e1ginas del PDF generado = n\u00famero de `.page` divs (sin p\u00e1ginas fantasma, ver \u00a75).
- [ ] Fases presentadas como aprobaciones independientes, nunca como paquete obligatorio (\u00a74.11).
- [ ] Tabla de inversi\u00f3n sin "total forzado"; cada fase con su costo y condici\u00f3n propios.
- [ ] Todos los componentes (tarjetas, pills, listas, tablas, pricing) usan las clases de
      `style.css` sin duplicar estilos ad hoc que diverjan del sistema.
- [ ] Revisi\u00f3n visual final de al menos: portada, \u00edndice, una p\u00e1gina de tarjetas, la tabla
      de inversi\u00f3n y el cierre.

---

## 9. Assets incluidos en este paquete

```
assets/
├── style.css                        ← hoja de estilos completa del sistema, lista para usar
├── logo.png                          ← lockup completo (\u00edcono + wordmark "PIME")
├── logo_icon.png                     ← solo el \u00edcono, recortado, fondo transparente
└── fonts/
    ├── inter-latin-{300,400,500,600,700,800,900}-normal.woff2
    └── manrope-latin-{500,600,700,800}-normal.woff2
template/
└── render.py                         ← script de referencia para renderizar HTML → PDF con Playwright
```

Copia esta carpeta `assets/` completa dentro de cada nuevo proyecto de propuesta. No la
regeneres desde cero salvo que falte alg\u00fan archivo.
