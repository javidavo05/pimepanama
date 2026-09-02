"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatDuration, formatTimestamp } from "@/lib/meetings/transcript";
import type {
  ExecutiveMinutes,
  MeetingSegment,
  SerializedMeeting,
  SerializedMeetingActionItem,
  SerializedMeetingSpeaker,
  TechnicalMinutes,
} from "@/lib/meetings/types";
import { MEETING_STATUS_COLOR, MEETING_STATUS_LABEL } from "../status";
import { ActionItemsPanel } from "./action-items-panel";
import { DeliverablePanel } from "./deliverable-panel";
import { MeetingAskPanel } from "./meeting-ask-panel";
import { MeetingAudioPlayer, type SeekRequest } from "./meeting-audio-player";
import { MeetingContextPanel } from "./meeting-context-panel";
import { MeetingOutbound } from "./meeting-outbound";
import { MeetingTranscriptView } from "./meeting-transcript-view";

type Tab =
  | "entregable"
  | "ejecutiva"
  | "tecnica"
  | "pendientes"
  | "prompt"
  | "transcripcion"
  | "capitulos"
  | "preguntar";

const TABS: { key: Tab; label: string }[] = [
  { key: "entregable", label: "Entregable técnico" },
  { key: "ejecutiva", label: "Minuta ejecutiva" },
  { key: "tecnica", label: "Minuta técnica" },
  { key: "pendientes", label: "Pendientes" },
  { key: "prompt", label: "Master prompt" },
  { key: "capitulos", label: "Capítulos" },
  { key: "transcripcion", label: "Transcripción" },
  { key: "preguntar", label: "Preguntar" },
];

const STAGES = [
  { key: "diarize", label: "Hablantes" },
  { key: "minutes", label: "Minutas" },
  { key: "items", label: "Pendientes" },
  { key: "deliverable", label: "Entregable" },
  { key: "prompt", label: "Master prompt" },
  { key: "chapters", label: "Capítulos" },
] as const;

