# Pime Panamá — Reglas del proyecto

## Despliegue (Deploy)

- **Mecanismo:** El sitio se despliega por integración **GitHub → Vercel**. NO hay Vercel CLI ni `firebase deploy` en el flujo normal.
- **Repo:** `https://github.com/javidavo05/pimepanama`
- **Branch de producción:** `main` → cada `git push origin main` dispara automáticamente un build y deploy en Vercel.
- **Producción:** `https://pimepanama.com`
- **"Desplegar" = `git push origin main`.** No existe otro paso manual de deploy.

## REGLA: validar SIEMPRE antes de desplegar

Antes de cualquier `git push` a `main` (= antes de cualquier deploy):

1. Ejecutar `npm run build` y confirmar que **termina sin errores**.
2. Si el build falla, **NO** hacer push. Arreglar primero.
3. Solo después de un build verde se hace `git push origin main`.

Nunca desplegar código que no haya pasado `npm run build` localmente.

## Contenido de la landing (home) — es ESTÁTICO, no usa base de datos

Desde la "Opción B", la home pública **no lee de Postgres**. Todo el contenido
(hero/H1, secciones, servicios, sectores, diferenciadores, SEO meta) vive en código:

- **Archivo:** `src/lib/static-content.ts` (texto es/en del hero, servicios, sectores, etc.)
- **Portafolio:** `src/lib/static-portfolio-data.ts`
- **Tarjetas del hero (métricas):** `src/components/landing/hero-section.tsx` (`PREVIEW_CARDS`)
- `getLandingContent()` en `src/lib/content.ts` solo devuelve ese contenido estático.

**Para editar contenido de la landing:**
1. Editar `src/lib/static-content.ts` (o el archivo correspondiente arriba).
2. `npm run build` y confirmar build verde.
3. `git push origin main` → se despliega.

`prisma/update-landing-content.ts` y `npm run db:seed` quedan obsoletos para la home
(solo aplicarían si se volviera a conectar la DB). NO usar `db:seed`: reescribe el
contenido viejo industrial.

## Variables que NO se arreglan con push (viven en Vercel, no en git)

- `NEXT_PUBLIC_SITE_URL` y `DATABASE_URL` son variables de entorno en el dashboard de Vercel. `.env` y `.env.local` están en `.gitignore` y no se despliegan.
