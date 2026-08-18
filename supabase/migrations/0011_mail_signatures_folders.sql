-- Migration 0011: Firmas por cuenta + índice carpetas IMAP

SET search_path TO public;

ALTER TABLE "MailAccount" ADD COLUMN IF NOT EXISTS "fromName" TEXT;
ALTER TABLE "MailAccount" ADD COLUMN IF NOT EXISTS "signatureName" TEXT;
ALTER TABLE "MailAccount" ADD COLUMN IF NOT EXISTS "signatureTitle" TEXT;
ALTER TABLE "MailAccount" ADD COLUMN IF NOT EXISTS "signatureEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "MailAccount" ADD COLUMN IF NOT EXISTS "signatureHtml" TEXT;

CREATE INDEX IF NOT EXISTS "InboxEmail_userId_folder_receivedAt_idx"
  ON "InboxEmail"("userId", "folder", "receivedAt");
