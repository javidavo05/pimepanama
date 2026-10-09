# Entrega · pime-v2

Estado al 2026-10-09. Sitio nuevo de Pime Panamá, construido desde cero (Next.js 16, React 19, CSS propio).

## Dónde está

- Código: `/Users/javiervallejo/Documents/Websites/pime-v2` (git local con `pime-git`; sin remoto todavía).
- Vercel: proyecto **pime-v2** en la cuenta javidavo05 (scope `javier-vallejos-projects`), creado en esta entrega.
  Producción del proyecto: https://pime-v2.vercel.app. El dominio pimepanama.com sigue en el proyecto anterior
  (`pimepanama-wt62`) hasta el corte.
- Variables en Vercel (producción): `LEADS_API_URL` = endpoint de contacto del CMS actual; `NEXT_PUBLIC_SITE_URL`.
- Local: `.env.local` con `LEADS_DRY_RUN=1` para no crear leads reales al probar.

## Cómo se despliega

```
scripts/vercel.sh deploy --prod --yes
```

`scripts/vercel.sh` quita del entorno los ids del proyecto viejo y fija `--cwd`, `--scope` y el token: sin él, el
entorno de la sesión apunta al proyecto de pimepanama.com y un deploy lo reemplazaría.

## Leads

El sitio no publica teléfono ni correo. Cada llamada a la acción lleva al wizard de `/[lang]/contacto` (proyecto,
industria, plazo, datos). El wizard envía a `/api/leads`, que reenvía al endpoint `LEADS_API_URL` del CMS actual
(`/api/contact`), el mismo que alimenta `/empresa/leads`: crea o anexa el lead, avisa por correo y lo prioriza.
Nada del CMS se tocó.

## Corte de dominio (pendiente de decisión)

El CMS (`/empresa`, `/api/*`, crons) vive en el proyecto viejo y Javier pidió que todo eso quede igual. Dos
proyectos no pueden servir el mismo dominio, así que para que pimepanama.com muestre el sitio nuevo:

1. Añadir un subdominio al proyecto viejo (por ejemplo `cms.pimepanama.com`) y confirmar que `/empresa` y
   `/api/contact` responden ahí.
2. Cambiar `LEADS_API_URL` del proyecto pime-v2 a `https://cms.pimepanama.com/api/contact` y redesplegar.
3. Mover `pimepanama.com` y `www` al proyecto pime-v2.
4. Quitar el `noindex` (`robots` en `src/app/(site)/[lang]/layout.tsx`) y redesplegar.
5. Comprobar: https://pimepanama.com/es, /en, una ficha, el wizard con un lead de prueba (`[prueba]`), el sitemap
   y las redirecciones 301 del sitemap viejo (en `next.config.ts`).

## Ajustes hechos en el proyecto Vercel

- Preset de framework: venía como «Other» (servía solo `public/`, todo daba 404); se fijó **Next.js**.
- Protección de acceso (Vercel Authentication) venía activa para todos los despliegues; se quitó para que la URL de producción sea pública.
- Lighthouse móvil sobre el sitio en vivo: 99 / 100 / 100, LCP 1,9 s.

## Puerta final (resultado)

- `scripts/check-motion.ts`: 39 componentes declaran su movimiento. OK.
- Lighthouse móvil y escritorio en siete rutas: ver `docs/03-antes-despues.md`.
- axe (`scripts/axe.mjs`, WCAG 2.1 AA) en ocho rutas: cero violaciones serias o críticas.
- Phone-check (`pime-phone-check`, 6 modelos actuales, motores reales de Safari y Chrome, build local): cero graves.
- Redirecciones 301 del sitemap anterior: en `next.config.ts`, verificadas en local.

## Riesgos y pendientes

- Rendimiento móvil simulado entre 89 y 96, por debajo del objetivo ≥ 99 del mandato.
- Enlaces públicos sin confirmar: B&B Real Estate y Suite UAP (sin enlace). Svitzer: herramienta interna, sin enlace.
- Monto desarrollado: no publicado (pregunta abierta).
- Repositorio en GitHub: pendiente de la sesión `gh` de javidavo05; el código está en git local.
- Dominio: pendiente del corte descrito arriba.
