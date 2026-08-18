-- Mail threading + delivery tracking for sent messages
-- Requiere: 0002_mail_hub.sql (tabla "InboxEmail") ya aplicado.

SET search_path TO public;

ALTER TABLE "InboxEmail" ADD COLUMN IF NOT EXISTS "inReplyTo" TEXT;
ALTER TABLE "InboxEmail" ADD COLUMN IF NOT EXISTS "referencesHeader" TEXT;
ALTER TABLE "InboxEmail" ADD COLUMN IF NOT EXISTS "threadKey" TEXT;
ALTER TABLE "InboxEmail" ADD COLUMN IF NOT EXISTS "repliedToEmailId" TEXT;
ALTER TABLE "InboxEmail" ADD COLUMN IF NOT EXISTS "deliveryStatus" TEXT;
ALTER TABLE "InboxEmail" ADD COLUMN IF NOT EXISTS "smtpAccepted" TEXT[] DEFAULT '{}';
ALTER TABLE "InboxEmail" ADD COLUMN IF NOT EXISTS "smtpRejected" TEXT[] DEFAULT '{}';
ALTER TABLE "InboxEmail" ADD COLUMN IF NOT EXISTS "smtpResponse" TEXT;

CREATE INDEX IF NOT EXISTS "InboxEmail_userId_threadKey_idx" ON "InboxEmail" ("userId", "threadKey");