interface MeetingDetailProps {
  meeting: SerializedMeeting;
  segments: MeetingSegment[];
  project: { id: string; name: string } | null;
  client: { id: string; name: string; company: string | null } | null;
  projects: { id: string; name: string; clientId: string | null }[];
  clients: { id: string; name: string; company: string | null }[];
  speakers: SerializedMeetingSpeaker[];
  actionItems: SerializedMeetingActionItem[];
  executive: ExecutiveMinutes | null;
  technical: TechnicalMinutes | null;
  /** El proyecto tiene repositorio conectado y la IA vio el código real */
  hasRepo: boolean;
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
  segments,
  project,
  client,
  projects,
  clients,
  speakers,
  actionItems: initialItems,
  executive,
  technical,
  hasRepo,
}: MeetingDetailProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(
    meeting.technicalDeliverable ? "entregable" : executive ? "ejecutiva" : "transcripcion"
  );
  const [items, setItems] = useState(initialItems);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [renaming, setRenaming] = useState<Record<string, string>>({});
  const [editingHeader, setEditingHeader] = useState(false);
  const [title, setTitle] = useState(meeting.title);
  const [meetingDate, setMeetingDate] = useState(meeting.meetingDate.slice(0, 10));
  // El reproductor vive arriba y cualquier timestamp del detalle le pide saltar.
  const [seek, setSeek] = useState<SeekRequest | null>(null);

  const hasAudio = meeting.audioChunks.length > 0 || meeting.audioKeys.length > 0;

  function seekTo(ms: number) {
    setSeek({ ms, nonce: Date.now() });
  }

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

  async function saveHeader() {
    setBusy("header");
    setError(null);
    try {
      const res = await fetch(`/api/empresa/meetings/${meeting.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, meetingDate }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "No se pudo guardar");
      }
      setEditingHeader(false);
      setMessage("Reunión actualizada.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setBusy(null);
    }
  }

  async function deleteMeeting() {
    if (!confirm("Se borra la reunión, su transcripción y su audio. No se puede deshacer.")) return;
    setBusy("delete");
    setError(null);
    try {
      const res = await fetch(`/api/empresa/meetings/${meeting.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "No se pudo borrar");
      }
      router.push("/empresa/reuniones");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo borrar");
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
          <div className="min-w-0 flex-1">
            {editingHeader ? (
              <div className="space-y-2">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#050508] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:border-[#1AA7F0]/50 focus:outline-none"
                />
                <div className="flex gap-2 flex-wrap">
                  <input
                    type="date"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    className="bg-[#050508] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm focus:border-[#1AA7F0]/50 focus:outline-none"
                  />
                  <button
                    onClick={() => void saveHeader()}
                    disabled={busy !== null}
                    className="px-4 py-2 bg-[#1AA7F0] hover:bg-[#0E87C8] disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-all"
                  >
                    {busy === "header" ? "Guardando…" : "Guardar"}
                  </button>
                  <button
                    onClick={() => {
                      setEditingHeader(false);
                      setTitle(meeting.title);
                      setMeetingDate(meeting.meetingDate.slice(0, 10));
                    }}
                    className="px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white/70 text-xs rounded-lg transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h1 className="text-white text-xl font-semibold tracking-tight">{meeting.title}</h1>
                  <span className={`px-2 py-0.5 text-[10px] rounded border ${MEETING_STATUS_COLOR[meeting.status]}`}>
                    {MEETING_STATUS_LABEL[meeting.status]}
                  </span>
                  <button
                    onClick={() => setEditingHeader(true)}
                    className="text-white/30 hover:text-[#1AA7F0] text-xs transition-colors"
                    aria-label="Editar título y fecha"
                  >
                    ✎
                  </button>
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
              </>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-[#C8A96E]/70 text-xs font-mono">${meeting.aiCostUSD.toFixed(3)} en IA</p>
            <p className="text-white/40 text-xs">{meeting.segmentCount} intervenciones</p>
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
                        onClick={() => setRenaming((prev) => ({ ...prev, [s.label]: s.name ?? "" }))}
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
              disabled={busy !== null || meeting.segmentCount === 0}
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
          <button
            onClick={() => void deleteMeeting()}
            disabled={busy !== null}
            className="px-3 py-1.5 bg-white/[0.02] hover:bg-red-500/10 disabled:opacity-40 border border-white/[0.06] hover:border-red-500/25 text-white/40 hover:text-red-400 text-xs rounded-lg transition-all ml-auto"
          >
            {busy === "delete" ? "Borrando…" : "Borrar reunión"}
          </button>
        </div>

        {message && <p className="text-green-400 text-xs mt-3">{message}</p>}
        {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
      </div>

      {hasAudio && (
        <MeetingAudioPlayer meetingId={meeting.id} durationMs={meeting.durationMs} seek={seek} />
      )}

      <MeetingContextPanel
        meetingId={meeting.id}
        projectId={meeting.projectId}
        clientId={meeting.clientId}
        manualContext={meeting.manualContext}
        audioSource={meeting.audioSource}
        projects={projects}
        clients={clients}
        hasMinutes={executive !== null || technical !== null}
      />

      <MeetingOutbound
        meetingId={meeting.id}
        hasMinutes={executive !== null}
        minutesSentAt={meeting.minutesSentAt}
        nextMeetingTaskId={meeting.nextMeetingTaskId}
        nextMeetingHint={executive?.nextMeeting ?? null}
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
            {t.key === "capitulos" && meeting.chapters.length > 0 ? ` (${meeting.chapters.length})` : ""}
          </button>
        ))}
      </div>

      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl p-6 space-y-6">
        {tab === "entregable" && (
          <DeliverablePanel
            meetingId={meeting.id}
            deliverable={meeting.technicalDeliverable}
            hasProject={project !== null}
            projectId={meeting.projectId}
            hasRepo={hasRepo}
            deliverableId={meeting.deliverableId}
            contractId={meeting.contractId}
            proposalDraftedAt={meeting.proposalDraftedAt}
          />
        )}

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
                <Bullets items={technical.openQuestions} empty="Ninguna — el alcance quedó cerrado." />
              </Section>
            </>
          ) : (
            <p className="text-white/40 text-sm">
              Todavía no se generó la minuta técnica. Corre la etapa «Minutas».
            </p>
          ))}

        {tab === "pendientes" && (
          <ActionItemsPanel
            meetingId={meeting.id}
            items={items}
            onItemsChange={setItems}
            hasProject={project !== null}
          />
        )}

        {tab === "capitulos" &&
          (meeting.chapters.length > 0 ? (
            <div className="space-y-2">
              <p className="text-white/50 text-xs">
                El índice de la reunión. Pulsa un capítulo para escucharlo desde ahí.
              </p>
              {meeting.chapters.map((c, i) => (
                <button
                  key={i}
                  onClick={() => seekTo(c.startMs)}
                  className="w-full text-left border border-white/[0.06] hover:border-[#1AA7F0]/25 rounded-xl p-3.5 transition-all group"
                >
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-[#1AA7F0]/70 text-xs font-mono shrink-0">
                      {formatTimestamp(c.startMs)}
                    </span>
                    <span className="text-white text-sm font-medium group-hover:text-[#1AA7F0] transition-colors">
                      {c.title}
                    </span>
                  </div>
                  {c.summary && (
                    <p className="text-white/55 text-xs mt-1 leading-relaxed pl-[3.6rem]">{c.summary}</p>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-white/40 text-sm">
              Todavía no se generó el índice de temas. Corre la etapa «Capítulos».
            </p>
          ))}

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
          <MeetingTranscriptView
            segments={segments}
            fallback={meeting.transcript}
            onSeek={seekTo}
          />
        )}

        {tab === "preguntar" && (
          <MeetingAskPanel
            meetingId={meeting.id}
            hasTranscript={meeting.segmentCount > 0}
            onSeek={seekTo}
          />
        )}
      </div>
    </div>
  );
}
