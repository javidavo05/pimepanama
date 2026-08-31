"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

interface MeetingContextPanelProps {
  meetingId: string;
  projectId: string | null;
  clientId: string | null;
  manualContext: string | null;
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
  projects,
  clients,
  hasMinutes,
}: MeetingContextPanelProps) {
  const router = useRouter();
  const [open, setOpen] = useState(!projectId);
  const [project, setProject] = useState(projectId ?? "");
  const [client, setClient] = useState(clientId ?? "");
  const [notes, setNotes] = useState(manualContext ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    project !== (projectId ?? "") ||
    client !== (clientId ?? "") ||
    notes.trim() !== (manualContext ?? "").trim();

  async function save(): Promise<boolean> {
    setBusy("save");
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/empresa/meetings/${meetingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project, clientId: client, manualContext: notes }),
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
    <div className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-6 py-4 text-left"
      >
        <span>
          <span className="text-white/70 text-xs uppercase tracking-wider">Proyecto y contexto</span>
          <span className="block text-white/40 text-xs mt-0.5">
            {projectId
              ? "Cambia el proyecto o agrega contexto y vuelve a analizar."
              : "Esta reunión no está en ningún proyecto: asígnala para que la IA la analice con el alcance y las reuniones anteriores."}
          </span>
        </span>
        <span className="text-white/40 text-xs shrink-0">{open ? "Ocultar" : "Editar"}</span>
      </button>

      {open && (
        <div className="px-6 pb-6 space-y-4 border-t border-white/[0.06] pt-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-white/70 text-xs uppercase tracking-wider mb-1.5">
                Proyecto
              </label>
              <select
                value={project}
                onChange={(e) => onProjectChange(e.target.value)}
                className="w-full bg-[#050508] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:border-[#1AA7F0]/50 focus:outline-none"
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
              <label className="block text-white/70 text-xs uppercase tracking-wider mb-1.5">
                Cliente
              </label>
              <select
                value={client}
                onChange={(e) => setClient(e.target.value)}
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
          </div>

          <div>
            <label className="block text-white/70 text-xs uppercase tracking-wider mb-1.5">
              Contexto manual
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              placeholder="Lo que hace falta saber para entender esta reunión: de qué venía, qué siglas se usan, quién es quién, qué se acordó antes por fuera. Entra al prompt junto con el contexto del proyecto y pesa más que él."
              className="w-full bg-[#050508] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm placeholder:text-white/30 focus:border-[#1AA7F0]/50 focus:outline-none leading-relaxed"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={save}
              disabled={busy !== null || !dirty}
              className="px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-40 border border-white/[0.08] text-white/70 text-xs rounded-lg transition-all"
            >
              {busy === "save" ? "Guardando…" : "Guardar"}
            </button>
            <button
              onClick={saveAndReprocess}
              disabled={busy !== null}
              className="px-4 py-2 bg-[#1AA7F0] hover:bg-[#0E87C8] disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-all"
            >
              {busy && busy !== "save"
                ? `Rehaciendo ${busy === "minutes" ? "minutas" : busy === "items" ? "pendientes" : "prompt"}…`
                : hasMinutes
                  ? "Guardar y volver a analizar"
                  : "Guardar y analizar"}
            </button>
            {saved && busy === null && <span className="text-green-400 text-xs">Guardado.</span>}
            {error && <span className="text-red-400 text-xs">{error}</span>}
          </div>

          <p className="text-white/35 text-xs leading-relaxed">
            Volver a analizar rehace minutas, pendientes y prompt. Los pendientes que ya pasaste a
            Tareas o a entregables no se tocan.
          </p>
        </div>
      )}
    </div>
  );
}
