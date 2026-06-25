"use client";

import { useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { createDocumentAction } from "@/app/(empresa)/empresa/actions";
import { LanguageToggle } from "@/components/empresa/document-builder/language-toggle";
import { AiEnhanceButton } from "@/components/empresa/document-builder/ai-enhance-button";
import type { DocumentFormValues } from "@/components/empresa/document-builder/line-items-editor";

export function BitacoraBuilder() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [restructuring, setRestructuring] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const { register, control, setValue, handleSubmit, watch } =
    useForm<DocumentFormValues>({
      defaultValues: {
        language: "es",
        meetingDate: new Date().toISOString().split("T")[0],
      },
    });

  const language = useWatch({ control, name: "language" });
  const rawNotes = watch("rawNotes");

  const isEs = language === "es";

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await transcribeAudio(blob);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
    } catch {
      alert(isEs ? "No se pudo acceder al micrófono." : "Could not access microphone.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  async function transcribeAudio(blob: Blob) {
    setTranscribing(true);
    try {
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");
      formData.append("language", language);
      const res = await fetch("/api/empresa/ai/transcribe", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setValue("rawNotes", (watch("rawNotes") ? watch("rawNotes") + "\n" : "") + data.transcript, { shouldDirty: true });
      }
    } finally {
      setTranscribing(false);
    }
  }

  async function restructureWithAI() {
    const notes = watch("rawNotes");
    if (!notes?.trim()) return;
    setRestructuring(true);
    try {
      const res = await fetch("/api/empresa/ai/restructure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawNotes: notes, language }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.agenda) setValue("agenda", data.agenda, { shouldDirty: true });
        if (data.decisions) setValue("decisions", Array.isArray(data.decisions) ? data.decisions.join("\n") : data.decisions, { shouldDirty: true });
        if (data.actionItems) setValue("actionItems", Array.isArray(data.actionItems) ? data.actionItems.map((a: { task: string; owner: string; due: string }) => `${a.task} (${a.owner}) — ${a.due}`).join("\n") : data.actionItems, { shouldDirty: true });
        if (data.nextMeeting) setValue("nextMeeting", data.nextMeeting, { shouldDirty: true });
      }
    } finally {
      setRestructuring(false);
    }
  }

  async function onSubmit(data: DocumentFormValues) {
    setSaving(true);
    try {
      const doc = await createDocumentAction({
        type: "BITACORA",
        title: data.project || `Bitácora ${new Date().toLocaleDateString()}`,
        language: data.language,
        clientName: data.clientName,
        content: {
          attendees: data.attendees,
          project: data.project,
          rawNotes: data.rawNotes,
          agenda: data.agenda,
          decisions: data.decisions,
          actionItems: data.actionItems,
          nextMeeting: data.nextMeeting,
        },
        issueDate: data.meetingDate ? new Date(data.meetingDate) : new Date(),
      });
      router.push(`/empresa/bitacoras/${doc.id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-semibold tracking-tight">
            {isEs ? "Nueva Bitácora" : "New Log"}
          </h1>
          <p className="text-white/40 text-sm mt-1">
            {isEs ? "Registro de reunión o actividad" : "Meeting or activity log"}
          </p>
        </div>
        <LanguageToggle value={language} onChange={(l) => setValue("language", l)} />
      </div>

      {/* Meeting info */}
      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5">
        <h3 className="text-white/60 text-xs uppercase tracking-widest font-medium mb-4">
          {isEs ? "Información de la reunión" : "Meeting information"}
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-white/50 text-xs uppercase tracking-widest mb-1.5">
              {isEs ? "Proyecto" : "Project"}
            </label>
            <input {...register("project")} placeholder={isEs ? "Nombre del proyecto" : "Project name"} className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#C8A96E]/40 transition-all" />
          </div>
          <div>
            <label className="block text-white/50 text-xs uppercase tracking-widest mb-1.5">
              {isEs ? "Fecha" : "Date"}
            </label>
            <input {...register("meetingDate")} type="date" className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#C8A96E]/40 transition-all" />
          </div>
          <div>
            <label className="block text-white/50 text-xs uppercase tracking-widest mb-1.5">
              {isEs ? "Cliente" : "Client"}
            </label>
            <input {...register("clientName")} placeholder={isEs ? "Nombre del cliente" : "Client name"} className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#C8A96E]/40 transition-all" />
          </div>
          <div>
            <label className="block text-white/50 text-xs uppercase tracking-widest mb-1.5">
              {isEs ? "Participantes" : "Attendees"}
            </label>
            <input {...register("attendees")} placeholder={isEs ? "Juan, María, Pedro..." : "John, Mary, Peter..."} className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#C8A96E]/40 transition-all" />
          </div>
        </div>
      </div>

      {/* Voice / raw notes */}
      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white/60 text-xs uppercase tracking-widest font-medium">
            {isEs ? "Notas / dictado" : "Notes / dictation"}
          </h3>
          <div className="flex items-center gap-3">
            {transcribing && (
              <span className="text-white/40 text-xs animate-pulse">
                {isEs ? "Transcribiendo..." : "Transcribing..."}
              </span>
            )}
            <button
              type="button"
              onClick={recording ? stopRecording : startRecording}
              disabled={transcribing}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                recording
                  ? "bg-red-500/10 border-red-500/30 text-red-400 animate-pulse"
                  : "bg-white/[0.04] border-white/[0.08] text-white/60 hover:text-white/80"
              }`}
            >
              {recording ? (
                <>⬛ {isEs ? "Detener" : "Stop"}</>
              ) : (
                <>🎤 {isEs ? "Grabar voz" : "Record voice"}</>
              )}
            </button>
          </div>
        </div>
        <textarea
          {...register("rawNotes")}
          rows={5}
          placeholder={isEs ? "Escribe o dicta las notas de la reunión aquí..." : "Write or dictate meeting notes here..."}
          className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white/80 text-sm placeholder-white/20 focus:outline-none focus:border-[#C8A96E]/40 resize-none transition-all"
        />

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={restructureWithAI}
            disabled={!rawNotes?.trim() || restructuring}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#C8A96E]/10 border border-[#C8A96E]/20 text-[#C8A96E] text-xs font-semibold rounded-lg hover:bg-[#C8A96E]/15 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {restructuring ? (
              <><span className="w-3 h-3 border-2 border-[#C8A96E]/30 border-t-[#C8A96E] rounded-full animate-spin" /> {isEs ? "Restructurando..." : "Restructuring..."}</>
            ) : (
              <>✦ {isEs ? "Restructurar con IA" : "Restructure with AI"}</>
            )}
          </button>
        </div>
      </div>

      {/* Structured output */}
      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5 space-y-4">
        <h3 className="text-white/60 text-xs uppercase tracking-widest font-medium">
          {isEs ? "Contenido estructurado" : "Structured content"}
        </h3>

        {([
          ["agenda", isEs ? "Resumen / agenda" : "Summary / agenda", "project scope description"],
          ["decisions", isEs ? "Acuerdos y decisiones" : "Agreements and decisions", "decisions"],
          ["actionItems", isEs ? "Tareas pendientes (tarea — responsable — fecha)" : "Action items (task — owner — due date)", "action items"],
          ["nextMeeting", isEs ? "Próxima reunión" : "Next meeting", "next steps"],
        ] as const).map(([field, label, context]) => (
          <div key={field}>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-white/50 text-xs uppercase tracking-widest font-medium">{label}</label>
              <AiEnhanceButton
                text={watch(field as keyof DocumentFormValues) as string ?? ""}
                language={language}
                context={context}
                onEnhanced={(t) => setValue(field as keyof DocumentFormValues, t as never)}
              />
            </div>
            <textarea
              {...register(field as keyof DocumentFormValues)}
              rows={3}
              placeholder={isEs ? "Se completará con IA o escribe manualmente..." : "Will be filled by AI or write manually..."}
              className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white/80 text-sm placeholder-white/20 focus:outline-none focus:border-[#C8A96E]/40 resize-none transition-all"
            />
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={() => router.back()} className="px-4 py-2.5 text-white/50 hover:text-white/80 text-sm transition-colors">
          {isEs ? "Cancelar" : "Cancel"}
        </button>
        <button type="submit" disabled={saving} className="px-6 py-2.5 bg-[#C8A96E] hover:bg-[#d4b87a] disabled:opacity-50 text-[#030611] text-sm font-semibold rounded-lg transition-all">
          {saving ? (isEs ? "Guardando..." : "Saving...") : (isEs ? "Crear bitácora" : "Create log")}
        </button>
      </div>
    </form>
  );
}
