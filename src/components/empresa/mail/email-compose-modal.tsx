"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { LanguageToggle } from "@/components/empresa/document-builder/language-toggle";
import { AiEnhanceButton } from "@/components/empresa/document-builder/ai-enhance-button";
import { SignaturePreview } from "@/components/empresa/mail/signature-preview";
import { EmailRichEditor } from "@/components/empresa/mail/email-rich-editor";
import { buildSignatureHtml } from "@/lib/mail/signature";
import { normalizeComposeAiResult } from "@/lib/mail/compose-ai";
import {
  htmlToPlainText,
  mailBodyHasContent,
  plainTextToHtml,
} from "@/lib/mail/body-format";
import type { ReplyEmailAnalysis } from "@/lib/mail/ai-reply-analyze";
import {
  formatAttachmentSize,
  type MailAttachmentInput,
} from "@/lib/mail/outgoing-attachments";
import { validateMailAddressList } from "@/lib/mail/validate-address";
import { MailRecipientInput } from "@/components/empresa/mail/mail-recipient-input";
import type { MailRecipientSuggestion } from "@/lib/mail/recipient-suggestions";

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const MAX_ATTACHMENTS_TOTAL_BYTES = 25 * 1024 * 1024;

type PendingAttachment = {
  id: string;
  file: File;
};

async function fileToAttachmentInput(file: File): Promise<MailAttachmentInput> {
  const content = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("No se pudo leer el adjunto"));
        return;
      }
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(reader.error ?? new Error("No se pudo leer el adjunto"));
    reader.readAsDataURL(file);
  });

  return {
    filename: file.name,
    contentType: file.type || "application/octet-stream",
    content,
  };
}

export type ComposeAccount = {
  id: string;
  label: string;
  username: string;
  smtpHost: string | null;
  fromName?: string | null;
  signatureName?: string | null;
  signatureTitle?: string | null;
  signatureEnabled?: boolean;
  signatureHtml?: string | null;
};

export type CompanyPreview = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  logoUrl?: string | null;
};

export type ComposeMode = "new" | "reply";

export interface ComposeInitial {
  to?: string;
  cc?: string;
  subject?: string;
  body?: string;
  replyToEmailId?: string;
  accountId?: string;
}

interface EmailComposeModalProps {
  open: boolean;
  onClose: () => void;
  accounts: ComposeAccount[];
  company: CompanyPreview | null;
  mode?: ComposeMode;
  initial?: ComposeInitial;
  originalBody?: string;
}

const EMAIL_TYPES_ES = ["Formal", "Comercial", "Seguimiento", "Soporte técnico", "Cobranza"];
const EMAIL_TYPES_EN = ["Formal", "Commercial", "Follow-up", "Technical support", "Collections"];

