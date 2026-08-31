"use client";

/**
 * Motor de captura de audio de una reunión.
 *
 * La idea central: cuando el micrófono y el audio de la videollamada entran por
 * dos fuentes distintas, no se mezclan. Cada fuente se graba en su propio canal,
 * y entonces saber quién habló deja de ser un problema de IA — el canal ya lo
 * dice, en el momento, sin esperar a que termine la reunión.
 *
 * Cada canal se graba en tramos cortos e independientes: se reinicia el
 * MediaRecorder en vez de pedirle `timeslice`, porque los trozos de un mismo
 * recorder no son webm decodificables por separado y Whisper no los acepta.
 */

export type CaptureMode = "mic" | "ambient" | "device" | "tab";
export type CaptureChannel = "LOCAL" | "REMOTE";

export interface CaptureSegment {
  blob: Blob;
  channel: CaptureChannel;
  index: number;
  /** ms desde el inicio de la grabación */
  offsetMs: number;
}

export interface CaptureConfig {
  mode: CaptureMode;
  micDeviceId?: string;
  /** Dispositivo de entrada que trae el audio del sistema (BlackHole, Loopback, VB-Cable…) */
  systemDeviceId?: string;
  segmentMs: number;
  onSegment: (segment: CaptureSegment) => void;
  /** Nivel de voz 0-1 por canal, para ver quién está hablando ahora mismo */
  onLevels: (levels: Record<CaptureChannel, number>) => void;
  /** Avisos no fatales: se pudo grabar, pero peor de lo pedido */
  onNotice: (message: string) => void;
}

interface ChannelState {
  channel: CaptureChannel;
  dest: MediaStreamAudioDestinationNode;
  analyser: AnalyserNode;
  buffer: Uint8Array<ArrayBuffer>;
  recorder: MediaRecorder | null;
  timer: ReturnType<typeof setTimeout> | null;
  segmentStart: number;
  index: number;
  /** Se resuelve cuando el último tramo del canal ya salió hacia la cola de subida */
  drained: (() => void) | null;
}

/** Cada cuánto se le reporta el nivel a la UI. Más rápido no se percibe. */
const LEVEL_INTERVAL_MS = 66;

/** Procesado de voz: bueno para el micrófono, destructivo para una línea de loopback. */
const VOICE_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

/** Sin procesar: para captar la sala entera o una línea de audio del sistema. */
const RAW_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
};

