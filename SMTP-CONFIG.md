# Configuración SMTP para PIME Panama

## 📧 Variables de Entorno Requeridas

Agrega estas variables en **Vercel** → **Settings** → **Environment Variables**:

```env
# SMTP Configuration
SMTP_HOST=smtp.tu-proveedor.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=info@pimepanama.com
SMTP_PASSWORD=tu-password-smtp
SMTP_FROM=PIME Panama <info@pimepanama.com>
```

---

## 🔧 Configuraciones Comunes por Proveedor

### Gmail / Google Workspace
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=info@pimepanama.com
SMTP_PASSWORD=tu-app-password
SMTP_FROM=PIME Panama <info@pimepanama.com>
```

**⚠️ Nota para Gmail:**
- Necesitas crear una "App Password" (no uses tu password normal)
- Ve a: https://myaccount.google.com/apppasswords
- Genera una password específica para la app

### Microsoft 365 / Outlook
```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=info@pimepanama.com
SMTP_PASSWORD=tu-password
SMTP_FROM=PIME Panama <info@pimepanama.com>
```

### cPanel / Hosting Compartido
```env
SMTP_HOST=mail.pimepanama.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=info@pimepanama.com
SMTP_PASSWORD=tu-password-cpanel
SMTP_FROM=PIME Panama <info@pimepanama.com>
```

### SendGrid (Alternativa)
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASSWORD=tu-sendgrid-api-key
SMTP_FROM=PIME Panama <info@pimepanama.com>
```

### Amazon SES
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-aws-access-key
SMTP_PASSWORD=tu-aws-secret-key
SMTP_FROM=PIME Panama <info@pimepanama.com>
```

---

## 🧪 Probar Configuración Localmente

1. Crea un archivo `.env.local`:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=info@pimepanama.com
SMTP_PASSWORD=tu-password
SMTP_FROM=PIME Panama <info@pimepanama.com>
```

2. Reinicia el servidor:
```bash
npm run dev
```

3. Prueba el formulario de contacto

4. Revisa la consola para ver logs de envío

---

## 🔐 Seguridad

### ⚠️ Nunca Hagas Esto:
- ❌ No subas passwords a GitHub
- ❌ No compartas el archivo `.env`
- ❌ No uses tu password personal de email

### ✅ Mejores Prácticas:
- ✅ Usa App Passwords (Gmail)
- ✅ Usa API Keys cuando sea posible
- ✅ Configura las variables solo en Vercel
- ✅ Usa diferentes passwords para dev/prod

---

## 📊 Límites por Proveedor

### Gmail (Gratis)
- 500 emails/día
- 100 destinatarios por email

### Google Workspace (Pago)
- 2,000 emails/día
- 2,000 destinatarios por email

### Microsoft 365
- 10,000 emails/día

### SendGrid (Gratis)
- 100 emails/día

### Amazon SES
- 200 emails/día gratis
- $0.10 por 1,000 emails después

---

## 🚀 Pasos para Activar

1. **Identifica tu proveedor de email** (Gmail, Outlook, cPanel, etc.)
2. **Obtén las credenciales SMTP** de tu proveedor
3. **Agrega las variables en Vercel:**
   - Ve a tu proyecto en Vercel
   - Settings → Environment Variables
   - Agrega las 6 variables SMTP
   - Marca "Production, Preview, Development"
4. **Redeploy el sitio** en Vercel
5. **Prueba el formulario**

---

## ❓ ¿Qué proveedor de email usas?

Dime cuál usas y te doy la configuración exacta:
- Gmail / Google Workspace
- Microsoft 365 / Outlook
- cPanel / Hosting compartido
- Otro

**Una vez configurado, los emails funcionarán perfectamente sin límites de Resend.** 📧

