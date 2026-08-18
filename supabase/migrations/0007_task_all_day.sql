-- Migration 0007: Task.allDay
-- Distingue tareas "todo el día" de tareas con hora específica, para la
-- vista de calendario semana/día (grid de horas) de /empresa/tareas.

SET search_path TO public;

ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "allDay" BOOLEAN NOT NULL DEFAULT true;
