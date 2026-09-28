"use client";

import { useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createDocumentAction } from "@/app/(empresa)/empresa/actions";
import { LanguageToggle } from "@/components/empresa/document-builder/language-toggle";
import { AiEnhanceButton } from "@/components/empresa/document-builder/ai-enhance-button";
import { DraftPdfPreview } from "@/components/empresa/document-builder/draft-pdf-preview";
import { PageHeader, ActionRow, btn } from "@/components/empresa/page-header";
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
      {/* En el celular el selector de idioma baja debajo del título, a lo ancho. */}
      <PageHeader
        title={isEs ? "Nuevo Correo" : "New Email"}
        description={isEs ? "Redacción corporativa asistida por IA" : "AI-assisted corporate email"}
        actions={<LanguageToggle value={language} onChange={(l) => setValue("language", l)} />}
      />

      {/* Email type */}
      <div className="bg-panel border border-line rounded-xl p-5">
        <h3 className="text-fg-dim text-xs uppercase tracking-widest font-medium mb-3">
          {isEs ? "Tipo de correo" : "Email type"}
        </h3>
        {/* Cuadrícula de columnas iguales (dos en el celular, cuatro desde
            tablet); si la cantidad es impar, el último ocupa dos columnas en vez
            de quedar suelto. */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {emailTypes.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setEmailType(t)}
              className={`min-h-11 sm:min-h-8 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all [&:nth-child(odd):last-child]:col-span-2 ${
                emailType === t
                  ? "bg-sand/10 border-sand/30 text-sand-fg"
                  : "border-line text-fg-faint hover:text-fg-mute hover:border-line-loud"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* AI compose */}
      <div className="bg-sand/[0.04] border border-sand/15 rounded-xl p-5">
        <h3 className="text-sand-fg text-xs uppercase tracking-widest font-medium mb-3">
          ✦ {isEs ? "Componer con IA" : "Compose with AI"}
        </h3>
        {/* En el celular: la instrucción a lo ancho y debajo tono y "Generar" en
            dos columnas iguales. En una sola fila se salía 125 px por la derecha. */}
        <div className="grid grid-cols-2 gap-3 sm:flex">
          <input
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            placeholder={isEs
              ? "Ej: seguimiento después de propuesta enviada la semana pasada"
              : "E.g.: follow-up after proposal sent last week"}
            className="col-span-2 min-w-0 sm:flex-1 bg-fill border border-line rounded-lg px-3 py-2.5 text-fg text-sm placeholder-fg-trace focus:outline-none focus:border-sand/40 transition-all"
          />
          <select
            {...register("tone")}
            aria-label={isEs ? "Tono" : "Tone"}
            className="min-w-0 w-full sm:w-auto bg-fill border border-line rounded-lg px-3 py-2.5 text-fg text-sm focus:outline-none focus:border-sand/40 transition-all"
          >
            <option value="formal">{isEs ? "Formal" : "Formal"}</option>
            <option value="friendly">{isEs ? "Amigable" : "Friendly"}</option>
          </select>
          <button
            type="button"
            onClick={composeWithAI}
            disabled={composing || !intent.trim()}
            className={btn.accent}
          >
            {composing ? (isEs ? "Componiendo..." : "Composing...") : (isEs ? "Generar" : "Generate")}
          </button>
        </div>
      </div>

      {/* Recipients */}
      <div className="bg-panel border border-line rounded-xl p-5">
        {/* Una columna en el celular: en dos, cada campo quedaba de 38 px. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="min-w-0">
            <label className="block text-fg-faint text-xs uppercase tracking-widest mb-1.5">
              {isEs ? "Para" : "To"}
            </label>
            <input {...register("toEmail")} type="email" placeholder="destinatario@empresa.com" className="w-full bg-fill border border-line rounded-lg px-3 py-2.5 text-fg text-sm placeholder-fg-trace focus:outline-none focus:border-sand/40 transition-all" />
          </div>
          <div className="min-w-0">
            <label className="block text-fg-faint text-xs uppercase tracking-widest mb-1.5">
              {isEs ? "Copia (CC)" : "Copy (CC)"}
            </label>
            <input {...register("ccEmail")} type="email" placeholder={isEs ? "opcional" : "optional"} className="w-full bg-fill border border-line rounded-lg px-3 py-2.5 text-fg text-sm placeholder-fg-trace focus:outline-none focus:border-sand/40 transition-all" />
          </div>
        </div>
      </div>

      {/* Subject */}
      <div className="bg-panel border border-line rounded-xl p-5">
        <div className="flex items-center justify-between mb-2">
          <label className="text-fg-dim text-xs uppercase tracking-widest font-medium">
            {isEs ? "Asunto" : "Subject"}
          </label>
          <AiEnhanceButton text={subject ?? ""} language={language} context="email subject line" onEnhanced={(t) => setValue("subject", t)} />
        </div>
        <input {...register("subject")} placeholder={isEs ? "Asunto del correo" : "Email subject"} className="w-full bg-fill border border-line rounded-lg px-3 py-2.5 text-fg text-sm placeholder-fg-trace focus:outline-none focus:border-sand/40 transition-all" />
      </div>

      {/* Body */}
      <div className="bg-panel border border-line rounded-xl p-5">
        <div className="flex items-center justify-between mb-2">
          <label className="text-fg-dim text-xs uppercase tracking-widest font-medium">
            {isEs ? "Cuerpo del correo" : "Email body"}
          </label>
          <AiEnhanceButton text={body ?? ""} language={language} context="corporate email body" onEnhanced={(t) => setValue("body", t)} />
        </div>
        <textarea
          {...register("body")}
          rows={10}
          placeholder={isEs ? "Contenido del correo..." : "Email content..."}
          className="w-full bg-fill border border-line rounded-lg px-3 py-2.5 text-fg-soft text-sm placeholder-fg-trace focus:outline-none focus:border-sand/40 resize-none transition-all font-mono"
        />
      </div>

      <DraftPdfPreview endpoint="/api/empresa/documents/preview" payload={previewPayload} title={isEs ? "Vista previa del documento" : "Document preview"} />

      {/* Dos columnas iguales en el celular; la acción principal a la derecha. */}
      <ActionRow className="pt-2 sm:justify-end sm:gap-3">
        <button type="button" onClick={() => router.back()} className={btn.secondary}>
          {isEs ? "Cancelar" : "Cancel"}
        </button>
        <button type="submit" disabled={saving} className={btn.accent}>
          {saving ? (isEs ? "Guardando..." : "Saving...") : (isEs ? "Guardar correo" : "Save email")}
        </button>
      </ActionRow>
    </form>
  );
}
