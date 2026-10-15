import Link from "next/link";
import { notFound } from "next/navigation";
import { getPortalUser } from "@/lib/portal/sesion";
import { ProyectoDetalle } from "@/components/portal/proyecto-detalle";
import { IconAtras } from "@/components/portal/iconos";

export const metadata = { title: "Proyecto" };

export default async function ProyectoCliente({ params }: { params: Promise<{ id: string }> }) {
  const p = await getPortalUser();
  const { id } = await params;
  const detalle = await ProyectoDetalle({ clientId: p.clientId, id });
  if (!detalle) notFound();
  return (
    <>
      <Link href="/cliente/proyectos" className="p-in group inline-flex items-center gap-1 min-h-11 text-sm font-semibold text-fg-dim hover:text-fg transition-colors"><IconAtras width={16} height={16} className="transition-transform group-hover:-translate-x-1" />Proyectos</Link>
      {detalle}
    </>
  );
}
