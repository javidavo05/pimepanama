"use client";

/**
 * Importar una reunión ya grabada: la exportación de un Zoom, una nota de voz,
 * un mp3 de una grabadora.
 *
 * Whisper no acepta un archivo de una hora de una sentada, así que el archivo se
 * decodifica en el navegador y se corta en tramos que sí caben. Cada tramo se
 * sube por la misma ruta que usa la grabación en vivo, con su `offsetMs`: para
 * el servidor una reunión importada y una grabada son exactamente lo mismo, y
 * todo lo que viene después —diarización, minutas, prompt— funciona igual.
 *
 * Se decodifica a 16 kHz mono, que es lo que Whisper usa internamente: subir más
 * calidad no mejora la transcripción y multiplica lo que hay que subir.
 */

/** Frecuencia de trabajo de Whisper. Más no aporta nada. */
const TARGET_RATE = 16_000;
/** 8 minutos a 16 kHz mono en WAV ≈ 15 MB, cómodo bajo el tope de 24 MB. */
const CHUNK_SECONDS = 8 * 60;
/**
 * Tope de audio decodificado en memoria. Un archivo más largo que esto revienta
 * la pestaña antes de llegar a subir nada, así que es mejor decirlo de entrada.
 */
const MAX_DECODED_SECONDS = 3 * 60 * 60;

export interface ImportedChunk {
  blob: Blob;
  index: number;
  offsetMs: number;
}

export interface ImportProgress {
  /** Tramos ya preparados y enviados al callback */
  done: number;
  total: number;
}

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // tamaño del bloque fmt
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // bytes por segundo
  view.setUint16(32, 2, true); // alineación de bloque
  view.setUint16(34, 16, true); // bits por muestra
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

/** Mezcla los canales a uno solo: para transcribir, el estéreo no aporta nada. */
function toMono(buffer: AudioBuffer): Float32Array {
  const channels = buffer.numberOfChannels;
  if (channels === 1) return buffer.getChannelData(0);

  const mono = new Float32Array(buffer.length);
  for (let c = 0; c < channels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < data.length; i++) mono[i] += data[i] / channels;
  }
  return mono;
}

export interface ImportOptions {
  file: File;
  onChunk: (chunk: ImportedChunk) => Promise<void>;
  onProgress?: (progress: ImportProgress) => void;
}

/**
 * Decodifica el archivo y va entregando los tramos en orden. El llamador decide
 * qué hacer con cada uno (subirlo); se espera a que termine antes de preparar el
 * siguiente, para no llenar la memoria con veinte WAV a la vez.
 */
export async function importAudioFile({
  file,
  onChunk,
  onProgress,
}: ImportOptions): Promise<{ durationMs: number; chunks: number }> {
  const arrayBuffer = await file.arrayBuffer();

  // Decodificar en un contexto a 16 kHz hace que el navegador remuestree durante
  // la decodificación, en vez de tener que hacerlo después sobre todo el audio.
  const ctx = new OfflineAudioContext(1, 1, TARGET_RATE);
  let decoded: AudioBuffer;
  try {
    decoded = await ctx.decodeAudioData(arrayBuffer);
  } catch {
    throw new Error(
      "No se pudo leer ese archivo de audio. Prueba con un mp3, m4a, wav o webm."
    );
  }

  if (decoded.duration > MAX_DECODED_SECONDS) {
    throw new Error(
      `El archivo dura ${Math.round(decoded.duration / 3600)} h y no cabe en memoria del navegador. Córtalo en partes de menos de 3 h.`
    );
  }

  const rate = decoded.sampleRate;
  const mono = toMono(decoded);
  const samplesPerChunk = Math.floor(CHUNK_SECONDS * rate);
  const total = Math.max(1, Math.ceil(mono.length / samplesPerChunk));

  for (let i = 0; i < total; i++) {
    const start = i * samplesPerChunk;
    const slice = mono.subarray(start, Math.min(start + samplesPerChunk, mono.length));
    if (slice.length === 0) break;

    await onChunk({
      blob: encodeWav(slice, rate),
      index: i,
      offsetMs: Math.round((start / rate) * 1000),
    });
    onProgress?.({ done: i + 1, total });
  }

  return { durationMs: Math.round(decoded.duration * 1000), chunks: total };
}
