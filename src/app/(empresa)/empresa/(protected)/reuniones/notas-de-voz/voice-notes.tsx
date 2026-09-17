"use client";

import { useState } from "react";

interface Interpretation {
  resumen: string;
  acciones: string[];
  dudas: string[];
}

interface VoiceNoteResult {
  text: string;
  durationSec: number;
  corrections: string[];
  doubtful: string[];
  interpretation: Interpretation | null;
}

type Note =
  | { id: string; file: File; status: "transcribing" }
  | { id: string; file: File; status: "error"; error: string }
  | { id: string; file: File; status: "done"; result: VoiceNoteResult };

const ACCEPT = "audio/*,.ogg,.opus,.m4a,.mp3,.wav,.aac,.webm,.mp4";

function duration(seconds: number): string {
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** La nota como texto plano para pegar en un chat, un correo o una tarea. */
function asPlainText(r: VoiceNoteResult): string {
  const parts: string[] = [];
  if (r.interpretation?.resumen) parts.push(r.interpretation.resumen);
  if (r.interpretation?.acciones.length) {
    parts.push("Pendientes:\n" + r.interpretation.acciones.map((a) => `- ${a}`).join("\n"));
  }
  parts.push("Transcripción:\n" + r.text);
  return parts.join("\n\n");
}

export function VoiceNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [dragging, setDragging] = useState(false);

  const update = (id: string, next: Note) =>
    setNotes((prev) => prev.map((n) => (n.id === id ? next : n)));

  async function transcribe(id: string, file: File) {
    update(id, { id, file, status: "transcribing" });
    try {
      const body = new FormData();
      body.append("audio", file);
      const res = await fetch("/api/empresa/voice-notes", { method: "POST", body });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) {
        throw new Error(data?.error ?? "No se pudo transcribir esta nota.");
      }
      update(id, { id, file, status: "done", result: data });
    } catch (err) {
      const message =
        err instanceof TypeError
          ? "Sin conexión. Revisa la red y reintenta."
          : err instanceof Error
            ? err.message
            : "No se pudo transcribir esta nota.";
      update(id, { id, file, status: "error", error: message });
    }
  }

  function addFiles(list: FileList | null) {
    if (!list?.length) return;
    const added = Array.from(list).map((file) => ({
      id: crypto.randomUUID(),
      file,
      status: "transcribing" as const,
    }));
    // Las nuevas arriba: es lo que se acaba de soltar y lo que se quiere ver
    setNotes((prev) => [...added.reverse(), ...prev]);
    for (const n of added) void transcribe(n.id, n.file);
  }

  const pending = notes.filter((n) => n.status === "transcribing").length;

  return (
    <div className="space-y-4">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        className={`block border border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${
          dragging ? "border-brand/50 bg-brand/[0.06]" : "border-line-mid hover:border-line-loud bg-panel"
        }`}
      >
        <input
          type="file"
          accept={ACCEPT}
          multiple
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
          className="hidden"
        />
        <span className="inline-block px-6 py-3 bg-brand hover:bg-brand-hi text-on-brand text-sm font-semibold rounded-lg transition-colors">
          {notes.length ? "Transcribir otra nota" : "Elegir notas de voz"}
        </span>
        <p className="text-fg-faint text-xs mt-3">
          O arrástralas aquí. Puedes soltar varias a la vez · ogg, opus, m4a, mp3 o wav
        </p>
      </label>

      {pending > 0 && (
        <p className="text-fg-dim text-sm" aria-live="polite">
          Transcribiendo {pending} nota{pending !== 1 ? "s" : ""}…
        </p>
      )}

      {notes.length === 0 ? (
        <div className="bg-panel border border-line rounded-2xl p-6 space-y-3">
          <h2 className="text-fg text-sm font-medium">Cómo sacar la nota de WhatsApp</h2>
          <ul className="text-fg-dim text-sm leading-relaxed space-y-2">
            <li>
              <span className="text-fg-mute">En el celular:</span> mantén presionada la nota → Reenviar o
              Compartir → Guardar en Archivos. Después elígela aquí.
            </li>
            <li>
              <span className="text-fg-mute">En WhatsApp de escritorio o web:</span> abre el menú de la
              nota → Descargar, y arrastra el archivo a este recuadro.
            </li>
          </ul>
          <p className="text-fg-faint text-xs leading-relaxed">
            Las notas no se guardan: el texto vive en esta pestaña hasta que la cierres. Copia lo que
            necesites.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {notes.map((note) => (
            <li key={note.id}>
              <NoteCard note={note} onRetry={() => transcribe(note.id, note.file)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NoteCard({ note, onRetry }: { note: Note; onRetry: () => void }) {
  const [copied, setCopied] = useState<"all" | "text" | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  async function copy(kind: "all" | "text", value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  }

  return (
    <article className="bg-panel border border-line rounded-2xl p-6 min-w-0">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-fg text-sm font-medium break-words">{note.file.name}</h2>
          <p className="text-fg-faint text-xs mt-1">
            {note.status === "done"
              ? duration(note.result.durationSec)
              : note.status === "transcribing"
                ? "Transcribiendo…"
                : "No se pudo transcribir"}
          </p>
        </div>
        {note.status === "done" && note.result.text && (
          <button
            onClick={() => copy("all", asPlainText(note.result))}
            className="shrink-0 px-3 py-2 border border-line-mid hover:border-line-loud text-fg-mute hover:text-fg text-xs font-medium rounded-lg transition-colors"
          >
            {copied === "all" ? "Copiado" : "Copiar todo"}
          </button>
        )}
      </header>

      {note.status === "transcribing" && (
        <div className="mt-4 space-y-2" aria-hidden>
          <div className="h-3 w-3/4 rounded bg-line animate-pulse" />
          <div className="h-3 w-full rounded bg-line animate-pulse" />
          <div className="h-3 w-2/3 rounded bg-line animate-pulse" />
        </div>
      )}

      {note.status === "error" && (
        <div className="mt-4 flex items-center justify-between gap-4 bg-danger/10 border border-danger/20 rounded-xl p-4">
          <p className="text-danger text-sm">{note.error}</p>
          <button
            onClick={onRetry}
            className="shrink-0 px-3 py-2 border border-danger/30 text-danger text-xs font-medium rounded-lg hover:bg-danger/10 transition-colors"
          >
            Reintentar
          </button>
        </div>
      )}

      {note.status === "done" && !note.result.text && (
        <p className="mt-4 text-fg-dim text-sm">
          No se oyó nada que transcribir. Puede que la nota esté en silencio o vacía.
        </p>
      )}

      {note.status === "done" && note.result.text && (
        <div className="mt-4 space-y-4">
          {note.result.interpretation?.resumen && (
            <p className="text-fg text-sm leading-relaxed">{note.result.interpretation.resumen}</p>
          )}

          {!!note.result.interpretation?.acciones.length && (
            <section>
              <h3 className="text-fg-mute text-xs uppercase tracking-wider">Lo que pide</h3>
              <ol className="mt-2 space-y-1 list-decimal pl-4 text-fg-dim text-sm leading-relaxed">
                {note.result.interpretation.acciones.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ol>
            </section>
          )}

          {(!!note.result.interpretation?.dudas.length || note.result.doubtful.length > 0) && (
            <section className="bg-warn/10 border border-warn/20 rounded-xl p-4">
              <h3 className="text-warn text-xs uppercase tracking-wider">Para confirmar</h3>
              <ul className="mt-2 space-y-1 text-fg-dim text-sm leading-relaxed">
                {note.result.interpretation?.dudas.map((d, i) => (
                  <li key={`d${i}`}>{d}</li>
                ))}
                {note.result.doubtful.map((d, i) => (
                  <li key={`a${i}`}>Se oye mal {d}</li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-fg-mute text-xs uppercase tracking-wider">Transcripción</h3>
              <button
                onClick={() => copy("text", note.result.text)}
                className="text-fg-faint hover:text-fg text-xs font-medium transition-colors"
              >
                {copied === "text" ? "Copiado" : "Copiar texto"}
              </button>
            </div>
            <p className="mt-2 text-fg-dim text-sm leading-relaxed whitespace-pre-wrap break-words select-text">
              {note.result.text}
            </p>
          </section>

          {note.result.corrections.length > 0 && (
            <div>
              <button
                onClick={() => setShowDetails((v) => !v)}
                className="text-fg-faint hover:text-fg-dim text-xs transition-colors"
              >
                {showDetails ? "Ocultar" : "Ver"} {note.result.corrections.length} corrección
                {note.result.corrections.length !== 1 ? "es" : ""} de vocabulario
              </button>
              {showDetails && (
                <ul className="mt-2 space-y-1 text-fg-faint text-xs font-mono">
                  {note.result.corrections.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
