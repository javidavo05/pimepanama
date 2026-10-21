-- 0065 · Cola del envío automático de respuestas (2026-10-21)
-- RespuestaLead.aprobadaAt: cuándo el agente de prospección la revisó y la aprobó para salir sola. Las aprobadas
--   forman una cola que se envía por orden de aprobación, con el cupo diario de src/lib/leads/envio-automatico.ts;
--   lo que no cabe hoy sale el día siguiente.
-- Idempotente.

ALTER TABLE "RespuestaLead" ADD COLUMN IF NOT EXISTS "aprobadaAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "RespuestaLead_userId_aprobadaAt_idx" ON "RespuestaLead" ("userId", "aprobadaAt");
