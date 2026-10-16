/** Descarga en CSV todas las personas de contacto de los clientes activos de la empresa. */
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { aCsv, nombreArchivo } from "@/lib/crm/csv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROL: Record<string, string> = { decide: "Decide", paga: "Paga", tecnico: "Técnico", otro: "Otro" };

export async function GET(request: Request) {
  try {
    const u = await requireEmpresaUser(request);
    const clientId = new URL(request.url).searchParams.get("cliente")?.slice(0, 40) || undefined;
    const contactos = await prisma.contacto.findMany({
      where: { userId: u.id, clientId, client: { archivedAt: null } },
      orderBy: [{ client: { name: "asc" } }, { principal: "desc" }, { nombre: "asc" }],
      select: { nombre: true, cargo: true, email: true, telefono: true, rol: true, principal: true, notas: true, client: { select: { name: true, company: true } } },
    });
    const csv = aCsv(
      ["Nombre", "Cargo", "Correo", "Teléfono", "Rol", "Principal", "Cliente", "Empresa", "Notas"],
      contactos.map((c) => [c.nombre, c.cargo, c.email, c.telefono, ROL[c.rol] ?? c.rol, c.principal ? "Sí" : "No", c.client.name, c.client.company, c.notas]),
    );
    return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${nombreArchivo("contactos")}"`, "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("[exportar contactos]", err);
    return Response.json({ error: "No se pudo preparar el archivo. Intenta de nuevo." }, { status: 500 });
  }
}
