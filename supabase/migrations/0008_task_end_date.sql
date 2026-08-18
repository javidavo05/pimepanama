-- Migration 0008: Task.endDate
-- Permite definir un "desde–hasta" en tareas con hora, para poder gestionar
-- la duración del evento en la vista de calendario semana/día de /empresa/tareas.

SET search_path TO public;

ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMPTZ;
