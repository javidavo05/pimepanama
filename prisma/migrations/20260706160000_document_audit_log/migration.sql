-- Historial de auditoría de documentos (contenido idéntico a supabase/migrations/0013_document_audit_log.sql)

SET search_path TO public;

CREATE TABLE IF NOT EXISTS "DocumentAuditLog" (
  "id"         TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "documentId" TEXT NOT NULL,
  "actorEmail" TEXT NOT NULL,
  "actorName"  TEXT,
  "summary"    TEXT NOT NULL,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "DocumentAuditLog_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "DocumentAuditLog" ADD CONSTRAINT "DocumentAuditLog_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "DocumentAuditLog_documentId_idx" ON "DocumentAuditLog"("documentId");

ALTER TABLE "DocumentAuditLog" ENABLE ROW LEVEL SECURITY;
