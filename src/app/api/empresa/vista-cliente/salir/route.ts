import { cookies } from "next/headers";
import { VISTA_COOKIE, irA } from "@/lib/portal/vista";

/** Cierra la vista de revisión y vuelve a la ficha del cliente (pestaña Cuenta). La sesión del equipo sigue. */
export async function GET() {
  const id = (await cookies()).get(VISTA_COOKIE)?.value;
  const r = irA(id ? `/empresa/clientes/${encodeURIComponent(id)}?tab=cuenta` : "/empresa/clientes");
  r.cookies.delete(VISTA_COOKIE);
  return r;
}
