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

**Resuelto el 2026-10-11:** Javier renovó el dominio en Namecheap (orden 216365215); el registro muestra vencimiento en
2027, el DNS volvió a `A @ → 76.76.21.21` y `CNAME www → cname.vercel-dns.com` con los registros de correo, y
`https://pimepanama.com` sirve el sitio nuevo con certificado de Let's Encrypt. Verificado en vivo: home es/en, acceso
al CMS, endpoint de contacto, redirecciones 301, www → raíz, sitemap, imagen OG y un lead de prueba enviado por el
wizard (id `cmv3yhgn00001le04m5vvmrom`, nombre `[prueba] Verificación del corte`: se puede borrar del CMS).

**Incidente ajeno al corte (histórico):** el dominio `pimepanama.com` **expiró en Namecheap el 2026-10-10 a las 05:20 UTC** y el
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

## Experiencia móvil (2026-10-11)

Javier rechazó la primera versión móvil («todo pegado como un largero»). Rehecha: la home pasa de 28 a 11 pantallas
de alto en un teléfono; ventana del hero con scroll interno; Capacidades y Trabajo como carruseles con snap (una
tarjeta por pantalla, la siguiente asomando; las escenas se montan solo a la vista); cifras en una fila; Proceso e
Industrias compactos; secciones y textos con ritmo más corto; menú móvil sin recorte; `theme-color` para que la barra
del navegador acompañe el tema. Phone-check: cero graves en cuatro rutas; Lighthouse móvil en vivo 98/100/100.

## Riesgos y pendientes

- Rendimiento móvil simulado entre 89 y 96, por debajo del objetivo ≥ 99 del mandato.
- Enlaces públicos sin confirmar: B&B Real Estate y Suite UAP (sin enlace). Svitzer: herramienta interna, sin enlace.
- Monto desarrollado: no publicado (pregunta abierta).
- Repositorio en GitHub: pendiente de la sesión `gh` de javidavo05; el código está en git local.
