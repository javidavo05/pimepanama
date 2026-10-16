import { exigirSeccion } from "@/lib/auth/exigir";

/** Solo las áreas que ven «ventas» entran al embudo (src/lib/auth/permisos.ts). */
export default async function Layout({ children }: { children: React.ReactNode }) {
  await exigirSeccion("ventas");
  return children;
}
