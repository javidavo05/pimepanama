-- 0021_project_clients.sql
-- Un proyecto puede pertenecer a varios clientes.
--
-- "Project"."clientId" queda como espejo legacy del cliente principal (se sigue
-- escribiendo por compatibilidad), pero la fuente de verdad de "qué clientes
-- pertenecen a este proyecto" pasa a ser esta tabla.
--
-- Idempotente: se puede correr varias veces sin efecto.

CREATE TABLE IF NOT EXISTS "ProjectClient" (
    "projectId" TEXT NOT NULL,
    "clientId"  TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectClient_pkey" PRIMARY KEY ("projectId", "clientId")
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ProjectClient_projectId_fkey'
    ) THEN
        ALTER TABLE "ProjectClient"
            ADD CONSTRAINT "ProjectClient_projectId_fkey"
            FOREIGN KEY ("projectId") REFERENCES "Project"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ProjectClient_clientId_fkey'
    ) THEN
        ALTER TABLE "ProjectClient"
            ADD CONSTRAINT "ProjectClient_clientId_fkey"
            FOREIGN KEY ("clientId") REFERENCES "Client"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "ProjectClient_clientId_idx" ON "ProjectClient"("clientId");
CREATE INDEX IF NOT EXISTS "ProjectClient_projectId_idx" ON "ProjectClient"("projectId");

-- Backfill: el cliente que ya tenía cada proyecto pasa a la tabla nueva.
INSERT INTO "ProjectClient" ("projectId", "clientId")
SELECT "id", "clientId" FROM "Project" WHERE "clientId" IS NOT NULL
ON CONFLICT DO NOTHING;

-- RLS obligatorio, sin políticas para anon/authenticated (igual que el resto).
ALTER TABLE "ProjectClient" ENABLE ROW LEVEL SECURITY;
