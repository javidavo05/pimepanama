-- 0026_project_repo_and_deliverable.sql
-- El módulo de Reuniones deja de opinar a ciegas sobre el código.
--
-- 1. Un proyecto puede apuntar a un repositorio de GitHub. Se guarda un
--    "snapshot" —el mapa del repo: árbol de archivos, dependencias reales,
--    modelos de Prisma, rutas, README/CLAUDE.md y últimos commits— que entra al
--    contexto de cada reunión. Sin esto la IA recomienda sobre un sistema
--    imaginario; con esto habla de módulos que existen y de rutas reales.
-- 2. El token de GitHub vive cifrado a nivel de usuario: un PAT sirve para
--    todos sus repos, así que no tiene sentido repetirlo por proyecto.
-- 3. Toda reunión —de seguimiento o de producto nuevo— produce un entregable
--    técnico. `Meeting.technicalDeliverable` guarda cuál es, de qué tipo
--    (propuesta, contrato, modificación, sistema nuevo, mantenimiento) y con qué
--    alcance, para que nunca haya una reunión que "no dejó nada".
--
-- Idempotente: se puede correr varias veces sin efecto.

-- ─── Token de GitHub del usuario (cifrado AES-256-GCM) ───────────────────────

ALTER TABLE "EmpresaUser" ADD COLUMN IF NOT EXISTS "githubTokenEnc" TEXT;

-- ─── Repositorio del proyecto ────────────────────────────────────────────────

ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "repoOwner"    TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "repoName"     TEXT;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "repoBranch"   TEXT;
-- Mapa del repo: árbol, dependencias, modelos, rutas, docs y commits recientes.
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "repoSnapshot" JSONB;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "repoSyncedAt" TIMESTAMP(3);

-- ─── Entregable técnico de la reunión ────────────────────────────────────────

-- { kind, title, summary, scope[], acceptance[], touchedAreas[], estimateHours,
--   blockers[], recommendation, readyFor }
ALTER TABLE "Meeting" ADD COLUMN IF NOT EXISTS "technicalDeliverable" JSONB;

-- Qué se materializó ya a partir de ese entregable, para no duplicarlo al
-- reprocesar la reunión.
ALTER TABLE "Meeting" ADD COLUMN IF NOT EXISTS "deliverableId" TEXT;
ALTER TABLE "Meeting" ADD COLUMN IF NOT EXISTS "proposalDraftedAt" TIMESTAMP(3);
ALTER TABLE "Meeting" ADD COLUMN IF NOT EXISTS "contractId" TEXT;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Meeting_deliverableId_fkey') THEN
        ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_deliverableId_fkey"
            FOREIGN KEY ("deliverableId") REFERENCES "Deliverable"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Meeting_contractId_fkey') THEN
        ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_contractId_fkey"
            FOREIGN KEY ("contractId") REFERENCES "Contract"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
