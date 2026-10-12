-- 0050 · El asistente propone fases con sus pagos (2026-10-12). Amplía AssistantAction.kind con 'fase'.
-- El nombre de la restricción lo pone Postgres al crear la tabla (0043): AssistantAction_kind_check.
ALTER TABLE "AssistantAction" DROP CONSTRAINT IF EXISTS "AssistantAction_kind_check";
ALTER TABLE "AssistantAction" ADD CONSTRAINT "AssistantAction_kind_check"
  CHECK ("kind" IN ('factura', 'tarea', 'nota', 'pago', 'fase'));
