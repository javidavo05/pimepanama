/** Puerta de cada sección de /empresa según el área del miembro (src/lib/auth/permisos.ts). */
import { redirect } from "next/navigation";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { puedeVer, type Seccion } from "./permisos";

export async function exigirSeccion(seccion: Seccion) {
  const u = await getEmpresaUser();
  if (!puedeVer(u.miembro.area, seccion)) redirect(`/empresa?sin_permiso=${seccion}`);
  return u;
}