export function EmailComposeModal({
  open,
  onClose,
  accounts,
  company,
  mode = "new",
  initial,
  originalBody,
}: EmailComposeModalProps) {
  const router = useRouter();
  const sendAccounts = useMemo(() => accounts, [accounts]);
  const openedRef = useRef(false);
  const replyAnalysisFetchedRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [accountId, setAccountId] = useState(initial?.accountId ?? sendAccounts[0]?.id ?? "");
  const [to, setTo] = useState(initial?.to ?? "");
  const [cc, setCc] = useState(initial?.cc ?? "");
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [language, setLanguage] = useState<"es" | "en">("es");
  const [emailType, setEmailType] = useState("Formal");
  const [intent, setIntent] = useState("");
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [composing, setComposing] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentNotice, setSentNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [composeNotice, setComposeNotice] = useState<string | null>(null);
  const [replyAnalysis, setReplyAnalysis] = useState<ReplyEmailAnalysis | null>(null);
  const [analyzingReply, setAnalyzingReply] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [logoOrigin, setLogoOrigin] = useState("");
  const [mounted, setMounted] = useState(false);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [recipientSuggestions, setRecipientSuggestions] = useState<MailRecipientSuggestion[]>([]);
  const recipientsLoadedRef = useRef(false);

  const account = sendAccounts.find((a) => a.id === accountId) ?? sendAccounts[0];

  async function loadRecipientSuggestions() {
    if (recipientsLoadedRef.current) return;
    try {
      const res = await fetch("/api/empresa/mail/recipients");
      if (!res.ok) return;
      const data = (await res.json()) as { recipients?: MailRecipientSuggestion[] };
      setRecipientSuggestions(data.recipients ?? []);
      recipientsLoadedRef.current = true;
    } catch {
      // Non-blocking — compose still works without suggestions.
    }
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    const prev = {
      position: document.body.style.position,
      top: document.body.style.top,
      left: document.body.style.left,
      right: document.body.style.right,
      overflow: document.body.style.overflow,
    };
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.position = prev.position;
      document.body.style.top = prev.top;
      document.body.style.left = prev.left;
      document.body.style.right = prev.right;
      document.body.style.overflow = prev.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      recipientsLoadedRef.current = false;
      return;
    }
    void loadRecipientSuggestions();
  }, [open]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setLogoOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      openedRef.current = false;
      replyAnalysisFetchedRef.current = false;
      setReplyAnalysis(null);
      setAnalysisError(null);
      setAnalyzingReply(false);
      return;
    }
    if (openedRef.current) return;
    openedRef.current = true;

    setAccountId(initial?.accountId ?? sendAccounts[0]?.id ?? "");
    setTo(initial?.to ?? "");
    setCc(initial?.cc ?? "");
    setSubject(initial?.subject ?? "");
    setBody(initial?.body ? plainTextToHtml(initial.body) : "");
    setIntent("");
    setSent(false);
    setError(null);
    setTab("edit");
    setAttachments([]);
  }, [open, initial, sendAccounts]);

  useEffect(() => {
    if (!open || mode !== "reply" || replyAnalysisFetchedRef.current) return;
    if (!originalBody?.trim()) {
      setAnalysisError("No hay mensaje original para analizar.");
      return;
    }

    replyAnalysisFetchedRef.current = true;
    void fetchReplyAnalysis();
  }, [open, mode, originalBody, subject]);

  const signatureHtml = useMemo(() => {
    if (!account) return "";
    return buildSignatureHtml(
      { ...account, label: account.label },
      company,
      { logoOrigin: logoOrigin || undefined }
    );
  }, [account, company, logoOrigin]);

  const previewBodyHtml = useMemo(() => {
    if (!account) return "";
    const bodyContent = mailBodyHasContent(body)
      ? plainTextToHtml(body)
      : '<p style="color:#aaa;font-style:italic;margin:0;">(Sin mensaje)</p>';
    const bodyBlock = `<div style="font-family:'Segoe UI',Arial,sans-serif;font-size:14px;line-height:1.65;color:#222;">${bodyContent}</div>`;
    const sig =
      account.signatureEnabled !== false
        ? buildSignatureHtml(
            { ...account, label: account.label },
            company,
            { logoOrigin: logoOrigin || undefined }
          )
        : "";
    return bodyBlock + sig;
  }, [account, body, company, logoOrigin]);

  const emailTypes = language === "es" ? EMAIL_TYPES_ES : EMAIL_TYPES_EN;

  async function composeWithAI() {
    if (!intent.trim()) return;
    setComposing(true);
    setError(null);
    setComposeNotice(null);
    try {
      const res = await fetch("/api/empresa/ai/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: `${emailType}: ${intent}`,
          language,
          tone: "formal",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo generar el borrador");
        return;
      }
      const { subject: aiSubject, body: aiBody } = normalizeComposeAiResult(data);
      if (!aiSubject && !aiBody) {
        setError("La IA no devolvió contenido. Intenta de nuevo.");
        return;
      }
      if (aiSubject) setSubject(aiSubject);
      if (aiBody) setBody(plainTextToHtml(aiBody));
      setComposeNotice("Borrador generado — revisa asunto y mensaje abajo.");
    } catch {
      setError("Error de red al generar el borrador");
    } finally {
      setComposing(false);
    }
  }

  async function fetchReplyAnalysis() {
    setAnalyzingReply(true);
    setAnalysisError(null);
    setReplyAnalysis(null);
    try {
      const res = await fetch("/api/empresa/ai/reply/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.replace(/^Re:\s*/i, ""),
          originalBody: originalBody ?? "",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAnalysisError(data.error ?? "No se pudo analizar el correo");
        replyAnalysisFetchedRef.current = false;
        return;
      }
      setReplyAnalysis(data as ReplyEmailAnalysis);
    } catch {
      setAnalysisError("Error de red al analizar el correo");
      replyAnalysisFetchedRef.current = false;
    } finally {
      setAnalyzingReply(false);
    }
  }

  async function replyWithAI() {
    if (!intent.trim() || !replyAnalysis) return;
    setComposing(true);
    setError(null);
    setComposeNotice(null);
    try {
      const res = await fetch("/api/empresa/ai/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          synthesis: intent,
          originalSubject: subject.replace(/^Re:\s*/i, ""),
          originalBody: originalBody ?? "",
          analysis: replyAnalysis,
          language,
          tone: "formal",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo ampliar la respuesta");
        return;
      }
      const { body: aiBody } = normalizeComposeAiResult(data);
      if (!aiBody) {
        setError("La IA no devolvió contenido. Intenta de nuevo.");
        return;
      }
      setBody(plainTextToHtml(aiBody));
      setComposeNotice("Respuesta ampliada — revisa y edita antes de enviar.");
    } catch {
      setError("Error de red al generar la respuesta");
    } finally {
      setComposing(false);
    }
  }

  async function translateEmail() {
    if (!subject.trim() && !mailBodyHasContent(body)) return;
    setTranslating(true);
    try {
      const texts = [subject, htmlToPlainText(body)];
      const res = await fetch("/api/empresa/ai/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts, to: language === "es" ? "en" : "es" }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.texts?.[0]) setSubject(data.texts[0]);
        if (data.texts?.[1]) setBody(plainTextToHtml(data.texts[1]));
        setLanguage(language === "es" ? "en" : "es");
      }
    } finally {
      setTranslating(false);
    }
  }

  const attachmentsTotalBytes = useMemo(
    () => attachments.reduce((sum, att) => sum + att.file.size, 0),
    [attachments]
  );

  function addAttachmentFiles(files: FileList | File[]) {
    const next: PendingAttachment[] = [];
    let runningTotal = attachmentsTotalBytes;

    for (const file of Array.from(files)) {
      if (file.size > MAX_ATTACHMENT_BYTES) {
        setError(`"${file.name}" supera el límite de 10 MB por archivo`);
        continue;
      }
      runningTotal += file.size;
      if (runningTotal > MAX_ATTACHMENTS_TOTAL_BYTES) {
        setError("El tamaño total de adjuntos supera 25 MB");
        break;
      }
      next.push({ id: `${file.name}-${file.size}-${file.lastModified}`, file });
    }

    if (next.length > 0) {
      setAttachments((prev) => [...prev, ...next]);
      setError(null);
    }
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((att) => att.id !== id));
  }

  function handleAttachmentDragEnter(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFiles(true);
  }

  function handleAttachmentDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDraggingFiles(false);
    }
  }

  function handleAttachmentDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleAttachmentDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFiles(false);
    if (e.dataTransfer.files?.length) addAttachmentFiles(e.dataTransfer.files);
  }

  async function buildAttachmentPayload(): Promise<MailAttachmentInput[]> {
    return Promise.all(attachments.map((att) => fileToAttachmentInput(att.file)));
  }

  async function handleSend() {
    if (!account || !to.trim() || !subject.trim() || !mailBodyHasContent(body)) return;

    const toCheck = validateMailAddressList(to, "Para");
    if (!toCheck.ok) {
      setError(toCheck.error);
      return;
    }
    let ccAddresses: string[] = [];
    if (cc.trim()) {
      const ccCheck = validateMailAddressList(cc, "CC");
      if (!ccCheck.ok) {
        setError(ccCheck.error);
        return;
      }
      ccAddresses = ccCheck.addresses;
    }

    setSending(true);
    setError(null);
    try {
      const attachmentPayload = await buildAttachmentPayload();
      const url =
        mode === "reply" && initial?.replyToEmailId
          ? `/api/empresa/mail/inbox/${initial.replyToEmailId}/reply`
          : `/api/empresa/mail/accounts/${account.id}/send`;

      const payload =
        mode === "reply" && initial?.replyToEmailId
          ? { body, subject, to, cc: cc || undefined, attachments: attachmentPayload }
          : {
              to,
              cc: cc || undefined,
              subject,
              body,
              replyToEmailId: initial?.replyToEmailId,
              attachments: attachmentPayload,
            };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Error al enviar");
        return;
      }
      const data = (await res.json()) as {
        attachmentCount?: number;
        deliveryStatus?: string;
        resendId?: string;
      };
      const attachNote =
        (data.attachmentCount ?? attachmentPayload.length) > 0
          ? ` con ${data.attachmentCount ?? attachmentPayload.length} adjunto(s)`
          : "";
      const statusNote = data.deliveryStatus
        ? ` · Resend: ${data.deliveryStatus === "SENT" ? "enviado" : data.deliveryStatus.toLowerCase()}`
        : data.resendId
          ? " · Resend: enviado"
          : "";
      setSentNotice(
        `Enviado a ${toCheck.addresses.join(", ")}${
          ccAddresses.length ? ` (CC: ${ccAddresses.join(", ")})` : ""
        }${attachNote}${statusNote}. El estado se actualiza al entregar/abrir.`
      );
      setSent(true);
      router.refresh();
      setTimeout(onClose, 1200);
    } finally {
      setSending(false);
    }
  }

  if (!open || !mounted) return null;

  const modal = sendAccounts.length === 0 ? (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
      <div className="bg-[#0d0d18] border border-white/[0.08] rounded-2xl p-6 max-w-sm w-full text-center">
        <p className="text-white/60 text-sm mb-4">
          Configura al menos una cuenta de correo (IMAP) para enviar vía Resend.
        </p>
        <button type="button" onClick={onClose} className="px-4 py-2 bg-white/[0.06] text-white/70 text-sm rounded-lg">
          Cerrar
        </button>
      </div>
    </div>
  ) : (
    <div
      className="fixed inset-0 z-[100] flex flex-col sm:items-center sm:justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={mode === "reply" ? "Responder correo" : "Redactar correo"}
    >
      <div className="absolute inset-0 bg-black/70 hidden sm:block" onClick={onClose} aria-hidden />

      <div className="relative flex flex-col w-full h-full max-h-full min-h-0 min-w-0 sm:h-auto sm:max-h-[min(92dvh,900px)] sm:max-w-3xl overflow-hidden bg-[#0d0d18] border-0 sm:border border-white/[0.08] sm:rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-white/[0.06] shrink-0 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="min-w-0 flex-1">
            <p className="text-white font-medium text-sm">
              {mode === "reply" ? "Responder con IA" : "Redactar correo"}
            </p>
            {mode === "new" && (
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="mt-1 w-full max-w-full sm:max-w-xs bg-transparent text-[#1AA7F0] text-xs focus:outline-none truncate"
              >
                {sendAccounts.map((a) => (
                  <option key={a.id} value={a.id} className="bg-[#0d0d18]">
                    {a.label} ({a.username})
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
            <LanguageToggle value={language} onChange={setLanguage} />
            <button type="button" onClick={onClose} className="text-white/50 hover:text-white p-2 -mr-1" aria-label="Cerrar">
              ✕
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-4 sm:px-5 pt-2 sm:pt-3 shrink-0">
          {(["edit", "preview"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                tab === t
                  ? "bg-[#1AA7F0]/10 border-[#1AA7F0]/25 text-[#1AA7F0]"
                  : "border-white/[0.07] text-white/50"
              }`}
            >
              {t === "edit" ? "Editor" : "Vista previa"}
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] p-4 sm:p-5 space-y-4">
          {tab === "edit" ? (
            <>
              {/* AI block */}
              <div className="bg-gradient-to-r from-[#6344E8]/10 to-[#1AA7F0]/10 border border-[#6344E8]/20 rounded-xl p-4 space-y-3">
                <p className="text-[#8B6FFF] text-xs uppercase tracking-widest font-medium">
                  {mode === "reply" ? "Respuesta con IA" : "Asistente IA"}
                </p>

                {mode === "reply" ? (
                  <>
                    <div className="bg-black/25 border border-white/[0.06] rounded-lg p-3 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-white/50 text-[10px] uppercase tracking-wider font-medium">
                          Análisis del correo
                        </p>
                        {replyAnalysis?.urgency === "high" && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                            Urgente
                          </span>
                        )}
                        {replyAnalysis?.urgency === "medium" && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-200/90 border border-amber-500/25">
                            Prioridad media
                          </span>
                        )}
                      </div>

                      {analyzingReply && (
                        <p className="text-white/45 text-xs animate-pulse">Analizando el mensaje original...</p>
                      )}

                      {analysisError && !analyzingReply && (
                        <div className="space-y-2">
                          <p className="text-red-400/90 text-xs">{analysisError}</p>
                          <button
                            type="button"
                            onClick={() => {
                              replyAnalysisFetchedRef.current = false;
                              void fetchReplyAnalysis();
                            }}
                            className="text-xs text-[#8B6FFF] hover:text-[#a894ff]"
                          >
                            Reintentar análisis
                          </button>
                        </div>
                      )}

                      {replyAnalysis && !analyzingReply && (
                        <div className="space-y-2.5">
                          <p className="text-white/85 text-sm leading-relaxed">{replyAnalysis.topic}</p>
                          {replyAnalysis.keyPoints.length > 0 && (
                            <ul className="space-y-1 pl-4 list-disc text-white/55 text-xs leading-relaxed">
                              {replyAnalysis.keyPoints.map((point) => (
                                <li key={point}>{point}</li>
                              ))}
                            </ul>
                          )}
                          {replyAnalysis.senderAsk && (
                            <p className="text-white/50 text-xs">
                              <span className="text-[#1AA7F0]/80 font-medium">Pide: </span>
                              {replyAnalysis.senderAsk}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <p className="text-white/45 text-xs leading-relaxed">
                      Con ese contexto, dime en pocas palabras qué quieres responder. La IA redacta el
                      correo completo según tu indicación.
                    </p>
                    <textarea
                      value={intent}
                      onChange={(e) => setIntent(e.target.value)}
                      rows={3}
                      disabled={analyzingReply || !replyAnalysis}
                      placeholder={
                        replyAnalysis
                          ? "Ej: acepto la cotización de $500, confirmar inicio la próxima semana..."
                          : "Espera el análisis del correo..."
                      }
                      className="w-full bg-black/20 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 resize-none disabled:opacity-50"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={composing || analyzingReply || !replyAnalysis || !intent.trim()}
                        onClick={replyWithAI}
                        className="px-3 py-1.5 text-xs bg-[#6344E8]/30 hover:bg-[#6344E8]/40 text-white rounded-lg disabled:opacity-50"
                      >
                        {composing ? "Ampliando..." : "Ampliar respuesta"}
                      </button>
                      <button
                        type="button"
                        disabled={translating}
                        onClick={translateEmail}
                        className="px-3 py-1.5 text-xs border border-white/10 text-white/60 rounded-lg disabled:opacity-50"
                      >
                        {translating ? "Traduciendo..." : `Traducir a ${language === "es" ? "EN" : "ES"}`}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {emailTypes.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setEmailType(t)}
                          className={`px-2.5 py-1 text-xs rounded-full border ${
                            emailType === t
                              ? "bg-[#6344E8]/20 border-[#6344E8]/30 text-[#8B6FFF]"
                              : "border-white/10 text-white/50"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                    <input
                      value={intent}
                      onChange={(e) => setIntent(e.target.value)}
                      placeholder="Describe el correo que quieres escribir..."
                      className="w-full bg-black/20 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={composing || !intent.trim()}
                        onClick={composeWithAI}
                        className="px-3 py-1.5 text-xs bg-[#6344E8]/30 hover:bg-[#6344E8]/40 text-white rounded-lg disabled:opacity-50"
                      >
                        {composing ? "Generando..." : "Generar borrador"}
                      </button>
                      <button
                        type="button"
                        disabled={translating}
                        onClick={translateEmail}
                        className="px-3 py-1.5 text-xs border border-white/10 text-white/60 rounded-lg disabled:opacity-50"
                      >
                        {translating ? "Traduciendo..." : `Traducir a ${language === "es" ? "EN" : "ES"}`}
                      </button>
                    </div>
                  </>
                )}

                {composeNotice && (
                  <p className="text-green-400/90 text-xs">{composeNotice}</p>
                )}
              </div>

              {/* Fields */}
              <div className="space-y-3 min-w-0">
                <MailRecipientInput
                  label="Para"
                  value={to}
                  onChange={setTo}
                  suggestions={recipientSuggestions}
                  onRequestSuggestions={loadRecipientSuggestions}
                  placeholder="correo@empresa.com"
                />
                <MailRecipientInput
                  label="CC (opcional)"
                  value={cc}
                  onChange={setCc}
                  suggestions={recipientSuggestions}
                  onRequestSuggestions={loadRecipientSuggestions}
                  placeholder="copia@empresa.com"
                />
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-white/40 text-xs">Asunto</label>
                    <AiEnhanceButton
                      text={subject}
                      language={language}
                      context="email subject line"
                      onEnhanced={setSubject}
                    />
                  </div>
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full mt-1 bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-white/40 text-xs">Mensaje</label>
                    <AiEnhanceButton
                      text={htmlToPlainText(body)}
                      language={language}
                      context="corporate email body"
                      onEnhanced={(t) => setBody(plainTextToHtml(t))}
                    />
                  </div>
                  <EmailRichEditor
                    value={body}
                    onChange={setBody}
                    placeholder="Escribe tu mensaje..."
                  />
                </div>

                <div>
                  <label className="text-white/40 text-xs mb-2 block">Adjuntos</label>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        fileInputRef.current?.click();
                      }
                    }}
                    onDragEnter={handleAttachmentDragEnter}
                    onDragLeave={handleAttachmentDragLeave}
                    onDragOver={handleAttachmentDragOver}
                    onDrop={handleAttachmentDrop}
                    className={`rounded-xl border border-dashed px-4 py-5 text-center transition-colors cursor-pointer ${
                      isDraggingFiles
                        ? "border-[#1AA7F0]/50 bg-[#1AA7F0]/10"
                        : "border-white/[0.12] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.03]"
                    }`}
                  >
                    <p className="text-white/55 text-xs">
                      {isDraggingFiles
                        ? "Suelta los archivos aquí"
                        : "Arrastra archivos aquí o haz clic para adjuntar"}
                    </p>
                    <p className="text-white/30 text-[10px] mt-1.5">
                      PDF, imágenes, Office, ZIP… máx. 10 MB por archivo, 25 MB total.
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.length) addAttachmentFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                  {attachments.length > 0 && (
                    <ul
                      className="space-y-1.5 mt-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {attachments.map((att) => (
                        <li
                          key={att.id}
                          className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]"
                        >
                          <div className="min-w-0">
                            <p className="text-white/75 text-xs truncate">{att.file.name}</p>
                            <p className="text-white/35 text-[10px]">{formatAttachmentSize(att.file.size)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAttachment(att.id)}
                            className="text-white/45 hover:text-red-300 text-xs shrink-0 px-2 py-1"
                            aria-label={`Quitar ${att.file.name}`}
                          >
                            Quitar
                          </button>
                        </li>
                      ))}
                      <p className="text-white/35 text-[10px] pt-1">
                        Total: {formatAttachmentSize(attachmentsTotalBytes)}
                      </p>
                    </ul>
                  )}
                </div>
              </div>

              {originalBody && (
                <details className="text-xs text-white/45">
                  <summary className="cursor-pointer">Mensaje original</summary>
                  <div className="mt-2 pl-3 border-l border-white/[0.08] whitespace-pre-wrap">
                    {originalBody.slice(0, 1500)}
                  </div>
                </details>
              )}

              <SignaturePreview html={signatureHtml} collapsibleOnMobile />
            </>
          ) : (
            <div className="space-y-3">
              <div className="text-xs text-white/45 space-y-1 border-b border-white/[0.06] pb-3">
                <p><span className="text-white/30">Para:</span> {to || "—"}</p>
                {cc.trim() ? (
                  <p><span className="text-white/30">CC:</span> {cc}</p>
                ) : null}
                {cc && <p><span className="text-white/30">CC:</span> {cc}</p>}
                <p><span className="text-white/30">Asunto:</span> {subject || "—"}</p>
                {attachments.length > 0 && (
                  <p>
                    <span className="text-white/30">Adjuntos:</span>{" "}
                    {attachments.map((att) => att.file.name).join(", ")}
                  </p>
                )}
              </div>
              {previewBodyHtml ? (
                <div
                  className="w-full min-h-[200px] sm:min-h-[420px] rounded-lg border border-white/[0.08] bg-white p-3 sm:p-4 overflow-auto"
                  dangerouslySetInnerHTML={{ __html: previewBodyHtml }}
                />
              ) : (
                <p className="text-white/40 text-sm text-center py-12">
                  Selecciona una cuenta con SMTP para ver la vista previa.
                </p>
              )}
            </div>
          )}

          {error && <p className="text-red-400 text-xs">{error}</p>}
          {sent && sentNotice && <p className="text-green-400 text-xs">{sentNotice}</p>}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 sm:gap-3 px-4 sm:px-5 py-3 sm:py-4 border-t border-white/[0.06] shrink-0 bg-[#0d0d18] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button type="button" onClick={onClose} className="px-3 sm:px-4 py-2 text-white/60 text-sm">
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || sent || !to.trim() || !subject.trim() || !mailBodyHasContent(body)}
            className="px-4 sm:px-5 py-2 bg-[#1AA7F0] hover:bg-[#0E87C8] disabled:opacity-50 text-white text-sm font-semibold rounded-lg"
          >
            {sending ? "Enviando..." : "Enviar"}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
