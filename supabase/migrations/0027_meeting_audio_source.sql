-- 0027_meeting_audio_source.sql
-- De dónde salió el audio de una reunión.
--
-- No es una etiqueta decorativa: cambia cómo se analiza. Una llamada telefónica
-- son dos personas turnándose sin verse; una reunión presencial son varias voces
-- en una sala con ruido de fondo y solapamientos; una nota de voz es una sola
-- persona hablando sola. La diarización acierta mucho más sabiendo cuál de las
-- tres está escuchando, y la minuta no redacta "los asistentes acordaron" sobre
-- un audio en el que solo habla una persona.
--
-- VIDEOLLAMADA | LLAMADA | PRESENCIAL | NOTA_VOZ | OTRO
--
-- Idempotente: se puede correr varias veces sin efecto.

ALTER TABLE "Meeting" ADD COLUMN IF NOT EXISTS "audioSource" TEXT;
