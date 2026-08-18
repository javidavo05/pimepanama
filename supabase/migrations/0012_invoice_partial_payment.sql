-- Migration 0012: Pagos parciales de factura
-- Document.amountPaid + estado PARTIALLY_PAID — cuando se cobra menos del total,
-- el saldo se registra como una cuota (PaymentSchedule) pendiente sobre el mismo documento.

SET search_path TO public;

DO $$ BEGIN
  ALTER TYPE "DocumentStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_PAID';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "amountPaid" DECIMAL(65,30);
