import { exigirSeccion } from "@/lib/auth/exigir";

/** Solo las áreas que ven «cotizaciones» entran a esta sección (src/lib/auth/permisos.ts). */
export default async function Layout({ children }: { children: React.ReactNode }) {
  await exigirSeccion("cotizaciones");
  return children;
}
