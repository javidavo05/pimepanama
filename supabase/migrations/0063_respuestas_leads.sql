-- 0063 · Respuestas a leads por tandas (2026-10-21)
-- RespuestaLead: el correo (y el mensaje de LinkedIn) que el agente de prospección deja redactado para cada lead.
--   lote = la tanda en que llegó (una corrida del agente). Se revisa, se edita y se envía desde /empresa/leads.
--   estado: 'borrador' | 'enviada' | 'descartada' | 'fallo'.
--   adjuntarPdf: si el correo sale con la presentación en PDF hecha para ese lead.
-- Backfill: los borradores que ya vivían como texto en Lead.notes (etiqueta «agente») pasan a filas; si ya hay un
--   correo enviado a esa dirección, la respuesta queda como enviada.
-- Idempotente. RLS activo y sin políticas, como el resto.

CREATE TABLE IF NOT EXISTS "RespuestaLead" (
  "id"              TEXT PRIMARY KEY,
  "userId"          TEXT NOT NULL REFERENCES "EmpresaUser"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "leadId"          TEXT NOT NULL REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "lote"            TEXT NOT NULL,
  "origen"          TEXT NOT NULL DEFAULT 'agente',
  "idioma"          TEXT NOT NULL DEFAULT 'es',
  "para"            TEXT,
  "asunto"          TEXT NOT NULL DEFAULT '',
  "cuerpo"          TEXT NOT NULL DEFAULT '',
  "mensajeLinkedin" TEXT,
  "linkedinUrl"     TEXT,
  "adjuntarPdf"     BOOLEAN NOT NULL DEFAULT true,
  "estado"          TEXT NOT NULL DEFAULT 'borrador',
  "error"           TEXT,
  "enviadaAt"       TIMESTAMP(3),
  "correoId"        TEXT,
  "linkedinAt"      TIMESTAMP(3),
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RespuestaLead_estado_check') THEN
    ALTER TABLE "RespuestaLead" ADD CONSTRAINT "RespuestaLead_estado_check" CHECK ("estado" IN ('borrador', 'enviada', 'descartada', 'fallo'));
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "RespuestaLead_userId_lote_idx" ON "RespuestaLead" ("userId", "lote");
CREATE INDEX IF NOT EXISTS "RespuestaLead_leadId_idx" ON "RespuestaLead" ("leadId");
ALTER TABLE "RespuestaLead" ENABLE ROW LEVEL SECURITY;

-- En PostgreSQL «.» cruza saltos de línea: (.*) toma hasta el final de la nota.
INSERT INTO "RespuestaLead" ("id", "userId", "leadId", "lote", "origen", "idioma", "para", "asunto", "cuerpo", "mensajeLinkedin", "linkedinUrl", "estado", "enviadaAt", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  l."userId",
  l."id",
  'agente-' || to_char(l."createdAt", 'YYYYMMDDHH24'),
  'agente',
  CASE WHEN 'mercado:US' = ANY(l."etiquetas") THEN 'en' ELSE 'es' END,
  l."email",
  COALESCE(substring(l."notes" from 'Correo \(borrador, no enviado\):\nAsunto: ([^\n]*)'), ''),
  COALESCE(substring(l."notes" from 'Correo \(borrador, no enviado\):\nAsunto: [^\n]*\n\n(.*)$'), ''),
  substring(l."notes" from 'Mensaje para LinkedIn \(enviar a mano\):\n(.*?)(?:\n\nCorreo \(borrador|$)'),
  substring(l."notes" from '\nLinkedIn: (\S+)'),
  CASE WHEN s."id" IS NOT NULL THEN 'enviada' ELSE 'borrador' END,
  s."receivedAt",
  l."createdAt",
  CURRENT_TIMESTAMP
FROM "Lead" l
LEFT JOIN LATERAL (
  SELECT e."id", e."receivedAt" FROM "InboxEmail" e
  WHERE e."userId" = l."userId" AND e."folder" = 'SENT' AND l."email" IS NOT NULL
    AND lower(l."email") = ANY(SELECT lower(x) FROM unnest(e."toAddresses") x)
  ORDER BY e."receivedAt" ASC LIMIT 1
) s ON true
WHERE 'agente' = ANY(l."etiquetas")
  AND NOT EXISTS (SELECT 1 FROM "RespuestaLead" r WHERE r."leadId" = l."id" AND r."origen" = 'agente');
