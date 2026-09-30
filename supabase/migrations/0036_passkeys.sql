-- 0036_passkeys.sql
-- Llaves de acceso (WebAuthn / passkeys): entrar a la suite y abrir la
-- información confidencial de Platforms con Touch ID, Face ID o la huella del
-- teléfono.
--
-- Se guarda solo la llave pública de cada dispositivo; la huella nunca sale del
-- teléfono ni de la Mac. vaultAccess dice si esa llave también abre la bóveda:
-- solo se activa después de probar la contraseña madre una vez en ese
-- dispositivo, así una sesión abierta no basta para saltarse la contraseña.
--
-- Idempotente: se puede correr varias veces sin efecto.

CREATE TABLE IF NOT EXISTS "Passkey" (
  "id"           TEXT PRIMARY KEY,
  "userId"       TEXT NOT NULL,
  "credentialId" TEXT NOT NULL,
  "publicKey"    TEXT NOT NULL,
  "counter"      INTEGER NOT NULL DEFAULT 0,
  "transports"   TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "name"         TEXT NOT NULL,
  "vaultAccess"  BOOLEAN NOT NULL DEFAULT false,
  "lastUsedAt"   TIMESTAMP(3),
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "Passkey_credentialId_key"
  ON "Passkey" ("credentialId");

CREATE INDEX IF NOT EXISTS "Passkey_userId_idx"
  ON "Passkey" ("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Passkey_userId_fkey'
  ) THEN
    ALTER TABLE "Passkey"
      ADD CONSTRAINT "Passkey_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "EmpresaUser"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- RLS obligatorio: solo el servidor (Prisma / service role) lee y escribe.
ALTER TABLE "Passkey" ENABLE ROW LEVEL SECURITY;
