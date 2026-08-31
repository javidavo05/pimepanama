"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatDuration } from "@/lib/meetings/transcript";
import type {
  ExecutiveMinutes,
  SerializedMeeting,
  SerializedMeetingActionItem,
  SerializedMeetingSpeaker,
  TechnicalMinutes,
} from "@/lib/meetings/types";
import {
  KIND_COLOR,
  KIND_LABEL,
  MEETING_STATUS_COLOR,
  MEETING_STATUS_LABEL,
  PRIORITY_LABEL,
} from "../status";
import { MeetingContextPanel } from "./meeting-context-panel";

type Tab = "ejecutiva" | "tecnica" | "pendientes" | "prompt" | "transcripcion";

const TABS: { key: Tab; label: string }[] = [
  { key: "ejecutiva", label: "Minuta ejecutiva" },
  { key: "tecnica", label: "Minuta técnica" },
  { key: "pendientes", label: "Pendientes" },
  { key: "prompt", label: "Prompt técnico" },
  { key: "transcripcion", label: "Transcripción" },
];

const STAGES = [
  { key: "diarize", label: "Hablantes" },
  { key: "minutes", label: "Minutas" },
  { key: "items", label: "Pendientes" },
  { key: "prompt", label: "Prompt" },
] as const;

interface MeetingDetailProps {
  meeting: SerializedMeeting;
  project: { id: string; name: string } | null;
  client: { id: string; name: string; company: string | null } | null;
  projects: { id: string; name: string; clientId: string | null }[];
  clients: { id: string; name: string; company: string | null }[];
  speakers: SerializedMeetingSpeaker[];
  actionItems: SerializedMeetingActionItem[];
  executive: ExecutiveMinutes | null;
  technical: TechnicalMinutes | null;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-white/70 text-xs uppercase tracking-wider mb-2">{title}</h3>
      {children}
    </div>
  );
}

