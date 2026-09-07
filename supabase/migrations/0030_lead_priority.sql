-- 0030_lead_priority.sql
-- Prioridad del lead.
--
-- La bandeja de info@ acumuló solicitudes del formulario durante meses y no
-- había forma de ver de un vistazo cuál valía la pena atender primero: una
-- fábrica pidiendo un MES llave en mano y un bot rellenando el formulario se
-- veían igual en el tablero.
--
-- `priority` la propone la IA al clasificar la solicitud y se puede corregir a
-- mano. `priorityReason` guarda en una línea por qué quedó en ese nivel, para
-- que la decisión sea auditable y no un badge de color sin explicación.
--
-- Idempotente: se puede correr varias veces sin efecto.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LeadPriority') THEN
    CREATE TYPE "LeadPriority" AS ENUM ('BAJA', 'MEDIA', 'ALTA');
  END IF;
END $$;

ALTER TABLE "Lead"
    ADD COLUMN IF NOT EXISTS "priority" "LeadPriority" NOT NULL DEFAULT 'MEDIA';

ALTER TABLE "Lead"
    ADD COLUMN IF NOT EXISTS "priorityReason" TEXT;

-- El tablero ordena por prioridad dentro de cada columna de estado.
CREATE INDEX IF NOT EXISTS "Lead_userId_priority_idx"
  ON "Lead" ("userId", "priority");
