-- Pagos parciales de factura (contenido idéntico a supabase/migrations/0012_invoice_partial_payment.sql)

SET search_path TO public;

DO $$ BEGIN
  ALTER TYPE "DocumentStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_PAID';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "amountPaid" DECIMAL(65,30);
