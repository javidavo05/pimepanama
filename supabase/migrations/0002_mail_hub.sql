-- Migración 0002: Mail Hub — IMAP inbox, adjuntos y notificaciones
-- Fecha: 2026-06-25 | Estado: ⏳ Pendiente — correr en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS "MailAccount" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId"      TEXT NOT NULL,
  "label"       TEXT NOT NULL,
  "host"        TEXT NOT NULL,
  "port"        INTEGER NOT NULL DEFAULT 993,
  "tls"         BOOLEAN NOT NULL DEFAULT true,
  "username"    TEXT NOT NULL,
  "passwordEnc" TEXT NOT NULL,
  "credType"    TEXT NOT NULL DEFAULT 'PASSWORD_APP',
  "smtpHost"    TEXT,
  "smtpPort"    INTEGER DEFAULT 587,
  "smtpTls"     BOOLEAN NOT NULL DEFAULT true,
  "active"      BOOLEAN NOT NULL DEFAULT true,
  "lastSyncAt"  TIMESTAMPTZ,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "MailAccount_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MailAccount_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "EmpresaUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "MailAccount_userId_idx" ON "MailAccount"("userId");

CREATE TABLE IF NOT EXISTS "InboxEmail" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "accountId"   TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "uid"         INTEGER NOT NULL,
  "messageId"   TEXT,
  "subject"     TEXT,
  "fromName"    TEXT,
  "fromEmail"   TEXT NOT NULL,
  "toAddresses" TEXT[] NOT NULL DEFAULT '{}',
  "ccAddresses" TEXT[] NOT NULL DEFAULT '{}',
  "bodyText"    TEXT,
  "receivedAt"  TIMESTAMPTZ NOT NULL,
  "isRead"      BOOLEAN NOT NULL DEFAULT false,
  "isStarred"   BOOLEAN NOT NULL DEFAULT false,
  "folder"      TEXT NOT NULL DEFAULT 'INBOX',
  "aiSummary"   TEXT,
  "aiTags"      TEXT[] NOT NULL DEFAULT '{}',
  "aiNotified"  BOOLEAN NOT NULL DEFAULT false,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "InboxEmail_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InboxEmail_accountId_uid_folder_key" UNIQUE ("accountId", "uid", "folder"),
  CONSTRAINT "InboxEmail_accountId_fkey" FOREIGN KEY ("accountId")
    REFERENCES "MailAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "InboxEmail_userId_idx"     ON "InboxEmail"("userId");
CREATE INDEX IF NOT EXISTS "InboxEmail_accountId_idx"  ON "InboxEmail"("accountId");
CREATE INDEX IF NOT EXISTS "InboxEmail_receivedAt_idx" ON "InboxEmail"("receivedAt");

CREATE TABLE IF NOT EXISTS "EmailAttachment" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "emailId"     TEXT NOT NULL,
  "filename"    TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "size"        INTEGER NOT NULL,
  "r2Key"       TEXT,
  "r2Url"       TEXT,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "EmailAttachment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EmailAttachment_emailId_fkey" FOREIGN KEY ("emailId")
    REFERENCES "InboxEmail"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "MailNotification" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId"    TEXT NOT NULL,
  "emailId"   TEXT,
  "title"     TEXT NOT NULL,
  "body"      TEXT NOT NULL,
  "read"      BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "MailNotification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MailNotification_userId_read_idx" ON "MailNotification"("userId", "read");

ALTER TABLE "MailAccount"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InboxEmail"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmailAttachment"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MailNotification" ENABLE ROW LEVEL SECURITY;
