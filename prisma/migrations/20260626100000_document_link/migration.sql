-- linkedDocumentId FK en Document (COTIZACION ↔ FACTURA); backfill desde JSON content

ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "linkedDocumentId" TEXT;

DO $$ BEGIN
  ALTER TABLE "Document"
    ADD CONSTRAINT "Document_linkedDocumentId_fkey"
    FOREIGN KEY ("linkedDocumentId") REFERENCES "Document"(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "Document_linkedDocumentId_idx" ON "Document"("linkedDocumentId");

UPDATE "Document"
SET "linkedDocumentId" = content->>'linkedInvoiceId'
WHERE type = 'COTIZACION'
  AND content->>'linkedInvoiceId' IS NOT NULL
  AND "linkedDocumentId" IS NULL;

UPDATE "Document"
SET "linkedDocumentId" = content->>'sourceQuoteId'
WHERE type = 'FACTURA'
  AND content->>'sourceQuoteId' IS NOT NULL
  AND "linkedDocumentId" IS NULL;
