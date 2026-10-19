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
| 0027 | `0027_meeting_audio_source.sql` | Meeting.audioSource — de dónde salió el audio (videollamada, llamada, presencial, nota de voz); ajusta diarización y redacción de la minuta | 2026-09-02 | ✅ Aplicado |
| 0028 | `0028_meeting_spoken_languages.sql` | Meeting.spokenLanguages — reuniones bilingües: con más de un idioma Whisper detecta por tramo en vez de forzar uno; language queda como idioma de la minuta | 2026-09-02 | ✅ Aplicado |
| 0029 | `0029_push_subscriptions.sql` | Web Push: tabla PushSubscription (una fila por dispositivo suscrito al PWA). Habilita el aviso de nuevo lead del formulario público en el teléfono | 2026-09-06 | ✅ Aplicado |
| 0030 | `0030_lead_priority.sql` | Lead.priority (enum LeadPriority BAJA/MEDIA/ALTA) + Lead.priorityReason — la IA clasifica qué tan caliente está el prospecto y deja escrito por qué | 2026-09-07 | ✅ Aplicado |
| 0031 | `0031_watched_threads.sql` | WatchedThread — conversaciones de correo marcadas como importantes; cada respuesta nueva del hilo avisa por campana y push | 2026-09-17 | ✅ Aplicado |
| 0032 | `0032_mail_watch_schedule.sql` | pg_cron + pg_net: job `mail-watch` cada 10 min llama a /api/empresa/cron/mail-watch; el Bearer sale del Vault (`mail_watch_cron_secret` = CRON_SECRET de Vercel) | 2026-09-17 | ✅ Aplicado |
| 0033 | `0033_project_tasks.sql` | Tareas por proyecto estilo Asana: tabla ProjectSection + Task.projectId/sectionId/parentId (subtareas)/sortOrder; backfill del proyecto desde documento, cuota y reunión | 2026-09-21 | ✅ Aplicado |
| 0034 | `0034_platform_accounts.sql` | PlatformAccount — plan (FREE/PRO) de cada cuenta de Supabase/Vercel usada en Platforms; una cuenta Pro no tiene el límite de 2 proyectos | 2026-09-23 | ✅ Aplicado |
| 0035 | `0035_device_tokens.sql` | DeviceToken — llave de dispositivo (solo el SHA-256) para que PIME Guard, la barra de menú de la Mac, lea correo y reuniones sin la cookie del navegador; se vincula desde /empresa/configuracion/mac | 2026-09-25 | ✅ Aplicado |
| 0036 | `0036_passkeys.sql` | Passkey — llaves de acceso WebAuthn: entrar con Touch ID / Face ID / huella y, si vaultAccess, abrir la información confidencial de Platforms sin escribir la contraseña madre | 2026-09-30 | ✅ Aplicado |
| 0037 | `0037_mail_watch_every_30_min.sql` | Job `mail-watch` de pg_cron de cada 10 a cada 30 min: 48 funciones de Vercel al día en vez de 144; lo urgente se trae a demanda | 2026-10-02 | ✅ Aplicado |
| 0038 | `0038_portal_clientes.sql` | Pime Clientes: ClientUser + ClientInvitation (cuenta del cliente), ProjectPhase, ChangeOrder, Ticket + TicketMessage + TicketAttachment, TimeEntry (horas a $30/$20), Payment (un pago por fila), Approval inmutable, ActivityEvent; Client.brandLine/hourlyRate/portalEnabled, Project.kind, ajustes de tarifa y garantía en CompanyConfig | 2026-10-11 | ✅ Aplicado |
| 0039 | `0039_pulso_sistemas.sql` | Pulso de los sistemas: MonitoredSystem (estado, último contacto, sondeo de salud cada 30 min), SystemIncident (errores agrupados por huella), PulseEventId (anti-repetición 1 día). Secreto por sistema derivado de PIME_PULSO_SECRET, no guardado | 2026-10-11 | ✅ Aplicado |
| 0040 | `0040_github_cuentas.sql` | GithubAccount — varias cuentas de GitHub por equipo (token cifrado por cuenta, importables desde la CLI de GitHub como en Git PIME) + Project.githubAccountId (con qué cuenta se lee el repo) | 2026-10-11 | ✅ Aplicado |
| 0041 | `0041_tarifas_y_envios.sql` | Tarifas por línea Normal $40 y Premium $30 (antes 30/20) + CompanyConfig.clientEmailsEnabled (envíos a clientes apagados por defecto) | 2026-10-11 | ✅ Aplicado |
| 0042 | `0042_verificacion_github.sql` | Project.githubCheck + githubCheckAt — estado del proyecto verificado con GitHub (commits, milestones, issues, PRs) | 2026-10-11 | ✅ Aplicado |
| 0043 | `0043_asistente.sql` | AssistantAction — registro de lo que propone y hace el asistente (factura, tarea, nota, pago), con confirmación y deshacer | 2026-10-11 | ✅ Aplicado |
| 0044 | `0044_calendario.sql` | EmpresaUser.calendarIcsEnc/calendarCheckedAt/calendarError — Google Calendar por dirección secreta iCal, cifrada, solo lectura | 2026-10-11 | ✅ Aplicado |
| 0045 | `0045_platforms_v2.sql` | Platforms v2: Platform.clientId/projectId (cliente y proyecto, SET NULL) + githubAccountId/githubRepo/vercelProjectId/vercelProjectName/supabaseProjectRef; PlatformAccount.tokenEnc/label/teamId/orgSlug/planSource/lastCheckedAt/lastError (token de Vercel o Supabase cifrado); tabla PlatformApiCache (caché ≥ 30 min de las APIs) | 2026-10-12 | ✅ Aplicado |
| 0046 | `0046_calendario_para_google.sql` | EmpresaUser.calendarFeedToken — dirección .ics de Pime a la que se suscribe Google Calendar (citas, tareas, vencimientos) | 2026-10-12 | ✅ Aplicado |
| 0047 | `0047_proyecto_requisitos_no_aplica.sql` | Project.linkWaived — requisitos de «Qué le falta» marcados «No aplica» (no cuentan en el porcentaje de completitud del proyecto) | 2026-10-12 | ✅ Aplicado |
| 0048 | `0048_empresa_interna_y_gastos_por_proyecto.sql` | Client.internal (la empresa interna Pime Panamá: fuera de cobros, ingresos, portal y correos) + Expense.projectId (FK SET NULL, índice): gastos por proyecto/producto | 2026-10-12 | ✅ Aplicado |
| 0049 | `0049_tickets_internos.sql` | Ticket.kind admite bug, mejora y tarea (tickets internos de los productos de la empresa) además de soporte, cambio, nuevo e incidente | 2026-10-12 | ✅ Aplicado |
| 0050 | `0050_asistente_fases.sql` | AssistantAction.kind acepta «fase»: el asistente propone una fase con su factura y los pagos ya recibidos | 2026-10-12 | ✅ Aplicado |
| 0051 | `0051_asistente_total_pagos_por_fase.sql` | Payment.projectId/phaseId (FK SET NULL, índices): de qué proyecto o fase es cada pago. AssistantAction.kind pasa de lista cerrada a formato libre en minúsculas (el asistente hace de todo) | 2026-10-12 | ✅ Aplicado |
| 0052 | `0052_entregables_por_fase.sql` | Deliverable.phaseId (FK SET NULL, índice): los entregables cuelgan de una fase; salen completos de la propuesta/cotización adjunta al crear el proyecto | 2026-10-14 | ✅ Aplicado |
| 0053 | `0053_portal_logo_accesos_github.sql` | Client.logoKey (logo del cliente en R2) + Project.liveUrl / githubHookId + ProjectPhase.readyNotifiedAt (aviso único de fase lista) + tabla ProjectAccess (accesos al sistema del cliente, clave cifrada; RLS) | 2026-10-15 | ✅ Aplicado |
| 0054 | `0054_motor_sistemas.sql` | Project.revision / revisadoAt (resumen de la revisión única de cada sistema: salud, GitHub, marcadores, Pulso) + MonitoredSystem.origen ('manual' \| 'auto') + índice por projectId | 2026-10-16 | ✅ Aplicado |
| 0055 | `0055_fase_sin_marcador.sql` | ProjectPhase.progressSource acepta 'sin_marcador' (fase llevada a mano a propósito: sin marcador en GitHub y fuera del aviso de «fases sin marcador») | 2026-10-16 | ✅ Aplicado |
| 0056 | `0056_equipo_y_responsables.sql` | EmpresaUser.ownerId/area/activo (equipo con datos compartidos del dueño y áreas Dueño/Ventas/Proyectos/Finanzas) + tabla EmpresaInvite (RLS) + Client/Lead.responsableId | 2026-10-16 | ✅ Aplicado |
| 0057 | `0057_crm_completo.sql` | CRM fases 1–8: Contacto, CampoPersonalizado, Interaccion, EtapaEmbudo, Oportunidad, PlantillaCorreo, Campana, CampanaEnvio, BajaCorreo, VistaGuardada, Encuesta, ArchivoCliente (todas con RLS) + Client.fuente/industria/etiquetas/camposExtra/ultimoContactoAt, Lead.etiquetas, Task.clientId/leadId/oportunidadId/responsableId, CompanyConfig.reglasCrm, Project.mantenimiento*, Meeting.compartidaCliente, Document.aceptadaAt/aceptadaPor | 2026-10-16 | ✅ Aplicado |
| 0058 | `0058_campana_preparando.sql` | Campana.estado acepta 'preparando' (lista de destinatarios en armado) | 2026-10-16 | ✅ Aplicado |
| 0059 | `0059_device_token_alcance.sql` | DeviceToken.alcance ('dispositivo' \| 'prospectos'): la llave del agente de prospección solo carga prospectos | 2026-10-19 | ✅ Aplicado |
| 0060 | `0060_revision_cuenta_cliente.sql` | Client.portalReviewedAt / portalReviewedBy — el equipo revisa la cuenta del cliente en modo solo lectura antes de invitarlo; la invitación exige una revisión de las últimas 24 h | 2026-10-19 | ✅ Aplicado |
