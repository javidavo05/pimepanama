-- Migration 0009: Registro de plataformas (access, Supabase, Vercel, etc.)

SET search_path TO public;

CREATE TABLE IF NOT EXISTS "Platform" (
  "id"              TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "userId"          TEXT NOT NULL,
  "name"            TEXT NOT NULL,
  "accessUrl"       TEXT,
  "supabaseEmail"   TEXT,
  "supabaseSlot"    INTEGER,
  "vercelEmail"     TEXT,
  "vercelSlot"      INTEGER,
  "linkUrl"         TEXT,
  "githubEmail"     TEXT,
  "brevoEmail"      TEXT,
  "notes"           TEXT,
  "sortOrder"       INTEGER NOT NULL DEFAULT 0,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Platform_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "Platform" ADD CONSTRAINT "Platform_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "EmpresaUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "Platform_userId_idx" ON "Platform"("userId");
CREATE INDEX IF NOT EXISTS "Platform_userId_sortOrder_idx" ON "Platform"("userId", "sortOrder");

ALTER TABLE "Platform" ENABLE ROW LEVEL SECURITY;
