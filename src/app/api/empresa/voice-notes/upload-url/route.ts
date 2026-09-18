import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { withEmpresaRoute } from "@/app/api/empresa/_route";
import { assertR2Configured, generatePresignedUploadUrl } from "@/lib/r2";
import { MAX_VOICE_NOTE_BYTES, voiceNoteKeyPrefix } from "@/lib/voice-notes/storage";

export const runtime = "nodejs";

/**
 * Una función de Vercel no acepta cuerpos de más de ~4.5 MB, y una nota de
 * WhatsApp de seis minutos ya pesa más. El navegador sube el audio directo a R2
 * con esta URL firmada y a la ruta de transcripción solo le pasa la clave.
 */
export const POST = withEmpresaRoute(async (request) => {
  const user = await requireEmpresaUser(request);
  const { name, type, size } = (await request.json().catch(() => ({}))) as {
    name?: string;
    type?: string;
    size?: number;
  };

  if (typeof size === "number" && size > MAX_VOICE_NOTE_BYTES) {
    return NextResponse.json(
      { error: "Pesa más de 25 MB. Para una grabación larga usa «Grabar reunión → Subir audio»." },
      { status: 413 }
    );
  }

  assertR2Configured();
  const ext = (name?.split(".").pop() ?? "").toLowerCase().replace(/[^a-z0-9]/g, "") || "ogg";
  const key = `${voiceNoteKeyPrefix(user.id)}${randomUUID()}.${ext}`;
  const contentType = type || "application/octet-stream";
  const url = await generatePresignedUploadUrl(key, contentType);

  return NextResponse.json({ url, key, contentType });
});
