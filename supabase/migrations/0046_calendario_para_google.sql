-- 0046 · Pime en Google Calendar (2026-10-12). Al revés que la 0044: Google se suscribe a una dirección .ics de Pime
-- con las citas, tareas y vencimientos. El token es la llave de esa dirección; se cambia para revocarla.
-- (0045 la usa la rama feat/platforms-v2.)
ALTER TABLE "EmpresaUser" ADD COLUMN IF NOT EXISTS "calendarFeedToken" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "EmpresaUser_calendarFeedToken_key" ON "EmpresaUser"("calendarFeedToken");
