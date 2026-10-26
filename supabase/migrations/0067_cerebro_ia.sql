-- 0067 · Cerebro de IA de la plataforma (2026-10-26)
-- CompanyConfig.cerebroIa: qué proveedor usa toda la IA de Pime Suite ('openai' | 'claude').
-- Se elige en Jarvis (nodo «Asistente») y vale para todo el equipo y todos los dispositivos.
-- La transcripción de voz sigue en Whisper: Claude no transcribe audio.
-- Idempotente.

ALTER TABLE "CompanyConfig" ADD COLUMN IF NOT EXISTS "cerebroIa" TEXT NOT NULL DEFAULT 'openai';
