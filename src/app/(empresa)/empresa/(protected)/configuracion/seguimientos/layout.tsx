import { exigirSeccion } from "@/lib/auth/exigir";

/** Reglas de seguimiento del CRM: son de la empresa, solo el dueño (src/lib/auth/permisos.ts). */
export default async function Layout({ children }: { children: React.ReactNode }) {
  await exigirSeccion("empresa");
  return children;
}
