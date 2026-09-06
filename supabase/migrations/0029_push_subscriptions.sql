-- 0029_push_subscriptions.sql
-- Web Push: suscripciones por dispositivo al PWA de Pime Suite.
-- Una fila por navegador/dispositivo suscrito (iPhone, Mac, iPad del mismo
-- usuario conviven). El endpoint es único: re-suscribir el mismo dispositivo
-- actualiza las llaves en vez de duplicar la fila.

CREATE TABLE IF NOT EXISTS "PushSubscription" (
  "id"         TEXT PRIMARY KEY,
  "userId"     TEXT NOT NULL,
  "endpoint"   TEXT NOT NULL,
  "p256dh"     TEXT NOT NULL,
  "auth"       TEXT NOT NULL,
  "userAgent"  TEXT,
  "lastUsedAt" TIMESTAMP(3),
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "PushSubscription_endpoint_key"
  ON "PushSubscription" ("endpoint");

CREATE INDEX IF NOT EXISTS "PushSubscription_userId_idx"
  ON "PushSubscription" ("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PushSubscription_userId_fkey'
  ) THEN
    ALTER TABLE "PushSubscription"
      ADD CONSTRAINT "PushSubscription_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "EmpresaUser"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- RLS obligatorio: la tabla se lee y escribe solo desde el servidor
-- (service role / Prisma). Sin políticas para anon/authenticated.
ALTER TABLE "PushSubscription" ENABLE ROW LEVEL SECURITY;
