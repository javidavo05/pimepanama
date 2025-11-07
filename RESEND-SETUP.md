# Configuración de Resend para PIME Panama

## 📧 Estado Actual

✅ API Key configurado en Vercel: `re_L7jFVjAQ_4UGxqde3C83t7oEnYoyfV...`
✅ Templates de email creados
⚠️ Usando dominio de desarrollo: `onboarding@resend.dev`

## 🚨 Limitaciones del Dominio de Desarrollo

Con `onboarding@resend.dev`:
- ✅ Puedes enviar emails
- ❌ Solo a emails verificados en Resend
- ❌ No puedes enviar a clientes reales
- ❌ Límite de 100 emails/día

## ✅ Solución: Verificar tu Dominio

### Opción 1: Usar un subdominio (Recomendado)

**Ejemplo:** `mail.pimepanama.com`

#### Pasos:

1. **En Resend Dashboard:**
   - Ve a: https://resend.com/domains
   - Click en "Add Domain"
   - Ingresa: `mail.pimepanama.com`
   - Resend te dará registros DNS

2. **En tu proveedor de DNS** (GoDaddy, Cloudflare, etc.):
   
   Agrega estos registros DNS (Resend te los dará exactamente):
   
   ```
   Tipo: TXT
   Nombre: mail._domainkey.pimepanama.com
   Valor: [valor que te da Resend]
   
   Tipo: TXT  
   Nombre: mail.pimepanama.com
   Valor: [valor que te da Resend]
   
   Tipo: MX
   Nombre: mail.pimepanama.com
   Valor: feedback-smtp.us-east-1.amazonses.com (prioridad 10)
   ```

3. **Espera 24-48 horas** para que se propague el DNS

4. **Verifica en Resend** que el dominio esté activo

5. **Actualiza el código:**
   - Cambia `onboarding@resend.dev` 
   - Por `noreply@mail.pimepanama.com`

### Opción 2: Usar el dominio principal

**Ejemplo:** `pimepanama.com`

⚠️ **No recomendado** porque afecta tu email actual si ya tienes uno configurado.

---

## 🔧 Mientras Tanto: Verificar Emails de Prueba

Para probar AHORA sin esperar el DNS:

1. **En Resend Dashboard:**
   - Ve a: https://resend.com/settings/emails
   - Agrega tu email personal para verificarlo
   - Verifica haciendo click en el link que te envían

2. **Prueba el formulario:**
   - Usa tu email verificado
   - Deberías recibir el email de agradecimiento

---

## 📨 Tipos de Emails Configurados

### 1. Email al Admin (info@pimepanama.com)
```
Asunto: [PIME Panama] Nueva solicitud de [Nombre]
Contenido:
- Datos del cliente
- Mensaje completo
- Timestamp
- Idioma de preferencia
```

### 2. Email de Agradecimiento al Cliente
```
Asunto: Gracias por contactar a PIME Panama
Contenido:
- Saludo personalizado
- Confirmación de recepción
- Promesa de respuesta en 24h
- Datos de contacto directo
```

### 3. Emails Promocionales (Endpoint `/api/send-promotional`)
```
- Diseño branded
- Personalización por nombre
- CTA button
- Unsubscribe link
```

---

## 🎯 Próximos Pasos

### Ahora:
1. ✅ Verifica tu email personal en Resend
2. ✅ Prueba el formulario con ese email
3. ✅ Deberías recibir el email de agradecimiento

### Después (cuando tengas dominio):
1. Configura `mail.pimepanama.com` en Resend
2. Actualiza el código con el nuevo dominio
3. Push a GitHub
4. Redeploy en Vercel

---

## 🧪 Cómo Probar Emails Promocionales

Usa Postman, Insomnia, o curl:

```bash
curl -X POST https://tu-sitio.vercel.app/api/send-promotional \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      {"name": "Juan Pérez", "email": "tu-email-verificado@gmail.com"}
    ],
    "subject": "Promoción Especial PIME Panama",
    "title": "20% de Descuento en Equipos Industriales",
    "content": "Estimado cliente,\n\nTenemos una oferta especial para usted...",
    "ctaText": "Ver Oferta",
    "ctaLink": "https://pimepanama.com/es#contact",
    "locale": "es"
  }'
```

---

## ❓ ¿Necesitas ayuda?

1. **Para verificar tu email en Resend:** Ve a Settings → Emails
2. **Para ver logs de emails enviados:** Ve a Resend Dashboard → Emails
3. **Para configurar dominio:** Ve a Domains → Add Domain

**¿Ya verificaste tu email en Resend para hacer pruebas?** 📧

