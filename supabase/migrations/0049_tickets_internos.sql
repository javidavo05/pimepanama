-- 0049 · Tickets internos (2026-10-12). Los productos de la empresa interna llevan tickets del equipo:
-- error (bug), mejora y tarea, además de los tipos de cliente. Amplía el CHECK de Ticket.kind (0038).
ALTER TABLE "Ticket" DROP CONSTRAINT IF EXISTS "Ticket_kind_check";
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_kind_check"
  CHECK ("kind" IN ('soporte', 'cambio', 'nuevo', 'incidente', 'bug', 'mejora', 'tarea'));
