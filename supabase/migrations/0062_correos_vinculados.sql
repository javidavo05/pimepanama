-- 0062 · Correos ligados a leads y clientes (2026-10-20)
-- InboxEmail.leadId / clientId: a quién pertenece el correo. Lo pone solo el sync (por dirección, por hilo o
--   porque la IA reconoció una solicitud de cotización y creó el lead) o el equipo a mano desde el correo.
-- InboxEmail.vinculo: 'auto' | 'manual' | 'ignorado' ('ignorado' = el equipo dijo que no es de nadie: el sync
--   no lo vuelve a tocar).
-- InboxEmail.solicitud: lo que la IA sacó de una solicitud de cotización (nombre, empresa, teléfono, necesidad,
--   valor estimado, prioridad), para crear el lead prellenado.
-- LeadSource.CORREO: lead que entró escribiendo directo a un buzón.
-- Idempotente.

ALTER TYPE "LeadSource" ADD VALUE IF NOT EXISTS 'CORREO';

ALTER TABLE "InboxEmail" ADD COLUMN IF NOT EXISTS "leadId"    TEXT;
ALTER TABLE "InboxEmail" ADD COLUMN IF NOT EXISTS "clientId"  TEXT;
ALTER TABLE "InboxEmail" ADD COLUMN IF NOT EXISTS "vinculo"   TEXT;
ALTER TABLE "InboxEmail" ADD COLUMN IF NOT EXISTS "solicitud" JSONB;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InboxEmail_leadId_fkey') THEN
    ALTER TABLE "InboxEmail" ADD CONSTRAINT "InboxEmail_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InboxEmail_clientId_fkey') THEN
    ALTER TABLE "InboxEmail" ADD CONSTRAINT "InboxEmail_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InboxEmail_vinculo_check') THEN
    ALTER TABLE "InboxEmail" ADD CONSTRAINT "InboxEmail_vinculo_check" CHECK ("vinculo" IS NULL OR "vinculo" IN ('auto', 'manual', 'ignorado'));
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "InboxEmail_leadId_idx"   ON "InboxEmail" ("leadId");
CREATE INDEX IF NOT EXISTS "InboxEmail_clientId_idx" ON "InboxEmail" ("clientId");
