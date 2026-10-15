-- 0053 · Cuenta del cliente: logo, acceso a su sistema y avance automático desde GitHub
-- Client.logoKey: llave en R2 del logo que sube el cliente (lo ve en su cuenta junto al de Pime).
-- Project.liveUrl: enlace del sistema en producción, visible en la cuenta del cliente.
-- Project.githubHookId: webhook que Pime crea en el repo para que el avance se mueva solo.
-- ProjectPhase.readyNotifiedAt: cuándo se avisó al cliente (cuenta + correo) que la fase quedó lista; evita
--   avisar dos veces. ProjectAccess: accesos al sistema del cliente (usuario y clave cifrada con
--   MAIL_ENCRYPTION_KEY, AES-256-GCM). Idempotente. RLS sin políticas, como el resto.

ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "logoKey" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "liveUrl" TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "githubHookId" TEXT;
ALTER TABLE "ProjectPhase" ADD COLUMN IF NOT EXISTS "readyNotifiedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "ProjectAccess" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "url" TEXT,
  "username" TEXT,
  "secretEnc" TEXT,
  "notes" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "ProjectAccess_projectId_idx" ON "ProjectAccess" ("projectId");
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProjectAccess_projectId_fkey') THEN
    ALTER TABLE "ProjectAccess"
      ADD CONSTRAINT "ProjectAccess_projectId_fkey"
      FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
ALTER TABLE "ProjectAccess" ENABLE ROW LEVEL SECURITY;
