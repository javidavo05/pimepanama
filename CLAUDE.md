# Pime Panamá — Reglas del proyecto

## Despliegue (Deploy)

- **Proyecto Vercel (fijo):** `prj_m8QWgvneB5dDJ9iHLUUQ9VngWlyS` (`pimepanama-wt62`, scope `javier-vallejos-projects`)
- **Producción:** `https://pimepanama.com`
- **Repo:** `https://github.com/javidavo05/pimepanama`
- **Deploy manual (CLI):** `npm run deploy:vercel` — valida proyecto, build local, luego `npx vercel deploy`.
- **Deploy por Git:** `git push origin main` también dispara build en el mismo proyecto Vercel.
- **NUNCA** desplegar sin `node scripts/verify-vercel-project.cjs` (evita crear/enlazar otro proyecto por error).

## REGLA: NO desplegar sin que el usuario lo pida explícitamente

**NUNCA** hacer `git push origin main` ni ningún deploy a menos que el usuario
lo indique de forma explícita en el mensaje. El flujo obligatorio es:

1. Hacer los cambios en el código.
2. Ejecutar `npm run build` local y confirmar build verde.
3. **Esperar a que el usuario diga "despliega" / "push" / "sube".**
4. Solo entonces hacer `git push origin main`.

Primero se prueba en local; el usuario decide cuándo subir a producción.

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

## Migraciones de base de datos — REGLA DE ORDEN

Todas las migraciones SQL manuales (las que se corren en Supabase directamente)
se guardan en **`supabase/migrations/`** con orden cíclico:

```
supabase/migrations/
  0001_initial_empresa_schema.sql
  0002_mail_hub.sql
  0003_proxima_migracion.sql
  ...
```

**Reglas obligatorias:**
- Nombre: `NNNN_descripcion_snake_case.sql` (4 dígitos, cero-rellenados)
- Cada archivo es idempotente — usa `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
- Al crear un archivo nuevo, incrementar el contador del último archivo existente
- Registrar en `supabase/migrations/README.md` (fecha, descripción, estado: ✅ aplicado / ⏳ pendiente)
- **NUNCA** modificar un archivo ya aplicado (crear uno nuevo con los cambios)
- **NUNCA** usar `prisma db push` ni `prisma migrate` — solo SQL manual en Supabase

## Base de datos (Supabase)

- **Home pública:** estática, no usa Postgres.
- **Admin + `/api/test-db`:** requieren `DATABASE_URL` + `DIRECT_URL` válidos.
- **Bootstrap:** `npm run db:setup-supabase` (local con `.env.local`).
- **RLS:** obligatorio en todas las tablas (`20251107133946_enable_rls_lockdown`). Sin políticas para `anon`/`authenticated`.
- **Firebase:** deprecado; no usar `firebase.json` ni deploy a Firebase Hosting.
