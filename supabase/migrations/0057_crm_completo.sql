-- 0057 · CRM completo (fases 1 a 8 del plan, 2026-10-16). Un solo archivo para que todas las fases partan del mismo
-- esquema. Todo cuelga del userId del dueño (equipo con datos compartidos, migración 0056).
-- Idempotente. RLS activo y sin políticas en cada tabla nueva, como el resto.

-- ── Fase 1 · Ficha 360 ─────────────────────────────────────────────────────────────────────────────────────
-- Contactos de una empresa cliente (no son cuentas del portal; pueden ligarse a una).
CREATE TABLE IF NOT EXISTS "Contacto" (
  "id"           TEXT PRIMARY KEY,
  "userId"       TEXT NOT NULL REFERENCES "EmpresaUser"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "clientId"     TEXT NOT NULL REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "nombre"       TEXT NOT NULL,
  "cargo"        TEXT,
  "email"        TEXT,
  "telefono"     TEXT,
  "rol"          TEXT NOT NULL DEFAULT 'otro' CHECK ("rol" IN ('decide', 'paga', 'tecnico', 'otro')),
  "principal"    BOOLEAN NOT NULL DEFAULT false,
  "notas"        TEXT,
  "clientUserId" TEXT REFERENCES "ClientUser"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Contacto_clientId_idx" ON "Contacto" ("clientId");
CREATE INDEX IF NOT EXISTS "Contacto_userId_email_idx" ON "Contacto" ("userId", "email");
ALTER TABLE "Contacto" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "fuente"           TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "industria"        TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "etiquetas"        TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "camposExtra"      JSONB;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "ultimoContactoAt" TIMESTAMP(3);
ALTER TABLE "Lead"   ADD COLUMN IF NOT EXISTS "etiquetas"        TEXT[] NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS "Client_etiquetas_idx" ON "Client" USING GIN ("etiquetas");

-- Campos propios que el dueño define para sus clientes.
CREATE TABLE IF NOT EXISTS "CampoPersonalizado" (
  "id"        TEXT PRIMARY KEY,
  "userId"    TEXT NOT NULL REFERENCES "EmpresaUser"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "entidad"   TEXT NOT NULL DEFAULT 'cliente' CHECK ("entidad" IN ('cliente', 'lead')),
  "clave"     TEXT NOT NULL,
  "etiqueta"  TEXT NOT NULL,
  "tipo"      TEXT NOT NULL DEFAULT 'texto' CHECK ("tipo" IN ('texto', 'numero', 'fecha', 'opcion')),
  "opciones"  TEXT[] NOT NULL DEFAULT '{}',
  "orden"     INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "CampoPersonalizado_userId_entidad_clave_key" ON "CampoPersonalizado" ("userId", "entidad", "clave");
ALTER TABLE "CampoPersonalizado" ENABLE ROW LEVEL SECURITY;

-- ── Fase 2 · Historia: interacciones registradas a mano (llamadas, WhatsApp, visitas, notas) ──────────────────
CREATE TABLE IF NOT EXISTS "Interaccion" (
  "id"          TEXT PRIMARY KEY,
  "userId"      TEXT NOT NULL REFERENCES "EmpresaUser"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "clientId"    TEXT REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "leadId"      TEXT REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "contactoId"  TEXT REFERENCES "Contacto"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "autorId"     TEXT REFERENCES "EmpresaUser"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "tipo"        TEXT NOT NULL CHECK ("tipo" IN ('llamada', 'whatsapp', 'correo', 'reunion', 'visita', 'nota')),
  "direccion"   TEXT CHECK ("direccion" IN ('entrante', 'saliente')),
  "resumen"     TEXT NOT NULL,
  "resultado"   TEXT,
  "duracionMin" INTEGER,
  "proximoPaso" TEXT,
  "fijada"      BOOLEAN NOT NULL DEFAULT false,
  "ocurrioAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Interaccion_clientId_ocurrioAt_idx" ON "Interaccion" ("clientId", "ocurrioAt" DESC);
CREATE INDEX IF NOT EXISTS "Interaccion_leadId_idx" ON "Interaccion" ("leadId");
ALTER TABLE "Interaccion" ENABLE ROW LEVEL SECURITY;

-- ── Fase 3 · Embudo: etapas editables y oportunidades ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "EtapaEmbudo" (
  "id"           TEXT PRIMARY KEY,
  "userId"       TEXT NOT NULL REFERENCES "EmpresaUser"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "nombre"       TEXT NOT NULL,
  "orden"        INTEGER NOT NULL DEFAULT 0,
  "probabilidad" INTEGER NOT NULL DEFAULT 10 CHECK ("probabilidad" BETWEEN 0 AND 100),
  "tipo"         TEXT NOT NULL DEFAULT 'abierta' CHECK ("tipo" IN ('abierta', 'ganada', 'perdida')),
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "EtapaEmbudo_userId_orden_idx" ON "EtapaEmbudo" ("userId", "orden");
ALTER TABLE "EtapaEmbudo" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "Oportunidad" (
  "id"             TEXT PRIMARY KEY,
  "userId"         TEXT NOT NULL REFERENCES "EmpresaUser"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "titulo"         TEXT NOT NULL,
  "clientId"       TEXT REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "leadId"         TEXT REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "etapaId"        TEXT NOT NULL REFERENCES "EtapaEmbudo"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "valor"          DECIMAL(12,2) NOT NULL DEFAULT 0,
  "probabilidad"   INTEGER NOT NULL DEFAULT 10 CHECK ("probabilidad" BETWEEN 0 AND 100),
  "cierreEsperado" TIMESTAMP(3),
  "responsableId"  TEXT REFERENCES "EmpresaUser"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "estado"         TEXT NOT NULL DEFAULT 'abierta' CHECK ("estado" IN ('abierta', 'ganada', 'perdida')),
  "motivoPerdida"  TEXT,
  "fuente"         TEXT,
  "notas"          TEXT,
  "cotizacionId"   TEXT REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "projectId"      TEXT REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "cerradaAt"      TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Oportunidad_userId_estado_idx" ON "Oportunidad" ("userId", "estado");
CREATE INDEX IF NOT EXISTS "Oportunidad_clientId_idx" ON "Oportunidad" ("clientId");
CREATE INDEX IF NOT EXISTS "Oportunidad_leadId_idx" ON "Oportunidad" ("leadId");
ALTER TABLE "Oportunidad" ENABLE ROW LEVEL SECURITY;

-- ── Fase 4 · Seguimientos y mantenimiento mensual ─────────────────────────────────────────────────────────────
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "clientId"      TEXT;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "leadId"        TEXT;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "oportunidadId" TEXT;
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "responsableId" TEXT;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Task_clientId_fkey') THEN
    ALTER TABLE "Task" ADD CONSTRAINT "Task_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Task_leadId_fkey') THEN
    ALTER TABLE "Task" ADD CONSTRAINT "Task_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Task_oportunidadId_fkey') THEN
    ALTER TABLE "Task" ADD CONSTRAINT "Task_oportunidadId_fkey" FOREIGN KEY ("oportunidadId") REFERENCES "Oportunidad"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Task_responsableId_fkey') THEN
    ALTER TABLE "Task" ADD CONSTRAINT "Task_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "EmpresaUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS "Task_clientId_idx" ON "Task" ("clientId");
CREATE INDEX IF NOT EXISTS "Task_leadId_idx" ON "Task" ("leadId");
CREATE INDEX IF NOT EXISTS "Task_oportunidadId_idx" ON "Task" ("oportunidadId");

-- Reglas de seguimiento del dueño: {"leadSinRespuestaDias":3,"clienteSinContactoDias":45,"renovacionDias":30}
ALTER TABLE "CompanyConfig" ADD COLUMN IF NOT EXISTS "reglasCrm" JSONB;

-- Mantenimiento mensual por proyecto: la factura se arma sola en borrador, solo si está activado.
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "mantenimientoActivo"  BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "mantenimientoMonto"   DECIMAL(12,2);
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "mantenimientoDia"     INTEGER NOT NULL DEFAULT 1 CHECK ("mantenimientoDia" BETWEEN 1 AND 28);
ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "mantenimientoUltimoAt" TIMESTAMP(3);

-- ── Fase 5 · Correo: plantillas, campañas y bajas ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "PlantillaCorreo" (
  "id"        TEXT PRIMARY KEY,
  "userId"    TEXT NOT NULL REFERENCES "EmpresaUser"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "nombre"    TEXT NOT NULL,
  "asunto"    TEXT NOT NULL,
  "cuerpo"    TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "PlantillaCorreo" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "Campana" (
  "id"         TEXT PRIMARY KEY,
  "userId"     TEXT NOT NULL REFERENCES "EmpresaUser"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "nombre"     TEXT NOT NULL,
  "asunto"     TEXT NOT NULL,
  "cuerpo"     TEXT NOT NULL,
  "filtro"     JSONB,
  "estado"     TEXT NOT NULL DEFAULT 'borrador' CHECK ("estado" IN ('borrador', 'enviando', 'enviada')),
  "enviados"   INTEGER NOT NULL DEFAULT 0,
  "abiertos"   INTEGER NOT NULL DEFAULT 0,
  "enviadaAt"  TIMESTAMP(3),
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "Campana" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "CampanaEnvio" (
  "id"         TEXT PRIMARY KEY,
  "campanaId"  TEXT NOT NULL REFERENCES "Campana"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "email"      TEXT NOT NULL,
  "nombre"     TEXT,
  "clientId"   TEXT REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "estado"     TEXT NOT NULL DEFAULT 'pendiente' CHECK ("estado" IN ('pendiente', 'enviado', 'fallo', 'abierto')),
  "error"      TEXT,
  "enviadoAt"  TIMESTAMP(3),
  "abiertoAt"  TIMESTAMP(3)
);
CREATE INDEX IF NOT EXISTS "CampanaEnvio_campanaId_idx" ON "CampanaEnvio" ("campanaId");
ALTER TABLE "CampanaEnvio" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "BajaCorreo" (
  "id"        TEXT PRIMARY KEY,
  "userId"    TEXT NOT NULL REFERENCES "EmpresaUser"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "email"     TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "BajaCorreo_userId_email_key" ON "BajaCorreo" ("userId", "email");
ALTER TABLE "BajaCorreo" ENABLE ROW LEVEL SECURITY;

-- ── Fase 6 · Vistas guardadas (de cada miembro) ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "VistaGuardada" (
  "id"        TEXT PRIMARY KEY,
  "miembroId" TEXT NOT NULL REFERENCES "EmpresaUser"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "entidad"   TEXT NOT NULL DEFAULT 'clientes',
  "nombre"    TEXT NOT NULL,
  "filtros"   JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "VistaGuardada_miembroId_idx" ON "VistaGuardada" ("miembroId");
ALTER TABLE "VistaGuardada" ENABLE ROW LEVEL SECURITY;

-- ── Fase 7 · Encuesta de satisfacción al terminar el proyecto ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Encuesta" (
  "id"           TEXT PRIMARY KEY,
  "userId"       TEXT NOT NULL REFERENCES "EmpresaUser"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "projectId"    TEXT NOT NULL REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "clientId"     TEXT NOT NULL REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "puntaje"      INTEGER CHECK ("puntaje" BETWEEN 0 AND 10),
  "comentario"   TEXT,
  "enviadaAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "respondidaAt" TIMESTAMP(3)
);
CREATE UNIQUE INDEX IF NOT EXISTS "Encuesta_projectId_key" ON "Encuesta" ("projectId");
ALTER TABLE "Encuesta" ENABLE ROW LEVEL SECURITY;

-- ── Fase 8 · Portal ampliado: minutas compartidas, archivos y aceptación de cotizaciones ────────────────────
ALTER TABLE "Meeting"  ADD COLUMN IF NOT EXISTS "compartidaCliente" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "aceptadaAt"        TIMESTAMP(3);
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "aceptadaPor"       TEXT;

CREATE TABLE IF NOT EXISTS "ArchivoCliente" (
  "id"             TEXT PRIMARY KEY,
  "userId"         TEXT NOT NULL REFERENCES "EmpresaUser"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "clientId"       TEXT NOT NULL REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "projectId"      TEXT REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "nombre"         TEXT NOT NULL,
  "r2Key"          TEXT NOT NULL,
  "tipo"           TEXT,
  "tamano"         INTEGER,
  "subidoPor"      TEXT NOT NULL DEFAULT 'pime' CHECK ("subidoPor" IN ('pime', 'cliente')),
  "visibleCliente" BOOLEAN NOT NULL DEFAULT true,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "ArchivoCliente_clientId_idx" ON "ArchivoCliente" ("clientId");
ALTER TABLE "ArchivoCliente" ENABLE ROW LEVEL SECURITY;
