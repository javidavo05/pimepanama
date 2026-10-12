-- 0048 · Empresa interna y gastos por proyecto (2026-10-12).
-- Client.internal: la propia Pime Panamá como cliente para sus productos (AcademyX, CifraApp…). No suma a
-- cobros ni ingresos, no tiene cuenta de cliente ni recibe correos.
-- Expense.projectId: a qué proyecto (producto) pertenece un gasto; si se borra el proyecto, el gasto queda.
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "internal" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "projectId" TEXT;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Expense_projectId_fkey') THEN
    ALTER TABLE "Expense" ADD CONSTRAINT "Expense_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "Expense_projectId_idx" ON "Expense"("projectId");
