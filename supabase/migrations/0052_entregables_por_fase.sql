-- 0052 · Entregables por fase
-- Deliverable.phaseId: cada entregable cuelga de una fase del proyecto (ProjectPhase). Las fases y sus
-- entregables salen completos de la propuesta o cotización adjunta al crear el proyecto. Borrar una fase
-- deja sus entregables sin fase (SET NULL), no los borra.
-- Idempotente. ProjectPhase ya tiene RLS (0038).

ALTER TABLE "Deliverable" ADD COLUMN IF NOT EXISTS "phaseId" TEXT;

CREATE INDEX IF NOT EXISTS "Deliverable_phaseId_idx" ON "Deliverable" ("phaseId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Deliverable_phaseId_fkey') THEN
    ALTER TABLE "Deliverable"
      ADD CONSTRAINT "Deliverable_phaseId_fkey"
      FOREIGN KEY ("phaseId") REFERENCES "ProjectPhase"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
