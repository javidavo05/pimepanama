"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LANGUAGE_LABEL,
  MEETING_LANGUAGES,
  type AttendeeOrg,
  type MeetingAttendee,
  type MeetingLanguage,
  type MeetingSegment,
} from "@/lib/meetings/types";
import { withoutEchoes } from "@/lib/meetings/echo";
import { importAudioFile, type ImportProgress } from "./audio-import";
import {
  MeetingCapture,
  looksLikeLoopback,
  type CaptureChannel,
  type CaptureMode,
  type CaptureSegment,
} from "./live-capture";
import { CHANNEL_ACCENT, LiveTranscript } from "./live-transcript";
import { isInstantSpeechSupported, useInstantSpeech } from "./use-instant-speech";
import {
  addSegment,
  bumpAttempts,
  deleteMeeting,
  deleteSegment,
  getMeeting,
  isOfflineStoreAvailable,
  listSegments,
  patchMeeting,
  requestPersistentStorage,
  saveMeeting,
  type OfflineMeetingDraft,
} from "@/lib/meetings/offline-store";
import {
  AuthError,
  createServerMeeting,
  holdMeetingLock,
  isTransient,
  NetworkError,
  ProcessingError,
  syncOfflineMeeting,
  uploadSegment,
  type SyncProgress,
} from "@/lib/meetings/offline-sync";
import { PROCESS_STAGES } from "@/lib/meetings/process-stages";
import { PendingOfflineMeetings } from "../pending-offline-meetings";
import { useConnectivity } from "../use-connectivity";

/**
 * Duración de cada tramo. Corto a propósito: es lo que hace que la transcripción
 * se vea avanzar durante la reunión. Cada tramo es un webm completo e
 * independiente — por eso se reinicia el MediaRecorder en vez de pedirle
 * `timeslice`: los trozos de un mismo recorder no se pueden transcribir sueltos.
 */
const SEGMENT_MS = 8_000;

/** Intentos antes de dar por perdido un tramo que el servidor no puede transcribir. */
const MAX_UPLOAD_ATTEMPTS = 3;

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

/** `saved`: terminó sin conexión y la reunión quedó guardada en el equipo. */
type Phase = "setup" | "recording" | "processing" | "saved" | "done";

const STAGES = PROCESS_STAGES;

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
    tagClass: "bg-ok/15 text-ok border-ok/25",
  },
  {
    key: "ambient",
    title: "Micrófono ambiente",
    detail:
      "El micrófono capta la sala completa: tu voz y lo que sale por los altavoces. No hay que compartir nada ni instalar nada, pero hay que estar sin audífonos y las voces se separan al final con IA, no en vivo.",
    tag: "sin configurar nada",
    tagClass: "bg-brand/15 text-brand-fg border-brand/25",
  },
  {
    key: "tab",
    title: "Micrófono + pestaña compartida",
    detail:
      "Chrome pide compartir una pestaña: eliges la del Meet o Zoom y marcas «Compartir audio de la pestaña». Separa voces igual de bien, pero obliga a compartir pantalla.",
    tag: "voces separadas",
    tagClass: "bg-ok/15 text-ok border-ok/25",
  },
  {
    key: "mic",
    title: "Solo mi micrófono",
    detail: "Para una nota de voz o una reunión presencial en la que solo hablas tú.",
    tag: "una sola voz",
    tagClass: "bg-fill-2 text-fg-dim border-line-mid",
  },
];

/** Cómo entra la reunión al sistema. */
type Entry = "record" | "upload";

/**
 * De dónde salió el audio. No es una etiqueta decorativa: una llamada son dos
 * personas turnándose sin verse, una reunión presencial son varias voces en una
 * sala con solapamientos, y una nota de voz es una sola persona. La separación
 * de voces y la redacción de la minuta cambian según cuál sea.
 */
const AUDIO_SOURCES = [
  { key: "VIDEOLLAMADA", label: "Videollamada", detail: "Meet, Zoom, Teams" },
  { key: "LLAMADA", label: "Llamada telefónica", detail: "WhatsApp, celular" },
  { key: "PRESENCIAL", label: "Reunión presencial", detail: "varias voces en una sala" },
  { key: "NOTA_VOZ", label: "Nota de voz", detail: "hablas tú solo" },
] as const;

