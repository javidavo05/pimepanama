-- 0061 · Enlaces para revisar el trabajo en el sistema del cliente.
-- ProjectPhase.reviewUrl: dónde revisa el cliente lo de esa fase (p. ej. el módulo de reservas del panel).
-- ActivityEvent.url: dónde quedó cada cambio (tarea cerrada en GitHub): sale de la línea «Dónde verlo:» del
-- issue o, si no la tiene, del enlace de revisión de su fase.
ALTER TABLE "ProjectPhase" ADD COLUMN IF NOT EXISTS "reviewUrl" TEXT;
ALTER TABLE "ActivityEvent" ADD COLUMN IF NOT EXISTS "url" TEXT;
