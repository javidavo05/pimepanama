-- 0054 · Un solo motor para los sistemas
-- Todo proyecto con repositorio o enlace es un sistema: Pime lo revisa una sola vez cada 30 min (salud del
-- enlace, GitHub, fases con marcador, Pulso) y guarda el resumen en el proyecto. Todas las pantallas leen de ahí.
-- Project.revision: resumen de la última revisión (estado, avisos, sugerencias, cifras). Project.revisadoAt: cuándo.
-- MonitoredSystem.origen: 'manual' (conectado a mano) | 'auto' (lo creó el motor desde el enlace del proyecto).
-- Idempotente. Las tablas ya tienen RLS (0038, 0039).

ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "revision"   JSONB;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "revisadoAt" TIMESTAMP(3);

ALTER TABLE "MonitoredSystem" ADD COLUMN IF NOT EXISTS "origen" TEXT NOT NULL DEFAULT 'manual';

CREATE INDEX IF NOT EXISTS "MonitoredSystem_projectId_idx" ON "MonitoredSystem" ("projectId");
