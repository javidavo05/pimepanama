-- Resend delivery tracking on sent emails
-- Requiere: 0002_mail_hub.sql + 0018_mail_threading.sql ya aplicados.

SET search_path TO public;

ALTER TABLE "InboxEmail" ADD COLUMN IF NOT EXISTS "resendId" TEXT;
ALTER TABLE "InboxEmail" ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMPTZ;
ALTER TABLE "InboxEmail" ADD COLUMN IF NOT EXISTS "openedAt" TIMESTAMPTZ;
ALTER TABLE "InboxEmail" ADD COLUMN IF NOT EXISTS "bouncedAt" TIMESTAMPTZ;
ALTER TABLE "InboxEmail" ADD COLUMN IF NOT EXISTS "bounceReason" TEXT;

CREATE INDEX IF NOT EXISTS "InboxEmail_resendId_idx" ON "InboxEmail" ("resendId");
