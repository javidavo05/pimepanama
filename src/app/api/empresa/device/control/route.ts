import { NextResponse } from "next/server";
import { withEmpresaRoute } from "@/app/api/empresa/_route";
import { requireDevice } from "@/lib/devices/tokens";
import { canalDeControl, realtimeConfig } from "@/lib/devices/control";

export const runtime = "nodejs";

/**
 * La Mac pide su canal del control de slides una vez y lo guarda: después
 * habla directo con Supabase Realtime, sin volver a pasar por aquí.
 */
export const GET = withEmpresaRoute(async (request) => {
  const device = await requireDevice(request);
  const { url, anonKey } = realtimeConfig();
  return NextResponse.json({ canal: canalDeControl(device.id), supabaseUrl: url, anonKey });
});
