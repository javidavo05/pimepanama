-- Migration 0017: PimeBook — agenda de citas in-house

SET search_path TO public;

DO $$ BEGIN
  CREATE TYPE "BookingStatus" AS ENUM ('CONFIRMED', 'CANCELLED', 'RESCHEDULED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "BookingSource" AS ENUM ('PUBLIC', 'EMPRESA', 'LEAD_LINK');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "BookingEventType" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "userId"      TEXT NOT NULL,
  "slug"        TEXT NOT NULL,
  "title"       TEXT NOT NULL,
  "durationMin" INTEGER NOT NULL DEFAULT 30,
  "bufferMin"   INTEGER NOT NULL DEFAULT 10,
  "description" TEXT,
  "active"      BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "BookingEventType_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "BookingEventType" ADD CONSTRAINT "BookingEventType_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "EmpresaUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "BookingEventType_userId_slug_key"
  ON "BookingEventType"("userId", "slug");

CREATE INDEX IF NOT EXISTS "BookingEventType_userId_idx"
  ON "BookingEventType"("userId");

CREATE TABLE IF NOT EXISTS "BookingAvailability" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "userId"    TEXT NOT NULL,
  "weekday"   INTEGER NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime"   TEXT NOT NULL,
  "timezone"  TEXT NOT NULL DEFAULT 'America/Panama',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "BookingAvailability_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "BookingAvailability" ADD CONSTRAINT "BookingAvailability_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "EmpresaUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "BookingAvailability_userId_idx"
  ON "BookingAvailability"("userId");

CREATE TABLE IF NOT EXISTS "Booking" (
  "id"            TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "userId"        TEXT NOT NULL,
  "eventTypeId"   TEXT NOT NULL,
  "leadId"        TEXT,
  "attendeeName"  TEXT NOT NULL,
  "attendeeEmail" TEXT NOT NULL,
  "attendeePhone" TEXT,
  "startTime"     TIMESTAMPTZ NOT NULL,
  "endTime"       TIMESTAMPTZ NOT NULL,
  "status"        "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
  "notes"         TEXT,
  "meetingUrl"    TEXT,
  "source"        "BookingSource" NOT NULL DEFAULT 'PUBLIC',
  "taskId"        TEXT,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "EmpresaUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Booking" ADD CONSTRAINT "Booking_eventTypeId_fkey"
    FOREIGN KEY ("eventTypeId") REFERENCES "BookingEventType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Booking" ADD CONSTRAINT "Booking_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Booking" ADD CONSTRAINT "Booking_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "Booking_userId_startTime_key"
  ON "Booking"("userId", "startTime");

CREATE INDEX IF NOT EXISTS "Booking_userId_idx" ON "Booking"("userId");
CREATE INDEX IF NOT EXISTS "Booking_leadId_idx" ON "Booking"("leadId");

ALTER TABLE "CompanyConfig" ADD COLUMN IF NOT EXISTS "bookingAutoLead" BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE "CompanyConfig" ADD COLUMN IF NOT EXISTS "signingMailAccountId" TEXT;

ALTER TABLE "BookingEventType" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BookingAvailability" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Booking" ENABLE ROW LEVEL SECURITY;
