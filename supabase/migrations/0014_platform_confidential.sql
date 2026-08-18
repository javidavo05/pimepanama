-- Migration 0014: Bóveda confidencial cifrada en Platform cards

SET search_path TO public;

ALTER TABLE "Platform"
  ADD COLUMN IF NOT EXISTS "confidentialVault" TEXT;
