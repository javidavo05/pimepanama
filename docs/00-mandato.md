# MANDATO: RECONSTRUCCIÓN TOTAL DE PIMEPANAMA.COM

(Copia literal del mandato de Javier del 2026-10-08. Es la fuente de verdad del proyecto.)

**Esto NO es un remake, NO es un refresh, NO es una mejora del sitio actual.** Vas a construir un sitio nuevo en un proyecto nuevo, en una carpeta vacía, sin mirar el código del sitio anterior. Si el resultado se parece al sitio actual en paleta, tipografía, layout, orden de secciones, navegación, componentes o copy, **el trabajo falló** y debes empezar de nuevo.

Ante cualquier duda entre conservador y audaz, elige audaz. Ante cualquier duda entre "parecido a lo que había" y "distinto", elige distinto.

Referencia visual obligatoria: `/Users/javiervallejo/Documents/Websites/design-system`
Sitio actual (solo para comparar, nunca para copiar): https://pimepanama.com

Subagentes: **Opus**. Nunca Sonnet. Sin Docker bajo ninguna circunstancia.

---

## 1. Aislamiento total del sitio viejo

1. Crea un proyecto **nuevo**: `/Users/javiervallejo/Documents/Websites/pime-v2`. Next.js (App Router) + TypeScript, creado desde cero con `create-next-app`. Repo nuevo.
2. Corre la skill `pime-project-preflight` en este proyecto nuevo.
3. **Prohibido** abrir, leer, copiar o importar componentes, estilos, configuración de Tailwind, layouts o assets del repo del sitio viejo.
4. **No se reutiliza nada del sitio viejo: ni diseño, ni componentes, ni copy, ni estructura, ni contenido.** Todo el contenido sale de este mandato. Lo único que se toma es la lista de URLs del sitemap de https://pimepanama.com, exclusivamente para crear redirects 301 y no perder SEO.
5. Lo único que se conserva de marca es **el logo**. Puede usarse en versión monocromática.

### Lo que cambia obligatoriamente (todo)
| Eje | Regla |
|---|---|
| Paleta | 100% derivada de la referencia. Prohibido el azul `#0586FE`, el púrpura `#552EFF` y cualquier gradiente azul→púrpura. |
| Tipografía | Derivada de la referencia. Prohibidas Manrope e Inter salvo que la referencia las use literalmente. |
| Layout y grid | Nuevos, derivados de la referencia. |
| Navegación | Nueva en forma, comportamiento y animación. |
| Hero | Nuevo concepto. Prohibido: titular centrado sobre fondo con gradiente + 2 botones. |
| Orden de secciones | Distinto al actual. |
| Componentes | Todos nuevos. Prohibida la grilla de 3 tarjetas iguales con ícono arriba. |
| Iconografía | Propia o adaptada a la referencia. Prohibidos íconos de librería sin modificar. |
| Copy | Nuevo, corto, escrito desde cero. |
| Footer | Nuevo. |

---

## 2. Absorber la referencia visual (fase obligatoria, sin escribir UI todavía)

1. Abre y mira **cada archivo** de `/Users/javiervallejo/Documents/Websites/design-system`: imágenes, PDFs, CSS, tokens, capturas, videos. Si son imágenes, míralas todas con Read.
2. Escribe `docs/01-referencia.md` con lo que extraes: paleta exacta con roles, tipografía (familias, escala, pesos, tracking), grid, márgenes, densidad, radios, bordes, sombras, tratamiento de imágenes, tratamiento de UI de producto, patrones de movimiento, componentes firma.
3. Escribe `src/styles/tokens.css` con **todos** los tokens: color, tipo, espacio, radio, línea, z-index, breakpoints y **motion** (duraciones, curvas, stagger, distancias).
4. Escribe `docs/02-mapa-referencia.md`: para cada sección y componente que vas a construir, qué elemento de la referencia lo origina. **Ningún componente puede existir sin una fila en este mapa.**

Objetivo de nivel: fintech europeo de primer nivel (Qonto, Pennylane, Mollie, Adyen, Wise, N26, Revolut Business). Quien entre debe pensar en 5 segundos: "esta empresa construye software caro y serio".

---

## 3. Movimiento: TODO se anima. Sin excepciones.

Cada sección y cada elemento interactivo tiene movimiento de **entrada**, de **interacción** (hover, foco, toque) y, si está en el flujo de scroll, de **scroll**. Cada sección tiene además un "momento firma": algo que alguien querría grabar en pantalla.

