# Pime Panamá — Reglas del proyecto

## Despliegue (Deploy)

- **Mecanismo:** El sitio se despliega por integración **GitHub → Vercel**. NO hay Vercel CLI ni `firebase deploy` en el flujo normal.
- **Repo:** `https://github.com/javidavo05/pimepanama`
- **Branch de producción:** `main` → cada `git push origin main` dispara automáticamente un build y deploy en Vercel.
- **Producción:** `https://pimepanama.com`
- **"Desplegar" = `git push origin main`.** No existe otro paso manual de deploy.

## REGLA: validar SIEMPRE antes de desplegar

Antes de cualquier `git push` a `main` (= antes de cualquier deploy):

1. Ejecutar `npm run build` y confirmar que **termina sin errores**.
2. Si el build falla, **NO** hacer push. Arreglar primero.
3. Solo después de un build verde se hace `git push origin main`.

Nunca desplegar código que no haya pasado `npm run build` localmente.

## Variables y datos que NO se arreglan con push (viven en Vercel, no en git)

- `NEXT_PUBLIC_SITE_URL` y `DATABASE_URL` son variables de entorno en el dashboard de Vercel. `.env` y `.env.local` están en `.gitignore` y no se despliegan.
- El contenido del sitio (hero/H1, servicios, sectores, SEO meta) vive en la **base de datos**, no en el código. Para actualizarlo en producción se corre `npm run db:update-content` contra la `DATABASE_URL` de prod (no `db:seed`, que reescribe el contenido viejo industrial).
