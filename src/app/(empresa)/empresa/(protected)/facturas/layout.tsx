import { exigirSeccion } from "@/lib/auth/exigir";

/** Solo las áreas que ven «facturas» entran a esta sección (src/lib/auth/permisos.ts). */
export default async function Layout({ children }: { children: React.ReactNode }) {
  await exigirSeccion("facturas");
  return children;
}
