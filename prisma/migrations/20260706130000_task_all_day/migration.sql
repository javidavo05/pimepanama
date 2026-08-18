-- Task.allDay (contenido idéntico a supabase/migrations/0007_task_all_day.sql)

SET search_path TO public;

ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "allDay" BOOLEAN NOT NULL DEFAULT true;
