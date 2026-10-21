-- 0064 · Propuesta en PDF por respuesta (2026-10-21)
-- RespuestaLead.propuesta: el contenido de la propuesta de una página por sección (lo que vimos, qué construiríamos,
--   próximos pasos) que la IA redacta para ese lead; el PDF se arma con react-pdf a partir de esto.
-- RespuestaLead.propuestaAt: cuándo se redactó.
-- Limpieza: el backfill de 0063 se llevó al cuerpo las notas que se anexaron después del borrador
--   («[19/10/2026, …] Propuesta enviada…»). Se cortan.
-- Idempotente.

ALTER TABLE "RespuestaLead" ADD COLUMN IF NOT EXISTS "propuesta"   JSONB;
ALTER TABLE "RespuestaLead" ADD COLUMN IF NOT EXISTS "propuestaAt" TIMESTAMP(3);

UPDATE "RespuestaLead"
SET "cuerpo" = regexp_replace("cuerpo", '\n+\[\d{1,2}/\d{1,2}/\d{4},.*$', '')
WHERE "origen" = 'agente' AND "cuerpo" ~ '\n\[\d{1,2}/\d{1,2}/\d{4},';
