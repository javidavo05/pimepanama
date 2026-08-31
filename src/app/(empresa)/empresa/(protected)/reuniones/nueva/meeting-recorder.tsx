"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AttendeeOrg, MeetingAttendee } from "@/lib/meetings/types";

/**
 * Duración de cada tramo de grabación. Cada tramo se cierra y se sube como un
 * webm independiente y decodificable — por eso se reinicia el MediaRecorder en
 * vez de pedirle `timeslice`: los trozos de un mismo recorder no se pueden
 * transcribir por separado.
 */
const SEGMENT_MS = 90_000;

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
] as const;

function pickMimeType(): string {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  for (const type of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

function formatClock(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
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
  const [captureTab, setCaptureTab] = useState(true);
  const [attendees, setAttendees] = useState<MeetingAttendee[]>([
    { name: creatorName?.trim() || "Javier Vallejo", org: "PIME" },
    { name: "", org: "CLIENTE" },
  ]);

  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [uploading, setUploading] = useState(0);
  const [stageIndex, setStageIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const destRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const streamsRef = useRef<MediaStream[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const rotateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const segmentIndexRef = useRef(0);
  const offsetRef = useRef(0);
  const segmentStartRef = useRef(0);
  const stoppingRef = useRef(false);
  const startedAtRef = useRef(0);
  // Las subidas se encadenan: el backend hace read-modify-write sobre el JSON de
  // segmentos, así que dos tramos en paralelo se pisarían.
  const uploadQueueRef = useRef<Promise<void>>(Promise.resolve());
  const meetingIdRef = useRef<string | null>(null);

  const selectedProject = projects.find((p) => p.id === projectId);

  useEffect(() => {
    if (selectedProject?.clientId && !clientId) setClientId(selectedProject.clientId);
  }, [selectedProject, clientId]);

  // Cronómetro de la grabación
  useEffect(() => {
    if (phase !== "recording") return;
    const t = setInterval(() => setElapsed(Date.now() - startedAtRef.current), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const releaseAudio = useCallback(() => {
    if (rotateTimerRef.current) clearTimeout(rotateTimerRef.current);
    rotateTimerRef.current = null;
    streamsRef.current.forEach((s) => s.getTracks().forEach((t) => t.stop()));
    streamsRef.current = [];
    audioCtxRef.current?.close().catch(() => undefined);
    audioCtxRef.current = null;
    destRef.current = null;
    recorderRef.current = null;
  }, []);

  // Si el usuario abandona la página con la grabación viva, soltamos el micrófono.
  useEffect(() => releaseAudio, [releaseAudio]);

  function updateAttendee(index: number, patch: Partial<MeetingAttendee>) {
    setAttendees((prev) => prev.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  }

  async function uploadSegment(blob: Blob, index: number, offsetMs: number) {
    const id = meetingIdRef.current;
    if (!id || blob.size === 0) return;

    const formData = new FormData();
    formData.append("audio", blob, `tramo-${index}.webm`);
    formData.append("index", String(index));
    formData.append("offsetMs", String(offsetMs));

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
      if (typeof data.transcript === "string") setTranscript(data.transcript);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error subiendo audio");
    } finally {
      setUploading((n) => n - 1);
    }
  }

  function enqueueUpload(blob: Blob, index: number, offsetMs: number) {
    uploadQueueRef.current = uploadQueueRef.current.then(() =>
      uploadSegment(blob, index, offsetMs)
    );
  }

  function startSegment() {
    const dest = destRef.current;
    if (!dest) return;

    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(dest.stream, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const elapsedMs = Date.now() - segmentStartRef.current;
      const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
      const index = segmentIndexRef.current++;
      const offset = offsetRef.current;
      offsetRef.current += elapsedMs;
      enqueueUpload(blob, index, offset);
      if (!stoppingRef.current) startSegment();
    };

    segmentStartRef.current = Date.now();
    recorder.start();
    recorderRef.current = recorder;
    rotateTimerRef.current = setTimeout(() => {
      if (recorder.state !== "inactive") recorder.stop();
    }, SEGMENT_MS);
  }

  async function startRecording() {
    setError(null);

    if (!title.trim()) {
      setError("Ponle un título a la reunión.");
      return;
    }
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Este navegador no permite grabar audio. Usa Chrome o Edge en escritorio.");
      return;
    }

    setBusy(true);
    try {
      const mic = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamsRef.current.push(mic);

      const ctx = new AudioContext();
      const dest = ctx.createMediaStreamDestination();
      ctx.createMediaStreamSource(mic).connect(dest);
      audioCtxRef.current = ctx;
      destRef.current = dest;

      if (captureTab) {
        try {
          // Chrome solo entrega audio de pestaña si también se pide vídeo; el
          // track de vídeo se ignora, solo va el audio a la mezcla.
          const display = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true,
          });
          streamsRef.current.push(display);
          const audioTracks = display.getAudioTracks();
          if (audioTracks.length === 0) {
            setError(
              "Compartiste la pantalla sin audio. Solo se grabará tu micrófono: para incluir al cliente, comparte una pestaña y marca «Compartir audio de la pestaña»."
            );
          } else {
            ctx.createMediaStreamSource(new MediaStream(audioTracks)).connect(dest);
          }
        } catch {
          setError("No se compartió la pestaña. Se graba solo tu micrófono.");
        }
      }

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

      stoppingRef.current = false;
      segmentIndexRef.current = 0;
      offsetRef.current = 0;
      startedAtRef.current = Date.now();
      setElapsed(0);
      startSegment();
      setPhase("recording");
    } catch (err) {
      releaseAudio();
      setError(err instanceof Error ? err.message : "No se pudo iniciar la grabación");
    } finally {
      setBusy(false);
    }
  }

  async function stopAndProcess() {
    const id = meetingIdRef.current;
    if (!id) return;

    setPhase("processing");
    stoppingRef.current = true;

    if (rotateTimerRef.current) clearTimeout(rotateTimerRef.current);
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();

    // El último tramo se encola dentro de onstop; esperamos un tick para que
    // entre a la cola antes de drenarla.
    await new Promise((r) => setTimeout(r, 300));
    await uploadQueueRef.current;
    releaseAudio();

    await fetch(`/api/empresa/meetings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ durationMs: Date.now() - startedAtRef.current }),
    }).catch(() => undefined);

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

  // ─── Render ────────────────────────────────────────────────────────────────

  if (phase === "processing" || phase === "done") {
    return (
      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl p-8">
        <h2 className="text-white text-lg font-semibold mb-1">Procesando la reunión</h2>
        <p className="text-white/60 text-sm mb-6">
          No cierres esta pestaña. Tarda alrededor de un minuto por cada media hora grabada.
        </p>
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
                  {captureTab ? "micrófono + pestaña" : "solo micrófono"}
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
          <p className="text-white/40 text-xs mt-4">
            {uploading > 0
              ? `Transcribiendo ${uploading} tramo${uploading !== 1 ? "s" : ""}…`
              : "Transcripción al día. Se sube un tramo cada 90 segundos."}
          </p>
          {error && <p className="text-amber-400 text-xs mt-2">{error}</p>}
        </div>

        <div className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl p-6">
          <h3 className="text-white/70 text-xs uppercase tracking-wider mb-3">Transcripción en vivo</h3>
          {transcript ? (
            <p className="text-white/75 text-sm leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
              {transcript}
            </p>
          ) : (
            <p className="text-white/40 text-sm">
              El primer tramo aparece a los 90 segundos de haber empezado.
            </p>
          )}
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
                : "Sin proyecto la reunión se analiza a ciegas y no acumula contexto."}
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
            Es la lista contra la que se resuelve quién habló. Mientras más completa, mejor la
            atribución.
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

      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl p-6">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={captureTab}
            onChange={(e) => setCaptureTab(e.target.checked)}
            className="mt-1 accent-[#1AA7F0]"
          />
          <span>
            <span className="text-white text-sm font-medium">
              Capturar también el audio de la videollamada
            </span>
            <span className="block text-white/50 text-xs mt-1">
              Al iniciar, Chrome pedirá compartir una pestaña: elige la del Meet o Zoom y marca
              «Compartir audio de la pestaña». Sin esto solo se graba tu micrófono y la
              transcripción no tendrá lo que dijo el cliente.
            </span>
          </span>
        </label>
      </div>

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
