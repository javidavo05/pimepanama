-- 0043 · Asistente de Pime Suite (prompt maestro §4)
-- Cada acción que el asistente propone queda aquí: lo que pidió la persona, qué propuso, si se confirmó y qué
-- creó. Sirve de registro y para deshacer. El asistente nunca escribe sin una fila confirmada.
-- Idempotente. RLS activo y sin políticas.
CREATE TABLE IF NOT EXISTS "AssistantAction" (
  "id"          TEXT PRIMARY KEY,
  "userId"      TEXT NOT NULL REFERENCES "EmpresaUser"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "kind"        TEXT NOT NULL CHECK ("kind" IN ('factura', 'tarea', 'nota', 'pago')),
  "payload"     JSONB NOT NULL,
  "summary"     TEXT NOT NULL,
  "request"     TEXT,
  "status"      TEXT NOT NULL DEFAULT 'propuesta' CHECK ("status" IN ('propuesta', 'hecha', 'cancelada', 'deshecha', 'fallida')),
  "resultType"  TEXT,
  "resultId"    TEXT,
  "resultHref"  TEXT,
  "error"       TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decidedAt"   TIMESTAMP(3)
);
CREATE INDEX IF NOT EXISTS "AssistantAction_userId_createdAt_idx" ON "AssistantAction" ("userId", "createdAt" DESC);
ALTER TABLE "AssistantAction" ENABLE ROW LEVEL SECURITY;
