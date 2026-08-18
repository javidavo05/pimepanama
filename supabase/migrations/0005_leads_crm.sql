-- Migration 0005: Módulo CRM de Leads (prospectos)
-- Los leads viven en su propia tabla, separada de "Client" — solo se convierten
-- en Client real cuando el usuario los marca como GANADO (ver updateLeadStatusAction).

SET search_path TO public;

-- Enums
DO $$ BEGIN
  CREATE TYPE "LeadStatus" AS ENUM ('NUEVO', 'CONTACTADO', 'COTIZANDO', 'NEGOCIACION', 'GANADO', 'PERDIDO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "LeadSource" AS ENUM ('REFERIDO', 'WEB', 'REDES_SOCIALES', 'FERIA', 'LLAMADA_FRIA', 'OTRO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Lead table
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

-- Document.leadId — permite vincular una COTIZACION a un Lead (antes de convertirse en Client)
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "leadId" TEXT;

DO $$ BEGIN
  ALTER TABLE "Document" ADD CONSTRAINT "Document_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "Document_leadId_idx" ON "Document"("leadId");
