-- Migration 0010: Por pagar — gastos mensuales y libro contable

SET search_path TO public;

DO $$ BEGIN
  CREATE TYPE "ExpenseStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ExpenseCategory" AS ENUM (
    'HOSTING', 'SAAS', 'SALARIOS', 'SERVICIOS', 'MARKETING',
    'IMPUESTOS', 'COMISIONES', 'SOFTWARE', 'OTRO'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "Expense" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "userId"      TEXT NOT NULL,
  "title"       TEXT NOT NULL,
  "category"    "ExpenseCategory" NOT NULL DEFAULT 'OTRO',
  "amount"      DECIMAL(65,30) NOT NULL,
  "currency"    TEXT NOT NULL DEFAULT 'USD',
  "dueDate"     TIMESTAMPTZ,
  "paidAt"      TIMESTAMPTZ,
  "status"      "ExpenseStatus" NOT NULL DEFAULT 'PENDING',
  "isRecurring" BOOLEAN NOT NULL DEFAULT false,
  "vendor"      TEXT,
  "notes"       TEXT,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "Expense" ADD CONSTRAINT "Expense_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "EmpresaUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "Expense_userId_status_idx" ON "Expense"("userId", "status");
CREATE INDEX IF NOT EXISTS "Expense_userId_dueDate_idx" ON "Expense"("userId", "dueDate");

ALTER TABLE "Expense" ENABLE ROW LEVEL SECURITY;
