# Migraciones SQL — Pime Panamá

Todas las migraciones se corren manualmente en **Supabase → SQL Editor**.

## Reglas

- Nombre: `NNNN_descripcion.sql` (4 dígitos)
- Cada archivo es idempotente (`IF NOT EXISTS`)
- Nunca modificar un archivo ya aplicado — crear uno nuevo
- Actualizar este README cuando se aplique una migración

## Historial

| # | Archivo | Descripción | Fecha | Estado |
|---|---------|-------------|-------|--------|
| 0001 | `0001_initial_empresa_schema.sql` | Schema inicial: EmpresaUser, Document, Client, PaymentMethod, CompanyConfig, AiUsageLog | 2025-11-07 | ✅ Aplicado |
| 0002 | `0002_mail_hub.sql` | Mail Hub: MailAccount, InboxEmail, EmailAttachment, MailNotification | 2026-06-25 | ⏳ Pendiente |
| 0003 | `0003_projects_contracts_ar.sql` | Proyectos, Contratos, PaymentSchedule; ALTER Document para projectId/contractId | 2026-06-26 | ⏳ Pendiente |
| 0004 | `0004_document_link.sql` | linkedDocumentId FK en Document (COTIZACION↔FACTURA); backfill desde JSON content | 2026-06-26 | ✅ Aplicado (local) — pendiente en prod si no se corrió en Supabase |
