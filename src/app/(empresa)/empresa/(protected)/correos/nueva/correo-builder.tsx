"use client";

import { useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createDocumentAction } from "@/app/(empresa)/empresa/actions";
import { LanguageToggle } from "@/components/empresa/document-builder/language-toggle";
import { AiEnhanceButton } from "@/components/empresa/document-builder/ai-enhance-button";
import { DraftPdfPreview } from "@/components/empresa/document-builder/draft-pdf-preview";
import type { DocumentFormValues } from "@/components/empresa/document-builder/line-items-editor";

const EMAIL_TYPES_ES = [
  "Formal", "Comercial", "Seguimiento", "Soporte técnico",
  "Cobranza", "Agradecimiento", "Presentación empresarial",
];
const EMAIL_TYPES_EN = [
  "Formal", "Commercial", "Follow-up", "Technical support",
  "Collections", "Thank you", "Business introduction",
];

export function CorreoBuilder() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [composing, setComposing] = useState(false);
  const [emailType, setEmailType] = useState("Formal");
  const [intent, setIntent] = useState("");

  const { register, control, setValue, handleSubmit, watch } =
    useForm<DocumentFormValues>({
      defaultValues: { language: "es", tone: "formal" },
    });

  const language = useWatch({ control, name: "language" });
  const body = watch("body");
  const subject = watch("subject");
  const isEs = language === "es";

  const allValues = useWatch({ control });
  const previewPayload = {
    type: "CORREO" as const,
    title: allValues.subject || "Correo",
    language: allValues.language,
    content: {
      to: allValues.toEmail,
      cc: allValues.ccEmail,
      subject: allValues.subject,
      body: allValues.body,
      type: emailType,
    },
  };

  async function composeWithAI() {
    if (!intent.trim()) return;
    setComposing(true);
    try {
      const res = await fetch("/api/empresa/ai/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: `${emailType}: ${intent}`, language, tone: watch("tone") }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.subject) setValue("subject", data.subject, { shouldDirty: true });
        if (data.body) setValue("body", data.body, { shouldDirty: true });
      }
    } finally {
      setComposing(false);
    }
  }

  async function onSubmit(data: DocumentFormValues) {
    setSaving(true);
    try {
      const doc = await createDocumentAction({
        type: "CORREO",
        title: data.subject || `Correo ${new Date().toLocaleDateString()}`,
        language: data.language,
        clientName: data.toEmail,
        clientEmail: data.toEmail,
        content: {
          to: data.toEmail,
          cc: data.ccEmail,
          subject: data.subject,
          body: data.body,
          type: emailType,
        },
        issueDate: new Date(),
      });
      router.push(`/empresa/correos/${doc.id}`);
    } finally {
      setSaving(false);
    }
  }

  const emailTypes = isEs ? EMAIL_TYPES_ES : EMAIL_TYPES_EN;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-semibold tracking-tight">
            {isEs ? "Nuevo Correo" : "New Email"}
          </h1>
          <p className="text-white/60 text-sm mt-1">
            {isEs ? "Redacción corporativa asistida por IA" : "AI-assisted corporate email"}
          </p>
        </div>
        <LanguageToggle value={language} onChange={(l) => setValue("language", l)} />
      </div>

      {/* Email type */}
      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5">
        <h3 className="text-white/60 text-xs uppercase tracking-widest font-medium mb-3">
          {isEs ? "Tipo de correo" : "Email type"}
        </h3>
        <div className="flex flex-wrap gap-2">
          {emailTypes.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setEmailType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                emailType === t
                  ? "bg-[#C8A96E]/10 border-[#C8A96E]/30 text-[#C8A96E]"
                  : "border-white/[0.07] text-white/50 hover:text-white/70 hover:border-white/20"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* AI compose */}
      <div className="bg-[#C8A96E]/[0.04] border border-[#C8A96E]/15 rounded-xl p-5">
        <h3 className="text-[#C8A96E] text-xs uppercase tracking-widest font-medium mb-3">
          ✦ {isEs ? "Componer con IA" : "Compose with AI"}
        </h3>
        <div className="flex gap-3">
          <input
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            placeholder={isEs
              ? "Ej: seguimiento después de propuesta enviada la semana pasada"
              : "E.g.: follow-up after proposal sent last week"}
            className="flex-1 bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#C8A96E]/40 transition-all"
          />
          <select
            {...register("tone")}
            aria-label={isEs ? "Tono" : "Tone"}
            className="bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#C8A96E]/40 transition-all"
          >
            <option value="formal">{isEs ? "Formal" : "Formal"}</option>
            <option value="friendly">{isEs ? "Amigable" : "Friendly"}</option>
          </select>
          <button
            type="button"
            onClick={composeWithAI}
            disabled={composing || !intent.trim()}
            className="px-4 py-2.5 bg-[#C8A96E] hover:bg-[#d4b87a] disabled:opacity-40 text-[#030611] text-sm font-semibold rounded-lg transition-all whitespace-nowrap"
          >
            {composing ? (isEs ? "Componiendo..." : "Composing...") : (isEs ? "Generar" : "Generate")}
          </button>
        </div>
      </div>

      {/* Recipients */}
      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-white/50 text-xs uppercase tracking-widest mb-1.5">
              {isEs ? "Para" : "To"}
            </label>
            <input {...register("toEmail")} type="email" placeholder="destinatario@empresa.com" className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#C8A96E]/40 transition-all" />
          </div>
          <div>
            <label className="block text-white/50 text-xs uppercase tracking-widest mb-1.5">
              {isEs ? "Copia (CC)" : "Copy (CC)"}
            </label>
            <input {...register("ccEmail")} type="email" placeholder={isEs ? "opcional" : "optional"} className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#C8A96E]/40 transition-all" />
          </div>
        </div>
      </div>

      {/* Subject */}
      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5">
        <div className="flex items-center justify-between mb-2">
          <label className="text-white/60 text-xs uppercase tracking-widest font-medium">
            {isEs ? "Asunto" : "Subject"}
          </label>
          <AiEnhanceButton text={subject ?? ""} language={language} context="email subject line" onEnhanced={(t) => setValue("subject", t)} />
        </div>
        <input {...register("subject")} placeholder={isEs ? "Asunto del correo" : "Email subject"} className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#C8A96E]/40 transition-all" />
      </div>

      {/* Body */}
      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5">
        <div className="flex items-center justify-between mb-2">
          <label className="text-white/60 text-xs uppercase tracking-widest font-medium">
            {isEs ? "Cuerpo del correo" : "Email body"}
          </label>
          <AiEnhanceButton text={body ?? ""} language={language} context="corporate email body" onEnhanced={(t) => setValue("body", t)} />
        </div>
        <textarea
          {...register("body")}
          rows={10}
          placeholder={isEs ? "Contenido del correo..." : "Email content..."}
          className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white/80 text-sm placeholder-white/20 focus:outline-none focus:border-[#C8A96E]/40 resize-none transition-all font-mono"
        />
      </div>

      <DraftPdfPreview endpoint="/api/empresa/documents/preview" payload={previewPayload} title={isEs ? "Vista previa del documento" : "Document preview"} />

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={() => router.back()} className="px-4 py-2.5 text-white/50 hover:text-white/80 text-sm transition-colors">
          {isEs ? "Cancelar" : "Cancel"}
        </button>
        <button type="submit" disabled={saving} className="px-6 py-2.5 bg-[#C8A96E] hover:bg-[#d4b87a] disabled:opacity-50 text-[#030611] text-sm font-semibold rounded-lg transition-all">
          {saving ? (isEs ? "Guardando..." : "Saving...") : (isEs ? "Guardar correo" : "Save email")}
        </button>
      </div>
    </form>
  );
}
