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

## Corte de dominio (hecho el 2026-10-10)

Javier pidió reemplazar **solo el front end**: el CMS (`/empresa`, `/admin`, `/firmar`, `/agendar`, `/api/*`, crons)
sigue en el proyecto viejo `pimepanama-wt62` sin cambios. Cómo quedó:

- `pimepanama.com` y `www.pimepanama.com` (308 → apex) están en el proyecto **pime-v2**.
- `next.config.ts` reenvía al proyecto viejo (`CMS_ORIGIN`, por defecto `https://pimepanama-wt62.vercel.app`) todo
  lo del CMS: `/empresa`, `/admin`, `/firmar`, `/agendar`, `/resume`, `/api/*` (salvo `/api/leads`, que es de este
  sitio) y, como último recurso, los `/_next/*` que este sitio no tiene (los del CMS). El navegador no lo nota:
  misma dirección, mismas cookies. Los crons del CMS siguen corriendo en su proyecto.
- `LEADS_API_URL` apunta directo a `https://pimepanama-wt62.vercel.app/api/contact`.
- `noindex` quitado; sitemap y hreflang con `https://pimepanama.com`.
- Verificado contra los servidores de Vercel con el nombre del dominio (`curl --resolve`): la home nueva y el acceso
  al CMS responden 200.

**Incidente ajeno al corte:** el dominio `pimepanama.com` **expiró en Namecheap el 2026-10-10 a las 05:20 UTC** y el
registro lo puso en nameservers de parking (`ns1/ns2.lander.d.parity.domains`, IPs de WorldStream). Por eso desde
internet no carga ni el sitio nuevo ni el CMS. Hay que **renovarlo en Namecheap**; al volver los nameservers
normales (`dns101/dns102.registrar-servers.com`) con sus registros anteriores, todo queda en vivo sin más pasos. Si
los registros se perdieran: `A @ → 76.76.21.21` (o `216.198.79.1`) y `CNAME www → cname.vercel-dns.com`.

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
