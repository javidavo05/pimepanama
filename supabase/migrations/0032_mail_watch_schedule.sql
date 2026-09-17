-- 0032_mail_watch_schedule.sql
-- Revisión automática de conversaciones marcadas como importantes (0031).
--
-- Cada 10 minutos Postgres llama a /api/empresa/cron/mail-watch, que baja la
-- bandeja de quienes tienen hilos marcados y avisa las respuestas. Vive en
-- Supabase porque el plan Hobby de Vercel solo permite crons diarios.
--
-- El Bearer NO está en este archivo (el repo es público): se lee del Vault,
-- secreto `mail_watch_cron_secret`, que debe valer lo mismo que CRON_SECRET en
-- Vercel. Si se rota uno, se rota el otro:
--   select vault.update_secret(
--     (select id from vault.secrets where name = 'mail_watch_cron_secret'), '<nuevo>');
--
-- Idempotente: cron.schedule con el mismo nombre reemplaza el job.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'mail-watch',
  '*/10 * * * *',
  $job$
  SELECT net.http_post(
    url := 'https://pimepanama.com/api/empresa/cron/mail-watch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets
        WHERE name = 'mail_watch_cron_secret'
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 300000
  );
  $job$
);
