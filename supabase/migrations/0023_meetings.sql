-- 0023_meetings.sql
-- Módulo Reuniones (PimeMeet): graba una reunión, la transcribe, separa quién
-- habla, y genera minuta ejecutiva + minuta técnica + pendientes técnicos +
-- un prompt técnico listo para ejecutar. Todo queda ligado a un Project para
-- que el contexto de lo hablado se acumule reunión tras reunión.
--
-- Idempotente: se puede correr varias veces sin efecto.

-- ─── Enums ───────────────────────────────────────────────────────────────────

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MeetingStatus') THEN
        CREATE TYPE "MeetingStatus" AS ENUM (
            'DRAFT', 'RECORDING', 'TRANSCRIBED', 'PROCESSING', 'READY', 'FAILED'
        );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MeetingItemKind') THEN
        CREATE TYPE "MeetingItemKind" AS ENUM (
            'TECNICO', 'COMERCIAL', 'ADMINISTRATIVO', 'DECISION', 'RIESGO'
        );
    END IF;
END $$;

-- ─── Meeting ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Meeting" (
    "id"               TEXT NOT NULL,
    "userId"           TEXT NOT NULL,
    "projectId"        TEXT,
    "clientId"         TEXT,
    "bitacoraId"       TEXT,
    "title"            TEXT NOT NULL,
    "language"         TEXT NOT NULL DEFAULT 'es',
    "status"           "MeetingStatus" NOT NULL DEFAULT 'DRAFT',
    "meetingDate"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationMs"       INTEGER NOT NULL DEFAULT 0,
    -- [{ name, org: 'PIME'|'CLIENTE', role }] — asistentes esperados
    "attendees"        JSONB NOT NULL DEFAULT '[]',
    -- [{ start, end, text, speaker }] — segmentos de Whisper con timestamps
    "segments"         JSONB NOT NULL DEFAULT '[]',
    "transcript"       TEXT,
    "diarizedText"     TEXT,
    "executiveMinutes" JSONB,
    "technicalMinutes" JSONB,
    "technicalPrompt"  TEXT,
    "contextSummary"   TEXT,
    "audioKeys"        TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "aiCostUSD"        DOUBLE PRECISION NOT NULL DEFAULT 0,
    "errorMessage"     TEXT,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Meeting_userId_fkey') THEN
        ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "EmpresaUser"("id")
            ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Meeting_projectId_fkey') THEN
        ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_projectId_fkey"
            FOREIGN KEY ("projectId") REFERENCES "Project"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Meeting_clientId_fkey') THEN
        ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_clientId_fkey"
            FOREIGN KEY ("clientId") REFERENCES "Client"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Meeting_bitacoraId_fkey') THEN
        ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_bitacoraId_fkey"
            FOREIGN KEY ("bitacoraId") REFERENCES "Document"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Meeting_userId_idx"           ON "Meeting"("userId");
CREATE INDEX IF NOT EXISTS "Meeting_projectId_idx"        ON "Meeting"("projectId");
CREATE INDEX IF NOT EXISTS "Meeting_clientId_idx"         ON "Meeting"("clientId");
CREATE INDEX IF NOT EXISTS "Meeting_userId_meetingDate_idx" ON "Meeting"("userId", "meetingDate");

-- ─── MeetingSpeaker ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "MeetingSpeaker" (
    "id"           TEXT NOT NULL,
    "meetingId"    TEXT NOT NULL,
    -- Etiqueta cruda del diarizador ("Hablante 1")
    "label"        TEXT NOT NULL,
    -- Nombre resuelto contra la lista de asistentes (null si no se pudo)
    "name"         TEXT,
    -- PIME | CLIENTE | DESCONOCIDO
    "org"          TEXT NOT NULL DEFAULT 'DESCONOCIDO',
    "segmentCount" INTEGER NOT NULL DEFAULT 0,
    "talkMs"       INTEGER NOT NULL DEFAULT 0,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MeetingSpeaker_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MeetingSpeaker_meetingId_fkey') THEN
        ALTER TABLE "MeetingSpeaker" ADD CONSTRAINT "MeetingSpeaker_meetingId_fkey"
            FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "MeetingSpeaker_meetingId_idx" ON "MeetingSpeaker"("meetingId");

-- ─── MeetingActionItem ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "MeetingActionItem" (
    "id"            TEXT NOT NULL,
    "meetingId"     TEXT NOT NULL,
    "title"         TEXT NOT NULL,
    "detail"        TEXT,
    "kind"          "MeetingItemKind" NOT NULL DEFAULT 'TECNICO',
    "owner"         TEXT,
    "dueDate"       TIMESTAMP(3),
    "priority"      "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    -- Criterios de aceptación — alimentan el prompt técnico
    "acceptance"    TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    -- Módulos/archivos/pantallas que toca según lo hablado
    "touchpoints"   TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "estimateHours" DOUBLE PRECISION,
    "sortOrder"     INTEGER NOT NULL DEFAULT 0,
    -- Se llenan cuando el pendiente se materializa en el módulo de Tareas
    "taskId"        TEXT,
    "deliverableId" TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MeetingActionItem_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MeetingActionItem_meetingId_fkey') THEN
        ALTER TABLE "MeetingActionItem" ADD CONSTRAINT "MeetingActionItem_meetingId_fkey"
            FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MeetingActionItem_taskId_fkey') THEN
        ALTER TABLE "MeetingActionItem" ADD CONSTRAINT "MeetingActionItem_taskId_fkey"
            FOREIGN KEY ("taskId") REFERENCES "Task"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MeetingActionItem_deliverableId_fkey') THEN
        ALTER TABLE "MeetingActionItem" ADD CONSTRAINT "MeetingActionItem_deliverableId_fkey"
            FOREIGN KEY ("deliverableId") REFERENCES "Deliverable"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "MeetingActionItem_meetingId_idx"  ON "MeetingActionItem"("meetingId");
CREATE INDEX IF NOT EXISTS "MeetingActionItem_meetingId_sortOrder_idx" ON "MeetingActionItem"("meetingId", "sortOrder");
CREATE INDEX IF NOT EXISTS "MeetingActionItem_taskId_idx"     ON "MeetingActionItem"("taskId");

-- ─── RLS (obligatorio; sin políticas para anon/authenticated) ────────────────

ALTER TABLE "Meeting"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MeetingSpeaker"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MeetingActionItem" ENABLE ROW LEVEL SECURITY;
