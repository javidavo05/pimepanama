-- 0040 · Varias cuentas de GitHub por equipo
-- Los repositorios de Pime viven en varias cuentas (una por cliente o producto, como en Git PIME).
-- Cada cuenta guarda su token cifrado (MAIL_ENCRYPTION_KEY, AES-GCM); cada proyecto recuerda con qué
-- cuenta se lee su repositorio. EmpresaUser.githubTokenEnc queda como respaldo de lo anterior.
-- Idempotente. RLS activo y sin políticas.

CREATE TABLE IF NOT EXISTS "GithubAccount" (
  "id"            TEXT PRIMARY KEY,
  "userId"        TEXT NOT NULL REFERENCES "EmpresaUser"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "login"         TEXT NOT NULL,
  "tokenEnc"      TEXT NOT NULL,
  "scopes"        TEXT,
  "source"        TEXT NOT NULL DEFAULT 'manual' CHECK ("source" IN ('manual', 'gh-cli')),
  "lastCheckedAt" TIMESTAMP(3),
  "lastError"     TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "GithubAccount_userId_login_key" ON "GithubAccount" ("userId", lower("login"));

ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "githubAccountId" TEXT;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Project_githubAccountId_fkey') THEN
    ALTER TABLE "Project" ADD CONSTRAINT "Project_githubAccountId_fkey"
      FOREIGN KEY ("githubAccountId") REFERENCES "GithubAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "GithubAccount" ENABLE ROW LEVEL SECURITY;
