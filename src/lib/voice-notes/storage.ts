/** Tope de Whisper por archivo. Una nota de WhatsApp de 10 min pesa ~10 MB en mp4. */
export const MAX_VOICE_NOTE_BYTES = 25 * 1024 * 1024;

/**
 * Las notas pasan por R2 solo para esquivar el límite de cuerpo de Vercel: la
 * ruta de transcripción las borra al terminar. La carpeta por usuario impide
 * pedir la transcripción de una clave ajena.
 */
export function voiceNoteKeyPrefix(userId: string): string {
  return `voice-notes-tmp/${userId}/`;
}
