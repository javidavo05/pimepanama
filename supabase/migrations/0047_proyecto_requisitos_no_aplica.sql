-- 0047 · «Qué le falta» al proyecto (2026-10-12). Requisitos del enlace que no aplican a un proyecto
-- (p. ej. uno interno sin cliente, o uno sin base de datos): se marcan «No aplica» y no cuentan en el
-- porcentaje. Guarda las claves de esos requisitos.
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "linkWaived" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