function Bullets({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) return <p className="text-white/40 text-sm">{empty}</p>;
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="text-white/75 text-sm leading-relaxed flex gap-2">
          <span className="text-[#1AA7F0]/60 shrink-0">·</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function MeetingDetail({
  meeting,
  project,
  client,
  projects,
  clients,
  speakers,
  actionItems: initialItems,
  executive,
  technical,
}: MeetingDetailProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(executive ? "ejecutiva" : "transcripcion");
  const [items, setItems] = useState(initialItems);
  const [selected, setSelected] = useState<string[]>(() =>
    initialItems.filter((i) => !i.taskId).map((i) => i.id)
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [renaming, setRenaming] = useState<Record<string, string>>({});

  const unsynced = items.filter((i) => !i.taskId);

  /**
   * Le pone nombre real a una etiqueta que la IA dejó genérica ("Hablante 2").
   * Reescribe la transcripción atribuida entera y marca esos segmentos como
   * confirmados, así un reproceso posterior ya no los vuelve a adivinar.
   */
  async function renameSpeaker(from: string) {
    const to = renaming[from]?.trim();
    if (!to || to === from) return;
    setBusy(`speaker-${from}`);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/empresa/meetings/${meeting.id}/speakers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labels: [{ from, to }] }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No se pudo renombrar");
      setRenaming((prev) => {
        const next = { ...prev };
        delete next[from];
        return next;
      });
      setMessage(`«${from}» ahora es ${to}.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo renombrar");
    } finally {
      setBusy(null);
    }
  }

  async function runStage(stage: string, label: string) {
    setBusy(stage);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/empresa/meetings/${meeting.id}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Error procesando");
      setMessage(`${label} listo.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error procesando");
    } finally {
      setBusy(null);
    }
  }

  async function syncTasks(asDeliverables: boolean) {
    if (selected.length === 0) {
      setError("Selecciona al menos un pendiente.");
      return;
    }
    setBusy("sync");
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/empresa/meetings/${meeting.id}/sync-tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIds: selected, asDeliverables }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Error creando tareas");
      setItems(data.actionItems);
      setSelected([]);
      setMessage(
        `${data.created} tarea${data.created !== 1 ? "s" : ""} creada${data.created !== 1 ? "s" : ""}${
          asDeliverables ? " y agregadas como entregables del proyecto" : ""
        }.`
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error creando tareas");
    } finally {
      setBusy(null);
    }
  }

  async function emitBitacora() {
    setBusy("bitacora");
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/empresa/meetings/${meeting.id}/bitacora`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Error emitiendo la bitácora");
      router.push(`/empresa/bitacoras/${data.documentId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error emitiendo la bitácora");
      setBusy(null);
    }
  }

  async function copyPrompt() {
    if (!meeting.technicalPrompt) return;
    await navigator.clipboard.writeText(meeting.technicalPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      <Link href="/empresa/reuniones" className="text-white/50 hover:text-white/80 text-sm transition-colors">
        ← Reuniones
      </Link>

      {/* Cabecera */}
      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-white text-xl font-semibold tracking-tight">{meeting.title}</h1>
              <span className={`px-2 py-0.5 text-[10px] rounded border ${MEETING_STATUS_COLOR[meeting.status]}`}>
                {MEETING_STATUS_LABEL[meeting.status]}
              </span>
            </div>
            <p className="text-white/60 text-sm">
              {new Date(meeting.meetingDate).toLocaleDateString("es-PA")}
              {meeting.durationMs > 0 ? ` · ${formatDuration(meeting.durationMs)}` : ""}
              {project ? (
                <>
                  {" · "}
                  <Link href={`/empresa/proyectos/${project.id}`} className="text-[#1AA7F0] hover:underline">
                    {project.name}
                  </Link>
                </>
              ) : (
                <span className="text-amber-400/70"> · sin proyecto</span>
              )}
              {client ? ` · ${client.name}` : ""}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[#C8A96E]/70 text-xs font-mono">${meeting.aiCostUSD.toFixed(3)} en IA</p>
            <p className="text-white/40 text-xs">{meeting.segments.length} intervenciones</p>
          </div>
        </div>

        {speakers.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {speakers.map((s) => {
              const editing = renaming[s.label] !== undefined;
              return (
                <span
                  key={s.id}
                  className="px-2.5 py-1 rounded-lg border border-white/[0.08] bg-white/[0.03] text-xs text-white/70 flex items-center gap-1.5"
                >
                  {editing ? (
                    <>
                      <input
                        autoFocus
                        value={renaming[s.label]}
                        onChange={(e) =>
                          setRenaming((prev) => ({ ...prev, [s.label]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void renameSpeaker(s.label);
                          if (e.key === "Escape")
                            setRenaming((prev) => {
                              const next = { ...prev };
                              delete next[s.label];
                              return next;
                            });
                        }}
                        placeholder="Nombre real"
                        className="bg-[#050508] border border-white/[0.08] rounded px-1.5 py-0.5 text-white text-xs w-32 focus:border-[#1AA7F0]/50 focus:outline-none"
                      />
                      <button
                        onClick={() => void renameSpeaker(s.label)}
                        disabled={busy !== null}
                        className="text-[#1AA7F0] hover:text-[#0E87C8] transition-colors"
                      >
                        {busy === `speaker-${s.label}` ? "…" : "✓"}
                      </button>
                    </>
                  ) : (
                    <>
                      <span>{s.name ?? s.label}</span>
                      <span className="text-white/40">
                        · {s.org === "PIME" ? "Pime" : s.org === "CLIENTE" ? "Cliente" : "?"} ·{" "}
                        {formatDuration(s.talkMs)}
                      </span>
                      <button
                        onClick={() =>
                          setRenaming((prev) => ({ ...prev, [s.label]: s.name ?? "" }))
                        }
                        className="text-white/30 hover:text-[#1AA7F0] transition-colors"
                        aria-label={`Renombrar ${s.label}`}
                      >
                        ✎
                      </button>
                    </>
                  )}
                </span>
              );
            })}
          </div>
        )}

        {meeting.errorMessage && (
          <p className="text-red-400 text-xs mt-4">Último error: {meeting.errorMessage}</p>
        )}

        <div className="flex flex-wrap gap-2 mt-5">
          {STAGES.map((stage) => (
            <button
              key={stage.key}
              onClick={() => runStage(stage.key, stage.label)}
              disabled={busy !== null || meeting.segments.length === 0}
              className="px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-40 border border-white/[0.08] text-white/70 text-xs rounded-lg transition-all"
            >
              {busy === stage.key ? "Procesando…" : `↻ ${stage.label}`}
            </button>
          ))}
          {executive && !meeting.bitacoraId && (
            <button
              onClick={emitBitacora}
              disabled={busy !== null}
              className="px-3 py-1.5 bg-[#C8A96E]/15 hover:bg-[#C8A96E]/25 disabled:opacity-40 border border-[#C8A96E]/25 text-[#C8A96E] text-xs rounded-lg transition-all"
            >
              {busy === "bitacora" ? "Emitiendo…" : "📝 Emitir bitácora"}
            </button>
          )}
          {meeting.bitacoraId && (
            <Link
              href={`/empresa/bitacoras/${meeting.bitacoraId}`}
              className="px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white/70 text-xs rounded-lg transition-all"
            >
              📝 Ver bitácora emitida
            </Link>
          )}
        </div>

        {message && <p className="text-green-400 text-xs mt-3">{message}</p>}
        {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
      </div>

      <MeetingContextPanel
        meetingId={meeting.id}
        projectId={meeting.projectId}
        clientId={meeting.clientId}
        manualContext={meeting.manualContext}
        projects={projects}
        clients={clients}
        hasMinutes={executive !== null || technical !== null}
      />

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all border ${
              tab === t.key
                ? "bg-[#1AA7F0]/15 border-[#1AA7F0]/30 text-[#1AA7F0]"
                : "bg-white/[0.02] border-white/[0.06] text-white/55 hover:text-white/80"
            }`}
          >
            {t.label}
            {t.key === "pendientes" && items.length > 0 ? ` (${items.length})` : ""}
          </button>
        ))}
      </div>

      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl p-6 space-y-6">
        {tab === "ejecutiva" &&
          (executive ? (
            <>
              <Section title="De qué se habló">
                <p className="text-white/75 text-sm leading-relaxed whitespace-pre-wrap">
                  {executive.agenda || "—"}
                </p>
              </Section>
              <Section title="Decisiones">
                <Bullets items={executive.decisions} empty="No se registraron decisiones." />
              </Section>
              <Section title="Compromisos">
                <Bullets items={executive.commitments} empty="No se registraron compromisos." />
              </Section>
              <Section title="Riesgos y bloqueos">
                <Bullets items={executive.risks} empty="Ninguno mencionado." />
              </Section>
              <Section title="Próximos pasos">
                <p className="text-white/75 text-sm leading-relaxed whitespace-pre-wrap">
                  {executive.nextSteps || "—"}
                </p>
              </Section>
              <Section title="Próxima reunión">
                <p className="text-white/75 text-sm">{executive.nextMeeting || "Por agendar"}</p>
              </Section>
            </>
          ) : (
            <p className="text-white/40 text-sm">
              Todavía no se generó la minuta ejecutiva. Corre la etapa «Minutas».
            </p>
          ))}

        {tab === "tecnica" &&
          (technical ? (
            <>
              <Section title="Resumen técnico">
                <p className="text-white/75 text-sm leading-relaxed whitespace-pre-wrap">
                  {technical.summary || "—"}
                </p>
              </Section>
              <Section title="Decisiones de arquitectura">
                <Bullets items={technical.architecture} empty="No se tomó ninguna." />
              </Section>
              <Section title="Cambios identificados">
                {technical.changes.length === 0 ? (
                  <p className="text-white/40 text-sm">Ninguno.</p>
                ) : (
                  <div className="space-y-3">
                    {technical.changes.map((c, i) => (
                      <div key={i} className="border border-white/[0.06] rounded-lg p-3">
                        <p className="text-[#1AA7F0] text-xs uppercase tracking-wider mb-1">{c.area}</p>
                        <p className="text-white/80 text-sm">{c.what}</p>
                        {c.why && <p className="text-white/50 text-xs mt-1">Por qué: {c.why}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </Section>
              <Section title="Dependencias pendientes">
                <Bullets items={technical.dependencies} empty="Ninguna." />
              </Section>
              <Section title="Preguntas abiertas">
                <Bullets
                  items={technical.openQuestions}
                  empty="Ninguna — el alcance quedó cerrado."
                />
              </Section>
            </>
          ) : (
            <p className="text-white/40 text-sm">
              Todavía no se generó la minuta técnica. Corre la etapa «Minutas».
            </p>
          ))}

        {tab === "pendientes" && (
          <>
            {items.length === 0 ? (
              <p className="text-white/40 text-sm">
                No hay pendientes. Corre la etapa «Pendientes» para extraerlos de la reunión.
              </p>
            ) : (
              <>
                <div className="space-y-3">
                  {items.map((item) => {
                    const isSelected = selected.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        className={`border rounded-xl p-4 transition-all ${
                          item.taskId
                            ? "border-green-500/20 bg-green-500/[0.03]"
                            : isSelected
                              ? "border-[#1AA7F0]/30 bg-[#1AA7F0]/[0.04]"
                              : "border-white/[0.06]"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {!item.taskId && (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) =>
                                setSelected((prev) =>
                                  e.target.checked
                                    ? [...prev, item.id]
                                    : prev.filter((id) => id !== item.id)
                                )
                              }
                              className="mt-1 accent-[#1AA7F0]"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className={`px-2 py-0.5 text-[10px] rounded border ${KIND_COLOR[item.kind]}`}>
                                {KIND_LABEL[item.kind]}
                              </span>
                              <span className="text-white/40 text-[10px]">
                                Prioridad {PRIORITY_LABEL[item.priority]}
                              </span>
                              {item.taskId && (
                                <span className="text-green-400 text-[10px]">✓ En tareas</span>
                              )}
                            </div>
                            <p className="text-white text-sm font-medium">{item.title}</p>
                            {item.detail && (
                              <p className="text-white/60 text-xs mt-1 leading-relaxed">{item.detail}</p>
                            )}
                            {item.acceptance.length > 0 && (
                              <div className="mt-2">
                                <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">
                                  Criterios de aceptación
                                </p>
                                <ul className="space-y-0.5">
                                  {item.acceptance.map((a, i) => (
                                    <li key={i} className="text-white/60 text-xs flex gap-1.5">
                                      <span className="text-[#1AA7F0]/50">✓</span>
                                      <span>{a}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            <div className="flex gap-3 flex-wrap mt-2 text-[11px] text-white/40">
                              {item.owner && <span>👤 {item.owner}</span>}
                              {item.dueDate && (
                                <span>📅 {new Date(item.dueDate).toLocaleDateString("es-PA")}</span>
                              )}
                              {item.estimateHours && <span>⏱ {item.estimateHours} h</span>}
                              {item.touchpoints.length > 0 && (
                                <span>🧩 {item.touchpoints.join(", ")}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {unsynced.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-white/[0.06]">
                    <button
                      onClick={() => syncTasks(false)}
                      disabled={busy !== null || selected.length === 0}
                      className="px-4 py-2 bg-[#1AA7F0] hover:bg-[#0E87C8] disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-all"
                    >
                      {busy === "sync" ? "Creando…" : `✅ Pasar ${selected.length} a Tareas`}
                    </button>
                    {project && (
                      <button
                        onClick={() => syncTasks(true)}
                        disabled={busy !== null || selected.length === 0}
                        className="px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-40 border border-white/[0.08] text-white/70 text-xs rounded-lg transition-all"
                      >
                        + también como entregables del proyecto
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {tab === "prompt" &&
          (meeting.technicalPrompt ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <p className="text-white/50 text-xs">
                  Cópialo y pégalo en Claude Code o en el ticket del desarrollador. Se sostiene solo:
                  no hace falta la transcripción.
                </p>
                <button
                  onClick={copyPrompt}
                  className="px-3 py-1.5 bg-[#1AA7F0] hover:bg-[#0E87C8] text-white text-xs font-semibold rounded-lg transition-all shrink-0"
                >
                  {copied ? "✓ Copiado" : "Copiar prompt"}
                </button>
              </div>
              <pre className="bg-[#050508] border border-white/[0.06] rounded-xl p-4 text-white/75 text-xs leading-relaxed whitespace-pre-wrap overflow-x-auto font-mono">
                {meeting.technicalPrompt}
              </pre>
              {meeting.contextSummary && (
                <Section title="Memoria que guarda el proyecto">
                  <p className="text-white/60 text-sm leading-relaxed">{meeting.contextSummary}</p>
                  <p className="text-white/35 text-xs mt-2">
                    Esto es lo que las próximas reuniones de este proyecto van a saber sobre esta.
                  </p>
                </Section>
              )}
            </>
          ) : (
            <p className="text-white/40 text-sm">
              Todavía no se generó el prompt técnico. Corre la etapa «Prompt».
            </p>
          ))}

        {tab === "transcripcion" && (
          <>
            {meeting.diarizedText ? (
              <div className="space-y-3 max-h-[70vh] overflow-y-auto">
                {meeting.diarizedText.split("\n\n").map((turn, i) => {
                  const match = turn.match(/^\*\*(.+?)\*\*\s*\((.+?)\):\s*([\s\S]*)$/);
                  if (!match) {
                    return (
                      <p key={i} className="text-white/70 text-sm leading-relaxed">
                        {turn}
                      </p>
                    );
                  }
                  const [, speaker, time, text] = match;
                  return (
                    <div key={i} className="flex gap-3">
                      <div className="w-32 shrink-0 text-right">
                        <p className="text-[#1AA7F0] text-xs font-medium truncate">{speaker}</p>
                        <p className="text-white/30 text-[10px] font-mono">{time}</p>
                      </div>
                      <p className="text-white/75 text-sm leading-relaxed flex-1">{text}</p>
                    </div>
                  );
                })}
              </div>
            ) : meeting.transcript ? (
              <>
                <p className="text-white/40 text-xs">
                  Sin atribuir todavía — corre la etapa «Hablantes» para separar quién dijo qué.
                </p>
                <p className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap max-h-[70vh] overflow-y-auto">
                  {meeting.transcript}
                </p>
              </>
            ) : (
              <p className="text-white/40 text-sm">Esta reunión no tiene audio transcrito.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
