import { exigirSeccion } from "@/lib/auth/exigir";

/** Campos propios de los clientes: los define el dueño (src/lib/auth/permisos.ts). */
export default async function Layout({ children }: { children: React.ReactNode }) {
  await exigirSeccion("empresa");
  return children;
}
