import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { VISTA_COOKIE } from "@/lib/portal/vista";

/** Cierra la vista de revisión y vuelve a la ficha del cliente (pestaña Cuenta). La sesión del equipo sigue. */
export async function GET(request: Request) {
  const id = (await cookies()).get(VISTA_COOKIE)?.value;
  const r = NextResponse.redirect(new URL(id ? `/empresa/clientes/${encodeURIComponent(id)}?tab=cuenta` : "/empresa/clientes", request.url), 303);
  r.cookies.delete(VISTA_COOKIE);
  return r;
}
