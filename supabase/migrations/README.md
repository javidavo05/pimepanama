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
| 0002 | `0002_mail_hub.sql` | Mail Hub: MailAccount, InboxEmail, EmailAttachment, MailNotification | 2026-06-25 | ✅ Aplicado |
| 0003 | `0003_projects_contracts_ar.sql` | Proyectos, Contratos, PaymentSchedule; ALTER Document para projectId/contractId | 2026-06-26 | ✅ Aplicado |
| 0004 | `0004_document_link.sql` | linkedDocumentId FK en Document (COTIZACION↔FACTURA); backfill desde JSON content | 2026-06-26 | ✅ Aplicado |
| 0005 | `0005_leads_crm.sql` | Módulo CRM: tabla Lead (prospectos), enums LeadStatus/LeadSource, Document.leadId | 2026-07-06 | ✅ Aplicado |
| 0006 | `0006_tasks.sql` | Módulo de Tareas: tabla Task (título, responsable, prioridad, fecha límite, vínculo a Document/PaymentSchedule), enum TaskPriority, MailNotification.link | 2026-07-06 | ✅ Aplicado |
| 0007 | `0007_task_all_day.sql` | Task.allDay — distingue tareas todo-el-día de tareas con hora, para vista calendario semana/día | 2026-07-06 | ✅ Aplicado |
| 0008 | `0008_task_end_date.sql` | Task.endDate — desde/hasta para gestionar la duración del evento en vista calendario semana/día | 2026-07-06 | ✅ Aplicado |
| 0009 | `0009_platforms.sql` | Registro de plataformas (Platform) | 2026-07-06 | ✅ Aplicado |
| 0010 | `0010_expenses.sql` | Por pagar: enums ExpenseStatus/ExpenseCategory + tabla Expense | 2026-07-06 | ✅ Aplicado |
| 0011 | `0011_mail_signatures_folders.sql` | MailAccount firmas + índice InboxEmail por carpeta | 2026-07-06 | ✅ Aplicado |
| 0012 | `0012_invoice_partial_payment.sql` | Document.amountPaid + estado PARTIALLY_PAID para pagos parciales de factura | 2026-07-06 | ✅ Aplicado |
| 0013 | `0013_document_audit_log.sql` | Tabla DocumentAuditLog — historial de ediciones a documentos (quién, cuándo, qué cambió) | 2026-07-06 | ✅ Aplicado |
| 0014 | `0014_platform_confidential.sql` | Platform.confidentialVault — bóveda confidencial cifrada en tarjetas de plataforma | 2026-07-14 | ✅ Aplicado |
| 0015 | `0015_project_proposal_content.sql` | Project.proposalContent (JSONB) — contenido estructurado generado por IA para el PDF de propuesta comercial (pilares, arquitectura, fases, alcance, cierre) | 2026-07-15 | ✅ Aplicado |
| 0016 | `0016_pimesign.sql` | PimeSign: firma digital in-house de contratos (ContractSigningRequest, tokens, audit) | 2026-07-15 | ✅ Aplicado |
| 0017 | `0017_pimebook.sql` | PimeBook: agenda de citas (BookingEventType, BookingAvailability, Booking) | 2026-07-15 | ✅ Aplicado |
| 0018 | `0018_mail_threading.sql` | InboxEmail: threading (threadKey, inReplyTo) + delivery status SMTP | 2026-07-21 | ✅ Aplicado |
| 0019 | `0019_resend_tracking.sql` | InboxEmail: resendId, deliveredAt, openedAt, bouncedAt, bounceReason | 2026-07-21 | ✅ Aplicado |
| 0020 | `0020_contract_html_content.sql` | Contract.htmlContent (TEXT) — documento HTML del design-system para editor visual y PDF | 2026-07-21 | ✅ Aplicado |
| 0021 | `0021_project_clients.sql` | ProjectClient — un proyecto puede pertenecer a varios clientes; backfill desde Project.clientId (que queda como espejo legacy del cliente principal) | 2026-08-18 | ✅ Aplicado |
| 0022 | `0022_deliverables_financing.sql` | Deliverable (entregables del proyecto, generados del contrato adjunto por IA) + Project.financingPlan (abono inicial + cuotas mensuales/quincenales) | 2026-08-18 | ✅ Aplicado |
| 0023 | `0023_meetings.sql` | PimeMeet: Meeting + MeetingSpeaker + MeetingActionItem, enums MeetingStatus/MeetingItemKind — reuniones grabadas con transcripción, hablantes, minuta ejecutiva + técnica, pendientes técnicos y prompt técnico ligados a Project | 2026-08-31 | ✅ Aplicado |
| 0024 | `0024_meeting_manual_context.sql` | Meeting.manualContext — notas de contexto escritas a mano después de grabar; se inyectan al prompt junto al contexto del proyecto | 2026-08-31 | ✅ Aplicado |
| 0025 | `0025_meetings_v2.sql` | PimeMeet v2: tabla MeetingSegment (segmentos fuera del JSONB, con backfill) + Meeting.audioChunks (reproductor), chapters (índice de temas), minutesSentAt y nextMeetingTaskId | 2026-09-01 | ✅ Aplicado |
| 0026 | `0026_project_repo_and_deliverable.sql` | Repositorio del proyecto (Project.repoOwner/repoName/repoBranch/repoSnapshot) + EmpresaUser.githubTokenEnc + Meeting.technicalDeliverable y los enlaces a lo materializado (deliverableId, proposalDraftedAt, contractId) | 2026-09-02 | ✅ Aplicado |
