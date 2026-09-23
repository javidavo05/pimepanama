-- 0034_platform_accounts.sql
-- Plan de cada cuenta de Supabase / Vercel usada en Platforms.
--
-- Una cuenta gratis admite 2 proyectos por proveedor; una Pro no tiene ese
-- límite. El plan es de la cuenta (correo + proveedor), no del proyecto, por eso
-- vive en su propia tabla. Una cuenta sin fila se trata como gratis.
--
-- Idempotente: se puede correr varias veces sin efecto.

CREATE TABLE IF NOT EXISTS "PlatformAccount" (
  "id"        TEXT PRIMARY KEY,
  "userId"    TEXT NOT NULL,
  "provider"  TEXT NOT NULL,
  "email"     TEXT NOT NULL,
  "plan"      TEXT NOT NULL DEFAULT 'FREE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "PlatformAccount_userId_provider_email_key"
  ON "PlatformAccount" ("userId", "provider", "email");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PlatformAccount_userId_fkey'
  ) THEN
    ALTER TABLE "PlatformAccount"
      ADD CONSTRAINT "PlatformAccount_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "EmpresaUser"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- RLS obligatorio: solo el servidor (Prisma / service role) lee y escribe.
ALTER TABLE "PlatformAccount" ENABLE ROW LEVEL SECURITY;
