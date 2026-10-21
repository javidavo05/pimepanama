/** Descarga en CSV los leads de la empresa (todos, o los de un estado con ?estado=NUEVO). */
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { equipoDeLaEmpresa } from "@/lib/auth/equipo-lista";
import { aCsv, nombreArchivo } from "@/lib/crm/csv";
import type { LeadStatus } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ESTADO: Record<string, string> = { NUEVO: "Nuevo", CONTACTADO: "Contactado", COTIZANDO: "Cotizando", NEGOCIACION: "Negociación", GANADO: "Ganado", PERDIDO: "Perdido" };
const FUENTE: Record<string, string> = { REFERIDO: "Referido", WEB: "Web", REDES_SOCIALES: "Redes sociales", FERIA: "Feria", LLAMADA_FRIA: "Llamada en frío", CORREO: "Correo", OTRO: "Otro" };
const PRIORIDAD: Record<string, string> = { ALTA: "Alta", MEDIA: "Media", BAJA: "Baja" };

export async function GET(request: Request) {
  try {
    const u = await requireEmpresaUser(request);
    const estado = new URL(request.url).searchParams.get("estado") ?? "";
    const [leads, equipo] = await Promise.all([
      prisma.lead.findMany({
        where: { userId: u.id, ...(estado in ESTADO ? { status: estado as LeadStatus } : {}) },
        orderBy: { createdAt: "desc" },
        select: { name: true, company: true, email: true, phone: true, city: true, source: true, status: true, priority: true, estimatedValue: true, etiquetas: true, responsableId: true, nextFollowUpAt: true, notes: true, createdAt: true },
      }),
      equipoDeLaEmpresa(u.id),
    ]);
    const nombre = new Map(equipo.map((e) => [e.id, e.nombre]));
    const csv = aCsv(
      ["Nombre", "Empresa", "Correo", "Teléfono", "Ciudad", "Fuente", "Estado", "Prioridad", "Valor estimado", "Etiquetas", "Responsable", "Próximo seguimiento", "Creado", "Notas"],
      leads.map((l) => [
        l.name, l.company, l.email, l.phone, l.city, FUENTE[l.source] ?? l.source, ESTADO[l.status] ?? l.status, PRIORIDAD[l.priority] ?? l.priority,
        l.estimatedValue != null ? Number(l.estimatedValue).toFixed(2) : "", l.etiquetas.join(", "),
        l.responsableId ? nombre.get(l.responsableId) ?? "" : "", l.nextFollowUpAt ?? "", l.createdAt, l.notes,
      ]),
    );
    return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${nombreArchivo("leads")}"`, "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("[exportar leads]", err);
    return Response.json({ error: "No se pudo preparar el archivo. Intenta de nuevo." }, { status: 500 });
  }
}
