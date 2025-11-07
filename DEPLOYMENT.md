# PIME Panama - Deployment Guide

## ⚠️ Importante: Decisión de Hosting

Este proyecto usa características de servidor de Next.js:
- API Routes (`/api/contact`)
- Autenticación con sesiones
- Base de datos SQLite con Prisma
- Server-side rendering dinámico

**Opciones de deployment:**

### Opción 1: Vercel (Recomendado - Más Fácil)
✅ Soporte nativo para Next.js
✅ Deploy automático desde GitHub
✅ Gratis para proyectos pequeños
✅ SSL automático
✅ Edge functions incluidas

### Opción 2: Firebase Hosting + Cloud Functions
⚠️ Requiere configuración adicional
⚠️ Necesita migrar de SQLite a Firestore
⚠️ Más complejo de mantener
💰 Puede tener costos

### Opción 3: VPS (DigitalOcean, AWS, etc.)
✅ Control total
✅ Puede usar SQLite
⚠️ Requiere configuración de servidor
⚠️ Mantenimiento manual

---

## 🚀 Deployment con Vercel (Recomendado)

### 1. Crear cuenta en Vercel
1. Ve a [vercel.com](https://vercel.com)
2. Sign up con tu cuenta de GitHub

### 2. Conectar repositorio
```bash
# Primero, sube tu código a GitHub
git remote add origin https://github.com/TU_USUARIO/pimepanama.git
git push -u origin main
git push origin dev
```

### 3. Importar proyecto en Vercel
1. Click en "New Project"
2. Selecciona el repositorio `pimepanama`
3. Configura las variables de entorno:
   ```
   DATABASE_URL=file:./prod.db
   NEXT_PUBLIC_SITE_URL=https://pimepanama.vercel.app
   ADMIN_SEED_EMAIL=founder@pimepanama.com
   ADMIN_SEED_PASSWORD=TU_PASSWORD_SEGURO
   ```
4. Click en "Deploy"

### 4. Configurar dominio personalizado
1. En Vercel dashboard → Settings → Domains
2. Agrega `pimepanama.com`
3. Configura los DNS según las instrucciones

---

## 🔥 Deployment con Firebase (Alternativa)

### ⚠️ Limitaciones con Firebase Hosting
Firebase Hosting solo sirve archivos estáticos. Para usar Next.js completo necesitas:

1. **Firebase Hosting + Cloud Functions**
2. **Migrar de SQLite a Firestore**
3. **Reescribir autenticación para usar Firebase Auth**

### Pasos para Firebase (Avanzado)

#### 1. Instalar dependencias
```bash
npm install firebase-admin firebase-functions
```

#### 2. Inicializar Firebase
```bash
firebase login
firebase init functions
firebase init firestore
```

#### 3. Configurar Next.js para Functions
Crear `firebase/functions/package.json`:
```json
{
  "engines": {
    "node": "18"
  },
  "main": "index.js",
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "firebase-functions": "^5.0.0",
    "next": "15.1.6"
  }
}
```

#### 4. Migrar base de datos
- Cambiar de SQLite a Firestore
- Reescribir queries de Prisma
- Actualizar modelos

**Esto requiere mucho trabajo adicional.**

---

## 📦 GitHub Setup

### 1. Crear repositorio en GitHub
```bash
# Ya tienes git inicializado, ahora crea el repo en GitHub
# Luego ejecuta:
git remote add origin https://github.com/TU_USUARIO/pimepanama.git
git push -u origin main
git push origin dev
```

### 2. Configurar branches
```bash
# Main branch (producción)
git checkout main

# Dev branch (desarrollo)
git checkout dev
```

### 3. Workflow recomendado
```bash
# Desarrollo
git checkout dev
# ... hacer cambios ...
git add .
git commit -m "Feature: descripción"
git push origin dev

# Cuando esté listo para producción
git checkout main
git merge dev
git push origin main
```

---

## 🗄️ Base de Datos en Producción

### Problema con SQLite
SQLite no es ideal para producción en serverless porque:
- El archivo se pierde en cada deploy
- No es compartido entre instancias

### Soluciones:

#### Opción A: Vercel Postgres (Recomendado)
```bash
# Instalar
npm install @vercel/postgres

# Actualizar DATABASE_URL en Vercel
DATABASE_URL=postgres://...
```

#### Opción B: PlanetScale (MySQL)
```bash
# Actualizar schema.prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

#### Opción C: Supabase (PostgreSQL)
```bash
# Gratis hasta 500MB
DATABASE_URL=postgresql://...
```

> **Importante:** Si tu contraseña tiene caracteres especiales (`@`, `#`, `?`, etc.) debes [codificarlos en URL](https://en.wikipedia.org/wiki/Percent-encoding). Por ejemplo, `Th3m0stw@nt3dtopg` debe quedar como `Th3m0stw%40nt3dtopg` antes de pegarla en `DATABASE_URL` y `DIRECT_URL`.

---

## 📧 Email en Producción

### Configurar Resend
1. Crear cuenta en [resend.com](https://resend.com)
2. Obtener API key
3. Agregar a variables de entorno:
   ```
   RESEND_API_KEY=re_...
   ```
4. Descomentar código en `src/app/api/contact/route.ts`

---

## ✅ Checklist Pre-Deploy

- [ ] Variables de entorno configuradas
- [ ] Base de datos migrada a producción
- [ ] Email service configurado
- [ ] Dominio configurado
- [ ] SSL habilitado
- [ ] Admin password cambiado
- [ ] Google Search Console configurado
- [ ] Analytics instalado (opcional)

---

## 🎯 Recomendación Final

**Para PIME Panama, recomiendo usar Vercel:**

1. ✅ Deploy en 5 minutos
2. ✅ SSL automático
3. ✅ Integración con GitHub
4. ✅ Soporte completo para Next.js
5. ✅ Gratis para empezar
6. ✅ Fácil de escalar

**Firebase es mejor para:**
- Apps móviles con Flutter/React Native
- Proyectos que ya usan Firebase Auth
- Necesitas Firestore real-time

---

## 📞 Siguiente Paso

**¿Qué prefieres?**

1. **Vercel** (5 minutos, más fácil) ← Recomendado
2. **Firebase** (2-3 horas, más complejo)
3. **VPS** (control total, requiere DevOps)

Dime cuál prefieres y te guío paso a paso.

