-- Migration 0006: Módulo de Tareas (estilo Asana)
-- Tareas con fecha límite y responsable (texto libre), que se pueden vincular
-- opcionalmente a una Factura/Cotización (Document) o a una cuota de pago
-- (PaymentSchedule) para dar seguimiento a cuentas por cobrar.

SET search_path TO public;

DO $$ BEGIN
  CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "Task" (
  "id"                TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "userId"            TEXT NOT NULL,
  "title"             TEXT NOT NULL,
  "description"       TEXT,
  "assignee"          TEXT,
  "priority"          "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
  "dueDate"           TIMESTAMPTZ,
  "completed"         BOOLEAN NOT NULL DEFAULT false,
  "completedAt"       TIMESTAMPTZ,
  "reminderSent"      BOOLEAN NOT NULL DEFAULT false,
  "documentId"        TEXT,
  "paymentScheduleId" TEXT,
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "Task" ADD CONSTRAINT "Task_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "EmpresaUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Task" ADD CONSTRAINT "Task_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Task" ADD CONSTRAINT "Task_paymentScheduleId_fkey"
    FOREIGN KEY ("paymentScheduleId") REFERENCES "PaymentSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "Task_userId_completed_idx" ON "Task"("userId", "completed");
CREATE INDEX IF NOT EXISTS "Task_dueDate_idx" ON "Task"("dueDate");
CREATE INDEX IF NOT EXISTS "Task_documentId_idx" ON "Task"("documentId");
CREATE INDEX IF NOT EXISTS "Task_paymentScheduleId_idx" ON "Task"("paymentScheduleId");

ALTER TABLE "Task" ENABLE ROW LEVEL SECURITY;

-- MailNotification.link — deep-link genérico (ej. /empresa/tareas) para que la
-- campanita de notificaciones no dependa solo de emailId (Mail Hub).
ALTER TABLE "MailNotification" ADD COLUMN IF NOT EXISTS "link" TEXT;
