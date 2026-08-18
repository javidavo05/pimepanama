-- Módulo CRM: tabla Lead, enums, Document.leadId
-- (contenido idéntico a supabase/migrations/0005_leads_crm.sql)

SET search_path TO public;

DO $$ BEGIN
  CREATE TYPE "LeadStatus" AS ENUM ('NUEVO', 'CONTACTADO', 'COTIZANDO', 'NEGOCIACION', 'GANADO', 'PERDIDO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "LeadSource" AS ENUM ('REFERIDO', 'WEB', 'REDES_SOCIALES', 'FERIA', 'LLAMADA_FRIA', 'OTRO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "Lead" (
  "id"                TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "name"              TEXT NOT NULL,
  "company"           TEXT,
  "email"             TEXT,
  "phone"             TEXT,
  "address"           TEXT,
  "city"              TEXT,
  "country"           TEXT NOT NULL DEFAULT 'Panamá',
  "source"            "LeadSource" NOT NULL DEFAULT 'OTRO',
  "status"            "LeadStatus" NOT NULL DEFAULT 'NUEVO',
  "estimatedValue"    DECIMAL(12,2),
  "notes"             TEXT,
  "nextFollowUpAt"    TIMESTAMPTZ,
  "lostReason"        TEXT,
  "userId"            TEXT NOT NULL,
  "convertedClientId" TEXT,
  "convertedAt"       TIMESTAMPTZ,
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "Lead" ADD CONSTRAINT "Lead_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "EmpresaUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Lead" ADD CONSTRAINT "Lead_convertedClientId_fkey"
    FOREIGN KEY ("convertedClientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "Lead_userId_idx" ON "Lead"("userId");
CREATE INDEX IF NOT EXISTS "Lead_userId_status_idx" ON "Lead"("userId", "status");

ALTER TABLE "Lead" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "leadId" TEXT;

DO $$ BEGIN
  ALTER TABLE "Document" ADD CONSTRAINT "Document_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "Document_leadId_idx" ON "Document"("leadId");
