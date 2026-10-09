# Antes y después

Medido el 2026-10-09 con Lighthouse 12 (perfil móvil simulado, Chromium headless). El "antes" es la home de
https://pimepanama.com en producción, una sola corrida. El "después" es el build de producción local de pime-v2
(`next build && next start`), que es lo que se desplegó.

| | Antes (sitio actual) | Después (pime-v2) |
|---|---|---|
| Rendimiento móvil (home) | 88 | 95 en build local · **99 en vivo** (https://pime-v2.vercel.app, CDN de Vercel) |
| Rendimiento escritorio (home) | — | 100 |
| Accesibilidad | 100 | 100 |
| Buenas prácticas | 100 | 100 |
| SEO | 100 | 69 · por el `noindex` hasta el corte de dominio; sube al quitarlo |
| LCP móvil (home) | 3,7 s | 2,0 s en local · 1,9 s en vivo |
| TBT móvil | 60 ms | 50 ms |
| CLS | 0,032 | 0 |
| JavaScript de la home | 196 KB | el runtime de Next; la librería 3D del maniquí solo se descarga al abrir John Henry |
| Fotos de stock | sí | ninguna: toda la UI de producto es HTML/CSS/SVG y las capturas son réplicas con datos de muestra |
| Teléfono publicado | sí | no: todo contacto entra al sistema de leads del CMS por el wizard |
| Idiomas | es/en | es/en con hreflang, Open Graph e imagen OG por idioma, sitemap con alternates |

Rendimiento móvil por ruta (después): home 95, portfolio 89, ficha 95, servicios 96, empresa 96, contacto 95, home EN 94.
Escritorio: 100 en las siete. Accesibilidad 100 en todas (Lighthouse) y cero violaciones serias o críticas con axe
(WCAG 2.1 AA) en las ocho rutas auditadas.

Qué no se alcanzó del mandato: el objetivo de ≥ 99 en móvil. El LCP real es pequeño; el simulado lo marca el
runtime de Next en red lenta. Es el riesgo que quedó documentado desde el paso 4.
