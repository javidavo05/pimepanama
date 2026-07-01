"use client";

import { useState } from "react";
import { EmailReplyModal } from "@/components/empresa/mail/email-reply-modal";
import { EmailBodyRenderer } from "@/components/empresa/mail/email-body-renderer";

const TAG_COLORS: Record<string, string> = {
  urgent: "bg-red-500/15 text-red-400 border-red-500/20",
  invoice: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  payment: "bg-green-500/15 text-green-400 border-green-500/20",
  "follow-up": "bg-blue-500/15 text-blue-400 border-blue-500/20",
  support: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  spam: "bg-white/10 text-white/30 border-white/10",
  general: "bg-white/[0.04] text-white/30 border-white/[0.08]",
};

interface EmailData {
  id: string;
  subject: string;
  fromName: string | null;
  fromEmail: string;
  toAddresses: string[];
  ccAddresses: string[];
  bodyText: string | null;
  receivedAt: string;
  isStarred: boolean;
  aiSummary: string | null;
  aiTags: string[];
  account: { id: string; label: string; smtpHost: string | null };
  attachments: { id: string; filename: string; contentType: string; size: number }[];
}

function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export function EmailDetailClient({ email }: { email: EmailData }) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [bodyText, setBodyText] = useState(email.bodyText);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<{ aiSummary: string | null; aiTags: string[]; urgency?: string; suggestedAction?: string; costUSD?: number } | null>(
    email.aiSummary ? { aiSummary: email.aiSummary, aiTags: email.aiTags } : null
  );
  const [isStarred, setIsStarred] = useState(email.isStarred);

  async function handleAnalyze() {
    setAnalyzing(true);
    try {
      const res = await fetch(`/api/empresa/mail/inbox/${email.id}/analyze`, { method: "POST" });
      if (!res.ok) return;
      const data = await res.json();
      setAnalysis({ aiSummary: data.aiSummary, aiTags: data.aiTags, urgency: data.urgency, suggestedAction: data.suggestedAction, costUSD: data.costUSD });
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleStar() {
    const next = !isStarred;
    setIsStarred(next);
    await fetch(`/api/empresa/mail/inbox/${email.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isStarred: next }),
    });
  }

  const tags = analysis?.aiTags ?? email.aiTags;
  const summary = analysis?.aiSummary ?? email.aiSummary;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <h1 className="text-white text-lg font-semibold leading-snug">{email.subject}</h1>
          <div className="flex items-center gap-2 flex-none">
            <button onClick={handleStar} className={`p-1.5 rounded-lg transition-colors ${isStarred ? "text-amber-400" : "text-white/25 hover:text-amber-400"}`}>
              <svg className="w-4 h-4" fill={isStarred ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
            </button>
            {email.account.smtpHost && (
              <button onClick={() => setReplyOpen(true)}
                className="px-3 py-1.5 bg-[#1AA7F0]/10 border border-[#1AA7F0]/20 text-[#1AA7F0] text-xs font-medium rounded-lg hover:bg-[#1AA7F0]/15 transition-all inline-flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                Responder
              </button>
            )}
          </div>
        </div>

        <div className="space-y-1.5 text-sm">
          <div className="flex gap-2">
            <span className="text-white/30 w-8 shrink-0">De</span>
            <span className="text-white/80">{email.fromName ? `${email.fromName} <${email.fromEmail}>` : email.fromEmail}</span>
          </div>
          {email.toAddresses.length > 0 && (
            <div className="flex gap-2">
              <span className="text-white/30 w-8 shrink-0">Para</span>
              <span className="text-white/60">{email.toAddresses.join(", ")}</span>
            </div>
          )}
          {email.ccAddresses.length > 0 && (
            <div className="flex gap-2">
              <span className="text-white/30 w-8 shrink-0">CC</span>
              <span className="text-white/60">{email.ccAddresses.join(", ")}</span>
            </div>
          )}
          <div className="flex gap-2">
            <span className="text-white/30 w-8 shrink-0">Fecha</span>
            <span className="text-white/50 text-xs">{new Date(email.receivedAt).toLocaleString("es-PA", { dateStyle: "full", timeStyle: "short" })}</span>
          </div>
        </div>

        {tags.length > 0 && (
          <div className="flex gap-1.5 mt-4 flex-wrap">
            {tags.map((t) => (
              <span key={t} className={`px-2 py-0.5 text-xs rounded border ${TAG_COLORS[t] ?? TAG_COLORS.general}`}>{t}</span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_280px] gap-5 items-start">
        <div className="space-y-5 min-w-0">
          {/* Body — full width of main column */}
          <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5 min-w-0">
            <EmailBodyRenderer
              body={bodyText}
              emailId={email.id}
              onBodyUpdated={setBodyText}
            />
          </div>

          {/* Attachments */}
          {email.attachments.length > 0 && (
            <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5">
              <h3 className="text-white/60 text-xs uppercase tracking-widest font-medium mb-3">Adjuntos ({email.attachments.length})</h3>
              <div className="space-y-2">
                {email.attachments.map((att) => (
                  <a key={att.id} href={`/api/empresa/mail/inbox/${email.id}/attachments/${att.id}`}
                    className="flex items-center gap-3 px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-lg hover:bg-white/[0.06] transition-all group">
                    <div className="w-8 h-8 bg-[#1AA7F0]/10 border border-[#1AA7F0]/20 rounded-lg flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-[#1AA7F0]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white/80 text-sm truncate group-hover:text-white transition-colors">{att.filename}</p>
                      <p className="text-white/30 text-xs">{fmtBytes(att.size)} · {att.contentType}</p>
                    </div>
                    <svg className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* AI Panel — narrow sidebar */}
        <div className="space-y-4 xl:sticky xl:top-4">
        <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white/60 text-xs uppercase tracking-widest font-medium">Análisis IA</h3>
            <button onClick={handleAnalyze} disabled={analyzing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#6344E8]/10 border border-[#6344E8]/25 text-[#6344E8] text-xs font-medium hover:bg-[#6344E8]/15 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
              {analyzing ? (
                <><span className="w-1.5 h-1.5 rounded-full bg-[#6344E8] animate-pulse" /> Analizando...</>
              ) : (
                <>✦ {summary ? "Re-analizar" : "Analizar"}</>
              )}
            </button>
          </div>

          {summary ? (
            <div className="space-y-3">
              <div>
                <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1">Resumen</p>
                <p className="text-white/70 text-sm leading-relaxed">{summary}</p>
              </div>
              {analysis?.urgency && (
                <div>
                  <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1">Urgencia</p>
                  <span className={`text-xs px-2 py-0.5 rounded border ${analysis.urgency === "high" ? "bg-red-500/15 text-red-400 border-red-500/20" : analysis.urgency === "medium" ? "bg-amber-500/15 text-amber-400 border-amber-500/20" : "bg-white/[0.04] text-white/40 border-white/[0.08]"}`}>
                    {analysis.urgency === "high" ? "Alta" : analysis.urgency === "medium" ? "Media" : "Baja"}
                  </span>
                </div>
              )}
              {analysis?.suggestedAction && (
                <div>
                  <p className="text-white/30 text-[10px] uppercase tracking-widest mb-1">Acción sugerida</p>
                  <p className="text-white/60 text-xs">{analysis.suggestedAction}</p>
                </div>
              )}
              {analysis?.costUSD != null && (
                <p className="text-white/15 text-[10px] font-mono">${analysis.costUSD.toFixed(4)}</p>
              )}
            </div>
          ) : (
            <p className="text-white/25 text-sm">Haz clic en &quot;Analizar&quot; para que la IA clasifique y resuma este correo.</p>
          )}
        </div>

        <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-4 space-y-2">
          <p className="text-white/30 text-[10px] uppercase tracking-widest">Cuenta</p>
          <p className="text-white/60 text-sm">{email.account.label}</p>
          {!email.account.smtpHost && (
            <p className="text-amber-400/60 text-xs">Sin SMTP — no se puede responder. Configura en <a href={`/empresa/correos/cuentas/${email.account.id}`} className="underline">ajustes de la cuenta</a>.</p>
          )}
        </div>
        </div>
      </div>

      {replyOpen && (
        <EmailReplyModal
          emailId={email.id}
          toEmail={email.fromEmail}
          subject={email.subject}
          originalBody={email.bodyText ?? ""}
          hasSmtp={!!email.account.smtpHost}
          onClose={() => setReplyOpen(false)}
        />
      )}
    </div>
  );
}
