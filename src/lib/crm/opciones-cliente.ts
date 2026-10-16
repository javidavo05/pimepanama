/** Lo que el formulario del cliente sugiere: campos propios del dueño, industrias y etiquetas ya usadas. Una ida a la base. */
import { prisma } from "@/lib/prisma";
import { INDUSTRIAS_SUGERIDAS } from "./ficha";

export async function opcionesCrmCliente(userId: string) {
  const [campos, usados] = await Promise.all([
    prisma.campoPersonalizado.findMany({ where: { userId, entidad: "cliente" }, orderBy: [{ orden: "asc" }, { createdAt: "asc" }], select: { clave: true, etiqueta: true, tipo: true, opciones: true } }).catch(() => []),
    prisma.client.findMany({ where: { userId }, select: { industria: true, etiquetas: true } }).catch(() => []),
  ]);
  const cuenta = new Map<string, number>();
  for (const c of usados) for (const t of c.etiquetas) cuenta.set(t, (cuenta.get(t) ?? 0) + 1);
  const industrias = [...new Set([...usados.map((c) => c.industria?.trim()).filter((x): x is string => !!x), ...INDUSTRIAS_SUGERIDAS])].sort((a, b) => a.localeCompare(b, "es"));
  return { campos, industrias, etiquetasUsadas: [...cuenta.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t) };
}
