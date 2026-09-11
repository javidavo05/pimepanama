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
  TechnicalTopic,
} from "@/lib/meetings/types";
import { isLegacyTechnical } from "@/lib/meetings/technical";
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
      <h3 className="text-fg-mute text-xs uppercase tracking-wider mb-2">{title}</h3>
      {children}
    </div>
  );
}

function Bullets({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) return <p className="text-fg-ghost text-sm">{empty}</p>;
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="text-fg-soft text-sm leading-relaxed flex gap-2">
          <span className="text-brand-fg shrink-0">·</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Una lista dentro de un tema. Sin elementos no se pinta: un rótulo vacío es ruido. */
function TopicList({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-3">
      <p className="text-fg-faint text-xs font-medium mb-1">{label}</p>
      <Bullets items={items} empty="" />
    </div>
  );
}

/**
 * Un tema de la minuta técnica. El minuto salta al audio: es lo que permite
 * comprobar un dato escuchándolo en vez de creerle a la minuta.
 */
function TopicBlock({ topic, onSeek }: { topic: TechnicalTopic; onSeek?: (ms: number) => void }) {
  const at = topic.startMs !== null ? formatTimestamp(topic.startMs) : null;
  return (
    <article className="py-4 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-fg text-sm font-semibold leading-snug min-w-0 break-words">{topic.title}</h4>
        {at !== null &&
          (onSeek ? (
            <button
              onClick={() => onSeek(topic.startMs as number)}
              aria-label={`Escuchar desde ${at}`}
              className="shrink-0 -my-3 px-2 min-h-[44px] text-brand-fg hover:underline underline-offset-2 text-xs font-mono tabular-nums"
            >
              ▶ {at}
            </button>
          ) : (
            <span className="shrink-0 text-fg-faint text-xs font-mono tabular-nums">{at}</span>
          ))}
      </div>
      {topic.discussion && (
        <p className="text-fg-soft text-sm leading-relaxed whitespace-pre-wrap mt-2">{topic.discussion}</p>
      )}
      <TopicList label="Datos concretos" items={topic.details} />
      <TopicList label="Se decidió" items={topic.decisions} />
      <TopicList label="Quedó abierto" items={topic.pending} />
    </article>
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
      <Link href="/empresa/reuniones" className="text-fg-faint hover:text-fg-soft text-sm transition-colors">
        ← Reuniones
      </Link>

      {/* Cabecera */}
      <div className="bg-panel border border-line rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            {editingHeader ? (
              <div className="space-y-2">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-fg text-sm focus:border-brand/50 focus:outline-none"
                />
                <div className="flex gap-2 flex-wrap">
                  <input
                    type="date"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    className="bg-canvas border border-line rounded-lg px-3 py-2 text-fg text-sm focus:border-brand/50 focus:outline-none"
                  />
                  <button
                    onClick={() => void saveHeader()}
                    disabled={busy !== null}
                    className="px-4 py-2 bg-brand hover:bg-brand-hi disabled:opacity-40 text-on-brand text-xs font-semibold rounded-lg transition-all"
                  >
                    {busy === "header" ? "Guardando…" : "Guardar"}
                  </button>
                  <button
                    onClick={() => {
                      setEditingHeader(false);
                      setTitle(meeting.title);
                      setMeetingDate(meeting.meetingDate.slice(0, 10));
                    }}
                    className="px-4 py-2 bg-fill hover:bg-fill-2 border border-line text-fg-mute text-xs rounded-lg transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h1 className="text-fg text-xl font-semibold tracking-tight">{meeting.title}</h1>
                  <span className={`px-2 py-1 text-[10px] rounded border ${MEETING_STATUS_COLOR[meeting.status]}`}>
                    {MEETING_STATUS_LABEL[meeting.status]}
                  </span>
                  <button
                    onClick={() => setEditingHeader(true)}
                    className="text-fg-ghost hover:text-brand-fg text-xs transition-colors"
                    aria-label="Editar título y fecha"
                  >
                    ✎
                  </button>
                </div>
                <p className="text-fg-dim text-sm">
                  {new Date(meeting.meetingDate).toLocaleDateString("es-PA")}
                  {meeting.durationMs > 0 ? ` · ${formatDuration(meeting.durationMs)}` : ""}
                  {project ? (
                    <>
                      {" · "}
                      <Link href={`/empresa/proyectos/${project.id}`} className="text-brand-fg hover:underline">
                        {project.name}
                      </Link>
                    </>
                  ) : (
                    <span className="text-warn"> · sin proyecto</span>
                  )}
                  {client ? ` · ${client.name}` : ""}
                </p>
              </>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-sand-fg text-xs font-mono">${meeting.aiCostUSD.toFixed(3)} en IA</p>
            <p className="text-fg-ghost text-xs">{meeting.segmentCount} intervenciones</p>
          </div>
        </div>

        {speakers.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {speakers.map((s) => {
              const editing = renaming[s.label] !== undefined;
              return (
                <span
                  key={s.id}
                  className="px-3 py-1 rounded-lg border border-line bg-fill text-xs text-fg-mute flex items-center gap-2"
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
                        className="bg-canvas border border-line rounded px-2 py-1 text-fg text-xs w-32 focus:border-brand/50 focus:outline-none"
                      />
                      <button
                        onClick={() => void renameSpeaker(s.label)}
                        disabled={busy !== null}
                        className="text-brand-fg hover:text-brand-hi transition-colors"
                      >
                        {busy === `speaker-${s.label}` ? "…" : "✓"}
                      </button>
                    </>
                  ) : (
                    <>
                      <span>{s.name ?? s.label}</span>
                      <span className="text-fg-ghost">
                        · {s.org === "PIME" ? "Pime" : s.org === "CLIENTE" ? "Cliente" : "?"} ·{" "}
                        {formatDuration(s.talkMs)}
                      </span>
                      <button
                        onClick={() => setRenaming((prev) => ({ ...prev, [s.label]: s.name ?? "" }))}
                        className="text-fg-ghost hover:text-brand-fg transition-colors"
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
          <p className="text-danger text-xs mt-4">Último error: {meeting.errorMessage}</p>
        )}

        <div className="flex flex-wrap gap-2 mt-6">
          {STAGES.map((stage) => (
            <button
              key={stage.key}
              onClick={() => runStage(stage.key, stage.label)}
              disabled={busy !== null || meeting.segmentCount === 0}
              className="px-3 py-2 bg-fill hover:bg-fill-2 disabled:opacity-40 border border-line text-fg-mute text-xs rounded-lg transition-all"
            >
              {busy === stage.key ? "Procesando…" : `↻ ${stage.label}`}
            </button>
          ))}
          {executive && !meeting.bitacoraId && (
            <button
              onClick={emitBitacora}
              disabled={busy !== null}
              className="px-3 py-2 bg-sand/15 hover:bg-sand/25 disabled:opacity-40 border border-sand/25 text-sand-fg text-xs rounded-lg transition-all"
            >
              {busy === "bitacora" ? "Emitiendo…" : "📝 Emitir bitácora"}
            </button>
          )}
          {meeting.bitacoraId && (
            <Link
              href={`/empresa/bitacoras/${meeting.bitacoraId}`}
              className="px-3 py-2 bg-fill hover:bg-fill-2 border border-line text-fg-mute text-xs rounded-lg transition-all"
            >
              📝 Ver bitácora emitida
            </Link>
          )}
          <button
            onClick={() => void deleteMeeting()}
            disabled={busy !== null}
            className="px-3 py-2 bg-fill hover:bg-danger/10 disabled:opacity-40 border border-line hover:border-danger/25 text-fg-ghost hover:text-danger text-xs rounded-lg transition-all ml-auto"
          >
            {busy === "delete" ? "Borrando…" : "Borrar reunión"}
          </button>
        </div>

        {message && <p className="text-ok text-xs mt-3">{message}</p>}
        {error && <p className="text-danger text-xs mt-3">{error}</p>}
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
        spokenLanguages={meeting.spokenLanguages}
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
            className={`px-3 py-2 rounded-lg text-xs whitespace-nowrap transition-all border ${
              tab === t.key
                ? "bg-brand/15 border-brand/30 text-brand-fg"
                : "bg-fill border-line text-fg-dim hover:text-fg-soft"
            }`}
          >
            {t.label}
            {t.key === "pendientes" && items.length > 0 ? ` (${items.length})` : ""}
            {t.key === "capitulos" && meeting.chapters.length > 0 ? ` (${meeting.chapters.length})` : ""}
          </button>
        ))}
      </div>

      <div className="bg-panel border border-line rounded-2xl p-6 space-y-6">
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
                <p className="text-fg-soft text-sm leading-relaxed whitespace-pre-wrap">
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
                <p className="text-fg-soft text-sm leading-relaxed whitespace-pre-wrap">
                  {executive.nextSteps || "—"}
                </p>
              </Section>
              <Section title="Próxima reunión">
                <p className="text-fg-soft text-sm">{executive.nextMeeting || "Por agendar"}</p>
              </Section>
            </>
          ) : (
            <p className="text-fg-ghost text-sm">
              Todavía no se generó la minuta ejecutiva. Corre la etapa «Minutas».
            </p>
          ))}

        {tab === "tecnica" &&
          (technical ? (
            <>
              {isLegacyTechnical(technical) && (
                <div className="border border-warn/25 bg-warn/10 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <p className="text-fg-soft text-sm leading-relaxed flex-1">
                    Esta minuta salió con el formato anterior, que resumía de más. Regenérala para
                    tenerla por temas, con los datos concretos y el minuto de cada tema. Se rehace
                    también la minuta ejecutiva; los pendientes y el entregable no cambian.
                  </p>
                  <button
                    onClick={() => runStage("minutes", "Minutas")}
                    disabled={busy !== null || meeting.segmentCount === 0}
                    className="shrink-0 px-4 min-h-[44px] bg-brand hover:bg-brand-hi disabled:opacity-50 text-on-brand text-sm font-semibold rounded-lg transition-all"
                  >
                    {busy === "minutes" ? "Regenerando…" : "Regenerar la minuta"}
                  </button>
                </div>
              )}
              <Section title="Resumen técnico">
                <p className="text-fg-soft text-sm leading-relaxed whitespace-pre-wrap">
                  {technical.summary || "—"}
                </p>
              </Section>
              {technical.topics.length > 0 && (
                <Section title={`Temas tratados (${technical.topics.length})`}>
                  <div className="divide-y divide-line">
                    {technical.topics.map((topic, i) => (
                      <TopicBlock key={i} topic={topic} onSeek={hasAudio ? seekTo : undefined} />
                    ))}
                  </div>
                </Section>
              )}
              <Section title="Cambios identificados">
                {technical.changes.length === 0 ? (
                  <p className="text-fg-ghost text-sm">Ninguno.</p>
                ) : (
                  <div className="space-y-3">
                    {technical.changes.map((c, i) => (
                      <div key={i} className="border border-line rounded-lg p-3">
                        <p className="text-brand-fg text-xs uppercase tracking-wider mb-1">{c.area}</p>
                        <p className="text-fg-soft text-sm leading-relaxed">{c.what}</p>
                        {c.why && <p className="text-fg-faint text-xs mt-1">Por qué: {c.why}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </Section>
              {/* El formato anterior no registraba reglas: decir "ninguna" ahí sería falso. */}
              {!isLegacyTechnical(technical) && (
                <Section title="Reglas de negocio">
                  <Bullets items={technical.businessRules} empty="No se enunció ninguna." />
                </Section>
              )}
              <Section title="Decisiones de arquitectura">
                <Bullets items={technical.architecture} empty="No se tomó ninguna." />
              </Section>
              <Section title="Dependencias pendientes">
                <Bullets items={technical.dependencies} empty="Ninguna." />
              </Section>
              <Section title="Preguntas abiertas">
                <Bullets items={technical.openQuestions} empty="Ninguna — el alcance quedó cerrado." />
              </Section>
            </>
          ) : (
            <p className="text-fg-ghost text-sm">
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
              <p className="text-fg-faint text-xs">
                El índice de la reunión. Pulsa un capítulo para escucharlo desde ahí.
              </p>
              {meeting.chapters.map((c, i) => (
                <button
                  key={i}
                  onClick={() => seekTo(c.startMs)}
                  className="w-full text-left border border-line hover:border-brand/25 rounded-xl p-4 transition-all group"
                >
                  <div className="flex items-baseline gap-3">
                    <span className="text-brand-fg text-xs font-mono shrink-0">
                      {formatTimestamp(c.startMs)}
                    </span>
                    <span className="text-fg text-sm font-medium group-hover:text-brand-fg transition-colors">
                      {c.title}
                    </span>
                  </div>
                  {c.summary && (
                    <p className="text-fg-dim text-xs mt-1 leading-relaxed pl-[3.6rem]">{c.summary}</p>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-fg-ghost text-sm">
              Todavía no se generó el índice de temas. Corre la etapa «Capítulos».
            </p>
          ))}

        {tab === "prompt" &&
          (meeting.technicalPrompt ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <p className="text-fg-faint text-xs">
                  Cópialo y pégalo en Claude Code o en el ticket del desarrollador. Se sostiene solo:
                  no hace falta la transcripción.
                </p>
                <button
                  onClick={copyPrompt}
                  className="px-3 py-2 bg-brand hover:bg-brand-hi text-on-brand text-xs font-semibold rounded-lg transition-all shrink-0"
                >
                  {copied ? "✓ Copiado" : "Copiar prompt"}
                </button>
              </div>
              <pre className="bg-canvas border border-line rounded-xl p-4 text-fg-soft text-xs leading-relaxed whitespace-pre-wrap overflow-x-auto font-mono">
                {meeting.technicalPrompt}
              </pre>
              {meeting.contextSummary && (
                <Section title="Memoria que guarda el proyecto">
                  <p className="text-fg-dim text-sm leading-relaxed">{meeting.contextSummary}</p>
                  <p className="text-fg-ghost text-xs mt-2">
                    Esto es lo que las próximas reuniones de este proyecto van a saber sobre esta.
                  </p>
                </Section>
              )}
            </>
          ) : (
            <p className="text-fg-ghost text-sm">
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
