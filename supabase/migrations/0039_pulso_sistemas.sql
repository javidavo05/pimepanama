-- 0039 · Pulso de los sistemas entregados
-- Cada sistema que Pime construye y mantiene reporta a Pime: errores y despliegues firmados con HMAC
-- (POST /api/pulso) y, si tiene dirección de salud, Pime lo sondea cada 30 min (junto al cron mail-watch).
-- El secreto de cada sistema NO se guarda: se deriva de PIME_PULSO_SECRET + key + secretVersion.
-- Idempotente. RLS activo y sin políticas (solo el servidor con Prisma).

CREATE TABLE IF NOT EXISTS "MonitoredSystem" (
  "id"               TEXT PRIMARY KEY,
  "userId"           TEXT NOT NULL REFERENCES "EmpresaUser"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "clientId"         TEXT NOT NULL REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "projectId"        TEXT REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "key"              TEXT NOT NULL,
  "name"             TEXT NOT NULL,
  "url"              TEXT,
  "healthUrl"        TEXT,
  "status"           TEXT NOT NULL DEFAULT 'sin_senal' CHECK ("status" IN ('sin_senal', 'ok', 'degradado', 'caido')),
  "statusDetail"     TEXT,
  "statusChangedAt"  TIMESTAMP(3),
  "failCount"        INTEGER NOT NULL DEFAULT 0,
  "lastSeenAt"       TIMESTAMP(3),
  "lastProbeAt"      TIMESTAMP(3),
  "lastLatencyMs"    INTEGER,
  "lastEventAt"      TIMESTAMP(3),
  "appVersion"       TEXT,
  "secretVersion"    INTEGER NOT NULL DEFAULT 1,
  "alertedStatus"    TEXT,
  "portalVisible"    BOOLEAN NOT NULL DEFAULT true,
  "active"           BOOLEAN NOT NULL DEFAULT true,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "MonitoredSystem_key_key" ON "MonitoredSystem" ("key");
CREATE INDEX IF NOT EXISTS "MonitoredSystem_clientId_idx" ON "MonitoredSystem" ("clientId");
CREATE INDEX IF NOT EXISTS "MonitoredSystem_userId_active_idx" ON "MonitoredSystem" ("userId", "active");

-- Errores agrupados por huella: una fila por problema, con cuántas veces pasó.
CREATE TABLE IF NOT EXISTS "SystemIncident" (
  "id"           TEXT PRIMARY KEY,
  "systemId"     TEXT NOT NULL REFERENCES "MonitoredSystem"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "fingerprint"  TEXT NOT NULL,
  "severity"     TEXT NOT NULL DEFAULT 'error' CHECK ("severity" IN ('aviso', 'error', 'grave')),
  "title"        TEXT NOT NULL,
  "detail"       TEXT,
  "count"        INTEGER NOT NULL DEFAULT 1,
  "firstSeenAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt"   TIMESTAMP(3),
  "notifiedAt"   TIMESTAMP(3)
);
CREATE UNIQUE INDEX IF NOT EXISTS "SystemIncident_systemId_fingerprint_key" ON "SystemIncident" ("systemId", "fingerprint");
CREATE INDEX IF NOT EXISTS "SystemIncident_systemId_lastSeenAt_idx" ON "SystemIncident" ("systemId", "lastSeenAt" DESC);

-- Anti-repetición: cada evento firmado trae un id único; se guarda 1 día.
CREATE TABLE IF NOT EXISTS "PulseEventId" (
  "systemId"   TEXT NOT NULL REFERENCES "MonitoredSystem"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "eventId"    TEXT NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("systemId", "eventId")
);
CREATE INDEX IF NOT EXISTS "PulseEventId_receivedAt_idx" ON "PulseEventId" ("receivedAt");

ALTER TABLE "MonitoredSystem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SystemIncident"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PulseEventId"    ENABLE ROW LEVEL SECURITY;
