"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AttendeeOrg, MeetingAttendee, MeetingSegment } from "@/lib/meetings/types";
import { withoutEchoes } from "@/lib/meetings/echo";
import { importAudioFile, type ImportProgress } from "./audio-import";
import { MeetingCapture, looksLikeLoopback, type CaptureChannel, type CaptureMode } from "./live-capture";
import { CHANNEL_ACCENT, LiveTranscript } from "./live-transcript";
import { isInstantSpeechSupported, useInstantSpeech } from "./use-instant-speech";

/**
 * Duración de cada tramo. Corto a propósito: es lo que hace que la transcripción
 * se vea avanzar durante la reunión. Cada tramo es un webm completo e
 * independiente — por eso se reinicia el MediaRecorder en vez de pedirle
 * `timeslice`: los trozos de un mismo recorder no se pueden transcribir sueltos.
 */
const SEGMENT_MS = 8_000;

interface ProjectOption {
  id: string;
  name: string;
  clientId: string | null;
}

interface ClientOption {
  id: string;
  name: string;
  company: string | null;
}

interface MeetingRecorderProps {
  projects: ProjectOption[];
  clients: ClientOption[];
  creatorName: string | null;
  /** Preselecciona el proyecto cuando se entra desde el detalle de un proyecto */
  initialProjectId?: string;
}

type Phase = "setup" | "recording" | "processing" | "done";

const STAGES = [
  { key: "diarize", label: "Separando quién habla" },
  { key: "minutes", label: "Redactando minuta ejecutiva y técnica" },
  { key: "items", label: "Extrayendo pendientes técnicos" },
  { key: "prompt", label: "Armando el prompt técnico" },
  // Va al final y sobre la transcripción, no sobre las minutas: si falla, la
  // reunión ya está completa y solo se queda sin índice de temas.
  { key: "chapters", label: "Armando el índice de temas" },
] as const;

interface ModeOption {
  key: CaptureMode;
  title: string;
  detail: string;
  tag: string;
  tagClass: string;
}

const CAPTURE_MODES: ModeOption[] = [
  {
    key: "device",
    title: "Micrófono + audio del sistema",
    detail:
      "Tu voz por un lado y la de la llamada por el otro, sin compartir pantalla. Necesita un dispositivo de audio virtual (BlackHole en Mac, VB-Cable en Windows) puesto como salida. Funciona con audífonos y sin ellos: por altavoz el micrófono capta también al cliente, pero esa repetición se descarta al analizar.",
    tag: "voces separadas",
    tagClass: "bg-green-500/15 text-green-400 border-green-500/25",
  },
  {
    key: "ambient",
    title: "Micrófono ambiente",
    detail:
      "El micrófono capta la sala completa: tu voz y lo que sale por los altavoces. No hay que compartir nada ni instalar nada, pero hay que estar sin audífonos y las voces se separan al final con IA, no en vivo.",
    tag: "sin configurar nada",
    tagClass: "bg-[#1AA7F0]/15 text-[#1AA7F0] border-[#1AA7F0]/25",
  },
  {
    key: "tab",
    title: "Micrófono + pestaña compartida",
    detail:
      "Chrome pide compartir una pestaña: eliges la del Meet o Zoom y marcas «Compartir audio de la pestaña». Separa voces igual de bien, pero obliga a compartir pantalla.",
    tag: "voces separadas",
    tagClass: "bg-green-500/15 text-green-400 border-green-500/25",
  },
  {
    key: "mic",
    title: "Solo mi micrófono",
    detail: "Para una nota de voz o una reunión presencial en la que solo hablas tú.",
    tag: "una sola voz",
    tagClass: "bg-white/[0.06] text-white/60 border-white/[0.12]",
  },
];

const CHANNEL_TITLE: Record<CaptureChannel, string> = {
  LOCAL: "Tu micrófono",
  REMOTE: "Audio de la llamada",
};

