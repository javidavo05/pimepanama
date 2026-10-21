/**
 * Pasar la voz a texto. Primero prueba el oído local de Jarvis (Whisper de github.com/openai/whisper corriendo
 * en la Mac, ver ~/jarvis/oido): gratis, privado y en menos de un segundo. Si no está prendido o falla, usa
 * Whisper en la nube (/api/empresa/ai/transcribe), como siempre.
 */
import { fetchLargo } from "@/lib/fetch-largo";

const LOCAL = "http://localhost:8765";
let local: boolean | null = null;
let revisado = 0;

/** ¿Hay un oído local en esta computadora? Se pregunta una vez por minuto, con un tope de 800 ms. */
export async function oidoLocal(): Promise<boolean> {
  if (local !== null && Date.now() - revisado < 60_000) return local;
  try {
    const r = await fetch(`${LOCAL}/salud`, { cache: "no-store", signal: AbortSignal.timeout(800) });
    local = r.ok;
  } catch {
    local = false;
  }
  revisado = Date.now();
  return local;
}

export type Transcripcion = { texto: string; local: boolean };

export async function transcribir(audio: Blob, idioma: "es" | "en" = "es"): Promise<Transcripcion> {
  if (await oidoLocal()) {
    try {
      const r = await fetch(`${LOCAL}/transcribir${idioma === "en" ? "?idioma=en" : ""}`, {
        method: "POST",
        headers: { "Content-Type": audio.type || "audio/webm" },
        body: audio,
        signal: AbortSignal.timeout(30_000),
      });
      const j = (await r.json().catch(() => ({}))) as { transcript?: string };
      if (r.ok && j.transcript?.trim()) return { texto: j.transcript.trim(), local: true };
    } catch {
      // El oído local se cayó a mitad: se marca apagado y se sigue con la nube.
    }
    local = false;
    revisado = Date.now();
  }
  const fd = new FormData();
  fd.append("audio", audio, `voz.${(audio.type || "").includes("mp4") ? "m4a" : "webm"}`);
  fd.append("language", idioma);
  const res = await fetchLargo("/api/empresa/ai/transcribe", { method: "POST", body: fd });
  const j = (await res.json().catch(() => ({}))) as { transcript?: string };
  if (!res.ok || !j.transcript?.trim()) throw new Error("No te entendí. Intenta otra vez, más cerca del micrófono.");
  return { texto: j.transcript.trim(), local: false };
}