### Inventario mínimo obligatorio
- **Navegación:** se oculta al bajar y aparece al subir; indicador de sección activa que se desliza; se compacta y cambia de fondo al hacer scroll; menú móvil con apertura coreografiada (líneas en stagger).
- **Hero:** titular con revelado por línea mediante máscara (clip-path), stagger 60–90 ms. Composición de UI real de los sistemas de Pime **construida en HTML/CSS/SVG** (no capturas), que se arma por capas con profundidad, reacciona al cursor (parallax de 3 planos) y "se usa sola" en loop: números que cambian, filas que entran, gráficas que se dibujan.
- **Cifras:** contadores que cuentan al entrar en viewport, con dígitos tabulares que ruedan.
- **Clientes:** marquee infinito, se pausa al hover, velocidad ligada al scroll.
- **Capacidades:** sección sticky. A medida que se hace scroll, cambia la capacidad activa y la UI de producto a la derecha se transforma (cross-fade + morph de layout).
- **Portfolio destacado:** scroll horizontal fijado (pinned). Las tarjetas escalan y se enfocan al pasar por el centro. Cada tarjeta tiene inclinación 3D al cursor y un spotlight radial que sigue el puntero (CSS vars).
- **Portfolio → caso de estudio:** transición de elemento compartido con View Transitions API (la imagen de la tarjeta se convierte en el hero del caso).
- **Proceso:** línea de progreso que se dibuja con el scroll (SVG stroke-dashoffset ligado a scroll-timeline); cada paso se activa al cruzarla.
- **Botones:** efecto magnético al cursor en escritorio, respuesta de presión (scale) en toque, transición de texto al hover (el texto sube y otro entra).
- **Links:** subrayado que se dibuja y se retira en dirección del cursor.
- **Formulario/wizard de contacto:** transiciones entre pasos, barra de progreso animada, validación con micro-feedback.
- **Paleta de comandos ⌘K:** apertura con escala + blur de fondo, resultados en stagger.
- **Footer:** wordmark gigante que se revela con el scroll.
- **Cambio de página:** View Transitions en toda navegación interna.
- **Cursor (solo escritorio, solo pointer: fine):** indicador propio que cambia de forma sobre elementos interactivos, movido con transform en rAF.

### Control de cumplimiento
- Cada componente de sección o interactivo debe declarar `data-motion="<nombre>"`.
- Escribe `scripts/check-motion.ts`: recorre `src/components` y falla si algún componente de sección o interactivo no declara `data-motion`. Este script es parte de la puerta final (sección 6).

### Prohibido
- Preloaders, splash screens o pantallas de carga de cualquier tipo (destruyen el LCP y se ven baratos).
- Animar `width`, `height`, `top`, `left`, `margin` o cualquier propiedad de layout.
- Glassmorphism, orbes/blobs difusos, texto con gradiente, emojis, ilustraciones stock, fotos stock, testimonios inventados, cifras inventadas, badges de certificaciones (Pime no tiene SOC 2 ni ISO 27001).
- `prefers-reduced-motion` ignorado: con esa preferencia, todo pasa a fundidos cortos sin desplazamiento.

---

## 4. Cómo se logra Lighthouse 99–100 CON todo animado (receta obligatoria)

No se negocia ni la animación ni el Lighthouse. Esta es la forma de tener ambos:

