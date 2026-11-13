-- 0068 · Llave de OpenAI elegida (2026-11-13)
-- CompanyConfig.llaveOpenai: alias de la llave de OpenAI que usa toda la plataforma (p. ej. 'pime', 'bb').
-- Las llaves viven solo en variables del servidor OPENAI_API_KEY_<ALIAS>; aquí se guarda el alias, nunca la llave.
-- NULL = usar OPENAI_API_KEY. Se elige en Configuración.
-- Idempotente.

ALTER TABLE "CompanyConfig" ADD COLUMN IF NOT EXISTS "llaveOpenai" TEXT;
