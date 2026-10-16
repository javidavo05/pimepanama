import Link from "next/link";
import { notFound } from "next/navigation";
import { getPortalUser } from "@/lib/portal/sesion";
import { reunionCompartida } from "@/lib/portal/datos";
import { minutaParaCliente } from "@/lib/portal/documentos";
import { Encabezado, Tarjeta, Vacio, btnSecundario, fechaCorta } from "@/components/portal/ui";
import { IconAtras } from "@/components/portal/iconos";
import { MinutaEjecutiva } from "@/components/portal/minuta";

export const metadata = { title: "Minuta de reunión" };

export default async function ReunionCliente({ params }: { params: Promise<{ id: string }> }) {
  const p = await getPortalUser();
  const { id } = await params;
  const r = await reunionCompartida(p.clientId, id);
  if (!r) notFound();
  const m = minutaParaCliente(r.executiveMinutes);
  const minutos = Math.round(r.durationMs / 60000);
  return (
    <>
      <Link href="/cliente/reuniones" className="p-in group inline-flex items-center gap-1 min-h-11 text-sm font-semibold text-fg-dim hover:text-fg transition-colors"><IconAtras width={16} height={16} className="transition-transform group-hover:-translate-x-1" />Reuniones</Link>
      <Encabezado eyebrow={`Reunión del ${fechaCorta(r.meetingDate)}`} titulo={r.title} detalle={[r.project?.name, minutos > 0 ? `${minutos} min` : null].filter(Boolean).join(" · ") || undefined} />
      <Tarjeta i={1}>
        {m ? <MinutaEjecutiva m={m} /> : (
          <Vacio titulo="La minuta todavía no está lista" texto="Pime compartió esta reunión, pero su minuta se está terminando. Vuelve en un rato; si necesitas algo de lo hablado, escríbenos."
            accion={<Link href="/cliente/tickets/nuevo" className={btnSecundario}>Escribirle a Pime</Link>} />
        )}
      </Tarjeta>
      {m && <p className="text-fg-faint text-xs leading-relaxed">Si algo de la minuta no refleja lo que acordamos, abre un ticket y lo corregimos.</p>}
    </>
  );
}