1. **Todo el texto renderizado en servidor.** SSG completo. Server Components por defecto; `"use client"` solo en islas de interacción.
2. **El elemento LCP no espera a nada.** Identifica el elemento LCP del hero (normalmente el titular). Debe pintarse visible en el primer frame, desde el HTML, sin depender de JS. La animación del titular es CSS pura que arranca en el primer paint y dura ≤ 600 ms, o el titular queda estático y se anima todo lo que lo rodea. Nunca empieza en `opacity: 0` esperando a JS.
3. **CSS primero, JS después.** Revelados de scroll, progresos y parallax simple con scroll-driven animations (`animation-timeline: view()` / `scroll()`). Fallback con **un solo** IntersectionObserver compartido para navegadores sin soporte.
4. **JS de animación mínimo y diferido.** Una sola librería: `motion` (usa `LazyMotion` + `domAnimation`, o el `animate` mini). Se importa solo dentro de las islas y se carga en `requestIdleCallback` o al entrar al viewport. Nada de GSAP, Three.js ni Lottie en el camino crítico.
5. **Smooth scroll opcional** (Lenis) solo después de `load`, desactivado con reduced-motion y en dispositivos táctiles.
6. **La UI de producto del hero y de capacidades se construye en HTML/CSS/SVG**, no en imágenes ni video: pesa casi nada, es nítida en cualquier pantalla y se anima barato.
7. **Imágenes** (casos de estudio): AVIF/WebP, `sizes` correctos, dimensiones explícitas, lazy salvo LCP, placeholder de color.
8. **Fuentes:** máximo 2 archivos `.woff2` (idealmente 1 variable), subset latino, autohospedadas, 1 preload, `font-display: swap` con fallback ajustado (`size-adjust`, `ascent-override`) para CLS = 0.
9. **Cero terceros bloqueantes.** Analytics (Vercel Analytics) después de `load`. Sin widgets de chat, sin embeds.
10. **Estilos sin runtime:** Tailwind v4 o CSS Modules. Nada de CSS-in-JS en runtime.
11. **Presupuesto:** JS de primera carga ≤ 90 KB gzip en home. LCP < 1.2 s móvil. CLS = 0. TBT < 50 ms. Verificar con `@next/bundle-analyzer`.
12. **Si Lighthouse baja:** el orden para corregir es (a) diferir la carga, (b) pasar la animación de JS a CSS, (c) abaratar la animación (menos nodos, solo transform/opacity, `content-visibility: auto` en secciones fuera de pantalla). **Eliminar una animación no es una opción.** La única excepción es el elemento LCP (punto 2).

---

## 5. Contenido

**Estructura:** decide el orden de secciones desde la referencia (distinto al actual). Debe cubrir: hero, prueba (cifras + clientes autorizados), capacidades, portfolio destacado, proceso (precio llave en mano, garantía de 3 meses post-entrega), industrias, cierre/contacto.
**Páginas:** `/portfolio` (filtrable por industria y tipo), `/portfolio/[slug]`, `/servicios`, `/empresa`, `/contacto`. Bilingüe `/es` (principal) y `/en`, con hreflang y OG por idioma.
**⌘K:** paleta de comandos global para buscar casos, servicios, industrias y páginas.
**Contacto:** wizard guiado (skill `ux-ui-rules`): tipo de proyecto → industria → plazo → datos, con opciones preseleccionables, nunca un formulario vacío. Teléfono 6479-5352.

**Copy:** titular de máximo 8 palabras por sección, máximo una línea de apoyo. Cero frases vacías ("soluciones innovadoras", "transformación digital", "llevamos tu negocio al siguiente nivel"). EN escrito como copy nativo.

**Cifras** en `content/site.ts`, editables: 7+ años, 30+ proyectos, monto desarrollado (valor real que Javier confirme). Nada inflado.

**Portfolio** en `content/portfolio.ts`. Busca en esta máquina el repo de cada sistema para sacar stack, módulos y arquitectura reales. La UI de cada caso se recrea como composición fiel en HTML/CSS, o se captura con Playwright si hay entorno accesible. Campos: `slug`, `nombre`, `cliente`, `industria`, `tipo`, `resumen`, `problema`, `solución`, `módulos`, `stack`, `visual`, `estado`, `publicable` (**todos empiezan en `false`** hasta que Javier confirme). Sin métricas inventadas.

Sistemas: B&B Real Estate (CMS inmobiliario + sync Wasi) · HOLO Realty (gestión de propiedades + API Wasi) · Academyx (CRM SaaS multi-tenant para academias) · MedSuite (gestión de clínicas white-label) · Sembradores (gestión de iglesias multi-tenant) · Smart Church (management + CMS white-label) · Suite Unión Adventista Panameña (gestión institucional: secretaría, propiedades, actas y juntas) · John Henry Oficial (CMS/CRM de sastrería de lujo) · Wedding CMS (invitaciones y eventos SaaS) · Pime Backup Enterprise (respaldo y auditoría de Google Workspace) · Godmode Control Center (superadministración multi-empresa) · Direct booking SaaS (reservas de corto plazo) · Misaza Designs (sitio + plataforma serverless) · Svitzer (analítica de muestras de aceite + automatización con IA; autorizado a nombrar).
No incluir oportunidades no adjudicadas, proyectos personales ni juegos.

---

## 6. Puertas de calidad (nada está terminado sin pasarlas)

Crea `npm run gate`, que ejecuta todo esto y falla si algo falla:

