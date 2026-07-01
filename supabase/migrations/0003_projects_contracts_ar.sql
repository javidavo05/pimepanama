-- Migration 0003: Projects, Contracts, PaymentSchedules
-- Run in Supabase SQL Editor before deploying

-- Enums
DO $$ BEGIN
  CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ScheduleStatus" AS ENUM ('PENDING', 'OVERDUE', 'PAID', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Project table
CREATE TABLE IF NOT EXISTS "Project" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "userId"      TEXT NOT NULL,
  "clientId"    TEXT,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "scope"       TEXT,
  "status"      "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
  "startDate"   TIMESTAMPTZ,
  "endDate"     TIMESTAMPTZ,
  "totalBudget" DECIMAL(12,2),
  "aiSummary"   TEXT,
  "aiTags"      TEXT[] NOT NULL DEFAULT '{}',
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "EmpresaUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Project" ADD CONSTRAINT "Project_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "Project_userId_idx" ON "Project"("userId");
CREATE INDEX IF NOT EXISTS "Project_userId_status_idx" ON "Project"("userId", "status");

-- Contract table
CREATE TABLE IF NOT EXISTS "Contract" (
  "id"               TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "userId"           TEXT NOT NULL,
  "projectId"        TEXT,
  "clientId"         TEXT,
  "title"            TEXT NOT NULL,
  "description"      TEXT,
  "responsibilities" TEXT,
  "terms"            TEXT,
  "status"           "ContractStatus" NOT NULL DEFAULT 'DRAFT',
  "signedAt"         TIMESTAMPTZ,
  "startsAt"         TIMESTAMPTZ,
  "endsAt"           TIMESTAMPTZ,
  "value"            DECIMAL(12,2),
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "Contract" ADD CONSTRAINT "Contract_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "EmpresaUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Contract" ADD CONSTRAINT "Contract_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Contract" ADD CONSTRAINT "Contract_clientId_fkey"
    FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "Contract_userId_idx" ON "Contract"("userId");
CREATE INDEX IF NOT EXISTS "Contract_projectId_idx" ON "Contract"("projectId");

-- PaymentSchedule table
CREATE TABLE IF NOT EXISTS "PaymentSchedule" (
  "id"           TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "userId"       TEXT NOT NULL,
  "documentId"   TEXT NOT NULL,
  "description"  TEXT NOT NULL,
  "amount"       DECIMAL(12,2) NOT NULL,
  "dueDate"      TIMESTAMPTZ NOT NULL,
  "status"       "ScheduleStatus" NOT NULL DEFAULT 'PENDING',
  "paidAt"       TIMESTAMPTZ,
  "invoiceId"    TEXT,
  "reminderSent" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "PaymentSchedule_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "PaymentSchedule" ADD CONSTRAINT "PaymentSchedule_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "PaymentSchedule_userId_status_idx" ON "PaymentSchedule"("userId", "status");
CREATE INDEX IF NOT EXISTS "PaymentSchedule_documentId_idx" ON "PaymentSchedule"("documentId");
CREATE INDEX IF NOT EXISTS "PaymentSchedule_dueDate_idx" ON "PaymentSchedule"("dueDate");

-- Add projectId and contractId to Document
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "projectId" TEXT;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "contractId" TEXT;

DO $$ BEGIN
  ALTER TABLE "Document" ADD CONSTRAINT "Document_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Document" ADD CONSTRAINT "Document_contractId_fkey"
    FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "Document_projectId_idx" ON "Document"("projectId");

-- Enable RLS
ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Contract" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentSchedule" ENABLE ROW LEVEL SECURITY;
