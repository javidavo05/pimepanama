import { readFile } from "node:fs/promises";
import path from "node:path";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";

/** Descarga del paquete Pime Pulso (pulso.ts) para instalarlo en un sistema entregado. */
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireEmpresaUser(request);
    const fuente = await readFile(path.join(process.cwd(), "packages/pime-pulso/pulso.ts"), "utf8");
    return new Response(fuente, { headers: { "content-type": "text/plain; charset=utf-8", "content-disposition": 'attachment; filename="pulso.ts"', "cache-control": "no-store" } });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("[pulso/paquete]", err);
    return Response.json({ error: "No se pudo leer el paquete." }, { status: 500 });
  }
}
