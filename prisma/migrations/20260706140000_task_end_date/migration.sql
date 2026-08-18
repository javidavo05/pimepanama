-- Task.endDate (contenido idéntico a supabase/migrations/0008_task_end_date.sql)

SET search_path TO public;

ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMPTZ;
