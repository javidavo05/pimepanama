# Configuración de Resend para PIME Panama

Todo el **envío saliente** usa Resend API (Mail Hub, contacto, PimeSign, PimeBook). La **recepción** sigue por IMAP.

## Variables de entorno

En `.env.local` (local) y Vercel → Environment Variables:

```env
RESEND_API_KEY=re_xxxxxxxxx
RESEND_FROM="PIME Panama <noreply@mail.pimepanama.com>"
RESEND_WEBHOOK_SECRET=whsec_...
```

- `RESEND_FROM` debe ser un email del **dominio verificado** en Resend.
- Opcional: `RESEND_ALLOWED_DOMAINS=mail.pimepanama.com,pimepanama.com`

**Nunca** commitees la API key en git.

## Webhook (tracking entrega / apertura / rebotes)

1. Resend Dashboard → [Webhooks](https://resend.com/webhooks) → Add Webhook
2. **URL:** `https://pimepanama.com/api/webhooks/resend`
3. **Eventos:** `email.sent`, `email.delivered`, `email.opened`, `email.bounced`, `email.complained`
4. Copia el **Signing Secret** → `RESEND_WEBHOOK_SECRET` en Vercel
5. Redeploy después de añadir la variable

El panel **Conversación** en cada correo muestra: Enviado → Entregado → Abierto / Rebote.

## Mail Hub

| Acción | Proveedor |
|--------|-----------|
| Recibir / sincronizar bandeja | IMAP (cuenta configurada) |
| Enviar / responder | Resend |
| Copia en Enviados (app) | Postgres (`InboxEmail` folder SENT) |
| Copia en Sent del servidor | No automática (usar "Recuperar enviados" si el servidor la guarda) |

El **username** de cada cuenta debe ser `@dominio-verificado` para enviar como esa dirección. Si no, se usa `RESEND_FROM` con `reply_to` al username de la cuenta.

## Dominio verificado

1. [resend.com/domains](https://resend.com/domains) → Add Domain → `mail.pimepanama.com`
2. Añade registros DNS (TXT, DKIM, etc.)
3. Espera verificación
4. Actualiza `RESEND_FROM` en Vercel

### Desarrollo con `onboarding@resend.dev`

Solo para pruebas: destinatarios deben estar verificados en Resend Settings → Emails.

## Migraciones Supabase

Aplicar en orden:

- `supabase/migrations/0018_mail_threading.sql`
- `supabase/migrations/0019_resend_tracking.sql`

## Probar envío

- Cuenta de correo → **Probar envío Resend**
- O desde el hub: redactar un correo de prueba

## Módulos que usan Resend

- `/api/empresa/mail/accounts/[id]/send` — redactar
- `/api/empresa/mail/inbox/[id]/reply` — responder
- `/api/contact` — formulario público
- `/api/send-promotional` — promocionales
- PimeSign / PimeBook — notificaciones

## Logs

Resend Dashboard → Emails: ver estado de cada envío.
