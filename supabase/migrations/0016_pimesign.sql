-- Migration 0016: PimeSign — firma digital in-house de contratos

SET search_path TO public;

DO $$ BEGIN
  CREATE TYPE "SigningStatus" AS ENUM (
    'DRAFT',
    'PENDING_CLIENT',
    'PENDING_COMPANY',
    'COMPLETED',
    'DECLINED',
    'EXPIRED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "ContractSigningRequest" (
  "id"                    TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "contractId"            TEXT NOT NULL,
  "userId"                TEXT NOT NULL,
  "status"                "SigningStatus" NOT NULL DEFAULT 'DRAFT',
  "clientEmail"           TEXT NOT NULL,
  "companyEmail"          TEXT NOT NULL,
  "clientName"            TEXT,
  "companyName"           TEXT,
  "basePdfR2Key"          TEXT,
  "clientSignatureR2Key"  TEXT,
  "companySignatureR2Key" TEXT,
  "signedPdfR2Key"        TEXT,
  "expiresAt"             TIMESTAMPTZ NOT NULL,
  "createdAt"             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ContractSigningRequest_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "ContractSigningRequest" ADD CONSTRAINT "ContractSigningRequest_contractId_fkey"
    FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ContractSigningRequest" ADD CONSTRAINT "ContractSigningRequest_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "EmpresaUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "ContractSigningRequest_contractId_key"
  ON "ContractSigningRequest"("contractId");

CREATE INDEX IF NOT EXISTS "ContractSigningRequest_userId_idx"
  ON "ContractSigningRequest"("userId");

CREATE TABLE IF NOT EXISTS "ContractSigningToken" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "requestId" TEXT NOT NULL,
  "role"      TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "usedAt"    TIMESTAMPTZ,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ContractSigningToken_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "ContractSigningToken" ADD CONSTRAINT "ContractSigningToken_requestId_fkey"
    FOREIGN KEY ("requestId") REFERENCES "ContractSigningRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "ContractSigningToken_tokenHash_key"
  ON "ContractSigningToken"("tokenHash");

CREATE INDEX IF NOT EXISTS "ContractSigningToken_requestId_idx"
  ON "ContractSigningToken"("requestId");

CREATE TABLE IF NOT EXISTS "ContractSigningEvent" (
  "id"         TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "requestId"  TEXT NOT NULL,
  "action"     TEXT NOT NULL,
  "actorEmail" TEXT,
  "ipAddress"  TEXT,
  "userAgent"  TEXT,
  "metadata"   JSONB,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "ContractSigningEvent_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "ContractSigningEvent" ADD CONSTRAINT "ContractSigningEvent_requestId_fkey"
    FOREIGN KEY ("requestId") REFERENCES "ContractSigningRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "ContractSigningEvent_requestId_idx"
  ON "ContractSigningEvent"("requestId");

ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "signingStatus" "SigningStatus";
ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "signingCompletedAt" TIMESTAMPTZ;

ALTER TABLE "ContractSigningRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ContractSigningToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ContractSigningEvent" ENABLE ROW LEVEL SECURITY;
