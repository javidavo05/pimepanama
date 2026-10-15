import { getPortalUser } from "@/lib/portal/sesion";
import { prisma } from "@/lib/prisma";
import { ThemeToggleLabeled } from "@/components/empresa/theme/theme-toggle";
import { Encabezado, Etiqueta, Tarjeta, TituloSeccion, fechaCorta } from "@/components/portal/ui";
import { CambiarClave, CambiarRol, DobleVerificacion, InvitarCompanero, LogoEmpresa, QuitarCompanero } from "./cuenta-forms";

export const metadata = { title: "Tu cuenta" };

export default async function CuentaCliente() {
  const p = await getPortalUser();
  const personas = await prisma.clientUser.findMany({ where: { clientId: p.clientId, status: { not: "revocado" } }, orderBy: [{ role: "asc" }, { createdAt: "asc" }], select: { id: true, email: true, fullName: true, role: true, status: true, lastLoginAt: true } });
  return (
    <>
      <Encabezado eyebrow={p.client.company || p.client.name} titulo="Tu cuenta" detalle="Tus datos, tu contraseña, la doble verificación y las personas de tu empresa con acceso." />
      <div className="grid gap-6 lg:grid-cols-2 items-start">
        <Tarjeta i={1}>
          <TituloSeccion>Tus datos</TituloSeccion>
          <dl className="space-y-3 text-sm">
            <div><dt className="text-fg-dim">Nombre</dt><dd className="text-fg font-semibold break-words">{p.fullName || "—"}</dd></div>
            <div><dt className="text-fg-dim">Correo para entrar</dt><dd className="text-fg font-semibold break-all">{p.email}</dd></div>
            <div><dt className="text-fg-dim">Empresa</dt><dd className="text-fg font-semibold">{p.client.company || p.client.name}{p.client.ruc ? ` · RUC ${p.client.ruc}` : ""}</dd></div>
          </dl>
          <p className="mt-4 text-xs text-fg-faint">Para cambiar el correo o los datos de facturación, escríbenos en un ticket.</p>
        </Tarjeta>
        <Tarjeta i={2}><TituloSeccion>Logo de tu empresa</TituloSeccion><LogoEmpresa logo={p.client.logoKey ? `/api/cliente/logo?v=${encodeURIComponent(p.client.logoKey.slice(-12))}` : null} empresa={p.client.company || p.client.name} /></Tarjeta>
        <Tarjeta i={2}><TituloSeccion>Contraseña</TituloSeccion><CambiarClave /></Tarjeta>
        <Tarjeta i={3}><TituloSeccion>Apariencia</TituloSeccion><p className="text-fg-dim text-sm mb-4">Claro, oscuro o el mismo de tu teléfono o computadora.</p><ThemeToggleLabeled /></Tarjeta>
        <Tarjeta i={4}><TituloSeccion>Doble verificación</TituloSeccion><DobleVerificacion /></Tarjeta>
        <Tarjeta i={5}>
          <TituloSeccion>Personas con acceso</TituloSeccion>
          <ul className="divide-y divide-line">
            {personas.map((x) => (
              <li key={x.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1 basis-48">
                  <p className="text-fg text-sm font-semibold truncate">{x.fullName || x.email}{x.id === p.id ? " (tú)" : ""}</p>
                  <p className="text-fg-dim text-xs truncate">{x.email} · {x.status === "invitado" ? "Invitación enviada" : x.lastLoginAt ? `Entró el ${fechaCorta(x.lastLoginAt)}` : "Activa"}</p>
                </div>
                <Etiqueta tono={x.role === "principal" ? "marca" : "neutro"} vivo={false}>{x.role === "principal" ? "Dueño" : "Miembro"}</Etiqueta>
                {p.role === "principal" && x.id !== p.id && <CambiarRol id={x.id} rol={x.role} nombre={x.fullName || x.email} />}
                {p.role === "principal" && x.id !== p.id && <QuitarCompanero id={x.id} nombre={x.fullName || x.email} />}
              </li>
            ))}
          </ul>
          {p.role === "principal" ? <div className="mt-6 border-t border-line pt-6"><InvitarCompanero /></div> : <p className="mt-4 text-xs text-fg-faint">Solo los dueños de la cuenta pueden invitar, quitar accesos o dar permisos.</p>}
        </Tarjeta>
      </div>
    </>
  );
}
