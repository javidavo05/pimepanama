-- 0056 · Equipo con datos compartidos, áreas y responsables (fase 0 del plan CRM, 2026-10-16)
-- EmpresaUser.ownerId: dueño de la empresa cuyos datos usa este miembro (null = es el dueño). Todos los datos
--   siguen colgando del userId del dueño; el miembro entra a esos mismos datos.
-- EmpresaUser.area: 'dueno' | 'ventas' | 'proyectos' | 'finanzas' (qué secciones ve). EmpresaUser.activo.
-- EmpresaInvite: invitación por correo; al entrar por primera vez con ese correo se crea su EmpresaUser.
-- Client.responsableId / Lead.responsableId: miembro del equipo a cargo.
-- Idempotente. RLS activo y sin políticas en la tabla nueva, como el resto.

ALTER TABLE "EmpresaUser" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;
ALTER TABLE "EmpresaUser" ADD COLUMN IF NOT EXISTS "area"    TEXT NOT NULL DEFAULT 'dueno';
ALTER TABLE "EmpresaUser" ADD COLUMN IF NOT EXISTS "activo"  BOOLEAN NOT NULL DEFAULT true;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EmpresaUser_ownerId_fkey') THEN
    ALTER TABLE "EmpresaUser" ADD CONSTRAINT "EmpresaUser_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "EmpresaUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EmpresaUser_area_check') THEN
    ALTER TABLE "EmpresaUser" ADD CONSTRAINT "EmpresaUser_area_check" CHECK ("area" IN ('dueno', 'ventas', 'proyectos', 'finanzas'));
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "EmpresaUser_ownerId_idx" ON "EmpresaUser" ("ownerId");

CREATE TABLE IF NOT EXISTS "EmpresaInvite" (
  "id"         TEXT PRIMARY KEY,
  "ownerId"    TEXT NOT NULL REFERENCES "EmpresaUser"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "email"      TEXT NOT NULL,
  "area"       TEXT NOT NULL DEFAULT 'ventas' CHECK ("area" IN ('dueno', 'ventas', 'proyectos', 'finanzas')),
  "fullName"   TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acceptedAt" TIMESTAMP(3),
  "revokedAt"  TIMESTAMP(3)
);
CREATE UNIQUE INDEX IF NOT EXISTS "EmpresaInvite_email_key" ON "EmpresaInvite" ("email");
ALTER TABLE "EmpresaInvite" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "responsableId" TEXT;
ALTER TABLE "Lead"   ADD COLUMN IF NOT EXISTS "responsableId" TEXT;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Client_responsableId_fkey') THEN
    ALTER TABLE "Client" ADD CONSTRAINT "Client_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "EmpresaUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Lead_responsableId_fkey') THEN
    ALTER TABLE "Lead" ADD CONSTRAINT "Lead_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "EmpresaUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "Client_responsableId_idx" ON "Client" ("responsableId");
CREATE INDEX IF NOT EXISTS "Lead_responsableId_idx" ON "Lead" ("responsableId");
