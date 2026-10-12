-- 0051 · Asistente total y pagos por fase o proyecto (2026-10-12).
-- Payment.projectId / Payment.phaseId: a qué proyecto o fase pertenece un pago. Todo pago queda con su
-- factura (documentId); estas columnas dicen de qué fase o proyecto es, para descontarlo de ahí y para
-- facturar después lo que se registró. Si se borra la fase o el proyecto, el pago queda (SET NULL).
-- AssistantAction.kind: el asistente ya hace de todo (clientes, proyectos, fases, pagos, facturas, planes,
-- tareas, tickets, gastos, reuniones, plataformas, notas). La restricción pasa de una lista cerrada a un
-- formato: minúsculas y guion bajo.
-- Idempotente.
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "projectId" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "phaseId" TEXT;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Payment_projectId_fkey') THEN
    ALTER TABLE "Payment" ADD CONSTRAINT "Payment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Payment_phaseId_fkey') THEN
    ALTER TABLE "Payment" ADD CONSTRAINT "Payment_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "ProjectPhase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "Payment_projectId_idx" ON "Payment"("projectId");
CREATE INDEX IF NOT EXISTS "Payment_phaseId_idx" ON "Payment"("phaseId");

ALTER TABLE "AssistantAction" DROP CONSTRAINT IF EXISTS "AssistantAction_kind_check";
ALTER TABLE "AssistantAction" ADD CONSTRAINT "AssistantAction_kind_check"
  CHECK ("kind" ~ '^[a-z][a-z_]{1,40}$');
