import Link from "@/components/empresa/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { FilaCampo, FormCampo } from "@/components/empresa/crm-ficha/campos-config";
import { card, h2 } from "@/components/empresa/crm-ficha/comun";

export const metadata = { title: "Campos propios — Pime Suite" };

export default async function CamposPropiosPage() {
  const u = await getEmpresaUser();
  const campos = await prisma.campoPersonalizado
    .findMany({ where: { userId: u.id, entidad: "cliente" }, orderBy: [{ orden: "asc" }, { createdAt: "asc" }], select: { id: true, etiqueta: true, tipo: true, opciones: true } })
    .catch(() => null);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <nav className="flex items-center gap-2 text-sm text-fg-dim" aria-label="Ruta">
        <Link href="/empresa/configuracion" className="inline-flex items-center min-h-11 sm:min-h-8 hover:text-fg-mute">Configuración</Link><span aria-hidden>/</span><span className="text-fg-mute">Campos propios</span>
      </nav>
      <div>
        <h1 className="text-fg text-2xl font-semibold tracking-tight">Campos propios de cada cliente</h1>
        <p className="text-fg-dim text-sm mt-1">Los datos que tu negocio necesita y la ficha no trae, como el número de sucursales o la fecha de aniversario. Salen al editar cada cliente.</p>
      </div>

      <section className={card}>
        <h2 className={h2}>Agregar un campo</h2>
        <div className="mt-4"><FormCampo /></div>
      </section>

      <section className={card}>
        <h2 className={h2}>Tus campos{campos?.length ? ` · ${campos.length}` : ""}</h2>
        {campos === null ? (
          <p className="mt-2 text-sm text-danger" role="alert">No se pudieron cargar los campos. Recarga la página.</p>
        ) : campos.length ? (
          <ul className="mt-2 divide-y divide-line">{campos.map((k) => <FilaCampo key={k.id} k={k} />)}</ul>
        ) : (
          <p className="mt-2 text-sm text-fg-dim">Todavía no hay campos propios. Agrega el primero arriba: aparece enseguida en el formulario de cada cliente.</p>
        )}
      </section>
    </div>
  );
}
