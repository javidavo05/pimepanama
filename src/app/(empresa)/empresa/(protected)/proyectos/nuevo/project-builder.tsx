"use client";

import { useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { createProjectAction } from "@/app/(empresa)/empresa/actions";
import { ClientCombobox } from "@/components/empresa/client-combobox";
import { AiEnhanceButton } from "@/components/empresa/document-builder/ai-enhance-button";
import type { Client } from "@prisma/client";

interface ProjectFormValues {
  name: string;
  clientId: string;
  clientName: string;
  description: string;
  scope: string;
  status: "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";
  startDate: string;
  endDate: string;
  totalBudget: string;
  rawNotes: string;
  language: "es" | "en";
}

interface ProjectBuilderProps {
  clients: Client[];
  creatorName: string | null;
}

const STATUS_OPTS = [
  { value: "ACTIVE", label: "Activo", color: "border-green-500/30 text-green-400" },
  { value: "PAUSED", label: "Pausado", color: "border-amber-500/30 text-amber-400" },
  { value: "COMPLETED", label: "Completado", color: "border-blue-500/30 text-blue-400" },
  { value: "CANCELLED", label: "Cancelado", color: "border-white/[0.1] text-white/30" },
];

export function ProjectBuilder({ clients, creatorName: _creatorName }: ProjectBuilderProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [expanding, setExpanding] = useState(false);
  const [expandCost, setExpandCost] = useState<number | null>(null);
  const [tempProjectId] = useState(() => `tmp-${Date.now()}`);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const { register, setValue, watch, control, handleSubmit } = useForm<ProjectFormValues>({
    defaultValues: {
      language: "es",
      status: "ACTIVE",
      name: "",
      clientId: "",
      clientName: "",
      description: "",
      scope: "",
      startDate: "",
      endDate: "",
      totalBudget: "",
      rawNotes: "",
    },
  });

  const language = useWatch({ control, name: "language" });
  const status = useWatch({ control, name: "status" });
  const rawNotes = watch("rawNotes");
  const clientId = watch("clientId");

  const isEs = language === "es";

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        await transcribeAudio(new Blob(chunksRef.current, { type: "audio/webm" }));
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
      const res = await fetch("/api/empresa/ai/transcribe", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        const prev = watch("rawNotes");
        setValue("rawNotes", (prev ? prev + "\n" : "") + data.transcript, { shouldDirty: true });
      }
    } finally {
      setTranscribing(false);
    }
  }

  async function expandWithAI() {
    const notes = watch("rawNotes");
    if (!notes?.trim()) return;
    setExpanding(true);
    try {
      const res = await fetch(`/api/empresa/projects/${tempProjectId}/ai-expand`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawNotes: notes, language }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.name && !watch("name")) setValue("name", data.name, { shouldDirty: true });
        else if (data.name) setValue("name", data.name, { shouldDirty: true });
        if (data.description) setValue("description", data.description, { shouldDirty: true });
        if (data.scope) setValue("scope", data.scope, { shouldDirty: true });
        if (data.suggestedBudget) setValue("totalBudget", String(data.suggestedBudget), { shouldDirty: true });
        if (data.costUSD != null) setExpandCost(data.costUSD);
      }
    } finally {
      setExpanding(false);
    }
  }

  async function onSubmit(data: ProjectFormValues) {
    setSaving(true);
    try {
      const project = await createProjectAction({
        name: data.name,
        clientId: data.clientId || undefined,
        description: data.description || undefined,
        scope: data.scope || undefined,
        status: data.status,
        startDate: data.startDate || undefined,
        endDate: data.endDate || undefined,
        totalBudget: data.totalBudget ? parseFloat(data.totalBudget) : undefined,
      });
      router.push(`/empresa/proyectos/${project.id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-white text-2xl font-semibold tracking-tight">Nuevo proyecto</h1>
        <div className="inline-flex rounded-lg border border-white/[0.08] overflow-hidden">
          {(["es", "en"] as const).map((l) => (
            <button key={l} type="button"
              onClick={() => setValue("language", l)}
              className={`px-4 py-1.5 text-xs font-medium uppercase tracking-widest transition-all ${language === l ? "bg-[#C8A96E]/10 text-[#C8A96E] border-r border-[#C8A96E]/20" : "text-white/40 hover:text-white/60"}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Estado */}
      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5">
        <h3 className="text-white/60 text-xs uppercase tracking-widest font-medium mb-4">Estado</h3>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTS.map((opt) => (
            <button key={opt.value} type="button"
              onClick={() => setValue("status", opt.value as ProjectFormValues["status"])}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${status === opt.value ? opt.color + " bg-white/[0.04]" : "border-white/[0.05] text-white/30 hover:text-white/60"}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Info básica */}
      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5 space-y-4">
        <h3 className="text-white/60 text-xs uppercase tracking-widest font-medium">Información del proyecto</h3>
        <div>
          <label className="block text-white/50 text-xs uppercase tracking-widest font-medium mb-1.5">
            {isEs ? "Nombre del proyecto" : "Project name"} <span className="text-red-400">*</span>
          </label>
          <input {...register("name", { required: true })}
            placeholder={isEs ? "Ej. Desarrollo plataforma web" : "E.g. Web platform development"}
            className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#C8A96E]/40 transition-all" />
        </div>

        <div>
          <label className="block text-white/50 text-xs uppercase tracking-widest font-medium mb-1.5">
            {isEs ? "Cliente" : "Client"}
          </label>
          <ClientCombobox
            clients={clients}
            value={watch("clientName")}
            onChange={(v) => setValue("clientName", v)}
            onSelect={(c) => { setValue("clientId", c.id); setValue("clientName", c.name); }}
            onNewClient={() => {}}
            selectedClientId={clientId || undefined}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-white/50 text-xs uppercase tracking-widest font-medium mb-1.5">
              {isEs ? "Fecha inicio" : "Start date"}
            </label>
            <input {...register("startDate")} type="date"
              className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#1AA7F0]/40 transition-all" />
          </div>
          <div>
            <label className="block text-white/50 text-xs uppercase tracking-widest font-medium mb-1.5">
              {isEs ? "Fecha fin estimada" : "Estimated end date"}
            </label>
            <input {...register("endDate")} type="date"
              className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#1AA7F0]/40 transition-all" />
          </div>
        </div>

        <div>
          <label className="block text-white/50 text-xs uppercase tracking-widest font-medium mb-1.5">
            {isEs ? "Presupuesto estimado (USD)" : "Estimated budget (USD)"}
          </label>
          <input {...register("totalBudget")} type="number" min="0" step="0.01"
            placeholder="0.00"
            className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#C8A96E]/40 transition-all" />
        </div>
      </div>

      {/* Dictado por voz + IA */}
      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white/60 text-xs uppercase tracking-widest font-medium">
            {isEs ? "Notas / Dictado" : "Notes / Dictation"}
          </h3>
          <div className="flex items-center gap-2">
            {recording ? (
              <button type="button" onClick={stopRecording}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-all">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                {isEs ? "Detener" : "Stop"}
              </button>
            ) : (
              <button type="button" onClick={startRecording} disabled={transcribing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/60 text-xs font-medium hover:text-white hover:border-white/20 disabled:opacity-40 transition-all">
                🎤 {transcribing ? (isEs ? "Transcribiendo..." : "Transcribing...") : (isEs ? "Grabar voz" : "Record voice")}
              </button>
            )}
            <button type="button" onClick={expandWithAI} disabled={expanding || !rawNotes?.trim()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#6344E8]/10 border border-[#6344E8]/25 text-[#6344E8] text-xs font-medium hover:bg-[#6344E8]/15 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
              {expanding ? <><span className="w-1.5 h-1.5 rounded-full bg-[#6344E8] animate-pulse" /> {isEs ? "Generando..." : "Generating..."}</> : "✦ " + (isEs ? "Generar proyecto con IA" : "Generate project with AI")}
            </button>
          </div>
        </div>
        {expandCost != null && (
          <p className="text-white/20 text-[10px] font-mono">costo IA: ${expandCost.toFixed(4)}</p>
        )}
        <textarea {...register("rawNotes")} rows={5}
          placeholder={isEs ? "Describe el proyecto libremente o dicta por voz. La IA llenará los campos automáticamente." : "Describe the project freely or dictate by voice. AI will fill in the fields automatically."}
          className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white/80 text-sm placeholder-white/20 focus:outline-none focus:border-[#1AA7F0]/40 resize-none transition-all" />
      </div>

      {/* Descripción y Alcance */}
      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5 space-y-4">
        <h3 className="text-white/60 text-xs uppercase tracking-widest font-medium">
          {isEs ? "Descripción y alcance" : "Description and scope"}
        </h3>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-white/50 text-xs uppercase tracking-widest font-medium">{isEs ? "Descripción" : "Description"}</label>
            <AiEnhanceButton
              text={watch("description")}
              onEnhanced={(v) => setValue("description", v, { shouldDirty: true })}
              language={language}
              context="project description"
            />
          </div>
          <textarea {...register("description")} rows={3}
            placeholder={isEs ? "¿En qué consiste el proyecto?" : "What does the project consist of?"}
            className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white/80 text-sm placeholder-white/20 focus:outline-none focus:border-[#1AA7F0]/40 resize-none transition-all" />
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-white/50 text-xs uppercase tracking-widest font-medium">{isEs ? "Alcance del proyecto" : "Project scope"}</label>
            <AiEnhanceButton
              text={watch("scope")}
              onEnhanced={(v) => setValue("scope", v, { shouldDirty: true })}
              language={language}
              context="project scope"
            />
          </div>
          <textarea {...register("scope")} rows={4}
            placeholder={isEs ? "Entregables, fases, exclusiones..." : "Deliverables, phases, exclusions..."}
            className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white/80 text-sm placeholder-white/20 focus:outline-none focus:border-[#1AA7F0]/40 resize-none transition-all" />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={() => router.back()} className="px-4 py-2.5 text-white/50 hover:text-white/80 text-sm transition-colors">
          {isEs ? "Cancelar" : "Cancel"}
        </button>
        <button type="submit" disabled={saving}
          className="px-6 py-2.5 bg-[#1AA7F0] hover:bg-[#0E87C8] disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-all">
          {saving ? (isEs ? "Guardando..." : "Saving...") : (isEs ? "Crear proyecto" : "Create project")}
        </button>
      </div>
    </form>
  );
}