type AudioSource = (typeof AUDIO_SOURCES)[number]["key"];

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
    <div className="h-1.5 w-full bg-fill-2 rounded-full overflow-hidden">
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
  // Qué se habla en la reunión y en qué idioma sale la minuta son dos cosas
  // distintas: una reunión bilingüe se redacta igual en un solo idioma.
  const [spoken, setSpoken] = useState<MeetingLanguage[]>(["es"]);
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
  const [entry, setEntry] = useState<Entry>("record");
  const [audioSource, setAudioSource] = useState<AudioSource>("VIDEOLLAMADA");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [stageIndex, setStageIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useConnectivity();
  /** Tramos guardados en este equipo que todavía no llegan al servidor */
  const [pendingCount, setPendingCount] = useState(0);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);

  const captureRef = useRef<MeetingCapture | null>(null);
  const startedAtRef = useRef(0);
  const meetingIdRef = useRef<string | null>(null);
  // La reunión existe primero en el equipo; el id del servidor llega después, o
  // cuando vuelve la red si se empezó a grabar sin ella.
  const localIdRef = useRef<string | null>(null);
  const draftRef = useRef<OfflineMeetingDraft | null>(null);
  const creatingRef = useRef<Promise<string> | null>(null);
  // Cada tramo se escribe en el equipo antes de subirse. Esta cadena permite
  // esperar a que el último quede guardado antes de cerrar la reunión.
  const writeChainRef = useRef<Promise<void>>(Promise.resolve());
  const drainRef = useRef<Promise<void> | null>(null);
  const drainAgainRef = useRef(false);
  const releaseLockRef = useRef<(() => Promise<void>) | null>(null);
  // Desde que se pulsa "Finalizar", la subida en vivo se detiene: la hace la
  // subida final, y dos a la vez duplicarían tramos.
  const stoppingRef = useRef(false);
  // Solo se reintenta sola la subida que falló por falta de red, no la que el
  // servidor rechazó: esa se reintentaría en bucle.
  const autoRetryRef = useRef(false);
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

  // El reconocimiento del navegador solo escucha un idioma a la vez; se usa el
  // primero declarado. La transcripción buena, la de Whisper, sí es bilingüe.
  // El reconocimiento de Chrome necesita red: sin ella solo generaría errores.
  const interim = useInstantSpeech(phase === "recording" && instantPreview && online, spoken[0] ?? "es");
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
  useEffect(
    () => () => {
      captureRef.current?.release();
      void releaseLockRef.current?.();
    },
    []
  );

  function updateAttendee(index: number, patch: Partial<MeetingAttendee>) {
    setAttendees((prev) => prev.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  }

  /** Nombre de la voz de un canal, si las voces van separadas por canal. */
  function currentSpeaker(channel: CaptureChannel): string | undefined {
    return lockSpeakersRef.current ? speakerRef.current[channel] || undefined : undefined;
  }

  /**
   * Id de la reunión en el servidor. Si todavía no existe, la crea: pasa al
   * empezar con conexión, o al volver la red en una grabación que arrancó sin
   * ella. Una sola creación a la vez, o un tramo que llega mientras se crea
   * duplicaría la reunión.
   */
  const ensureServerMeeting = useCallback(async (): Promise<string | null> => {
    if (meetingIdRef.current) return meetingIdRef.current;
    const localId = localIdRef.current;
    const draft = draftRef.current;
    if (!localId || !draft) return null;
    if (!creatingRef.current) {
      creatingRef.current = createServerMeeting(draft).finally(() => {
        creatingRef.current = null;
      });
    }
    const id = await creatingRef.current;
    if (!meetingIdRef.current) {
      meetingIdRef.current = id;
      setMeetingId(id);
      await patchMeeting(localId, { serverId: id });
    }
    return meetingIdRef.current;
  }, []);

  /**
   * Sube, en orden, todo lo que esté guardado en el equipo, y lo borra de aquí a
   * medida que el servidor lo confirma. Una sola corrida a la vez: si llega un
   * tramo mientras sube, se anota y se vuelve a pasar. Sin red no insiste; la
   * próxima vuelta (tramo nuevo, reconexión o el reintento periódico) retoma.
   */
  const drain = useCallback((): Promise<void> => {
    if (drainRef.current) {
      drainAgainRef.current = true;
      return drainRef.current;
    }

    const run = async () => {
      do {
        drainAgainRef.current = false;
        const localId = localIdRef.current;
        if (!localId || stoppingRef.current) return;

        let id: string | null;
        try {
          id = await ensureServerMeeting();
        } catch (err) {
          if (isTransient(err)) {
            setOnline(false);
            if (err instanceof AuthError) setError(err.message);
          } else {
            setError(err instanceof Error ? err.message : "No se pudo crear la reunión");
          }
          return;
        }
        if (!id) return;

        for (const segment of await listSegments(localId)) {
          if (stoppingRef.current) return;
          setUploading((n) => n + 1);
          try {
            const transcribed = await uploadSegment(id, { ...segment, speaker: currentSpeaker(segment.channel) });
            await deleteSegment(segment.id as number);
            setPendingCount((n) => Math.max(0, n - 1));
            setOnline(true);
            if (transcribed.length > 0) {
              setSegments((prev) => [...prev, ...transcribed].sort((a, b) => a.start - b.start));
            }
          } catch (err) {
            if (isTransient(err)) {
              setOnline(false);
              if (err instanceof AuthError) setError(err.message);
              return;
            }
            const attempts = await bumpAttempts(segment.id as number);
            if (attempts < MAX_UPLOAD_ATTEMPTS) return;
            await deleteSegment(segment.id as number);
            setPendingCount((n) => Math.max(0, n - 1));
            setError(
              `Un tramo no se pudo transcribir (${err instanceof Error ? err.message : "error del servidor"}). La grabación sigue.`
            );
          } finally {
            setUploading((n) => n - 1);
          }
        }
      } while (drainAgainRef.current);
    };

    drainRef.current = run().finally(() => {
      drainRef.current = null;
    });
    return drainRef.current;
    // `setOnline` es estable; `currentSpeaker` lee refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ensureServerMeeting]);

  /**
   * Destino de cada tramo que corta la captura: primero al equipo, después al
   * servidor. Si el equipo no lo puede guardar (sin espacio), se intenta subir
   * directo como último recurso.
   */
  const persistSegment = useCallback(
    (segment: CaptureSegment) => {
      const localId = localIdRef.current;
      if (!localId || segment.blob.size === 0) return;

      writeChainRef.current = writeChainRef.current
        .then(async () => {
          await addSegment({
            localId,
            channel: segment.channel,
            index: segment.index,
            offsetMs: segment.offsetMs,
            blob: segment.blob,
            attempts: 0,
          });
          await patchMeeting(localId, { updatedAt: Date.now() });
          setPendingCount((n) => n + 1);
          void drain();
        })
        .catch(async () => {
          const id = meetingIdRef.current;
          try {
            if (!id) throw new Error("sin reunión en el servidor");
            const transcribed = await uploadSegment(id, { ...segment, speaker: currentSpeaker(segment.channel) });
            setSegments((prev) => [...prev, ...transcribed].sort((a, b) => a.start - b.start));
            setError("Este equipo no pudo guardar un tramo (¿sin espacio?); se subió directo.");
          } catch {
            setError("Se perdió un tramo: este equipo no lo pudo guardar y no había conexión para subirlo.");
          }
        });
    },
    [drain]
  );

  // Reintentos mientras se graba: al volver la red y, por si el evento no llega
  // (wifi sin salida), cada 15 s. Con conexión y nada pendiente no hace nada.
  useEffect(() => {
    if (phase !== "recording") return;
    if (online) void drain();
    const timer = setInterval(() => void drain(), 15_000);
    return () => clearInterval(timer);
  }, [phase, online, drain]);

  /**
   * Asigna una persona a un canal de audio. Reetiqueta también lo ya transcrito:
   * la conversación de arriba se corrige entera, no solo de aquí en adelante.
   */
  async function assignSpeaker(channel: CaptureChannel, name: string) {
    const speaker = name.trim();
    setChannelSpeaker((prev) => ({ ...prev, [channel]: speaker }));
    speakerRef.current = { ...speakerRef.current, [channel]: speaker };
    if (localIdRef.current) {
      void patchMeeting(localIdRef.current, { channelSpeakers: speakerRef.current }).catch(() => undefined);
    }

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
    }).catch(() => {
      // Sin conexión no es un error: el nombre se aplica a todo al subir.
      if (navigator.onLine) setError("No se pudo guardar el nombre de esa voz. Se reintenta al finalizar.");
    });
  }

  /** Los datos de la reunión tal como están en el formulario. */
  function buildDraft(): OfflineMeetingDraft {
    return {
      title: title.trim(),
      projectId: projectId || undefined,
      clientId: clientId || undefined,
      language,
      spokenLanguages: spoken,
      meetingDate,
      audioSource,
      attendees: attendees.filter((a) => a.name.trim()),
    };
  }

  /** Crea la reunión en el servidor para importar un audio, que sí necesita red. */
  async function createMeeting(): Promise<string> {
    const id = await createServerMeeting(buildDraft());
    setMeetingId(id);
    meetingIdRef.current = id;
    return id;
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
      setError(
        err instanceof NetworkError
          ? "Subir un audio necesita conexión. Sin internet puedes grabar en vivo: se guarda en este equipo."
          : err instanceof Error
            ? err.message
            : "No se pudo crear la reunión"
      );
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
    if (!isOfflineStoreAvailable()) {
      setError("Este navegador no permite guardar la grabación en el equipo. Usa Chrome o Edge en escritorio.");
      return;
    }
    if (mode === "device" && !systemDeviceId) {
      setError("Elige el dispositivo por el que entra el audio de la llamada.");
      return;
    }

    setBusy(true);
    stoppingRef.current = false;
    const localId = crypto.randomUUID();
    const draft = buildDraft();
    localIdRef.current = localId;
    draftRef.current = draft;
    meetingIdRef.current = null;
    setMeetingId(null);
    setPendingCount(0);

    const capture = new MeetingCapture({
      mode,
      micDeviceId: micDeviceId || undefined,
      systemDeviceId: systemDeviceId || undefined,
      segmentMs: SEGMENT_MS,
      onSegment: persistSegment,
      onLevels: setLevels,
      onNotice: setNotice,
    });

    try {
      // La reunión existe primero en el equipo: desde el primer tramo el audio
      // tiene dónde guardarse, haya red o no.
      const now = Date.now();
      await saveMeeting({
        localId,
        serverId: null,
        draft,
        createdAt: now,
        updatedAt: now,
        durationMs: 0,
        channelSpeakers: {},
        lockSpeakers,
        state: "recording",
      });
      releaseLockRef.current = await holdMeetingLock(localId);
      void requestPersistentStorage();

      await capture.start();
      captureRef.current = capture;
      setActiveChannels(capture.activeChannels);

      // En el servidor se crea si hay red, pero la grabación no lo espera: sin
      // conexión se graba igual y la reunión se crea cuando vuelve.
      try {
        await ensureServerMeeting();
      } catch (err) {
        if (!isTransient(err)) throw err;
        setOnline(false);
        if (err instanceof AuthError) setError(err.message);
      }

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
      await patchMeeting(localId, { channelSpeakers: initialMap });

      startedAtRef.current = Date.now();
      setElapsed(0);
      setSegments([]);
      setPhase("recording");
    } catch (err) {
      capture.release();
      captureRef.current = null;
      await releaseLockRef.current?.();
      releaseLockRef.current = null;
      localIdRef.current = null;
      await deleteMeeting(localId).catch(() => undefined);
      setError(err instanceof Error ? err.message : "No se pudo iniciar la grabación");
    } finally {
      setBusy(false);
    }
  }

  async function stopAndProcess() {
    const localId = localIdRef.current;
    if (!localId || busy) return;

    setBusy(true);
    stoppingRef.current = true;
    try {
      await captureRef.current?.stop();
      // El último tramo tiene que quedar guardado en el equipo antes de cerrar.
      await writeChainRef.current;
      captureRef.current?.release();
      captureRef.current = null;
      // Y la subida en curso tiene que terminar antes de soltar el candado: si no,
      // la subida final repetiría un tramo que ya iba en camino.
      await drainRef.current;
      await patchMeeting(localId, {
        durationMs: Date.now() - startedAtRef.current,
        state: "pending",
        channelSpeakers: speakerRef.current,
        lockSpeakers: lockSpeakersRef.current,
        updatedAt: Date.now(),
      });
      // La subida final pide este mismo candado: tiene que estar libre de verdad.
      await releaseLockRef.current?.();
      releaseLockRef.current = null;
    } finally {
      setBusy(false);
    }

    await uploadAndProcess(localId);
  }

  /**
   * Sube lo que quedó guardado en el equipo y analiza la reunión. Sin conexión no
   * es un error: la reunión queda guardada aquí y se sube sola cuando vuelve.
   */
  async function uploadAndProcess(localId: string) {
    autoRetryRef.current = false;
    setError(null);
    setNotice(null);
    setSyncProgress(null);
    setStageIndex(-1);
    setPhase("processing");

    try {
      const result = await syncOfflineMeeting(localId, {
        onProgress: (p) => {
          setSyncProgress(p);
          setStageIndex(p.stageIndex);
        },
      });
      if (!result) {
        setPhase("saved");
        // `null` quiere decir que otra pestaña la tiene tomada, o que ya la subió.
        if (!(await getMeeting(localId))) {
          setNotice("Esta grabación ya se subió desde otra pestaña. La encuentras en Reuniones.");
          return;
        }
        setNotice("Otra pestaña está subiendo esta grabación. Si la cierras, se retoma desde aquí.");
        autoRetryRef.current = true;
        setTimeout(() => {
          if (autoRetryRef.current && localIdRef.current === localId) void uploadAndProcess(localId);
        }, 10_000);
        return;
      }
      setPhase("done");
      router.push(`/empresa/reuniones/${result.serverId}`);
      router.refresh();
    } catch (err) {
      if (err instanceof ProcessingError) {
        setError(`${err.message} — la grabación ya está en el servidor; reintenta el análisis desde el detalle.`);
        router.push(`/empresa/reuniones/${err.serverId}`);
        return;
      }
      setPhase("saved");
      if (err instanceof NetworkError) {
        setOnline(false);
        autoRetryRef.current = true;
        return;
      }
      setError(err instanceof Error ? err.message : "No se pudo subir la grabación");
    }
  }

  // Guardada sin conexión: en cuanto vuelve la red, se sube sola.
  useEffect(() => {
    if (phase !== "saved" || !online || !autoRetryRef.current) return;
    const localId = localIdRef.current;
    if (localId) void uploadAndProcess(localId);
    // `uploadAndProcess` solo lee refs y setters estables.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, online]);

  function labelFor(seg: MeetingSegment): string {
    if (seg.speaker) return seg.speaker;
    if (seg.channel === "LOCAL") return channelSpeaker.LOCAL || "Tu micrófono";
    if (seg.channel === "REMOTE") return channelSpeaker.REMOTE || "La llamada";
    return "Sin identificar";
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  if (phase === "processing" || phase === "done") {
    return (
      <div className="bg-panel border border-line rounded-2xl p-8">
        <h2 className="text-fg text-lg font-semibold mb-1">Procesando la reunión</h2>
        <p className="text-fg-dim text-sm mb-6">
          No cierres esta pestaña. Tarda alrededor de un minuto por cada media hora grabada.
        </p>
        {importProgress && (
          <div className="mb-6">
            <div className="flex items-center justify-between gap-3 mb-2">
              <span className="text-fg-soft text-sm">Transcribiendo el archivo</span>
              <span className="text-fg-faint text-xs font-mono">
                {importProgress.done} / {importProgress.total}
              </span>
            </div>
            <div className="h-1.5 w-full bg-fill-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand rounded-full transition-[width] duration-300"
                style={{
                  width: `${Math.round((importProgress.done / Math.max(1, importProgress.total)) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}
        {syncProgress && syncProgress.step === "upload" && syncProgress.total > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between gap-3 mb-2">
              <span className="text-fg-soft text-sm">Subiendo lo grabado</span>
              <span className="text-fg-faint text-xs font-mono">
                {syncProgress.uploaded} / {syncProgress.total}
              </span>
            </div>
            <div className="h-1.5 w-full bg-fill-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand rounded-full transition-[width] duration-300"
                style={{ width: `${Math.round((syncProgress.uploaded / syncProgress.total) * 100)}%` }}
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
                      ? "bg-ok/20 border-ok/40 text-ok"
                      : state === "active"
                        ? "bg-brand/20 border-brand/40 text-brand-fg animate-pulse"
                        : "bg-fill border-line text-fg-ghost"
                  }`}
                >
                  {state === "done" ? "✓" : i + 1}
                </span>
                <span className={state === "pending" ? "text-fg-ghost text-sm" : "text-fg-soft text-sm"}>
                  {stage.label}
                </span>
              </li>
            );
          })}
        </ol>
        {error && <p className="text-danger text-sm mt-6">{error}</p>}
      </div>
    );
  }

  if (phase === "saved") {
    return (
      <div className="bg-panel border border-line rounded-2xl p-6 sm:p-8">
        <h2 className="text-fg text-lg font-semibold">Reunión guardada en este equipo</h2>
        <p className="text-fg-dim text-sm mt-2 leading-relaxed">
          «{title}» · {formatClock(elapsed)} grabados. El audio está a salvo aquí y se sube y se
          analiza solo en cuanto vuelva la conexión. Puedes cerrar esta pestaña: la grabación queda
          en Reuniones, lista para subir.
        </p>
        {notice && <p className="text-warn text-sm mt-4">{notice}</p>}
        {error && <p className="text-danger text-sm mt-4">{error}</p>}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-6">
          <button
            onClick={() => localIdRef.current && void uploadAndProcess(localIdRef.current)}
            disabled={!online}
            className="px-6 min-h-[44px] bg-brand hover:bg-brand-hi disabled:opacity-50 text-on-brand text-sm font-semibold rounded-lg transition-all"
          >
            {online ? "Subir y analizar ahora" : "Esperando conexión…"}
          </button>
          <button
            onClick={() => router.push("/empresa/reuniones")}
            className="px-4 min-h-[44px] text-fg-dim hover:text-fg text-sm transition-colors"
          >
            Ir a Reuniones
          </button>
        </div>
      </div>
    );
  }

  if (phase === "recording") {
    return (
      <div className="space-y-4">
        <div className="bg-panel border border-danger/20 rounded-2xl p-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-danger animate-pulse" />
              <div>
                <p className="text-fg font-medium">{title}</p>
                <p className="text-fg-faint text-xs">
                  {selectedProject ? selectedProject.name : "Sin proyecto"} ·{" "}
                  {CAPTURE_MODES.find((m) => m.key === mode)?.title.toLowerCase()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-fg text-2xl font-mono tabular-nums">{formatClock(elapsed)}</span>
              <button
                onClick={stopAndProcess}
                disabled={busy}
                className="px-6 min-h-[44px] bg-danger-solid hover:bg-danger-solid/85 disabled:opacity-60 text-on-solid text-sm font-semibold rounded-lg transition-all"
              >
                {busy
                  ? "Guardando los últimos tramos…"
                  : online
                    ? "Finalizar y procesar"
                    : "Finalizar y guardar en el equipo"}
              </button>
            </div>
          </div>
          {(!online || pendingCount > 0) && (
            <p className={`text-xs mt-3 leading-relaxed ${online ? "text-fg-dim" : "text-warn"}`} role="status">
              {online
                ? `Subiendo ${pendingCount === 1 ? "1 tramo que quedó guardado" : `${pendingCount} tramos que quedaron guardados`} en este equipo…`
                : `Sin conexión. La grabación sigue: ${pendingCount === 1 ? "1 tramo guardado" : `${pendingCount} tramos guardados`} en este equipo, se suben solos cuando vuelva la red.`}
            </p>
          )}
          {notice && <p className="text-warn text-xs mt-3">{notice}</p>}
          {error && <p className="text-danger text-xs mt-2">{error}</p>}
        </div>

        {/* Quién es cada voz */}
        <div className="bg-panel border border-line rounded-2xl p-6">
          <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
            <h3 className="text-fg-mute text-xs uppercase tracking-wider">Voces</h3>
            <p className="text-fg-ghost text-[11px]">
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
                  className={`border rounded-xl p-4 transition-colors ${
                    talking ? "border-line-mid bg-fill" : "border-line"
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
                      className={`text-[10px] ${talking ? "text-fg-mute" : "text-fg-ghost"}`}
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
                        className="w-full mt-3 bg-canvas border border-line rounded-lg px-3 py-2 text-fg text-xs placeholder:text-fg-trace focus:border-brand/50 focus:outline-none"
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
                        className="w-full mt-3 bg-canvas border border-line rounded-lg px-3 py-2 text-fg text-xs focus:border-brand/50 focus:outline-none"
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
        <div className="bg-panel border border-line rounded-2xl p-6">
          <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
            <h3 className="text-fg-mute text-xs uppercase tracking-wider">Conversación en vivo</h3>
            <p className="text-fg-ghost text-[11px]">
              {uploading > 0
                ? `transcribiendo ${uploading} tramo${uploading !== 1 ? "s" : ""}…`
                : !online
                  ? "sin conexión · el audio se guarda aquí"
                  : pendingCount > 0
                    ? `${pendingCount} por subir`
                    : `al día · tramos de ${SEGMENT_MS / 1000} s`}
            </p>
          </div>
          <LiveTranscript
            segments={withoutEchoes(segments)}
            labelFor={labelFor}
            interim={instantPreview ? interim : ""}
            interimSpeaker={interimSpeaker}
            emptyHint={
              online
                ? `El texto empieza a aparecer a los ${SEGMENT_MS / 1000} segundos de haber empezado a hablar.`
                : "Sin conexión: la transcripción aparece cuando vuelva la red. El audio se está guardando en este equipo."
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-fg text-2xl font-semibold tracking-tight">Nueva reunión</h1>
        <p className="text-fg-dim text-sm mt-1">
          Grábala en vivo o sube un audio que ya tengas. En los dos casos obtienes minuta ejecutiva,
          minuta técnica, pendientes, el entregable técnico y el prompt para construirlo.
        </p>
      </div>

      <PendingOfflineMeetings />

      {!online && (
        <div className="bg-warn/10 border border-warn/20 rounded-xl p-4" role="status">
          <p className="text-warn text-sm leading-relaxed">
            Sin conexión. Puedes grabar igual: el audio se guarda en este equipo y se sube y se analiza
            cuando vuelva la red.
          </p>
        </div>
      )}

      {/* Cómo entra la reunión — es la primera decisión, no la última */}
      <div className="grid sm:grid-cols-2 gap-3">
        {(
          [
            {
              key: "record" as const,
              icon: "🎙️",
              title: "Grabar ahora",
              detail: "Estás por entrar a la reunión. Se transcribe mientras hablan.",
            },
            {
              key: "upload" as const,
              icon: "⬆️",
              title: "Subir un audio",
              detail: "Ya la tienes grabada: la exportación de un Zoom, una llamada, una nota de voz.",
            },
          ] satisfies { key: Entry; icon: string; title: string; detail: string }[]
        ).map((option) => (
          <button
            key={option.key}
            onClick={() => setEntry(option.key)}
            className={`text-left p-4 rounded-2xl border transition-all ${
              entry === option.key
                ? "border-brand/40 bg-brand/[0.06]"
                : "border-line bg-panel hover:border-line-mid"
            }`}
          >
            <span className="text-lg">{option.icon}</span>
            <p
              className={`text-sm font-medium mt-1 ${
                entry === option.key ? "text-brand-fg" : "text-fg"
              }`}
            >
              {option.title}
            </p>
            <p className="text-fg-faint text-xs mt-1 leading-relaxed">{option.detail}</p>
          </button>
        ))}
      </div>

      <div className="bg-panel border border-line rounded-2xl p-6 space-y-4">
        <div>
          <label className="block text-fg-mute text-xs uppercase tracking-wider mb-2">Título</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Revisión de alcance — módulo de facturación"
            className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-fg text-sm placeholder:text-fg-trace focus:border-brand/50 focus:outline-none"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-fg-mute text-xs uppercase tracking-wider mb-2">Proyecto</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-fg text-sm focus:border-brand/50 focus:outline-none"
            >
              <option value="">Sin proyecto</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <p className="text-fg-ghost text-xs mt-1">
              {projectId
                ? "La IA leerá el alcance, los entregables y las reuniones anteriores del proyecto."
                : "Puedes dejarlo en blanco y asignarle el proyecto después, desde el detalle de la reunión."}
            </p>
          </div>

          <div>
            <label className="block text-fg-mute text-xs uppercase tracking-wider mb-2">Cliente</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-fg text-sm focus:border-brand/50 focus:outline-none"
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
            <label className="block text-fg-mute text-xs uppercase tracking-wider mb-2">Fecha</label>
            <input
              type="date"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
              className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-fg text-sm focus:border-brand/50 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-fg-mute text-xs uppercase tracking-wider mb-2">
              Origen del audio
            </label>
            <select
              value={audioSource}
              onChange={(e) => setAudioSource(e.target.value as AudioSource)}
              className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-fg text-sm focus:border-brand/50 focus:outline-none"
            >
              {AUDIO_SOURCES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label} — {s.detail}
                </option>
              ))}
            </select>
            <p className="text-fg-ghost text-xs mt-1">
              Cambia cómo se separan las voces: no es lo mismo una llamada de dos personas que una
              sala con seis.
            </p>
          </div>

          <div>
            <label className="block text-fg-mute text-xs uppercase tracking-wider mb-2">
              Idiomas que se hablan
            </label>
            <div className="flex gap-2">
              {MEETING_LANGUAGES.map((code) => {
                const on = spoken.includes(code);
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() =>
                      setSpoken((prev) => {
                        const next = on ? prev.filter((l) => l !== code) : [...prev, code];
                        // Nunca cero: sin idioma no hay nada que transcribir.
                        return next.length > 0 ? next : prev;
                      })
                    }
                    className={`flex-1 px-3 py-2 rounded-lg border text-sm transition-all ${
                      on
                        ? "border-brand/40 bg-brand/[0.08] text-brand-fg"
                        : "border-line bg-canvas text-fg-faint hover:text-fg-soft"
                    }`}
                  >
                    {on ? "✓ " : ""}
                    {LANGUAGE_LABEL[code]}
                  </button>
                );
              })}
            </div>
            <p className="text-fg-ghost text-xs mt-1">
              {spoken.length > 1
                ? "Bilingüe: se detecta el idioma tramo por tramo y las citas se conservan como se dijeron."
                : "Marca los dos si en la reunión se cambia de idioma."}
            </p>
          </div>

          <div>
            <label className="block text-fg-mute text-xs uppercase tracking-wider mb-2">
              Idioma de la minuta
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as "es" | "en")}
              className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-fg text-sm focus:border-brand/50 focus:outline-none"
            >
              <option value="es">Español</option>
              <option value="en">Inglés</option>
            </select>
            <p className="text-fg-ghost text-xs mt-1">
              En el que se redacta lo que sale hacia el cliente, hable lo que se hable.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-panel border border-line rounded-2xl p-6 space-y-3">
        <div>
          <h2 className="text-fg-mute text-xs uppercase tracking-wider">Asistentes</h2>
          <p className="text-fg-ghost text-xs mt-1">
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
              className="flex-1 bg-canvas border border-line rounded-lg px-3 py-2 text-fg text-sm placeholder:text-fg-trace focus:border-brand/50 focus:outline-none"
            />
            <input
              value={a.role ?? ""}
              onChange={(e) => updateAttendee(i, { role: e.target.value })}
              placeholder="Rol (opcional)"
              className="w-36 bg-canvas border border-line rounded-lg px-3 py-2 text-fg text-sm placeholder:text-fg-trace focus:border-brand/50 focus:outline-none"
            />
            <select
              value={a.org}
              onChange={(e) => updateAttendee(i, { org: e.target.value as AttendeeOrg })}
              className="w-32 bg-canvas border border-line rounded-lg px-2 py-2 text-fg text-sm focus:border-brand/50 focus:outline-none"
            >
              <option value="PIME">Pime</option>
              <option value="CLIENTE">Cliente</option>
              <option value="DESCONOCIDO">Otro</option>
            </select>
            <button
              type="button"
              onClick={() => setAttendees((prev) => prev.filter((_, idx) => idx !== i))}
              className="px-3 text-fg-ghost hover:text-danger transition-colors"
              aria-label="Quitar asistente"
            >
              ✕
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => setAttendees((prev) => [...prev, { name: "", org: "CLIENTE" }])}
          className="text-brand-fg hover:text-brand-hi text-sm transition-colors"
        >
          + Agregar asistente
        </button>
      </div>

      {/* Cómo se capta el audio — solo tiene sentido grabando en vivo */}
      {entry === "record" && (
      <div className="bg-panel border border-line rounded-2xl p-6 space-y-3">
        <div>
          <h2 className="text-fg-mute text-xs uppercase tracking-wider">Cómo se capta el audio</h2>
          <p className="text-fg-ghost text-xs mt-1">
            Cuando tu voz y la de la llamada entran por fuentes distintas, se sabe quién habla en el
            momento, sin que la IA tenga que adivinarlo.
          </p>
        </div>

        <div className="space-y-2">
          {CAPTURE_MODES.map((option) => (
            <label
              key={option.key}
              className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                mode === option.key
                  ? "border-brand/35 bg-brand/[0.05]"
                  : "border-line hover:border-line-mid"
              }`}
            >
              <input
                type="radio"
                name="capture-mode"
                checked={mode === option.key}
                onChange={() => setMode(option.key)}
                className="mt-1 accent-brand"
              />
              <span className="min-w-0">
                <span className="flex items-center gap-2 flex-wrap">
                  <span className="text-fg text-sm font-medium">{option.title}</span>
                  <span className={`px-2 py-1 text-[10px] rounded border ${option.tagClass}`}>
                    {option.tag}
                  </span>
                </span>
                <span className="block text-fg-faint text-xs mt-1 leading-relaxed">
                  {option.detail}
                </span>
              </span>
            </label>
          ))}
        </div>

        {mode === "device" && (
          <div className="border border-line rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <label className="text-fg-mute text-xs uppercase tracking-wider">
                Entrada con el audio de la llamada
              </label>
              <button
                type="button"
                onClick={() => void loadDevices(true)}
                className="text-brand-fg hover:text-brand-hi text-xs transition-colors"
              >
                Buscar dispositivos
              </button>
            </div>
            <select
              value={systemDeviceId}
              onChange={(e) => setSystemDeviceId(e.target.value)}
              className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-fg text-sm focus:border-brand/50 focus:outline-none"
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
              <p className="text-fg-ghost text-xs">
                Pulsa «Buscar dispositivos» y concede el permiso del micrófono para poder verlos por
                nombre.
              </p>
            )}
            <p className="text-fg-ghost text-xs leading-relaxed">
              En Mac: instala BlackHole, crea un «Dispositivo de salida múltiple» con tus audífonos +
              BlackHole y ponlo como salida del sistema. Aquí elige BlackHole. En Windows, VB-Cable o
              «Mezcla estéreo».
            </p>
          </div>
        )}

        {devices.length > 0 && (
          <div>
            <label className="block text-fg-mute text-xs uppercase tracking-wider mb-2">
              Micrófono
            </label>
            <select
              value={micDeviceId}
              onChange={(e) => setMicDeviceId(e.target.value)}
              className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-fg text-sm focus:border-brand/50 focus:outline-none"
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
              className="mt-1 accent-brand"
            />
            <span>
              <span className="text-fg text-sm font-medium">Vista previa instantánea</span>
              <span className="block text-fg-faint text-xs mt-1 leading-relaxed">
                Muestra palabra por palabra lo que oye el micrófono mientras se graba, usando el
                reconocimiento de voz de Chrome (procesa audio en servidores de Google). La
                transcripción que se guarda es siempre la de Whisper.
              </span>
            </span>
          </label>
        )}
      </div>
      )}

      {/* El archivo — solo en el camino de subir */}
      {entry === "upload" && (
        <div className="bg-panel border border-line rounded-2xl p-6 space-y-3">
          <div>
            <h2 className="text-fg-mute text-xs uppercase tracking-wider">El archivo de audio</h2>
            <p className="text-fg-ghost text-xs mt-1 leading-relaxed">
              La exportación de un Zoom o un Meet, la grabación de una llamada, una nota de voz de
              WhatsApp o el mp3 de una grabadora. Se decodifica y se corta aquí mismo, en tu
              navegador, y se sube por tramos: para el sistema es igual que si la hubieras grabado
              en vivo.
            </p>
          </div>

          <label
            className={`block border border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              importFile
                ? "border-brand/35 bg-brand/[0.04]"
                : "border-line-mid hover:border-line-loud"
            }`}
          >
            <input
              type="file"
              accept="audio/*,video/mp4,video/webm,.m4a,.mp3,.wav,.webm,.ogg,.aac,.flac"
              onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
            {importFile ? (
              <>
                <p className="text-fg text-sm font-medium">{importFile.name}</p>
                <p className="text-fg-faint text-xs mt-1">
                  {(importFile.size / 1024 / 1024).toFixed(1)} MB · pulsa para cambiarlo
                </p>
              </>
            ) : (
              <>
                <p className="text-fg-mute text-sm">Elige el archivo de audio</p>
                <p className="text-fg-ghost text-xs mt-1">mp3, m4a, wav, webm, ogg o el audio de un mp4</p>
              </>
            )}
          </label>

          <p className="text-fg-ghost text-[11px] leading-relaxed">
            En un archivo ya mezclado las voces las separa la IA, porque el audio no dice por sí
            solo quién habló. Declarar bien los asistentes y el origen arriba es lo que hace que
            acierte.
          </p>
        </div>
      )}

      {notice && (
        <div className="bg-warn/10 border border-warn/20 rounded-xl p-4">
          <p className="text-warn text-sm">{notice}</p>
        </div>
      )}

      {error && (
        <div className="bg-danger/10 border border-danger/20 rounded-xl p-4">
          <p className="text-danger text-sm">{error}</p>
        </div>
      )}

      <button
        onClick={entry === "upload" ? startImport : startRecording}
        disabled={busy || (entry === "upload" && (!importFile || !online))}
        className="w-full px-6 py-3 bg-brand hover:bg-brand-hi disabled:opacity-50 text-on-brand text-sm font-semibold rounded-lg transition-all"
      >
        {busy
          ? "Preparando…"
          : entry === "upload"
            ? !online
              ? "Subir un audio necesita conexión"
              : importFile
                ? "⬆️ Transcribir y analizar el audio"
                : "Elige un archivo para continuar"
            : "🎙️ Iniciar grabación"}
      </button>
      {meetingId && phase === "setup" && (
        <p className="text-fg-ghost text-xs text-center">Reunión creada: {meetingId}</p>
      )}
    </div>
  );
}
