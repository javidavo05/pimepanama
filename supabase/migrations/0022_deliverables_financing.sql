-- 0022_deliverables_financing.sql
-- 1) Entregables del proyecto (los genera el análisis del contrato adjunto).
-- 2) Project.financingPlan — plan de financiación (abono inicial + cuotas
--    mensuales o quincenales) que se materializa en PaymentSchedule al facturar.
--
-- Idempotente: se puede correr varias veces sin efecto.

CREATE TABLE IF NOT EXISTS "Deliverable" (
    "id"          TEXT NOT NULL,
    "projectId"   TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "description" TEXT,
    "dueDate"     TIMESTAMP(3),
    "completed"   BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "sortOrder"   INTEGER NOT NULL DEFAULT 0,
    "source"      TEXT NOT NULL DEFAULT 'MANUAL',
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Deliverable_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Deliverable_projectId_fkey'
    ) THEN
        ALTER TABLE "Deliverable"
            ADD CONSTRAINT "Deliverable_projectId_fkey"
            FOREIGN KEY ("projectId") REFERENCES "Project"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Deliverable_projectId_idx" ON "Deliverable"("projectId");
CREATE INDEX IF NOT EXISTS "Deliverable_projectId_sortOrder_idx" ON "Deliverable"("projectId", "sortOrder");

ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "financingPlan" JSONB;

ALTER TABLE "Deliverable" ENABLE ROW LEVEL SECURITY;
