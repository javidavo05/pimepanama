-- 0033_project_tasks.sql
-- Tareas por proyecto, estilo Asana.
--
-- Una tarea puede pertenecer a un proyecto (Task.projectId) y, dentro de él, a
-- una sección (ProjectSection: "Por hacer", "Diseño", "Entrega"...). Las
-- subtareas son tareas con parentId. sortOrder ordena dentro de la sección.
--
-- Backfill: las tareas que ya existían heredan el proyecto de lo que las creó
-- — el documento (cotización/factura), la cuota de pago o el pendiente de una
-- reunión ligada a un proyecto.
--
-- Idempotente: se puede correr varias veces sin efecto.

CREATE TABLE IF NOT EXISTS "ProjectSection" (
  "id"        TEXT PRIMARY KEY,
  "projectId" TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "ProjectSection_projectId_sortOrder_idx"
  ON "ProjectSection" ("projectId", "sortOrder");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ProjectSection_projectId_fkey'
  ) THEN
    ALTER TABLE "ProjectSection"
      ADD CONSTRAINT "ProjectSection_projectId_fkey"
      FOREIGN KEY ("projectId") REFERENCES "Project"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "projectId" TEXT;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "sectionId" TEXT;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "parentId"  TEXT;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "Task_projectId_idx" ON "Task" ("projectId");
CREATE INDEX IF NOT EXISTS "Task_sectionId_idx" ON "Task" ("sectionId");
CREATE INDEX IF NOT EXISTS "Task_parentId_idx"  ON "Task" ("parentId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Task_projectId_fkey') THEN
    ALTER TABLE "Task"
      ADD CONSTRAINT "Task_projectId_fkey"
      FOREIGN KEY ("projectId") REFERENCES "Project"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Task_sectionId_fkey') THEN
    ALTER TABLE "Task"
      ADD CONSTRAINT "Task_sectionId_fkey"
      FOREIGN KEY ("sectionId") REFERENCES "ProjectSection"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Task_parentId_fkey') THEN
    ALTER TABLE "Task"
      ADD CONSTRAINT "Task_parentId_fkey"
      FOREIGN KEY ("parentId") REFERENCES "Task"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Backfill: proyecto del documento vinculado
UPDATE "Task" t
SET "projectId" = d."projectId"
FROM "Document" d
WHERE t."projectId" IS NULL
  AND t."documentId" = d."id"
  AND d."projectId" IS NOT NULL;

-- Backfill: proyecto de la factura dueña de la cuota
UPDATE "Task" t
SET "projectId" = d."projectId"
FROM "PaymentSchedule" ps
JOIN "Document" d ON d."id" = ps."documentId"
WHERE t."projectId" IS NULL
  AND t."paymentScheduleId" = ps."id"
  AND d."projectId" IS NOT NULL;

-- Backfill: proyecto de la reunión que originó el pendiente
UPDATE "Task" t
SET "projectId" = m."projectId"
FROM "MeetingActionItem" mai
JOIN "Meeting" m ON m."id" = mai."meetingId"
WHERE t."projectId" IS NULL
  AND mai."taskId" = t."id"
  AND m."projectId" IS NOT NULL;

UPDATE "Task" t
SET "projectId" = m."projectId"
FROM "Meeting" m
WHERE t."projectId" IS NULL
  AND m."nextMeetingTaskId" = t."id"
  AND m."projectId" IS NOT NULL;

-- RLS obligatorio: solo el servidor (Prisma / service role) lee y escribe.
ALTER TABLE "ProjectSection" ENABLE ROW LEVEL SECURITY;
