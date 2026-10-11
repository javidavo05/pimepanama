-- 0044 · Google Calendar por dirección secreta iCal (solo lectura). Decisión del 2026-10-11 (pregunta 32).
-- La dirección da acceso a la agenda: se guarda cifrada (MAIL_ENCRYPTION_KEY) y nunca se devuelve.
ALTER TABLE "EmpresaUser" ADD COLUMN IF NOT EXISTS "calendarIcsEnc"     TEXT;
ALTER TABLE "EmpresaUser" ADD COLUMN IF NOT EXISTS "calendarCheckedAt"  TIMESTAMP(3);
ALTER TABLE "EmpresaUser" ADD COLUMN IF NOT EXISTS "calendarError"      TEXT;
