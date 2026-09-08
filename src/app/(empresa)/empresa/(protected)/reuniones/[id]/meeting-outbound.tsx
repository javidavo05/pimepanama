"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Draft {
  to: string;
  subject: string;
  body: string;
  accounts: { id: string; label: string; username: string }[];
  clientName: string | null;
  sentAt: string | null;
}

interface MeetingOutboundProps {
  meetingId: string;
  hasMinutes: boolean;
  minutesSentAt: string | null;
  nextMeetingTaskId: string | null;
  /** Lo que se acordó sobre la próxima reunión, según la minuta */
  nextMeetingHint: string | null;
}

/**
 * Lo que sale de la reunión hacia afuera: la minuta al cliente y la próxima
 * reunión agendada.
 *
 * Son los dos pasos que se caían siempre. La minuta se quedaba dentro del panel
 * y había que copiarla a mano a un correo; la próxima reunión quedaba escrita en
 * la minuta y nadie la agendaba, y a las dos semanas el proyecto estaba parado
 * esperando una reunión que nunca se convocó.
 */
export function MeetingOutbound({
  meetingId,
  hasMinutes,
  minutesSentAt,
  nextMeetingTaskId,
  nextMeetingHint,
}: MeetingOutboundProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [accountId, setAccountId] = useState("");
  const [openNext, setOpenNext] = useState(false);
  const [nextDate, setNextDate] = useState("");
  const [nextTitle, setNextTitle] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function openDraft() {
    setBusy("draft");
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/empresa/meetings/${meetingId}/send-minutes`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No se pudo preparar el correo");
      setDraft(data);
      setAccountId(data.accounts?.[0]?.id ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo preparar el correo");
    } finally {
      setBusy(null);
    }
  }

  async function send() {
    if (!draft) return;
    if (!draft.to.trim()) {
      setError("Escribe a quién enviarle la minuta.");
      return;
    }
    setBusy("send");
    setError(null);
    try {
      const res = await fetch(`/api/empresa/meetings/${meetingId}/send-minutes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: draft.to,
          subject: draft.subject,
          body: draft.body,
          accountId: accountId || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No se pudo enviar");
      setDraft(null);
      setMessage(`Minuta enviada a ${data.to}.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar");
    } finally {
      setBusy(null);
    }
  }

  async function scheduleNext() {
    if (!nextDate) {
      setError("Elige la fecha de la próxima reunión.");
      return;
    }
    setBusy("next");
    setError(null);
    try {
      const res = await fetch(`/api/empresa/meetings/${meetingId}/next-meeting`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueDate: nextDate, title: nextTitle || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No se pudo agendar");
      setOpenNext(false);
      setMessage("Próxima reunión agendada en Tareas.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo agendar");
    } finally {
      setBusy(null);
    }
  }

  if (!hasMinutes) return null;

  return (
    <div className="bg-panel border border-line rounded-2xl p-6 space-y-4">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h2 className="text-fg-mute text-xs uppercase tracking-wider">Cerrar la reunión</h2>
        <p className="text-fg-ghost text-[11px]">
          {minutesSentAt
            ? `Minuta enviada el ${new Date(minutesSentAt).toLocaleDateString("es-PA")}.`
            : "La minuta todavía no se le envió al cliente."}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => (draft ? setDraft(null) : void openDraft())}
          disabled={busy !== null}
          className="px-4 py-2 bg-sand/15 hover:bg-sand/25 disabled:opacity-40 border border-sand/25 text-sand-fg text-xs rounded-lg transition-all"
        >
          {busy === "draft"
            ? "Preparando…"
            : draft
              ? "Cerrar borrador"
              : minutesSentAt
                ? "✉️ Reenviar la minuta"
                : "✉️ Enviar la minuta al cliente"}
        </button>

        {nextMeetingTaskId ? (
          <span className="px-4 py-2 bg-ok/10 border border-ok/20 text-ok text-xs rounded-lg">
            ✓ Próxima reunión agendada en Tareas
          </span>
        ) : (
          <button
            onClick={() => setOpenNext((v) => !v)}
            disabled={busy !== null}
            className="px-4 py-2 bg-fill hover:bg-fill-2 disabled:opacity-40 border border-line text-fg-mute text-xs rounded-lg transition-all"
          >
            📅 Agendar la próxima reunión
          </button>
        )}
      </div>

      {openNext && !nextMeetingTaskId && (
        <div className="border border-line rounded-xl p-4 space-y-3">
          {nextMeetingHint && nextMeetingHint !== "Por agendar" && (
            <p className="text-fg-faint text-xs">
              En la reunión se dijo: <span className="text-fg-mute">{nextMeetingHint}</span>
            </p>
          )}
          <div className="grid sm:grid-cols-2 gap-3">
            <input
              type="date"
              value={nextDate}
              onChange={(e) => setNextDate(e.target.value)}
              className="bg-canvas border border-line rounded-lg px-3 py-2 text-fg text-sm focus:border-brand/50 focus:outline-none"
            />
            <input
              value={nextTitle}
              onChange={(e) => setNextTitle(e.target.value)}
              placeholder="Título (opcional)"
              className="bg-canvas border border-line rounded-lg px-3 py-2 text-fg text-sm placeholder:text-fg-trace focus:border-brand/50 focus:outline-none"
            />
          </div>
          <button
            onClick={() => void scheduleNext()}
            disabled={busy !== null}
            className="px-4 py-2 bg-brand hover:bg-brand-hi disabled:opacity-40 text-on-brand text-xs font-semibold rounded-lg transition-all"
          >
            {busy === "next" ? "Agendando…" : "Crear la tarea"}
          </button>
        </div>
      )}

      {draft && (
        <div className="border border-line rounded-xl p-4 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-fg-mute text-xs uppercase tracking-wider mb-1.5">
                Para{draft.clientName ? ` — ${draft.clientName}` : ""}
              </label>
              <input
                value={draft.to}
                onChange={(e) => setDraft({ ...draft, to: e.target.value })}
                placeholder="cliente@empresa.com"
                className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-fg text-sm placeholder:text-fg-trace focus:border-brand/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-fg-mute text-xs uppercase tracking-wider mb-1.5">
                Desde
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-fg text-sm focus:border-brand/50 focus:outline-none"
              >
                {draft.accounts.length === 0 && <option value="">Sin cuentas activas</option>}
                {draft.accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label} — {a.username}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-fg-mute text-xs uppercase tracking-wider mb-1.5">
              Asunto
            </label>
            <input
              value={draft.subject}
              onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
              className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-fg text-sm focus:border-brand/50 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-fg-mute text-xs uppercase tracking-wider mb-1.5">
              Cuerpo del correo
            </label>
            {/* Se muestra el HTML tal cual para poder ajustarlo antes de enviar:
                sale hacia el cliente y a veces hay que suavizar una frase. */}
            <textarea
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              rows={10}
              className="w-full bg-canvas border border-line rounded-lg px-3 py-2 text-fg-mute text-xs font-mono focus:border-brand/50 focus:outline-none leading-relaxed"
            />
          </div>

          <button
            onClick={() => void send()}
            disabled={busy !== null || draft.accounts.length === 0}
            className="px-4 py-2 bg-brand hover:bg-brand-hi disabled:opacity-40 text-on-brand text-xs font-semibold rounded-lg transition-all"
          >
            {busy === "send" ? "Enviando…" : "Enviar minuta"}
          </button>
        </div>
      )}

      {message && <p className="text-ok text-xs">{message}</p>}
      {error && <p className="text-danger text-xs">{error}</p>}
    </div>
  );
}
