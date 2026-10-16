# Brief para construir el CRM de Pime (fases 1–8)

Repo: Next.js 15 App Router + Prisma + Supabase. Panel del equipo en `src/app/(empresa)/empresa/(protected)/`, portal del cliente en `src/app/(cliente)/cliente/`. Todo el texto de la interfaz va en **español**, con palabras de negocio (nada de "CRUD", "sync", "endpoint").

## Esquema (YA está en la base y en prisma/schema.prisma — migración 0057)
No crees migraciones ni cambies `prisma/schema.prisma`. Si te falta un campo, dilo en tu informe final.
Modelos nuevos: `Contacto`, `CampoPersonalizado`, `Interaccion`, `EtapaEmbudo`, `Oportunidad`, `PlantillaCorreo`, `Campana`, `CampanaEnvio`, `BajaCorreo`, `VistaGuardada`, `Encuesta`, `ArchivoCliente`. Campos nuevos: `Client.fuente/industria/etiquetas(String[])/camposExtra(Json)/ultimoContactoAt/responsableId`, `Lead.etiquetas/responsableId`, `Task.clientId/leadId/oportunidadId/responsableId`, `CompanyConfig.reglasCrm(Json)`, `Project.mantenimientoActivo/mantenimientoMonto/mantenimientoDia/mantenimientoUltimoAt`, `Meeting.compartidaCliente`, `Document.aceptadaAt/aceptadaPor`. Lee los modelos en `prisma/schema.prisma` antes de escribir.

## Equipo y permisos (importante)
- `const u = await getEmpresaUser()` (`@/lib/supabase/get-empresa-user`). **`u.id` es el id del dueño**: filtra TODOS los datos con `userId: u.id`. **`u.miembro`** es quién entró: `{ id, email, fullName, area, esDueno }`. Lo personal (vistas guardadas, autor de una interacción) usa `u.miembro.id`.
- API: `requireEmpresaUser(request)` de `@/app/api/empresa/_auth` (devuelve lo mismo).
- Áreas y secciones en `src/lib/auth/permisos.ts` (`puedeVer(area, seccion)`, secciones `ventas`, `campanas`, `reportes` ya existen). Cada carpeta de sección nueva lleva un `layout.tsx` con `await exigirSeccion("<seccion>")` (`@/lib/auth/exigir`), igual que `src/app/(empresa)/empresa/(protected)/leads/layout.tsx`.
- Equipo para elegir responsable: `equipoDeLaEmpresa(u.id)` (`@/lib/auth/equipo-lista`).

## Patrones del código (cópialos)
- Server actions en archivos `"use server"` propios dentro de `src/app/(empresa)/empresa/(protected)/acciones-<tema>.ts`, con `useActionState` en el cliente y estado `{ ok?, error?, mensaje? }`. Ver `acciones-fechas.ts` y `src/components/empresa/clientes/fechas-pago.tsx`.
- Clases de formularios: `campo` y `etiqueta` de `@/components/empresa/clientes/formularios`; botones `btn.primary/secondary` de `@/components/empresa/page-header`; encabezado de página `PageHeader`.
- Línea de tiempo del cliente: `registrarEvento(...)` de `@/lib/portal/eventos`.
- Revalidar con `revalidatePath(...)` después de escribir.
- Fechas: `fechaCorta` de `@/lib/format-datetime`; dinero: `dinero` de `@/lib/portal/datos`.
- Correo a clientes: `enviarAlCliente({ to, subject, html, motivo })` de `@/lib/motor/envios` (sale por Resend).
- Archivos: hay R2 (busca `src/lib/r2` / `api/empresa/r2`). Push/campana: `notifyUser` de `@/lib/notifications/notify`.
- Latencia: cada consulta a Supabase tarda ~600 ms desde local. Junta consultas con `Promise.all`, nunca en bucle.

## Reglas de diseño (obligatorias)
- Escala de espacio 4/8/12/16/24/32/48 (clases Tailwind p-1,2,3,4,6,8,12). Una sola tipografía. Toques de 44 px (`min-h-11`).
- Toda vista con datos tiene estado vacío que explica qué va ahí y ofrece la primera acción; error con mensaje claro.
- El botón principal dice qué va a pasar ("Guardar contacto", no "Enviar"). Pre-rellena lo que se pueda inferir.
- Leyenda corta bajo cada título de pantalla; leyenda en cada campo no obvio.
- Debe verse bien en teléfono (grid que se apila, `min-w-0`, `[overflow-wrap:anywhere]` en textos largos).

## Cómo terminar
- `npx tsc --noEmit -p .` sin errores. Lógica pura con prueba en `src/lib/crm/*.test.ts` (`node:test`, ver `src/lib/auth/permisos.test.ts`); corre `node --import tsx --test src/lib/crm/*.test.ts`.
- **No** corras `next build` (otros trabajos corren en paralelo), **no** hagas push, **no** toques la base (ni scripts que escriban), **no** edites `src/components/empresa/sidebar-nav.tsx`, `configuracion/page.tsx` ni archivos que tu encargo dice que son de otro trabajo.
- Commit en tu rama con `git add -A && git commit -m "..."` terminando el mensaje con la línea `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Informe final: qué hiciste, archivos nuevos y tocados, rutas nuevas, y qué hay que conectar desde fuera (por ejemplo, un componente que va en la ficha del cliente).
