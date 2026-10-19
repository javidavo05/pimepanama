-- 0059 · DeviceToken.alcance: qué puede hacer cada llave de máquina. 'dispositivo' = PIME Guard (correo, reuniones,
-- credenciales); 'prospectos' = el agente de prospección en la nube, que solo puede cargar prospectos al CRM.
-- Idempotente.
ALTER TABLE "DeviceToken" ADD COLUMN IF NOT EXISTS "alcance" TEXT NOT NULL DEFAULT 'dispositivo';
ALTER TABLE "DeviceToken" DROP CONSTRAINT IF EXISTS "DeviceToken_alcance_check";
ALTER TABLE "DeviceToken" ADD CONSTRAINT "DeviceToken_alcance_check" CHECK ("alcance" IN ('dispositivo', 'prospectos'));
