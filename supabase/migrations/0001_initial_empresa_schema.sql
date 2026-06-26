-- Migración 0001: Schema inicial Pime Communications Suite
-- Fecha: 2025-11-07 | Estado: ✅ Ya aplicado en producción

-- Enums
DO $$ BEGIN
  CREATE TYPE "EmpresaRole" AS ENUM ('OWNER', 'USER');
  EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "DocumentType" AS ENUM ('FACTURA', 'COTIZACION', 'BITACORA', 'CORREO');
  EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'PAID', 'CANCELLED');
  EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentType" AS ENUM ('CASH', 'BANK_TRANSFER', 'CARD', 'CHECK', 'OTHER');
  EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- EmpresaUser
CREATE TABLE IF NOT EXISTS "EmpresaUser" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "supabaseUid" TEXT NOT NULL,
  "email"       TEXT NOT NULL,
  "fullName"    TEXT,
  "role"        "EmpresaRole" NOT NULL DEFAULT 'USER',
  "configId"    TEXT,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "EmpresaUser_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EmpresaUser_supabaseUid_key" UNIQUE ("supabaseUid"),
  CONSTRAINT "EmpresaUser_email_key" UNIQUE ("email")
);

-- CompanyConfig
CREATE TABLE IF NOT EXISTS "CompanyConfig" (
  "id"               TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "name"             TEXT NOT NULL DEFAULT 'Pime Panamá',
  "legalName"        TEXT,
  "ruc"              TEXT,
  "address"          TEXT,
  "city"             TEXT,
  "country"          TEXT NOT NULL DEFAULT 'Panamá',
  "phone"            TEXT,
  "email"            TEXT,
  "logoUrl"          TEXT,
  "website"          TEXT,
  "currency"         TEXT NOT NULL DEFAULT 'USD',
  "defaultLocale"    TEXT NOT NULL DEFAULT 'es',
  "invoicePrefix"    TEXT NOT NULL DEFAULT 'INV',
  "quotePrefix"      TEXT NOT NULL DEFAULT 'COT',
  "paymentTermsDays" INTEGER NOT NULL DEFAULT 30,
  "taxRatePercent"   NUMERIC NOT NULL DEFAULT 7,
  "footerNotes_en"   TEXT,
  "footerNotes_es"   TEXT,
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "CompanyConfig_pkey" PRIMARY KEY ("id")
);

-- Client
CREATE TABLE IF NOT EXISTS "Client" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "name"      TEXT NOT NULL,
  "company"   TEXT,
  "ruc"       TEXT,
  "email"     TEXT,
  "phone"     TEXT,
  "address"   TEXT,
  "city"      TEXT,
  "country"   TEXT NOT NULL DEFAULT 'Panamá',
  "notes"     TEXT,
  "userId"    TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "Client_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Client_userId_fkey" FOREIGN KEY ("userId") REFERENCES "EmpresaUser"("id")
);
CREATE INDEX IF NOT EXISTS "Client_userId_idx" ON "Client"("userId");

-- PaymentMethod
CREATE TABLE IF NOT EXISTS "PaymentMethod" (
  "id"             TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "name"           TEXT NOT NULL,
  "type"           "PaymentType" NOT NULL DEFAULT 'OTHER',
  "commissionPct"  NUMERIC NOT NULL DEFAULT 0,
  "commissionFlat" NUMERIC NOT NULL DEFAULT 0,
  "commissionTax"  NUMERIC NOT NULL DEFAULT 0,
  "bankName"       TEXT,
  "accountNumber"  TEXT,
  "accountType"    TEXT,
  "accountHolder"  TEXT,
  "isActive"       BOOLEAN NOT NULL DEFAULT true,
  "userId"         TEXT NOT NULL,
  "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PaymentMethod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "EmpresaUser"("id")
);
CREATE INDEX IF NOT EXISTS "PaymentMethod_userId_idx" ON "PaymentMethod"("userId");

-- Document
CREATE TABLE IF NOT EXISTS "Document" (
  "id"              TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "type"            "DocumentType" NOT NULL,
  "status"          "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
  "language"        TEXT NOT NULL DEFAULT 'es',
  "number"          TEXT,
  "title"           TEXT NOT NULL,
  "clientName"      TEXT,
  "clientEmail"     TEXT,
  "clientCompany"   TEXT,
  "clientAddress"   TEXT,
  "clientRuc"       TEXT,
  "content"         JSONB NOT NULL DEFAULT '{}',
  "aiEnhanced"      BOOLEAN NOT NULL DEFAULT false,
  "aiTokensUsed"    INTEGER NOT NULL DEFAULT 0,
  "issueDate"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "dueDate"         TIMESTAMPTZ,
  "validUntil"      TIMESTAMPTZ,
  "subtotal"        NUMERIC,
  "taxAmount"       NUMERIC,
  "total"           NUMERIC,
  "commissionAmt"   NUMERIC,
  "netAmount"       NUMERIC,
  "currency"        TEXT NOT NULL DEFAULT 'USD',
  "userId"          TEXT NOT NULL,
  "clientId"        TEXT,
  "companyId"       TEXT,
  "paymentMethodId" TEXT,
  "r2Key"           TEXT,
  "pdfUrl"          TEXT,
  "sentAt"          TIMESTAMPTZ,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "Document_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "EmpresaUser"("id"),
  CONSTRAINT "Document_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id"),
  CONSTRAINT "Document_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CompanyConfig"("id"),
  CONSTRAINT "Document_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id")
);
CREATE INDEX IF NOT EXISTS "Document_type_userId_idx" ON "Document"("type", "userId");
CREATE INDEX IF NOT EXISTS "Document_status_userId_idx" ON "Document"("status", "userId");
CREATE INDEX IF NOT EXISTS "Document_clientId_idx" ON "Document"("clientId");

-- AiUsageLog
CREATE TABLE IF NOT EXISTS "AiUsageLog" (
  "id"           TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "supabaseUid"  TEXT NOT NULL,
  "documentId"   TEXT,
  "operation"    TEXT NOT NULL,
  "model"        TEXT NOT NULL,
  "inputTokens"  INTEGER NOT NULL DEFAULT 0,
  "outputTokens" INTEGER NOT NULL DEFAULT 0,
  "durationMs"   INTEGER NOT NULL DEFAULT 0,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "AiUsageLog_pkey" PRIMARY KEY ("id")
);

-- RLS
ALTER TABLE "EmpresaUser"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CompanyConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Client"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentMethod" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Document"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AiUsageLog"    ENABLE ROW LEVEL SECURITY;
