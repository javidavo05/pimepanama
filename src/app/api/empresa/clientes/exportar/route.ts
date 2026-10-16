/** Descarga en CSV los clientes del filtro actual de la lista (los mismos que se ven, sin paginar). */
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { cargarClientes } from "@/lib/crm/listas-datos";
import { leerFiltros } from "@/lib/crm/listas";
import { aCsv, nombreArchivo } from "@/lib/crm/csv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const u = await requireEmpresaUser(request);
    const sp = Object.fromEntries(new URL(request.url).searchParams);
    const { filas } = await cargarClientes(u, leerFiltros(sp));
    const csv = aCsv(
      ["Nombre", "Empresa", "Correo", "Teléfono", "RUC", "Fuente", "Industria", "Etiquetas", "Responsable", "Saldo pendiente", "Último contacto"],
      filas.map((c) => [
        c.name, c.company, c.email, c.phone, c.ruc, c.fuente, c.industria, c.etiquetas.join(", "), c.responsable,
        c.internal ? "" : c.saldo.toFixed(2), c.contacto ? new Date(c.contacto) : "",
      ]),
    );
    return descarga(csv, nombreArchivo("clientes"));
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("[exportar clientes]", err);
    return Response.json({ error: "No se pudo preparar el archivo. Intenta de nuevo." }, { status: 500 });
  }
}

function descarga(csv: string, nombre: string) {
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${nombre}"`, "Cache-Control": "no-store" } });
}
