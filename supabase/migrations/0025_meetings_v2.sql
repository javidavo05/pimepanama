-- 0025_meetings_v2.sql
-- Segunda vuelta del módulo Reuniones (PimeMeet):
--
-- 1. Los segmentos dejan de vivir en un JSONB de Meeting y pasan a tabla propia.
--    Grabando, cada tramo de 8 s hacía read-modify-write del JSON completo: en
--    una reunión de dos horas eso son ~900 escrituras de un documento que crece
--    hasta medio mega. Con tabla, cada tramo es un INSERT de sus propias filas.
-- 2. `audioChunks` guarda dónde empieza cada tramo de audio dentro de la reunión,
--    que es lo que permite reproducirla y saltar al minuto de un turno. Hasta
--    ahora el audio se archivaba en R2 sin forma de escucharlo.
-- 3. `chapters` guarda el índice de temas con timestamps.
-- 4. `minutesSentAt` / `nextMeetingTaskId` cierran la reunión hacia afuera:
--    minuta enviada al cliente y próxima reunión agendada como tarea.
--
-- Idempotente: se puede correr varias veces sin efecto.

-- ─── Segmentos en tabla ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "MeetingSegment" (
    "id"        TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    -- ms desde el inicio de la reunión (absolutos, no relativos al tramo)
    "startMs"   INTEGER NOT NULL,
    "endMs"     INTEGER NOT NULL,
    "text"      TEXT NOT NULL,
    -- Hablante resuelto: por canal de audio, a mano, o por la diarización
    "speaker"   TEXT,
    -- LOCAL | REMOTE — ausente en grabaciones de un solo canal mezclado
    "channel"   TEXT,
    -- true cuando el hablante viene del canal o de una persona: la IA no lo toca
    "locked"    BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MeetingSegment_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MeetingSegment_meetingId_fkey') THEN
        ALTER TABLE "MeetingSegment" ADD CONSTRAINT "MeetingSegment_meetingId_fkey"
            FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- La lectura siempre es "todos los segmentos de una reunión en orden".
CREATE INDEX IF NOT EXISTS "MeetingSegment_meetingId_startMs_idx"
    ON "MeetingSegment"("meetingId", "startMs");

-- ─── Columnas nuevas de Meeting ──────────────────────────────────────────────

-- [{ key, channel, index, offsetMs, durationMs, mime }] — dónde cae cada tramo
-- de audio dentro de la reunión, para el reproductor.
ALTER TABLE "Meeting" ADD COLUMN IF NOT EXISTS "audioChunks" JSONB NOT NULL DEFAULT '[]';
-- [{ startMs, title, summary }] — índice de temas de la reunión.
ALTER TABLE "Meeting" ADD COLUMN IF NOT EXISTS "chapters" JSONB;
ALTER TABLE "Meeting" ADD COLUMN IF NOT EXISTS "minutesSentAt" TIMESTAMP(3);
ALTER TABLE "Meeting" ADD COLUMN IF NOT EXISTS "nextMeetingTaskId" TEXT;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Meeting_nextMeetingTaskId_fkey') THEN
        ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_nextMeetingTaskId_fkey"
            FOREIGN KEY ("nextMeetingTaskId") REFERENCES "Task"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- El buscador filtra por título y por lo que se dijo; sin índice, cada búsqueda
-- es un scan de transcripciones completas.
CREATE INDEX IF NOT EXISTS "Meeting_userId_status_idx" ON "Meeting"("userId", "status");

-- ─── Backfill: JSONB de Meeting.segments → MeetingSegment ────────────────────
-- Solo corre si la tabla está vacía para esa reunión, así repetir la migración
-- no duplica segmentos.

INSERT INTO "MeetingSegment" ("id", "meetingId", "startMs", "endMs", "text", "speaker", "channel", "locked")
SELECT
    md5(m."id" || ':' || ord::text)::uuid::text,
    m."id",
    COALESCE((seg->>'start')::numeric, 0)::int,
    COALESCE((seg->>'end')::numeric, 0)::int,
    COALESCE(seg->>'text', ''),
    NULLIF(seg->>'speaker', ''),
    CASE WHEN seg->>'channel' IN ('LOCAL', 'REMOTE') THEN seg->>'channel' ELSE NULL END,
    COALESCE((seg->>'locked')::boolean, false)
FROM "Meeting" m
CROSS JOIN LATERAL jsonb_array_elements(m."segments") WITH ORDINALITY AS t(seg, ord)
WHERE jsonb_typeof(m."segments") = 'array'
  AND COALESCE(seg->>'text', '') <> ''
  AND NOT EXISTS (SELECT 1 FROM "MeetingSegment" s WHERE s."meetingId" = m."id");

-- `Meeting.segments` queda como respaldo del backfill. Ya no se lee ni se
-- escribe; se elimina en una migración posterior cuando el histórico esté
-- verificado en producción.

-- ─── RLS (obligatorio; sin políticas para anon/authenticated) ────────────────

ALTER TABLE "MeetingSegment" ENABLE ROW LEVEL SECURITY;
