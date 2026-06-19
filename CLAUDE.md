# Pime Panamá — Reglas del proyecto

## Despliegue (Deploy)

- **Proyecto Vercel (fijo):** `prj_m8QWgvneB5dDJ9iHLUUQ9VngWlyS` (`pimepanama-wt62`, scope `javier-vallejos-projects`)
- **Producción:** `https://pimepanama.com`
- **Repo:** `https://github.com/javidavo05/pimepanama`
- **Deploy manual (CLI):** `npm run deploy:vercel` — valida proyecto, build local, luego `npx vercel deploy`.
- **Deploy por Git:** `git push origin main` también dispara build en el mismo proyecto Vercel.
- **NUNCA** desplegar sin `node scripts/verify-vercel-project.cjs` (evita crear/enlazar otro proyecto por error).

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

- `NEXT_PUBLIC_SITE_URL`, `DATABASE_URL`, `DIRECT_URL` — Vercel dashboard o `npm run vercel:env-supabase`
- Supabase proyecto: `onodhoqfybzmpaorhyve` — ver `SUPABASE-SETUP.md`
- `.env` y `.env.local` están en `.gitignore` y no se despliegan.

## Base de datos (Supabase)

- **Home pública:** estática, no usa Postgres.
- **Admin + `/api/test-db`:** requieren `DATABASE_URL` + `DIRECT_URL` válidos.
- **Bootstrap:** `npm run db:setup-supabase` (local con `.env.local`).
- **RLS:** obligatorio en todas las tablas (`20251107133946_enable_rls_lockdown`). Sin políticas para `anon`/`authenticated`.
- **Firebase:** deprecado; no usar `firebase.json` ni deploy a Firebase Hosting.