export function pickMimeType(): string {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  for (const type of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

/** Nombres típicos de dispositivos de loopback en macOS y Windows. */
const LOOPBACK_HINT = /blackhole|loopback|aggregate|agregado|vb-?cable|virtual|soundflower|stereo mix|mezcla est/i;

export function looksLikeLoopback(label: string): boolean {
  return LOOPBACK_HINT.test(label);
}

export class MeetingCapture {
  private config: CaptureConfig;
  private ctx: AudioContext | null = null;
  private streams: MediaStream[] = [];
  private channels: ChannelState[] = [];
  private startedAt = 0;
  private stopping = false;
  private levelTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: CaptureConfig) {
    this.config = config;
  }

  /** Canales que quedaron activos después de negociar permisos. */
  get activeChannels(): CaptureChannel[] {
    return this.channels.map((c) => c.channel);
  }

  async start(): Promise<void> {
    const { mode, micDeviceId, systemDeviceId } = this.config;
    const ctx = new AudioContext();
    this.ctx = ctx;

    // ── Canal local: el micrófono ──────────────────────────────────────────
    // En modo ambiente se desactiva todo el procesado a propósito: queremos que
    // el micrófono capte también lo que sale por los altavoces, que es
    // justamente lo que la cancelación de eco existe para borrar.
    const mic = await navigator.mediaDevices.getUserMedia({
      audio: {
        ...(mode === "ambient" ? RAW_CONSTRAINTS : VOICE_CONSTRAINTS),
        ...(micDeviceId ? { deviceId: { exact: micDeviceId } } : {}),
      },
    });
    this.streams.push(mic);
    this.addChannel("LOCAL", ctx, mic);

    // ── Canal remoto: el audio de la videollamada ──────────────────────────
    if (mode === "device" && systemDeviceId) {
      try {
        const system = await navigator.mediaDevices.getUserMedia({
          audio: { ...RAW_CONSTRAINTS, deviceId: { exact: systemDeviceId } },
        });
        this.streams.push(system);
        this.addChannel("REMOTE", ctx, system);
      } catch {
        this.config.onNotice(
          "No se pudo abrir el dispositivo de audio del sistema. Se graba solo tu micrófono."
        );
      }
    }

    if (mode === "tab") {
      try {
        // Chrome solo entrega audio de pestaña si también se pide vídeo; el
        // track de vídeo se descarta, solo va el audio al canal remoto.
        const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        this.streams.push(display);
        display.getVideoTracks().forEach((t) => t.stop());
        const audioTracks = display.getAudioTracks();
        if (audioTracks.length === 0) {
          this.config.onNotice(
            "Compartiste la pantalla sin audio. Solo se graba tu micrófono: para incluir al cliente, comparte una pestaña y marca «Compartir audio de la pestaña»."
          );
        } else {
          this.addChannel("REMOTE", ctx, new MediaStream(audioTracks));
        }
      } catch {
        this.config.onNotice("No se compartió la pestaña. Se graba solo tu micrófono.");
      }
    }

    this.startedAt = Date.now();
    this.stopping = false;

    // El canal remoto arranca desfasado medio tramo para que las subidas de los
    // dos canales no caigan siempre juntas y la cola no se atragante.
    for (const channel of this.channels) {
      const delay = channel.channel === "REMOTE" ? this.config.segmentMs / 2 : this.config.segmentMs;
      this.startSegment(channel, delay);
    }

    this.levelTimer = setInterval(() => this.reportLevels(), LEVEL_INTERVAL_MS);
  }

  private addChannel(channel: CaptureChannel, ctx: AudioContext, stream: MediaStream): void {
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    const dest = ctx.createMediaStreamDestination();
    source.connect(analyser);
    source.connect(dest);

    this.channels.push({
      channel,
      dest,
      analyser,
      buffer: new Uint8Array(new ArrayBuffer(analyser.fftSize)),
      recorder: null,
      timer: null,
      segmentStart: 0,
      index: 0,
      drained: null,
    });
  }

  private startSegment(state: ChannelState, durationMs: number): void {
    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(state.dest.stream, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
      if (blob.size > 0) {
        this.config.onSegment({
          blob,
          channel: state.channel,
          index: state.index++,
          offsetMs: Math.max(0, state.segmentStart - this.startedAt),
        });
      }
      if (this.stopping) {
        state.drained?.();
        state.drained = null;
      } else {
        this.startSegment(state, this.config.segmentMs);
      }
    };

    state.segmentStart = Date.now();
    state.recorder = recorder;
    recorder.start();
    state.timer = setTimeout(() => {
      if (recorder.state !== "inactive") recorder.stop();
    }, durationMs);
  }

  private reportLevels(): void {
    const levels: Record<CaptureChannel, number> = { LOCAL: 0, REMOTE: 0 };
    for (const state of this.channels) {
      state.analyser.getByteTimeDomainData(state.buffer);
      let sum = 0;
      for (let i = 0; i < state.buffer.length; i++) {
        const v = (state.buffer[i] - 128) / 128;
        sum += v * v;
      }
      // RMS escalado: la voz normal ronda 0.05-0.2 en crudo, así que se
      // amplifica para que la barra use todo su recorrido.
      const rms = Math.sqrt(sum / state.buffer.length);
      levels[state.channel] = Math.min(1, rms * 6);
    }
    this.config.onLevels(levels);
  }

  /** Cierra el tramo en curso de cada canal y espera a que salgan hacia la cola. */
  async stop(): Promise<void> {
    this.stopping = true;
    if (this.levelTimer) clearInterval(this.levelTimer);
    this.levelTimer = null;

    await Promise.all(
      this.channels.map(
        (state) =>
          new Promise<void>((resolve) => {
            if (state.timer) clearTimeout(state.timer);
            state.timer = null;
            if (!state.recorder || state.recorder.state === "inactive") {
              resolve();
              return;
            }
            state.drained = resolve;
            state.recorder.stop();
            // Si el recorder no dispara `onstop` (pestaña en segundo plano, un
            // track ya muerto) no dejamos colgado el cierre de la reunión.
            setTimeout(resolve, 4000);
          })
      )
    );

    this.config.onLevels({ LOCAL: 0, REMOTE: 0 });
  }

  /** Suelta micrófono y pestaña. Después de esto la instancia no se reutiliza. */
  release(): void {
    if (this.levelTimer) clearInterval(this.levelTimer);
    this.levelTimer = null;
    for (const state of this.channels) {
      if (state.timer) clearTimeout(state.timer);
      if (state.recorder && state.recorder.state !== "inactive") {
        try {
          state.recorder.stop();
        } catch {
          // Un recorder ya muerto al desmontar no es un error que reportar.
        }
      }
    }
    this.channels = [];
    this.streams.forEach((s) => s.getTracks().forEach((t) => t.stop()));
    this.streams = [];
    this.ctx?.close().catch(() => undefined);
    this.ctx = null;
  }
}
