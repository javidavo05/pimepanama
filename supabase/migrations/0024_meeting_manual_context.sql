-- 0024_meeting_manual_context.sql
-- Contexto manual de una reunión: notas que el usuario escribe DESPUÉS de grabar
-- (de qué iba la reunión, quién es quién, siglas, acuerdos previos) y que entran
-- al prompt junto con el contexto acumulado del proyecto.
--
-- Permite grabar primero y decidir después a qué proyecto pertenece la reunión
-- y con qué contexto se analiza, en vez de tener que saberlo antes de empezar.

ALTER TABLE "Meeting" ADD COLUMN IF NOT EXISTS "manualContext" TEXT;
