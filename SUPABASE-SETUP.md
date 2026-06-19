# Supabase — Pime Panamá

Proyecto: **onodhoqfybzmpaorhyve**  
Dashboard: https://supabase.com/dashboard/project/onodhoqfybzmpaorhyve

La **home pública** no usa la DB (contenido en `src/lib/static-*.ts`). Postgres alimenta:

- `/admin` — panel CMS y autenticación
- `/api/test-db` — health check

Firebase está **deprecado**; producción es Vercel + Supabase Postgres.

---

## 1. Obtener connection strings

Supabase → **Settings** → **Database** → **Connection string** → **URI**

Necesitas dos URLs (Prisma + pooler):

| Variable | Modo | Puerto típico |
|----------|------|----------------|
| `DATABASE_URL` | Transaction pooler | `6543` + `?pgbouncer=true` |
| `DIRECT_URL` | Session / direct pooler | `5432` |

Si el host del pooler no es `aws-1-us-east-1`, copia el host exacto del dashboard.

---

## Seguridad (RLS)

Todas las tablas tienen **Row Level Security** activado y **sin políticas** para `anon` / `authenticated`.
Eso bloquea el acceso vía Supabase Data API (PostgREST) con la anon key.

La app solo accede por **Prisma** (`DATABASE_URL` → rol `postgres`), que no pasa por la API pública.

Migración: `prisma/migrations/20251107133946_enable_rls_lockdown/`

**Nunca** expongas `SUPABASE_SERVICE_ROLE_KEY` en el cliente. Si no usas la API REST de Supabase,
puedes quitar `NEXT_PUBLIC_SUPABASE_*` de Vercel.

---

## 2. Configurar local

```bash
cp .env.example .env.local
# Edita .env.local con DATABASE_URL, DIRECT_URL y ADMIN_SEED_*
```

O solo la contraseña:

```bash
SUPABASE_DB_PASSWORD=tu-password npm run db:setup-supabase
```

El script ejecuta: `prisma migrate deploy` → admin user → contenido CMS (software).

---

## 3. Subir variables a Vercel

Con `.env.local` completo:

```bash
npm run vercel:env-supabase
npm run deploy:vercel
```

Variables requeridas en Vercel:

- `DATABASE_URL`
- `DIRECT_URL`
- `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD` (ya deberían existir)

Opcionales (API REST de Supabase, no usadas por Prisma hoy):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## 4. Verificar

```bash
curl https://pimepanama.com/api/test-db
# → {"status":"connected","counts":{"hero":1,"services":6},...}
```

Admin: https://pimepanama.com/admin/login

---

## Migraciones

```bash
npm run db:migrate          # solo aplicar migraciones
npm run db:seed-admin       # solo usuario admin
npm run db:update-content   # solo contenido CMS (no toca admin password)
```

**No usar** `prisma/seed.ts` — contenido industrial obsoleto. Usar `db:setup-supabase` o `db:update-content`.

---

## Rotar secretos

Si expusiste keys en chat o logs, rótalo en Supabase → Settings → API y Database password.
