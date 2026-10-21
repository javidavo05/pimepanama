-- 0066 · Doble verificación del envío automático (2026-10-21)
-- Todo correo que sale solo pasa dos revisiones sobre su versión FINAL (el correo reescrito y la propuesta en PDF):
--   el agente de prospección y una IA verificadora independiente que contrasta cada afirmación con las fuentes.
-- RespuestaLead.aprobadaHuella: huella del correo final aprobado; si cambia después, no sale hasta volver a aprobarse.
-- RespuestaLead.verificacion: lo que dijo la IA verificadora ({aprobado, problemas[]}).
-- RespuestaLead.verificadaAt: cuándo.
-- Idempotente.

ALTER TABLE "RespuestaLead" ADD COLUMN IF NOT EXISTS "aprobadaHuella" TEXT;
ALTER TABLE "RespuestaLead" ADD COLUMN IF NOT EXISTS "verificacion"   JSONB;
ALTER TABLE "RespuestaLead" ADD COLUMN IF NOT EXISTS "verificadaAt"   TIMESTAMP(3);
