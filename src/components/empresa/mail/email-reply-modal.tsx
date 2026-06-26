"use client";

import { useState } from "react";

interface EmailReplyModalProps {
  emailId: string;
  toEmail: string;
  subject: string;
  originalBody?: string;
  hasSmtp: boolean;
  onClose: () => void;
}

export function EmailReplyModal({ emailId, toEmail, subject, originalBody, hasSmtp, onClose }: EmailReplyModalProps) {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const replySubject = subject.startsWith("Re:") ? subject : `Re: ${subject}`;

  async function handleSend() {
    if (!body.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/empresa/mail/inbox/${emailId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, subject: replySubject }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Error al enviar");
        return;
      }
      setSent(true);
      setTimeout(onClose, 1500);
    } finally {
      setSending(false);
    }
  }

  if (!hasSmtp) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-[#0d0d18] border border-white/[0.08] rounded-2xl p-6 max-w-sm w-full text-center">
          <p className="text-white/60 text-sm mb-4">
            Para responder correos, configura el servidor SMTP en la cuenta de correo.
          </p>
          <button onClick={onClose} className="px-4 py-2 bg-white/[0.06] hover:bg-white/[0.09] text-white/70 text-sm rounded-lg transition-all">
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-[#0d0d18] border border-white/[0.08] rounded-2xl w-full max-w-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div>
            <p className="text-white/80 text-sm font-medium">Responder</p>
            <p className="text-white/30 text-xs mt-0.5">Para: {toEmail}</p>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Subject */}
        <div className="px-5 py-3 border-b border-white/[0.04]">
          <p className="text-white/40 text-xs font-mono">{replySubject}</p>
        </div>

        {/* Body */}
        <div className="p-5 space-y-3">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            placeholder="Escribe tu respuesta..."
            className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white/80 text-sm placeholder-white/20 focus:outline-none focus:border-[#1AA7F0]/40 resize-none transition-all"
            autoFocus
          />

          {originalBody && (
            <details className="text-xs text-white/20">
              <summary className="cursor-pointer hover:text-white/40 transition-colors">Mensaje original</summary>
              <div className="mt-2 pl-3 border-l border-white/[0.08] text-white/25 whitespace-pre-wrap">{originalBody.slice(0, 1000)}</div>
            </details>
          )}

          {error && <p className="text-red-400 text-xs">{error}</p>}
          {sent && <p className="text-green-400 text-xs">✓ Enviado correctamente</p>}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-5 pb-5">
          <button onClick={onClose} className="px-4 py-2 text-white/40 hover:text-white/70 text-sm transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !body.trim() || sent}
            className="px-5 py-2 bg-[#1AA7F0] hover:bg-[#0E87C8] disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-all inline-flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            {sending ? "Enviando..." : "Enviar"}
          </button>
        </div>
      </div>
    </div>
  );
}