1. `next build` sin warnings.
2. `scripts/check-motion.ts` en verde.
3. Lighthouse CI (`@lhci/cli`) con `lighthouserc.json`: 3 corridas, mediana, **móvil y escritorio**, en `/es`, `/es/portfolio` y un caso de estudio. Aserciones: performance ≥ 0.99, accessibility = 1, best-practices = 1, seo = 1.
4. Playwright: capturas en 375, 768, 1280 y 1920 de cada página; cero overflow horizontal; animaciones verificadas con y sin `prefers-reduced-motion`.
5. axe sin violaciones; navegación completa por teclado; foco visible y diseñado.
6. **Puerta de diferencia:** captura https://pimepanama.com y el sitio nuevo en las mismas resoluciones y genera `docs/03-antes-despues.md` con ambas imágenes lado a lado y la tabla de la sección 1 marcada eje por eje. Si **cualquier** eje se parece al sitio viejo, la puerta falla.

---

## 7. Aprobación paso por paso en localhost (obligatorio)

Javier aprueba **cada parte** antes de que avances. No construyes el sitio completo de corrido.

### Servidor local
- Desde el primer paso, mantén `npm run dev` corriendo en `http://localhost:3000` todo el tiempo.
- Para medir Lighthouse de cada parte, usa un build de producción aparte: `next build && next start -p 3001`.

### Tablero de avance (artifact)
- Crea la ruta `http://localhost:3000/avance`: un tablero con cada paso de la lista de abajo, su estado (pendiente / en revisión / aprobado / con cambios), link directo a la parte en localhost, capturas 375 y 1440, Lighthouse móvil de esa parte y las notas de Javier.
- El tablero usa el mismo sistema visual del sitio nuevo y se actualiza en cada paso.
- Si en esta sesión tienes la herramienta **Artifact**, publica también el tablero como artifact y actualízalo en cada paso, para que Javier lo vea fuera de localhost.

### Protocolo en cada paso
1. Construye **solo** esa parte.
2. Actualiza `/avance`.
3. Detente y entrega: el link exacto de localhost, qué debe revisar Javier (incluyendo qué animaciones mirar y cómo dispararlas), Lighthouse móvil y la comparación antes/después si aplica.
4. **Espera.** Solo avanzas cuando Javier escriba "aprobado". Si pide cambios, los aplicas, vuelves a mostrar el mismo paso y esperas de nuevo.

### Pasos
1. Proyecto nuevo + preflight + tablero `/avance` vacío.
2. Sistema visual: página `/avance/sistema` con paleta, escala tipográfica, espaciado, componentes base y **demos vivas de cada token de movimiento**. Incluye el resumen de `docs/01-referencia.md`.
3. Navegación (escritorio y móvil) con todo su movimiento.
4. Hero con su composición de UI animada.
5. Cada sección de la home, **una por una**: un paso por sección.
6. Footer.
7. `/portfolio` con filtros.
8. `/portfolio/[slug]` con la transición desde la tarjeta.
9. `/servicios`, `/empresa`.
10. `/contacto` (wizard) + paleta ⌘K.
11. Versión EN.
12. `npm run gate` completo + `docs/04-entrega.md` (decisiones, performance alcanzado, casos pendientes de confirmación, redirects 301).

No declares terminado nada que no haya pasado `npm run gate`. Si algo no se puede cumplir, dilo explícitamente con la causa; no lo maquilles.

---

## Anexo: sitemap del sitio actual (para redirects 301)

Tomado de https://pimepanama.com/sitemap.xml el 2026-10-08:

```
/
/en
/desarrollo-de-software-a-medida
/sistemas-empresariales-erp
/desarrollo-de-aplicaciones-web
/desarrollo-de-aplicaciones-moviles
/portfolio
/en/portfolio
/portfolio/academyx            /en/portfolio/academyx
/portfolio/uapa-suite          /en/portfolio/uapa-suite
/portfolio/visita7             /en/portfolio/visita7
/portfolio/smart-church        /en/portfolio/smart-church
/portfolio/wedding-site        /en/portfolio/wedding-site
/portfolio/godmode             /en/portfolio/godmode
/portfolio/cifrapp             /en/portfolio/cifrapp
/portfolio/pime-backup         /en/portfolio/pime-backup
/portfolio/misaza              /en/portfolio/misaza
/portfolio/bnb-real-estate     /en/portfolio/bnb-real-estate
/portfolio/holo-realty         /en/portfolio/holo-realty
/portfolio/john-henry          /en/portfolio/john-henry
/portfolio/demos/academyx
/portfolio/demos/bnb-real-estate
/portfolio/demos/godmode
/portfolio/demos/sembradores
/portfolio/demos/tdp
/portfolio/demos/tickets
/portfolio/demos/wedding-saas
/portfolio/demos/wedding-site
```
