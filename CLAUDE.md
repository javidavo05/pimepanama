# Pime v2 — reglas del repo

Este es el sitio NUEVO de pimepanama.com. El mandato completo está en `docs/00-mandato.md`; léelo antes de tocar nada.

- **Prohibido** abrir, leer, copiar o importar nada de `../pimepanama` (el sitio viejo). Solo su sitemap para redirects 301.
- Referencia visual única: `/Users/javiervallejo/Documents/Websites/design-system`. Lo extraído está en `docs/01-referencia.md`; los tokens en `src/styles/tokens.css`; cada componente tiene una fila en `docs/02-mapa-referencia.md`.
- Prohibidos: `#0586FE`, `#552EFF`, gradiente azul→púrpura, preloaders, glassmorphism, blobs, texto con gradiente, emojis, stock, cifras inventadas, badges de certificaciones.
- Manrope e Inter se conservan porque la referencia las usa literalmente. Solo 2 archivos woff2 (variables, en `public/fonts`).
- Todo componente de sección o interactivo declara `data-motion="<nombre>"`. `scripts/check-motion.ts` lo verifica.
- Server Components por defecto; `"use client"` solo en islas. Una sola librería de animación: `motion` (LazyMotion), cargada diferida.
- Presupuesto: JS primera carga ≤ 90 KB gzip, LCP < 1.2 s móvil, CLS 0, TBT < 50 ms. Lighthouse ≥ 0.99.
- Subagentes: solo Opus. Sin Docker.
- Git siempre por `pime-git` (`pime-git commit`, `pime-git push`), perfil `pime`. Nunca `git push` directo. Nunca desplegar sin que Javier lo pida.
- Aprobación paso por paso: construir solo la parte en curso, actualizar `content/avance.ts` y `/avance`, y esperar "aprobado".
