import { exigirSeccion } from "@/lib/auth/exigir";

/** Tarifas y reglas de cobro de los clientes: solo el dueño (src/lib/auth/permisos.ts). */
export default async function Layout({ children }: { children: React.ReactNode }) {
  await exigirSeccion("empresa");
  return children;
}
