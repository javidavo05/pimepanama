# Pime v2 — reglas del repo

Este es el sitio NUEVO de pimepanama.com. El mandato completo está en `docs/00-mandato.md`; léelo antes de tocar nada.

- **Prohibido** abrir, leer, copiar o importar nada de `../pimepanama` (el sitio viejo). Solo su sitemap para redirects 301.
- Referencia visual única: `/Users/javiervallejo/Documents/Websites/design-system`. Lo extraído está en `docs/01-referencia.md`; los tokens en `src/styles/tokens.css`; cada componente tiene una fila en `docs/02-mapa-referencia.md`.
- Prohibidos: `#0586FE`, `#552EFF`, gradiente azul→púrpura, preloaders, glassmorphism, blobs, texto con gradiente, emojis, stock, cifras inventadas, badges de certificaciones.
- Desde el 2026-10-11 la marca sale del manual de marca (`../design-system/brand/manual.html`, línea Normal): logo «Capas abiertas» (componente `src/components/ui/logo.tsx`, colores en `--logo-*`), azul tinta #0B1D3A, azul señal #1F5BFF, azul cielo #6FA8FF. Pedido explícito de Javier; reemplaza el logo y el acento #2306D4 anteriores.
- Una sola familia: Manrope (variable, `public/fonts/manrope-var.woff2`). Inter se retiró el 2026-10-11.
- Todo componente de sección o interactivo declara `data-motion="<nombre>"`. `scripts/check-motion.ts` lo verifica.
- Server Components por defecto; `"use client"` solo en islas. Una sola librería de animación: `motion` (LazyMotion), cargada diferida.
- Presupuesto: JS primera carga ≤ 90 KB gzip, LCP < 1.2 s móvil, CLS 0, TBT < 50 ms. Lighthouse ≥ 0.99.
- Subagentes: solo Opus. Sin Docker.
- Git siempre por `pime-git` (`pime-git commit`, `pime-git push`), perfil `pime`. Nunca `git push` directo. Nunca desplegar sin que Javier lo pida.
- Aprobación paso por paso: construir solo la parte en curso, actualizar `content/avance.ts` y `/avance`, y esperar "aprobado".

## Leads (contacto)

- El sitio **no publica teléfono ni correo** (decisión de Javier, 2026-10-09). Toda llamada a la acción lleva al wizard de `/[lang]/contacto`.
- El wizard envía a `/api/leads`, que reenvía al sistema de leads del CMS de la empresa (`LEADS_API_URL`, por defecto `https://pimepanama.com/api/contact`, el mismo endpoint que alimenta `/empresa/leads`).
- En local, `.env.local` lleva `LEADS_DRY_RUN=1`: no se crean leads reales, solo se registran en consola. No quitarlo para probar.
- Decisión de Javier (2026-10-09): este proyecto **solo cambia el front end visual**; el CMS, `/empresa` y `/api/contact` quedan igual. El sitio nuevo les manda los leads sin tocarlos. Cómo conviven en el dominio se resuelve en la puerta final.
