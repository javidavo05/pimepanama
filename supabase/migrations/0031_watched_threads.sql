-- 0031_watched_threads.sql
-- Conversaciones marcadas como importantes en el hub de correo.
--
-- Cuando se manda una propuesta o se responde un RFP, lo que importa es enterarse
-- en cuanto la otra parte conteste. Marcar el hilo guarda qué buscar en los
-- correos que entren: el asunto normalizado, las direcciones de la contraparte
-- y los Message-ID del hilo (para casar In-Reply-To / References aunque cambien
-- el asunto). Cada respuesta nueva dispara campana + push al teléfono.
--
-- Solo cuentan los correos posteriores a `lastMessageAt`: lo que ya estaba en
-- el hilo al marcarlo no avisa.
--
-- Idempotente: se puede correr varias veces sin efecto.

CREATE TABLE IF NOT EXISTS "WatchedThread" (
  "id"               TEXT PRIMARY KEY,
  "userId"           TEXT NOT NULL,
  "emailId"          TEXT NOT NULL,
  "subject"          TEXT,
  "normSubject"      TEXT NOT NULL,
  "participants"     TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "messageIds"       TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "lastMessageAt"    TIMESTAMP(3) NOT NULL,
  "lastReplyAt"      TIMESTAMP(3),
  "lastReplyEmailId" TEXT,
  "replyCount"       INTEGER NOT NULL DEFAULT 0,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "WatchedThread_userId_idx"
  ON "WatchedThread" ("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'WatchedThread_userId_fkey'
  ) THEN
    ALTER TABLE "WatchedThread"
      ADD CONSTRAINT "WatchedThread_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "EmpresaUser"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- RLS obligatorio: solo el servidor (Prisma / service role) lee y escribe.
ALTER TABLE "WatchedThread" ENABLE ROW LEVEL SECURITY;
