import Link from "next/link";
import { getPortalUser } from "@/lib/portal/sesion";
import { prisma } from "@/lib/prisma";
import { proyectosDelCliente } from "@/lib/portal/datos";
import { Encabezado, Tarjeta } from "@/components/portal/ui";
import { IconAtras } from "@/components/portal/iconos";
import { NuevoTicketForm } from "./nuevo-form";

export const metadata = { title: "Abrir un ticket" };

export default async function NuevoTicket({ searchParams }: { searchParams: Promise<{ proyecto?: string; tipo?: string }> }) {
  const p = await getPortalUser();
  const { proyecto, tipo } = await searchParams;
  const proyectos = await prisma.project.findMany({ where: { ...proyectosDelCliente(p.clientId), status: { in: ["ACTIVE", "PAUSED", "COMPLETED"] } }, select: { id: true, name: true }, orderBy: { updatedAt: "desc" } });
  return (
    <>
      <Link href="/cliente/tickets" className="p-in group inline-flex items-center gap-1 min-h-11 text-sm font-semibold text-fg-dim hover:text-fg transition-colors"><IconAtras width={16} height={16} className="transition-transform group-hover:-translate-x-1" />Tickets</Link>
      <Encabezado titulo="Abrir un ticket" detalle="Mientras más detalle y capturas, más rápido lo resolvemos." />
      <Tarjeta className="max-w-3xl">
        <NuevoTicketForm proyectos={proyectos} proyectoInicial={proyectos.find((x) => x.id === proyecto)?.id ?? (proyectos.length === 1 ? proyectos[0].id : "")} tipoInicial={tipo === "cambio" || tipo === "nuevo" ? tipo : "soporte"} />
      </Tarjeta>
    </>
  );
}
