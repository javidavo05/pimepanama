-- 0035_device_tokens.sql
-- Llaves de dispositivo para las apps nativas de la compañía (PIME Guard, la
-- barra de menú de la Mac).
--
-- La app nativa no tiene la cookie de Supabase del navegador. Se vincula una
-- vez desde /empresa/configuracion/mac: el servidor genera una llave aleatoria,
-- se la entrega a la app por el enlace pimeguard:// y guarda solo su SHA-256.
-- Con esa llave la app lee el resumen de correo y de reuniones del usuario.
-- Desvincular (revokedAt) la deja sin acceso en la siguiente consulta.
--
-- Idempotente: se puede correr varias veces sin efecto.

CREATE TABLE IF NOT EXISTS "DeviceToken" (
  "id"         TEXT PRIMARY KEY,
  "userId"     TEXT NOT NULL,
  "name"       TEXT NOT NULL,
  "tokenHash"  TEXT NOT NULL,
  "lastUsedAt" TIMESTAMP(3),
  "revokedAt"  TIMESTAMP(3),
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "DeviceToken_tokenHash_key"
  ON "DeviceToken" ("tokenHash");

CREATE INDEX IF NOT EXISTS "DeviceToken_userId_idx"
  ON "DeviceToken" ("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DeviceToken_userId_fkey'
  ) THEN
    ALTER TABLE "DeviceToken"
      ADD CONSTRAINT "DeviceToken_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "EmpresaUser"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- RLS obligatorio: solo el servidor (Prisma / service role) lee y escribe.
ALTER TABLE "DeviceToken" ENABLE ROW LEVEL SECURITY;
