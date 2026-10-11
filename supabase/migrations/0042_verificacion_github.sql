-- 0042 · Estado del proyecto verificado con GitHub
-- Foto del repositorio (commits recientes, milestones, issues, PRs) guardada en el proyecto para definir
-- su estado real antes de mostrárselo al cliente. Idempotente.
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "githubCheck"   JSONB;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "githubCheckAt" TIMESTAMP(3);
