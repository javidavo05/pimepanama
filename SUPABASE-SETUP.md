# Configuración de Supabase para PIME Panama

## 🎯 Ventajas de Supabase

✅ **500MB de base de datos GRATIS**
✅ PostgreSQL completo
✅ Sin tarjeta de crédito requerida
✅ Backups automáticos
✅ Dashboard para ver datos
✅ API REST automática

---

## 📝 Paso 1: Crear Proyecto en Supabase

1. Ve a: https://supabase.com/dashboard/sign-up
2. Sign up con GitHub (más rápido)
3. Click en **"New Project"**
4. Configura:
   - **Name:** `pimepanama`
   - **Database Password:** Genera uno seguro (guárdalo)
   - **Region:** `East US (North Virginia)` (más cercano)
   - **Pricing Plan:** Free (seleccionado por defecto)
5. Click en **"Create new project"**
6. Espera 2-3 minutos mientras se crea

---

## 📋 Paso 2: Obtener Connection String

Una vez creado el proyecto:

1. En el dashboard de Supabase, ve a **Settings** (⚙️ abajo a la izquierda)
2. Click en **"Database"**
3. Scroll hasta **"Connection string"**
4. Selecciona la pestaña **"URI"**
5. Copia la connection string que se ve así:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxx.supabase.co:5432/postgres
   ```
6. **Importante:** Reemplaza `[YOUR-PASSWORD]` con el password que generaste

---

## 🔧 Paso 3: Configurar en Vercel

Ve a tu proyecto en Vercel → **Settings** → **Environment Variables**

### Actualizar/Agregar:

```
Name: DATABASE_URL
Value: postgresql://postgres:TU-PASSWORD@db.xxxxxxxxxxxx.supabase.co:5432/postgres
Environment: ✅ Production ✅ Preview ✅ Development
```

**⚠️ Importante:** Reemplaza con tu connection string real de Supabase

---

## 🗄️ Paso 4: Crear las Tablas en Supabase

Después de configurar la variable en Vercel, necesitamos crear las tablas.

### Opción A: Desde Local (Recomendado)

1. Crea un archivo `.env.local` con tu connection string:
   ```env
   DATABASE_URL="postgresql://postgres:TU-PASSWORD@db.xxxx.supabase.co:5432/postgres"
   ```

2. Genera y aplica las migraciones:
   ```bash
   npx prisma migrate dev --name init
   ```

3. Seed la base de datos:
   ```bash
   npm run db:seed
   ```

### Opción B: Desde Supabase SQL Editor

1. En Supabase Dashboard → **SQL Editor**
2. Copia y pega el SQL de las migraciones
3. Ejecuta el SQL

---

## 🔄 Paso 5: Redeploy en Vercel

1. Ve a **Deployments**
2. Click en **"Redeploy"** del último deployment
3. Espera 2-3 minutos

---

## ✅ Verificar que Funciona

### Probar el Admin:

1. Ve a: `https://tu-sitio.vercel.app/admin/login`
2. Login con:
   - Email: `founder@pimepanama.com`
   - Password: `ChangeMe123!`
3. Deberías poder acceder al panel de admin
4. Edita contenido y guarda
5. Verifica que los cambios aparezcan en el sitio

---

## 🎯 Resumen de Pasos

- [ ] 1. Crear proyecto en Supabase
- [ ] 2. Copiar connection string
- [ ] 3. Agregar DATABASE_URL en Vercel
- [ ] 4. Ejecutar migraciones localmente
- [ ] 5. Seed la base de datos
- [ ] 6. Redeploy en Vercel
- [ ] 7. Probar admin panel

---

## 💡 Tips

### Ver tus Datos en Supabase:
- Dashboard → **Table Editor**
- Puedes ver/editar datos directamente

### Backups:
- Supabase hace backups automáticos diarios
- Puedes restaurar desde el dashboard

### Monitoreo:
- Dashboard → **Database** → **Logs**
- Ve queries en tiempo real

---

## ❓ ¿Necesitas Ayuda?

Una vez que tengas el connection string de Supabase, avísame y te ayudo a:
1. Ejecutar las migraciones
2. Seed la base de datos
3. Verificar que todo funcione

**¿Ya creaste el proyecto en Supabase?** 🚀