function formatClock(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Barra de nivel: es lo que deja ver quién está hablando sin esperar al texto. */
function LevelBar({ level, channel }: { level: number; channel: CaptureChannel }) {
  const accent = CHANNEL_ACCENT[channel];
  const talking = level > 0.12;
  return (
    <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-[width] duration-75 ${accent.dot} ${
          talking ? "opacity-100" : "opacity-40"
        }`}
        style={{ width: `${Math.round(level * 100)}%` }}
      />
    </div>
  );
}

export function MeetingRecorder({
  projects,
  clients,
  creatorName,
  initialProjectId,
}: MeetingRecorderProps) {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("setup");
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState(initialProjectId ?? "");
  const [clientId, setClientId] = useState("");
  const [language, setLanguage] = useState<"es" | "en">("es");
  const [meetingDate, setMeetingDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [attendees, setAttendees] = useState<MeetingAttendee[]>([
    { name: creatorName?.trim() || "Javier Vallejo", org: "PIME" },
    { name: "", org: "CLIENTE" },
  ]);

  const [mode, setMode] = useState<CaptureMode>("ambient");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [micDeviceId, setMicDeviceId] = useState("");
  const [systemDeviceId, setSystemDeviceId] = useState("");
  const [instantPreview, setInstantPreview] = useState(true);
  // El soporte solo se conoce en el navegador; resolverlo en el render daría un
  // HTML distinto en servidor y cliente.
  const [speechSupported, setSpeechSupported] = useState(false);

  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [segments, setSegments] = useState<MeetingSegment[]>([]);
  const [levels, setLevels] = useState<Record<CaptureChannel, number>>({ LOCAL: 0, REMOTE: 0 });
  const [activeChannels, setActiveChannels] = useState<CaptureChannel[]>([]);
  const [channelSpeaker, setChannelSpeaker] = useState<Record<CaptureChannel, string>>({
    LOCAL: "",
    REMOTE: "",
  });
  const [customChannel, setCustomChannel] = useState<Record<CaptureChannel, boolean>>({
    LOCAL: false,
    REMOTE: false,
  });
  // Borrador del nombre escrito a mano: se confirma al salir del campo o con
  // Enter, para no disparar una reasignación por cada tecla.
  const [customDraft, setCustomDraft] = useState<Record<CaptureChannel, string>>({
    LOCAL: "",
    REMOTE: "",
  });
  const [uploading, setUploading] = useState(0);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [stageIndex, setStageIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const captureRef = useRef<MeetingCapture | null>(null);
  const startedAtRef = useRef(0);
  // Las subidas se encadenan: el backend hace read-modify-write sobre el JSON de
  // segmentos, así que dos tramos en paralelo se pisarían.
  const uploadQueueRef = useRef<Promise<void>>(Promise.resolve());
  const meetingIdRef = useRef<string | null>(null);
  // El mapeo canal→persona lo lee la subida, que corre fuera del render.
  const speakerRef = useRef<Record<CaptureChannel, string>>({ LOCAL: "", REMOTE: "" });
  const lockSpeakersRef = useRef(false);

  const selectedProject = projects.find((p) => p.id === projectId);
  const namedAttendees = useMemo(
    () => attendees.filter((a) => a.name.trim()).map((a) => a.name.trim()),
    [attendees]
  );

  // En modo ambiente todo entra por el mismo micrófono: fijar un nombre al canal
  // le pondría tu nombre a lo que dijo el cliente. Ahí la separación la hace la
  // IA al final, y por eso no se bloquea ningún hablante.
  const lockSpeakers = mode !== "ambient";

  const interim = useInstantSpeech(phase === "recording" && instantPreview, language);
  const interimSpeaker =
    mode === "ambient" ? "Vista previa" : channelSpeaker.LOCAL || "Tu micrófono";

  useEffect(() => {
    if (selectedProject?.clientId && !clientId) setClientId(selectedProject.clientId);
  }, [selectedProject, clientId]);

  // Cronómetro de la grabación
  useEffect(() => {
    if (phase !== "recording") return;
    const t = setInterval(() => setElapsed(Date.now() - startedAtRef.current), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const loadDevices = useCallback(async (askPermission: boolean) => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      if (askPermission) {
        // Sin permiso concedido, `enumerateDevices` devuelve los dispositivos sin
        // nombre y no hay forma de reconocer cuál es el de loopback.
        const probe = await navigator.mediaDevices.getUserMedia({ audio: true });
        probe.getTracks().forEach((t) => t.stop());
      }
      const all = await navigator.mediaDevices.enumerateDevices();
      const inputs = all.filter((d) => d.kind === "audioinput" && d.deviceId);
      setDevices(inputs);

      const loopback = inputs.find((d) => looksLikeLoopback(d.label));
      if (loopback) {
        setSystemDeviceId((prev) => prev || loopback.deviceId);
        // Si la computadora ya tiene un dispositivo de loopback instalado, ese es
        // el mejor modo disponible: separa voces y no obliga a compartir pantalla.
        setMode((prev) => (prev === "ambient" ? "device" : prev));
      }
    } catch {
      setNotice("No se pudieron listar los dispositivos de audio.");
    }
  }, []);

  useEffect(() => {
    void loadDevices(false);
    setSpeechSupported(isInstantSpeechSupported());
  }, [loadDevices]);

  // Si el usuario abandona la página con la grabación viva, soltamos el micrófono.
  useEffect(() => () => captureRef.current?.release(), []);

  function updateAttendee(index: number, patch: Partial<MeetingAttendee>) {
    setAttendees((prev) => prev.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  }

  const uploadSegment = useCallback(
    async (blob: Blob, channel: CaptureChannel, index: number, offsetMs: number) => {
      const id = meetingIdRef.current;
      if (!id || blob.size === 0) return;

      const formData = new FormData();
      formData.append("audio", blob, `${channel.toLowerCase()}-${index}.webm`);
      formData.append("index", String(index));
      formData.append("offsetMs", String(offsetMs));
      formData.append("channel", channel);
      const speaker = speakerRef.current[channel];
      if (lockSpeakersRef.current && speaker) formData.append("speaker", speaker);

      setUploading((n) => n + 1);
      try {
        const res = await fetch(`/api/empresa/meetings/${id}/audio`, {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "No se pudo transcribir el tramo");
        }
        const data = await res.json();
        if (Array.isArray(data.segments) && data.segments.length > 0) {
          setSegments((prev) =>
            [...prev, ...(data.segments as MeetingSegment[])].sort((a, b) => a.start - b.start)
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error subiendo audio");
      } finally {
        setUploading((n) => n - 1);
      }
    },
    []
  );

  const enqueueUpload = useCallback(
    (blob: Blob, channel: CaptureChannel, index: number, offsetMs: number) => {
      uploadQueueRef.current = uploadQueueRef.current.then(() =>
        uploadSegment(blob, channel, index, offsetMs)
      );
    },
    [uploadSegment]
  );

  /**
   * Asigna una persona a un canal de audio. Reetiqueta también lo ya transcrito:
   * la conversación de arriba se corrige entera, no solo de aquí en adelante.
   */
  async function assignSpeaker(channel: CaptureChannel, name: string) {
    const speaker = name.trim();
    setChannelSpeaker((prev) => ({ ...prev, [channel]: speaker }));
    speakerRef.current = { ...speakerRef.current, [channel]: speaker };

    setSegments((prev) =>
      prev.map((seg) =>
        seg.channel === channel ? { ...seg, speaker: speaker || undefined, locked: !!speaker } : seg
      )
    );

    const id = meetingIdRef.current;
    if (!id || !lockSpeakersRef.current) return;
    await fetch(`/api/empresa/meetings/${id}/speakers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channels: [{ channel, speaker }] }),
    }).catch(() => setError("No se pudo guardar el nombre de esa voz. Se reintenta al finalizar."));
  }

  /** Crea la fila de la reunión. La comparten grabar en vivo e importar audio. */
  async function createMeeting(): Promise<string> {
    const res = await fetch("/api/empresa/meetings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        projectId: projectId || undefined,
        clientId: clientId || undefined,
        language,
        meetingDate,
        attendees: attendees.filter((a) => a.name.trim()),
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "No se pudo crear la reunión");
    }
    const meeting = await res.json();
    setMeetingId(meeting.id);
    meetingIdRef.current = meeting.id;
    return meeting.id as string;
  }

  /** Corre el análisis completo y lleva al detalle. Lo comparten ambos caminos. */
  async function processMeeting(id: string) {
    for (let i = 0; i < STAGES.length; i++) {
      setStageIndex(i);
      const res = await fetch(`/api/empresa/meetings/${id}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: STAGES[i].key }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          `${data.error ?? "Error procesando"} — la transcripción quedó guardada, puedes reintentar desde el detalle.`
        );
        setStageIndex(-1);
        router.push(`/empresa/reuniones/${id}`);
        return;
      }
    }

    setPhase("done");
    router.push(`/empresa/reuniones/${id}`);
    router.refresh();
  }

  /**
   * Importa un audio ya grabado. El archivo se decodifica y se corta aquí, en el
   * navegador: al servidor le llegan tramos idénticos a los de una grabación en
   * vivo, así que de ahí en adelante el camino es el mismo.
   */
  async function startImport() {
    setError(null);
    setNotice(null);

    if (!title.trim()) {
      setError("Ponle un título a la reunión.");
      return;
    }
    if (!importFile) {
      setError("Elige el archivo de audio.");
      return;
    }

    setBusy(true);
    let id: string;
    try {
      id = await createMeeting();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la reunión");
      setBusy(false);
      return;
    }

    setPhase("processing");
    setImportProgress({ done: 0, total: 1 });

    try {
      const { durationMs } = await importAudioFile({
        file: importFile,
        onProgress: setImportProgress,
        onChunk: async ({ blob, index, offsetMs }) => {
          const formData = new FormData();
          formData.append("audio", blob, `tramo-${index}.wav`);
          formData.append("index", String(index));
          formData.append("offsetMs", String(offsetMs));
          const res = await fetch(`/api/empresa/meetings/${id}/audio`, {
            method: "POST",
            body: formData,
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error ?? "No se pudo transcribir un tramo del archivo");
          }
        },
      });

      await fetch(`/api/empresa/meetings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durationMs }),
      }).catch(() => undefined);
    } catch (err) {
      setError(
        `${err instanceof Error ? err.message : "Error importando el audio"} — la reunión quedó creada, puedes reintentar desde el detalle.`
      );
      setImportProgress(null);
      router.push(`/empresa/reuniones/${id}`);
      return;
    } finally {
      setBusy(false);
    }

    setImportProgress(null);
    await processMeeting(id);
  }

  async function startRecording() {
    setError(null);
    setNotice(null);

    if (!title.trim()) {
      setError("Ponle un título a la reunión.");
      return;
    }
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Este navegador no permite grabar audio. Usa Chrome o Edge en escritorio.");
      return;
    }
    if (mode === "device" && !systemDeviceId) {
      setError("Elige el dispositivo por el que entra el audio de la llamada.");
      return;
    }

    setBusy(true);
    const capture = new MeetingCapture({
      mode,
      micDeviceId: micDeviceId || undefined,
      systemDeviceId: systemDeviceId || undefined,
      segmentMs: SEGMENT_MS,
      onSegment: ({ blob, channel, index, offsetMs }) =>
        enqueueUpload(blob, channel, index, offsetMs),
      onLevels: setLevels,
      onNotice: setNotice,
    });

    try {
      await capture.start();
      captureRef.current = capture;
      setActiveChannels(capture.activeChannels);

      await createMeeting();

      // Arranque del mapeo de voces: tu micrófono eres tú, y si hay un solo
      // asistente del lado del cliente, ese es el otro canal. Lo demás lo ajusta
      // el usuario en vivo.
      const mine = attendees.find((a) => a.org === "PIME" && a.name.trim())?.name.trim() ?? "";
      const clientSide = attendees.filter((a) => a.org === "CLIENTE" && a.name.trim());
      const theirs =
        capture.activeChannels.includes("REMOTE") && clientSide.length === 1
          ? clientSide[0].name.trim()
          : "";
      lockSpeakersRef.current = lockSpeakers;
      const initialMap = lockSpeakers
        ? { LOCAL: mine, REMOTE: theirs }
        : { LOCAL: "", REMOTE: "" };
      speakerRef.current = initialMap;
      setChannelSpeaker(initialMap);

      startedAtRef.current = Date.now();
      setElapsed(0);
      setSegments([]);
      setPhase("recording");
    } catch (err) {
      capture.release();
      captureRef.current = null;
      setError(err instanceof Error ? err.message : "No se pudo iniciar la grabación");
    } finally {
      setBusy(false);
    }
  }

  async function stopAndProcess() {
    const id = meetingIdRef.current;
    if (!id) return;

    setPhase("processing");

    await captureRef.current?.stop();
    await uploadQueueRef.current;
    captureRef.current?.release();
    captureRef.current = null;

    await fetch(`/api/empresa/meetings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ durationMs: Date.now() - startedAtRef.current }),
    }).catch(() => undefined);

    await processMeeting(id);
  }

  function labelFor(seg: MeetingSegment): string {
    if (seg.speaker) return seg.speaker;
    if (seg.channel === "LOCAL") return channelSpeaker.LOCAL || "Tu micrófono";
    if (seg.channel === "REMOTE") return channelSpeaker.REMOTE || "La llamada";
    return "Sin identificar";
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  if (phase === "processing" || phase === "done") {
    return (
      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl p-8">
        <h2 className="text-white text-lg font-semibold mb-1">Procesando la reunión</h2>
        <p className="text-white/60 text-sm mb-6">
          No cierres esta pestaña. Tarda alrededor de un minuto por cada media hora grabada.
        </p>
        {importProgress && (
          <div className="mb-6">
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <span className="text-white/80 text-sm">Transcribiendo el archivo</span>
              <span className="text-white/50 text-xs font-mono">
                {importProgress.done} / {importProgress.total}
              </span>
            </div>
            <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#1AA7F0] rounded-full transition-[width] duration-300"
                style={{
                  width: `${Math.round((importProgress.done / Math.max(1, importProgress.total)) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}
        <ol className="space-y-3">
          {STAGES.map((stage, i) => {
            const state = i < stageIndex ? "done" : i === stageIndex ? "active" : "pending";
            return (
              <li key={stage.key} className="flex items-center gap-3">
                <span
                  className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] ${
                    state === "done"
                      ? "bg-green-500/20 border-green-500/40 text-green-400"
                      : state === "active"
                        ? "bg-[#1AA7F0]/20 border-[#1AA7F0]/40 text-[#1AA7F0] animate-pulse"
                        : "bg-white/[0.04] border-white/[0.08] text-white/40"
                  }`}
                >
                  {state === "done" ? "✓" : i + 1}
                </span>
                <span className={state === "pending" ? "text-white/40 text-sm" : "text-white/80 text-sm"}>
                  {stage.label}
                </span>
              </li>
            );
          })}
        </ol>
        {error && <p className="text-red-400 text-sm mt-6">{error}</p>}
      </div>
    );
  }

  if (phase === "recording") {
    return (
      <div className="space-y-4">
        <div className="bg-[#0a0a10] border border-red-500/20 rounded-2xl p-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <div>
                <p className="text-white font-medium">{title}</p>
                <p className="text-white/50 text-xs">
                  {selectedProject ? selectedProject.name : "Sin proyecto"} ·{" "}
                  {CAPTURE_MODES.find((m) => m.key === mode)?.title.toLowerCase()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-white text-2xl font-mono tabular-nums">{formatClock(elapsed)}</span>
              <button
                onClick={stopAndProcess}
                className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-all"
              >
                Finalizar y procesar
              </button>
            </div>
          </div>
          {notice && <p className="text-amber-400 text-xs mt-3">{notice}</p>}
          {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
        </div>

        {/* Quién es cada voz */}
        <div className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl p-5">
          <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
            <h3 className="text-white/70 text-xs uppercase tracking-wider">Voces</h3>
            <p className="text-white/35 text-[11px]">
              {lockSpeakers
                ? "Cambiar el nombre corrige también lo ya transcrito."
                : "Todo entra por un micrófono: las voces se separan al finalizar."}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {activeChannels.map((channel) => {
              const accent = CHANNEL_ACCENT[channel];
              const level = levels[channel];
              const talking = level > 0.12;
              return (
                <div
                  key={channel}
                  className={`border rounded-xl p-3.5 transition-colors ${
                    talking ? "border-white/[0.16] bg-white/[0.03]" : "border-white/[0.06]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${accent.dot} ${talking ? "animate-pulse" : "opacity-40"}`}
                      />
                      <span className={`text-xs font-medium ${accent.name}`}>
                        {CHANNEL_TITLE[channel]}
                      </span>
                    </span>
                    <span
                      className={`text-[10px] ${talking ? "text-white/70" : "text-white/25"}`}
                    >
                      {talking ? "hablando" : "en silencio"}
                    </span>
                  </div>

                  <LevelBar level={level} channel={channel} />

                  {lockSpeakers &&
                    (customChannel[channel] ? (
                      <input
                        autoFocus
                        value={customDraft[channel]}
                        onChange={(e) =>
                          setCustomDraft((prev) => ({ ...prev, [channel]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.currentTarget.blur();
                        }}
                        onBlur={() => {
                          setCustomChannel((prev) => ({ ...prev, [channel]: false }));
                          void assignSpeaker(channel, customDraft[channel]);
                        }}
                        placeholder="Nombre de esta voz"
                        className="w-full mt-3 bg-[#050508] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-white text-xs placeholder:text-white/30 focus:border-[#1AA7F0]/50 focus:outline-none"
                      />
                    ) : (
                      <select
                        value={
                          namedAttendees.includes(channelSpeaker[channel])
                            ? channelSpeaker[channel]
                            : channelSpeaker[channel]
                              ? "__custom"
                              : ""
                        }
                        onChange={(e) => {
                          if (e.target.value === "__custom") {
                            setCustomDraft((prev) => ({
                              ...prev,
                              [channel]: channelSpeaker[channel],
                            }));
                            setCustomChannel((prev) => ({ ...prev, [channel]: true }));
                            return;
                          }
                          void assignSpeaker(channel, e.target.value);
                        }}
                        className="w-full mt-3 bg-[#050508] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-white text-xs focus:border-[#1AA7F0]/50 focus:outline-none"
                      >
                        <option value="">Sin asignar</option>
                        {namedAttendees.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                        <option value="__custom">Otro nombre…</option>
                      </select>
                    ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* Conversación en vivo */}
        <div className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl p-6">
          <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
            <h3 className="text-white/70 text-xs uppercase tracking-wider">Conversación en vivo</h3>
            <p className="text-white/35 text-[11px]">
              {uploading > 0
                ? `transcribiendo ${uploading} tramo${uploading !== 1 ? "s" : ""}…`
                : `al día · tramos de ${SEGMENT_MS / 1000} s`}
            </p>
          </div>
          <LiveTranscript
            segments={withoutEchoes(segments)}
            labelFor={labelFor}
            interim={instantPreview ? interim : ""}
            interimSpeaker={interimSpeaker}
            emptyHint={`El texto empieza a aparecer a los ${SEGMENT_MS / 1000} segundos de haber empezado a hablar.`}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-white text-2xl font-semibold tracking-tight">Grabar reunión</h1>
        <p className="text-white/60 text-sm mt-0.5">
          Al terminar obtienes minuta ejecutiva, minuta técnica, pendientes y un prompt listo para
          construir lo que se acordó.
        </p>
      </div>

      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl p-6 space-y-4">
        <div>
          <label className="block text-white/70 text-xs uppercase tracking-wider mb-1.5">Título</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Revisión de alcance — módulo de facturación"
            className="w-full bg-[#050508] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30 focus:border-[#1AA7F0]/50 focus:outline-none"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-white/70 text-xs uppercase tracking-wider mb-1.5">Proyecto</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full bg-[#050508] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:border-[#1AA7F0]/50 focus:outline-none"
            >
              <option value="">Sin proyecto</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <p className="text-white/40 text-xs mt-1">
              {projectId
                ? "La IA leerá el alcance, los entregables y las reuniones anteriores del proyecto."
                : "Puedes dejarlo en blanco y asignarle el proyecto después, desde el detalle de la reunión."}
            </p>
          </div>

          <div>
            <label className="block text-white/70 text-xs uppercase tracking-wider mb-1.5">Cliente</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full bg-[#050508] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:border-[#1AA7F0]/50 focus:outline-none"
            >
              <option value="">Sin cliente</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.company ? ` — ${c.company}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-white/70 text-xs uppercase tracking-wider mb-1.5">Fecha</label>
            <input
              type="date"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
              className="w-full bg-[#050508] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:border-[#1AA7F0]/50 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-white/70 text-xs uppercase tracking-wider mb-1.5">Idioma</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as "es" | "en")}
              className="w-full bg-[#050508] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:border-[#1AA7F0]/50 focus:outline-none"
            >
              <option value="es">Español</option>
              <option value="en">Inglés</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl p-6 space-y-3">
        <div>
          <h2 className="text-white/70 text-xs uppercase tracking-wider">Asistentes</h2>
          <p className="text-white/40 text-xs mt-1">
            Es la lista contra la que se resuelve quién habló, y de la que salen los nombres que le
            asignas a cada voz durante la reunión.
          </p>
        </div>

        {attendees.map((a, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={a.name}
              onChange={(e) => updateAttendee(i, { name: e.target.value })}
              placeholder="Nombre y apellido"
              className="flex-1 bg-[#050508] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30 focus:border-[#1AA7F0]/50 focus:outline-none"
            />
            <input
              value={a.role ?? ""}
              onChange={(e) => updateAttendee(i, { role: e.target.value })}
              placeholder="Rol (opcional)"
              className="w-36 bg-[#050508] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30 focus:border-[#1AA7F0]/50 focus:outline-none"
            />
            <select
              value={a.org}
              onChange={(e) => updateAttendee(i, { org: e.target.value as AttendeeOrg })}
              className="w-32 bg-[#050508] border border-white/[0.08] rounded-lg px-2 py-2 text-white text-sm focus:border-[#1AA7F0]/50 focus:outline-none"
            >
              <option value="PIME">Pime</option>
              <option value="CLIENTE">Cliente</option>
              <option value="DESCONOCIDO">Otro</option>
            </select>
            <button
              type="button"
              onClick={() => setAttendees((prev) => prev.filter((_, idx) => idx !== i))}
              className="px-3 text-white/40 hover:text-red-400 transition-colors"
              aria-label="Quitar asistente"
            >
              ✕
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => setAttendees((prev) => [...prev, { name: "", org: "CLIENTE" }])}
          className="text-[#1AA7F0] hover:text-[#0E87C8] text-sm transition-colors"
        >
          + Agregar asistente
        </button>
      </div>

      {/* Cómo se capta el audio */}
      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl p-6 space-y-3">
        <div>
          <h2 className="text-white/70 text-xs uppercase tracking-wider">Cómo se capta el audio</h2>
          <p className="text-white/40 text-xs mt-1">
            Cuando tu voz y la de la llamada entran por fuentes distintas, se sabe quién habla en el
            momento, sin que la IA tenga que adivinarlo.
          </p>
        </div>

        <div className="space-y-2">
          {CAPTURE_MODES.map((option) => (
            <label
              key={option.key}
              className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                mode === option.key
                  ? "border-[#1AA7F0]/35 bg-[#1AA7F0]/[0.05]"
                  : "border-white/[0.06] hover:border-white/[0.12]"
              }`}
            >
              <input
                type="radio"
                name="capture-mode"
                checked={mode === option.key}
                onChange={() => setMode(option.key)}
                className="mt-1 accent-[#1AA7F0]"
              />
              <span className="min-w-0">
                <span className="flex items-center gap-2 flex-wrap">
                  <span className="text-white text-sm font-medium">{option.title}</span>
                  <span className={`px-1.5 py-0.5 text-[10px] rounded border ${option.tagClass}`}>
                    {option.tag}
                  </span>
                </span>
                <span className="block text-white/50 text-xs mt-1 leading-relaxed">
                  {option.detail}
                </span>
              </span>
            </label>
          ))}
        </div>

        {mode === "device" && (
          <div className="border border-white/[0.06] rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <label className="text-white/70 text-xs uppercase tracking-wider">
                Entrada con el audio de la llamada
              </label>
              <button
                type="button"
                onClick={() => void loadDevices(true)}
                className="text-[#1AA7F0] hover:text-[#0E87C8] text-xs transition-colors"
              >
                Buscar dispositivos
              </button>
            </div>
            <select
              value={systemDeviceId}
              onChange={(e) => setSystemDeviceId(e.target.value)}
              className="w-full bg-[#050508] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:border-[#1AA7F0]/50 focus:outline-none"
            >
              <option value="">Elige un dispositivo…</option>
              {devices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || "Entrada sin nombre"}
                  {looksLikeLoopback(d.label) ? " · recomendado" : ""}
                </option>
              ))}
            </select>
            {devices.length === 0 && (
              <p className="text-white/40 text-xs">
                Pulsa «Buscar dispositivos» y concede el permiso del micrófono para poder verlos por
                nombre.
              </p>
            )}
            <p className="text-white/40 text-xs leading-relaxed">
              En Mac: instala BlackHole, crea un «Dispositivo de salida múltiple» con tus audífonos +
              BlackHole y ponlo como salida del sistema. Aquí elige BlackHole. En Windows, VB-Cable o
              «Mezcla estéreo».
            </p>
          </div>
        )}

        {devices.length > 0 && (
          <div>
            <label className="block text-white/70 text-xs uppercase tracking-wider mb-1.5">
              Micrófono
            </label>
            <select
              value={micDeviceId}
              onChange={(e) => setMicDeviceId(e.target.value)}
              className="w-full bg-[#050508] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:border-[#1AA7F0]/50 focus:outline-none"
            >
              <option value="">Predeterminado del sistema</option>
              {devices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || "Entrada sin nombre"}
                </option>
              ))}
            </select>
          </div>
        )}

        {speechSupported && (
          <label className="flex items-start gap-3 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={instantPreview}
              onChange={(e) => setInstantPreview(e.target.checked)}
              className="mt-1 accent-[#1AA7F0]"
            />
            <span>
              <span className="text-white text-sm font-medium">Vista previa instantánea</span>
              <span className="block text-white/50 text-xs mt-1 leading-relaxed">
                Muestra palabra por palabra lo que oye el micrófono mientras se graba, usando el
                reconocimiento de voz de Chrome (procesa audio en servidores de Google). La
                transcripción que se guarda es siempre la de Whisper.
              </span>
            </span>
          </label>
        )}
      </div>

      {/* Importar un audio ya grabado */}
      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl p-6 space-y-3">
        <div>
          <h2 className="text-white/70 text-xs uppercase tracking-wider">
            ¿Ya tienes la reunión grabada?
          </h2>
          <p className="text-white/40 text-xs mt-1 leading-relaxed">
            Sube la exportación del Zoom o del Meet, una nota de voz o el mp3 de una grabadora. Se
            corta y se transcribe aquí mismo, y a partir de ahí obtienes lo mismo que grabando en
            vivo: minutas, pendientes y prompt. Las voces las separa la IA, porque un archivo ya
            mezclado no dice quién habló.
          </p>
        </div>

        <input
          type="file"
          accept="audio/*,video/mp4,.m4a,.mp3,.wav,.webm,.ogg"
          onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
          className="w-full text-white/60 text-xs file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-white/[0.06] file:text-white/70 file:text-xs hover:file:bg-white/[0.10] file:cursor-pointer"
        />

        {importFile && (
          <button
            onClick={startImport}
            disabled={busy}
            className="w-full px-5 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-50 border border-white/[0.08] text-white/80 text-sm font-semibold rounded-lg transition-all"
          >
            {busy
              ? "Preparando…"
              : `⬆️ Transcribir ${importFile.name} (${(importFile.size / 1024 / 1024).toFixed(1)} MB)`}
          </button>
        )}
      </div>

      {notice && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
          <p className="text-amber-400 text-sm">{notice}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <button
        onClick={startRecording}
        disabled={busy}
        className="w-full px-5 py-3 bg-[#1AA7F0] hover:bg-[#0E87C8] disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-all"
      >
        {busy ? "Preparando…" : "🎙️ Iniciar grabación"}
      </button>
      {meetingId && phase === "setup" && (
        <p className="text-white/40 text-xs text-center">Reunión creada: {meetingId}</p>
      )}
    </div>
  );
}
