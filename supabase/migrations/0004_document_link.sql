-- Migration 0004: Enlace directo entre documentos (COTIZACION ↔ FACTURA)
-- Reemplaza el enlace frágil via JSON content por una FK real consultable

SET search_path TO public;

ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "linkedDocumentId" TEXT;

DO $$ BEGIN
  ALTER TABLE "Document"
    ADD CONSTRAINT "Document_linkedDocumentId_fkey"
    FOREIGN KEY ("linkedDocumentId") REFERENCES "Document"(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "Document_linkedDocumentId_idx" ON "Document"("linkedDocumentId");

-- Backfill: poblar desde el JSON existente (COTIZACION → linkedInvoiceId)
UPDATE "Document"
SET "linkedDocumentId" = content->>'linkedInvoiceId'
WHERE type = 'COTIZACION'
  AND content->>'linkedInvoiceId' IS NOT NULL
  AND "linkedDocumentId" IS NULL;

-- Backfill inverso: FACTURA → sourceQuoteId
UPDATE "Document"
SET "linkedDocumentId" = content->>'sourceQuoteId'
WHERE type = 'FACTURA'
  AND content->>'sourceQuoteId' IS NOT NULL
  AND "linkedDocumentId" IS NULL;
