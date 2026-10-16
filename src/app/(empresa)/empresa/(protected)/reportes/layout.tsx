import { exigirSeccion } from "@/lib/auth/exigir";

/** Solo las áreas que ven «reportes» entran a esta sección (src/lib/auth/permisos.ts). */
export default async function Layout({ children }: { children: React.ReactNode }) {
  await exigirSeccion("reportes");
  return children;
}
