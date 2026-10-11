-- 0038_portal_clientes.sql
-- Pime Clientes: cuenta para cada cliente, tickets con imágenes, fases con avance,
-- órdenes de cambio, horas de soporte, pagos uno por uno, aprobaciones inmutables y
-- la línea de tiempo del cliente.
--
-- Decisiones (artifact «Plan Pime Clientes», 2026-10-11):
--   - Tarifa por hora: $30 línea Normal, $20 línea Premium (editables en CompanyConfig;
--     un cliente puede tener su propia tarifa en Client.hourlyRate).
--   - Redondeo: bloques de 15 minutos con mínimo de 30 por registro.
--   - El cliente aprueba el estimado solo si pasa de 2 horas.
--   - Fallas nuestras dentro de 90 días de garantía no se cobran.
--   - Los estados son TEXT con CHECK (no enums) para poder agregar valores sin migrar tipos.
--
-- Todas las tablas cuelgan de "userId" (EmpresaUser), igual que el resto de /empresa.
-- RLS activado y sin políticas: solo el servidor (Prisma / service role) lee y escribe.
-- Idempotente: se puede correr varias veces sin efecto.

-- ─── Ajustes de la empresa ──────────────────────────────────────────────────────
ALTER TABLE "CompanyConfig" ADD COLUMN IF NOT EXISTS "hourlyRateNormal"      NUMERIC(10,2) NOT NULL DEFAULT 30;
ALTER TABLE "CompanyConfig" ADD COLUMN IF NOT EXISTS "hourlyRatePremium"     NUMERIC(10,2) NOT NULL DEFAULT 20;
ALTER TABLE "CompanyConfig" ADD COLUMN IF NOT EXISTS "timeRoundingMinutes"   INTEGER NOT NULL DEFAULT 15;
ALTER TABLE "CompanyConfig" ADD COLUMN IF NOT EXISTS "timeMinimumMinutes"    INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "CompanyConfig" ADD COLUMN IF NOT EXISTS "estimateApprovalHours" NUMERIC(6,2) NOT NULL DEFAULT 2;
ALTER TABLE "CompanyConfig" ADD COLUMN IF NOT EXISTS "warrantyDays"          INTEGER NOT NULL DEFAULT 90;

-- ─── Cliente: línea de marca, tarifa propia y acceso al portal ──────────────────
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "brandLine"     TEXT NOT NULL DEFAULT 'normal';
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "hourlyRate"    NUMERIC(10,2);
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "portalEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "archivedAt"    TIMESTAMP(3);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Client_brandLine_check') THEN
    ALTER TABLE "Client" ADD CONSTRAINT "Client_brandLine_check" CHECK ("brandLine" IN ('normal', 'premium'));
  END IF;
END $$;

-- ─── Proyecto: tipo y si el cliente lo ve en su cuenta ──────────────────────────
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "kind"          TEXT NOT NULL DEFAULT 'nuevo';
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "portalVisible" BOOLEAN NOT NULL DEFAULT true;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Project_kind_check') THEN
    ALTER TABLE "Project" ADD CONSTRAINT "Project_kind_check" CHECK ("kind" IN ('nuevo', 'modificacion', 'soporte'));
  END IF;
END $$;

