"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LANGUAGE_LABEL, MEETING_LANGUAGES, type MeetingLanguage } from "@/lib/meetings/types";

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

const AUDIO_SOURCES = [
  { key: "VIDEOLLAMADA", label: "Videollamada (Meet, Zoom, Teams)" },
  { key: "LLAMADA", label: "Llamada telefónica" },
  { key: "PRESENCIAL", label: "Reunión presencial" },
  { key: "NOTA_VOZ", label: "Nota de voz" },
  { key: "OTRO", label: "Otro" },
] as const;

interface MeetingContextPanelProps {
  meetingId: string;
  projectId: string | null;
  clientId: string | null;
  manualContext: string | null;
  audioSource: string | null;
  spokenLanguages: string[];
  projects: ProjectOption[];
  clients: ClientOption[];
  /** Si ya se generaron minutas, reprocesar las rehace con el contexto nuevo */
  hasMinutes: boolean;
}

const REPROCESS_STAGES = [
  { key: "minutes", label: "Minutas" },
  { key: "items", label: "Pendientes" },
  { key: "prompt", label: "Prompt" },
] as const;

/**
 * Contexto de una reunión ya grabada: a qué proyecto pertenece, para qué cliente
 * y qué más hay que saber para entenderla.
 *
 * Existe porque el momento de grabar y el momento de saber dónde encaja lo
 * grabado casi nunca son el mismo: se entra a un Meet, se graba, y recién
 * después se decide de qué proyecto era. Al reprocesar, las minutas se rehacen
 * con el alcance, los entregables y las reuniones anteriores de ese proyecto.
 */
export function MeetingContextPanel({
  meetingId,
  projectId,
  clientId,
  manualContext,
  audioSource,
  spokenLanguages,
  projects,
  clients,
  hasMinutes,
}: MeetingContextPanelProps) {
  const router = useRouter();
  const [open, setOpen] = useState(!projectId);
  const [project, setProject] = useState(projectId ?? "");
  const [client, setClient] = useState(clientId ?? "");
  const [notes, setNotes] = useState(manualContext ?? "");
  const [source, setSource] = useState(audioSource ?? "");
  const [spoken, setSpoken] = useState<MeetingLanguage[]>(
    () => MEETING_LANGUAGES.filter((l) => spokenLanguages.includes(l))
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    project !== (projectId ?? "") ||
    client !== (clientId ?? "") ||
    notes.trim() !== (manualContext ?? "").trim() ||
    source !== (audioSource ?? "") ||
    spoken.join(",") !== MEETING_LANGUAGES.filter((l) => spokenLanguages.includes(l)).join(",");

  async function save(): Promise<boolean> {
    setBusy("save");
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/empresa/meetings/${meetingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project,
          clientId: client,
          manualContext: notes,
          audioSource: source || null,
          spokenLanguages: spoken,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar el contexto");
      setSaved(true);
      router.refresh();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el contexto");
      return false;
    } finally {
      setBusy(null);
    }
  }

  /** Guarda y vuelve a correr el análisis, para que las minutas usen el contexto nuevo. */
  async function saveAndReprocess() {
    if (dirty && !(await save())) return;

    for (const stage of REPROCESS_STAGES) {
      setBusy(stage.key);
      const res = await fetch(`/api/empresa/meetings/${meetingId}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: stage.key }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `Error rehaciendo ${stage.label.toLowerCase()}`);
        setBusy(null);
        return;
      }
    }

    setBusy(null);
    setSaved(true);
    router.refresh();
  }

  function onProjectChange(value: string) {
    setProject(value);
    // El cliente del proyecto se hereda si la reunión no tenía uno propio.
    const found = projects.find((p) => p.id === value);
    if (found?.clientId && !client) setClient(found.clientId);
  }

  return (
    <div className="bg-panel border border-line rounded-2xl">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-6 py-4 text-left"
      >
        <span>
          <span className="text-fg-mute text-xs uppercase tracking-wider">Proyecto y contexto</span>
          <span className="block text-fg-ghost text-xs mt-0.5">
            {projectId
              ? "Cambia el proyecto o agrega contexto y vuelve a analizar."
              : "Esta reunión no está en ningún proyecto: asígnala para que la IA la analice con el alcance y las reuniones anteriores."}
          </span>
        </span>
        <span className="text-fg-ghost text-xs shrink-0">{open ? "Ocultar" : "Editar"}</span>
      </button>

      {open && (
        <div className="px-6 pb-6 space-y-4 border-t border-line pt-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-fg-mute text-xs uppercase tracking-wider mb-1.5">
                Proyecto
              </label>
              <select
                value={project}
                onChange={(e) => onProjectChange(e.target.value)}
                className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-fg text-sm focus:border-brand/50 focus:outline-none"
              >
                <option value="">Sin proyecto</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-fg-mute text-xs uppercase tracking-wider mb-1.5">
                Cliente
              </label>
              <select
                value={client}
                onChange={(e) => setClient(e.target.value)}
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
          </div>

          <div>
            <label className="block text-fg-mute text-xs uppercase tracking-wider mb-1.5">
              Origen del audio
            </label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-fg text-sm focus:border-brand/50 focus:outline-none"
            >
              <option value="">Sin declarar</option>
              {AUDIO_SOURCES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
            <p className="text-fg-ghost text-xs mt-1">
              Declararlo y volver a analizar mejora la separación de voces: una llamada de dos
              personas no se reparte como una sala de seis.
            </p>
          </div>

          <div>
            <label className="block text-fg-mute text-xs uppercase tracking-wider mb-1.5">
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
              Cambiar esto no re-transcribe el audio ya subido; sí cambia cómo se separan las voces
              y se redacta al volver a analizar.
            </p>
          </div>

          <div>
            <label className="block text-fg-mute text-xs uppercase tracking-wider mb-1.5">
              Contexto manual
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              placeholder="Lo que hace falta saber para entender esta reunión: de qué venía, qué siglas se usan, quién es quién, qué se acordó antes por fuera. Entra al prompt junto con el contexto del proyecto y pesa más que él."
              className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-fg text-sm placeholder:text-fg-trace focus:border-brand/50 focus:outline-none leading-relaxed"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={save}
              disabled={busy !== null || !dirty}
              className="px-4 py-2 bg-fill hover:bg-fill-2 disabled:opacity-40 border border-line text-fg-mute text-xs rounded-lg transition-all"
            >
              {busy === "save" ? "Guardando…" : "Guardar"}
            </button>
            <button
              onClick={saveAndReprocess}
              disabled={busy !== null}
              className="px-4 py-2 bg-brand hover:bg-brand-hi disabled:opacity-40 text-on-brand text-xs font-semibold rounded-lg transition-all"
            >
              {busy && busy !== "save"
                ? `Rehaciendo ${busy === "minutes" ? "minutas" : busy === "items" ? "pendientes" : "prompt"}…`
                : hasMinutes
                  ? "Guardar y volver a analizar"
                  : "Guardar y analizar"}
            </button>
            {saved && busy === null && <span className="text-ok text-xs">Guardado.</span>}
            {error && <span className="text-danger text-xs">{error}</span>}
          </div>

          <p className="text-fg-ghost text-xs leading-relaxed">
            Volver a analizar rehace minutas, pendientes y prompt. Los pendientes que ya pasaste a
            Tareas o a entregables no se tocan.
          </p>
        </div>
      )}
    </div>
  );
}
