import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { withEmpresaRoute } from "@/app/api/empresa/_route";
import { createDeviceToken } from "@/lib/devices/tokens";

export const runtime = "nodejs";

/**
 * Vincula una app nativa. La llave solo sale en esta respuesta: el navegador la
 * pasa a la app por el enlace pimeguard:// y no queda guardada en ningún lado.
 */
export const POST = withEmpresaRoute(async (request) => {
  const user = await requireEmpresaUser(request);
  const body = (await request.json().catch(() => ({}))) as { name?: string };
  const name = body.name?.trim() || "Mac";
  const { token, device } = await createDeviceToken(user.id, name);
  return NextResponse.json({ token, device });
});
