-- 0037_mail_watch_every_30_min.sql
-- El job `mail-watch` (0032) pasa de cada 10 a cada 30 minutos.
--
-- Cada corrida es una función de Vercel que abre IMAP por cuenta: 144 al día
-- consumían CPU activa de la cuota Hobby (4 h al mes) para un correo que no
-- necesita llegar al minuto. Con 30 min son 48. Lo que no puede esperar se
-- trae a demanda: el botón de sincronizar del hub y abrir la campana.
--
-- Idempotente: cron.alter_job solo cambia el horario si el job existe.

SELECT cron.alter_job(jobid, schedule := '*/30 * * * *')
FROM cron.job
WHERE jobname = 'mail-watch';