-- ─── Personas del cliente con acceso a su cuenta ────────────────────────────────
-- Nunca se convierten en EmpresaUser: el acceso del equipo y el de clientes van separados.
CREATE TABLE IF NOT EXISTS "ClientUser" (
  "id"           TEXT PRIMARY KEY,
  "userId"       TEXT NOT NULL REFERENCES "EmpresaUser"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "clientId"     TEXT NOT NULL REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "email"        TEXT NOT NULL,
  "fullName"     TEXT,
  "role"         TEXT NOT NULL DEFAULT 'principal' CHECK ("role" IN ('principal', 'miembro')),
  "status"       TEXT NOT NULL DEFAULT 'invitado' CHECK ("status" IN ('invitado', 'activo', 'revocado')),
  "supabaseUid"  TEXT,
  "invitedAt"    TIMESTAMP(3),
  "activatedAt"  TIMESTAMP(3),
  "lastLoginAt"  TIMESTAMP(3),
  "revokedAt"    TIMESTAMP(3),
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "ClientUser_supabaseUid_key" ON "ClientUser" ("supabaseUid");
CREATE UNIQUE INDEX IF NOT EXISTS "ClientUser_clientId_email_key" ON "ClientUser" ("clientId", lower("email"));
CREATE INDEX IF NOT EXISTS "ClientUser_email_idx" ON "ClientUser" (lower("email"));
CREATE INDEX IF NOT EXISTS "ClientUser_userId_idx" ON "ClientUser" ("userId");

-- Invitación de un solo uso: se guarda solo el SHA-256 del token; vence a los 7 días.
CREATE TABLE IF NOT EXISTS "ClientInvitation" (
  "id"                     TEXT PRIMARY KEY,
  "clientUserId"           TEXT NOT NULL REFERENCES "ClientUser"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "tokenHash"              TEXT NOT NULL,
  "expiresAt"              TIMESTAMP(3) NOT NULL,
  "usedAt"                 TIMESTAMP(3),
  "createdByEmpresaUserId" TEXT REFERENCES "EmpresaUser"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "createdAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "ClientInvitation_tokenHash_key" ON "ClientInvitation" ("tokenHash");
CREATE INDEX IF NOT EXISTS "ClientInvitation_clientUserId_idx" ON "ClientInvitation" ("clientUserId");

-- ─── Órdenes de cambio (antes que fases, porque una fase puede salir de una) ────
CREATE SEQUENCE IF NOT EXISTS "change_order_number_seq";
CREATE TABLE IF NOT EXISTS "ChangeOrder" (
  "id"                    TEXT PRIMARY KEY,
  "userId"                TEXT NOT NULL REFERENCES "EmpresaUser"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "projectId"             TEXT NOT NULL REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "clientId"              TEXT NOT NULL REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "ticketId"              TEXT,
  "number"                TEXT NOT NULL DEFAULT ('OC-' || lpad(nextval('change_order_number_seq')::text, 4, '0')),
  "title"                 TEXT NOT NULL,
  "description"           TEXT,
  "status"                TEXT NOT NULL DEFAULT 'borrador' CHECK ("status" IN ('borrador', 'enviada', 'aprobada', 'rechazada', 'cancelada')),
  "total"                 NUMERIC(12,2) NOT NULL DEFAULT 0,
  "sentAt"                TIMESTAMP(3),
  "decidedAt"             TIMESTAMP(3),
  "decidedByClientUserId" TEXT REFERENCES "ClientUser"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "decisionComment"       TEXT,
  "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "ChangeOrder_number_key" ON "ChangeOrder" ("number");
CREATE INDEX IF NOT EXISTS "ChangeOrder_projectId_idx" ON "ChangeOrder" ("projectId");
CREATE INDEX IF NOT EXISTS "ChangeOrder_clientId_status_idx" ON "ChangeOrder" ("clientId", "status");

-- ─── Fases del proyecto: una sola fuente para propuesta, cotización, avance y cobro ─
CREATE TABLE IF NOT EXISTS "ProjectPhase" (
  "id"              TEXT PRIMARY KEY,
  "projectId"       TEXT NOT NULL REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "changeOrderId"   TEXT REFERENCES "ChangeOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "sortOrder"       INTEGER NOT NULL DEFAULT 0,
  "name"            TEXT NOT NULL,
  "description"     TEXT,
  "price"           NUMERIC(12,2) NOT NULL DEFAULT 0,
  "billingPoint"    TEXT NOT NULL DEFAULT 'al_entregar' CHECK ("billingPoint" IN ('al_aprobar', 'al_iniciar', 'al_entregar', 'sin_cobro')),
  "status"          TEXT NOT NULL DEFAULT 'pendiente' CHECK ("status" IN ('pendiente', 'en_curso', 'en_revision', 'hecha')),
  "progress"        NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK ("progress" >= 0 AND "progress" <= 100),
  "progressSource"  TEXT NOT NULL DEFAULT 'manual' CHECK ("progressSource" IN ('manual', 'github')),
  "githubMilestone" INTEGER,
  "estimatedDays"   INTEGER,
  "startedAt"       TIMESTAMP(3),
  "completedAt"     TIMESTAMP(3),
  "invoiceId"       TEXT REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "ProjectPhase_projectId_sortOrder_idx" ON "ProjectPhase" ("projectId", "sortOrder");
CREATE INDEX IF NOT EXISTS "ProjectPhase_changeOrderId_idx" ON "ProjectPhase" ("changeOrderId");

-- ─── Tickets ────────────────────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS "ticket_number_seq";
CREATE TABLE IF NOT EXISTS "Ticket" (
  "id"                    TEXT PRIMARY KEY,
  "userId"                TEXT NOT NULL REFERENCES "EmpresaUser"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "clientId"              TEXT NOT NULL REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "projectId"             TEXT REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "number"                TEXT NOT NULL DEFAULT ('TK-' || lpad(nextval('ticket_number_seq')::text, 4, '0')),
  "kind"                  TEXT NOT NULL DEFAULT 'soporte' CHECK ("kind" IN ('soporte', 'cambio', 'nuevo', 'incidente')),
  "title"                 TEXT NOT NULL,
  "status"                TEXT NOT NULL DEFAULT 'abierto' CHECK ("status" IN ('abierto', 'en_revision', 'esperando_cliente', 'en_progreso', 'resuelto', 'cerrado')),
  "priority"              TEXT NOT NULL DEFAULT 'normal' CHECK ("priority" IN ('baja', 'normal', 'alta', 'urgente')),
  "source"                TEXT NOT NULL DEFAULT 'portal' CHECK ("source" IN ('portal', 'empresa', 'sistema')),
  "openedByClientUserId"  TEXT REFERENCES "ClientUser"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "openedByEmpresaUserId" TEXT REFERENCES "EmpresaUser"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "estimatedMinutes"      INTEGER CHECK ("estimatedMinutes" IS NULL OR "estimatedMinutes" > 0),
  "estimateStatus"        TEXT NOT NULL DEFAULT 'no_requiere' CHECK ("estimateStatus" IN ('no_requiere', 'pendiente', 'aprobado', 'rechazado')),
  "isWarranty"            BOOLEAN NOT NULL DEFAULT false,
  "lastClientActivityAt"  TIMESTAMP(3),
  "lastPimeActivityAt"    TIMESTAMP(3),
  "resolvedAt"            TIMESTAMP(3),
  "closedAt"              TIMESTAMP(3),
  "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "Ticket_number_key" ON "Ticket" ("number");
CREATE INDEX IF NOT EXISTS "Ticket_userId_status_idx" ON "Ticket" ("userId", "status");
CREATE INDEX IF NOT EXISTS "Ticket_clientId_createdAt_idx" ON "Ticket" ("clientId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Ticket_projectId_idx" ON "Ticket" ("projectId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ChangeOrder_ticketId_fkey') THEN
    ALTER TABLE "ChangeOrder" ADD CONSTRAINT "ChangeOrder_ticketId_fkey"
      FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "TicketMessage" (
  "id"            TEXT PRIMARY KEY,
  "ticketId"      TEXT NOT NULL REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "authorType"    TEXT NOT NULL CHECK ("authorType" IN ('cliente', 'pime', 'sistema')),
  "clientUserId"  TEXT REFERENCES "ClientUser"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "empresaUserId" TEXT REFERENCES "EmpresaUser"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "body"          TEXT NOT NULL,
  -- Nota interna del equipo: nunca se muestra en la cuenta del cliente.
  "internal"      BOOLEAN NOT NULL DEFAULT false,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "TicketMessage_ticketId_createdAt_idx" ON "TicketMessage" ("ticketId", "createdAt");

CREATE TABLE IF NOT EXISTS "TicketAttachment" (
  "id"                      TEXT PRIMARY KEY,
  "ticketId"                TEXT NOT NULL REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "messageId"               TEXT REFERENCES "TicketMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "r2Key"                   TEXT NOT NULL,
  "fileName"                TEXT NOT NULL,
  "contentType"             TEXT NOT NULL,
  "sizeBytes"               INTEGER NOT NULL CHECK ("sizeBytes" > 0),
  "uploadedByClientUserId"  TEXT REFERENCES "ClientUser"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "uploadedByEmpresaUserId" TEXT REFERENCES "EmpresaUser"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "createdAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "TicketAttachment_ticketId_idx" ON "TicketAttachment" ("ticketId");

-- ─── Horas trabajadas ──────────────────────────────────────────────────────────
-- minutes = lo trabajado; billedMinutes = lo que se cobra después de redondear;
-- amount = billedMinutes / 60 × rate (0 si no es facturable o es garantía).
CREATE TABLE IF NOT EXISTS "TimeEntry" (
  "id"            TEXT PRIMARY KEY,
  "userId"        TEXT NOT NULL REFERENCES "EmpresaUser"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "clientId"      TEXT NOT NULL REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "ticketId"      TEXT REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "projectId"     TEXT REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "empresaUserId" TEXT REFERENCES "EmpresaUser"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "workDate"      DATE NOT NULL DEFAULT CURRENT_DATE,
  "minutes"       INTEGER NOT NULL CHECK ("minutes" > 0),
  "billedMinutes" INTEGER NOT NULL CHECK ("billedMinutes" >= 0),
  "rate"          NUMERIC(10,2) NOT NULL,
  "amount"        NUMERIC(12,2) NOT NULL,
  "billable"      BOOLEAN NOT NULL DEFAULT true,
  "note"          TEXT,
  "invoiceId"     TEXT REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "TimeEntry_clientId_workDate_idx" ON "TimeEntry" ("clientId", "workDate");
CREATE INDEX IF NOT EXISTS "TimeEntry_ticketId_idx" ON "TimeEntry" ("ticketId");
CREATE INDEX IF NOT EXISTS "TimeEntry_invoiceId_idx" ON "TimeEntry" ("invoiceId");
CREATE INDEX IF NOT EXISTS "TimeEntry_unbilled_idx" ON "TimeEntry" ("userId", "clientId") WHERE "invoiceId" IS NULL AND "billable";

-- ─── Pagos: uno por fila, con fecha, método, referencia y comprobante ───────────
-- Document.amountPaid queda como suma en caché de los pagos confirmados de esa factura.
CREATE TABLE IF NOT EXISTS "Payment" (
  "id"                      TEXT PRIMARY KEY,
  "userId"                  TEXT NOT NULL REFERENCES "EmpresaUser"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "clientId"                TEXT REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "documentId"              TEXT REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "amount"                  NUMERIC(12,2) NOT NULL CHECK ("amount" > 0),
  "paidAt"                  DATE NOT NULL DEFAULT CURRENT_DATE,
  "method"                  TEXT NOT NULL DEFAULT 'transferencia' CHECK ("method" IN ('transferencia', 'yappy', 'tarjeta', 'efectivo', 'cheque', 'otro')),
  "reference"               TEXT,
  "receiptR2Key"            TEXT,
  -- por_confirmar: lo reportó el cliente con su comprobante y falta que Pime lo confirme.
  "status"                  TEXT NOT NULL DEFAULT 'confirmado' CHECK ("status" IN ('confirmado', 'por_confirmar', 'rechazado')),
  "note"                    TEXT,
  "reportedByClientUserId"  TEXT REFERENCES "ClientUser"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "recordedByEmpresaUserId" TEXT REFERENCES "EmpresaUser"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "confirmedAt"             TIMESTAMP(3),
  "createdAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Payment_documentId_idx" ON "Payment" ("documentId");
CREATE INDEX IF NOT EXISTS "Payment_clientId_paidAt_idx" ON "Payment" ("clientId", "paidAt" DESC);
CREATE INDEX IF NOT EXISTS "Payment_userId_status_idx" ON "Payment" ("userId", "status");

-- ─── Aprobaciones del cliente: se agregan, nunca se editan ni se borran ─────────
CREATE TABLE IF NOT EXISTS "Approval" (
  "id"           TEXT PRIMARY KEY,
  "userId"       TEXT NOT NULL REFERENCES "EmpresaUser"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "clientId"     TEXT NOT NULL REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "entityType"   TEXT NOT NULL CHECK ("entityType" IN ('orden_de_cambio', 'estimado', 'propuesta', 'fase')),
  "entityId"     TEXT NOT NULL,
  "decision"     TEXT NOT NULL CHECK ("decision" IN ('aprobado', 'rechazado', 'solicita_cambios')),
  "clientUserId" TEXT REFERENCES "ClientUser"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "comment"      TEXT,
  "ip"           TEXT,
  "userAgent"    TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Approval_entity_idx" ON "Approval" ("entityType", "entityId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Approval_clientId_idx" ON "Approval" ("clientId");

CREATE OR REPLACE FUNCTION "approval_inmutable"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Permite el borrado en cascada cuando se elimina el cliente o la cuenta completa.
  IF TG_OP = 'DELETE' AND NOT EXISTS (SELECT 1 FROM "Client" WHERE "id" = OLD."clientId") THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'Las aprobaciones no se editan ni se borran (Approval %)', OLD."id";
END $$;
DROP TRIGGER IF EXISTS "Approval_inmutable" ON "Approval";
CREATE TRIGGER "Approval_inmutable" BEFORE UPDATE OR DELETE ON "Approval"
  FOR EACH ROW EXECUTE FUNCTION "approval_inmutable"();

-- ─── Línea de tiempo del cliente ───────────────────────────────────────────────
-- visibility = 'cliente' se muestra en su cuenta; 'interno' solo en /empresa.
CREATE TABLE IF NOT EXISTS "ActivityEvent" (
  "id"                 TEXT PRIMARY KEY,
  "userId"             TEXT NOT NULL REFERENCES "EmpresaUser"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "clientId"           TEXT NOT NULL REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "projectId"          TEXT REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "entityType"         TEXT NOT NULL,
  "entityId"           TEXT,
  "kind"               TEXT NOT NULL,
  "title"              TEXT NOT NULL,
  "detail"             TEXT,
  "visibility"         TEXT NOT NULL DEFAULT 'interno' CHECK ("visibility" IN ('interno', 'cliente')),
  "actorType"          TEXT NOT NULL DEFAULT 'pime' CHECK ("actorType" IN ('cliente', 'pime', 'sistema', 'github')),
  "actorClientUserId"  TEXT REFERENCES "ClientUser"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "actorEmpresaUserId" TEXT REFERENCES "EmpresaUser"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "ActivityEvent_clientId_createdAt_idx" ON "ActivityEvent" ("clientId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "ActivityEvent_projectId_createdAt_idx" ON "ActivityEvent" ("projectId", "createdAt" DESC);

-- ─── RLS obligatorio en todo lo nuevo (sin políticas: solo el servidor) ─────────
ALTER TABLE "ClientUser"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClientInvitation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChangeOrder"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProjectPhase"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Ticket"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TicketMessage"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TicketAttachment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TimeEntry"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Approval"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ActivityEvent"    ENABLE ROW LEVEL SECURITY;
