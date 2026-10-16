-- 0055 · Fases llevadas a mano a propósito
-- ProjectPhase.progressSource acepta 'sin_marcador': la fase nunca recibe marcador en GitHub (por ejemplo, una fase
-- genérica mientras se carga la propuesta) y la revisión del sistema no la cuenta como «fase sin marcador».
-- Idempotente: se reemplaza el CHECK de 0038.

ALTER TABLE "ProjectPhase" DROP CONSTRAINT IF EXISTS "ProjectPhase_progressSource_check";
ALTER TABLE "ProjectPhase" ADD CONSTRAINT "ProjectPhase_progressSource_check" CHECK ("progressSource" IN ('manual', 'github', 'sin_marcador'));
