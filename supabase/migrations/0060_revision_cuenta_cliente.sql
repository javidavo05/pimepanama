-- 0060 · Revisión de la cuenta del cliente antes de mandarle sus credenciales.
-- El equipo abre la cuenta del cliente en modo solo lectura (vista de revisión) y confirma «Todo está en orden».
-- La invitación con el enlace de acceso solo sale si esa revisión es de las últimas 24 horas.
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "portalReviewedAt" TIMESTAMP(3);
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "portalReviewedBy" TEXT;
