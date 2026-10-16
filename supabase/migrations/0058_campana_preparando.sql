-- 0058 · Campana.estado acepta 'preparando' (mientras se arma la lista de destinatarios, para que dos clics no la
-- armen dos veces). Idempotente: se reemplaza el CHECK de 0057.
ALTER TABLE "Campana" DROP CONSTRAINT IF EXISTS "Campana_estado_check";
ALTER TABLE "Campana" ADD CONSTRAINT "Campana_estado_check" CHECK ("estado" IN ('borrador', 'preparando', 'enviando', 'enviada'));
