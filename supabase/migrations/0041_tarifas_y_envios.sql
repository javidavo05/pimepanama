-- 0041 · Tarifas por línea y envíos a clientes apagados
-- Decisión del 2026-10-11: Normal $40 la hora, Premium $30 la hora (la línea de cada cliente se pone a mano).
-- Ninguna comunicación automática a clientes hasta que se encienda desde Configuración.
-- Idempotente.

ALTER TABLE "CompanyConfig" ALTER COLUMN "hourlyRateNormal"  SET DEFAULT 40;
ALTER TABLE "CompanyConfig" ALTER COLUMN "hourlyRatePremium" SET DEFAULT 30;
-- Solo cambia las tarifas que seguían en los valores del plan anterior (30/20); una tarifa puesta a mano no se pisa.
UPDATE "CompanyConfig" SET "hourlyRateNormal" = 40 WHERE "hourlyRateNormal" = 30;
UPDATE "CompanyConfig" SET "hourlyRatePremium" = 30 WHERE "hourlyRatePremium" = 20;

ALTER TABLE "CompanyConfig" ADD COLUMN IF NOT EXISTS "clientEmailsEnabled" BOOLEAN NOT NULL DEFAULT false;
