"use client";

import { useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { createProjectWithContractAction } from "@/app/(empresa)/empresa/actions";
import { ClientCombobox } from "@/components/empresa/client-combobox";
import { ContractAnalyzer, type ContractAnalysis } from "@/components/empresa/contract-analyzer";
import { DeliverablesEditor, type DeliverableDraft } from "@/components/empresa/deliverables-editor";
import { FinancingPlanner } from "@/components/empresa/financing-planner";
import type { FinancingPlan } from "@/lib/financing";
import { AiEnhanceButton } from "@/components/empresa/document-builder/ai-enhance-button";
import { coerceAiText } from "@/lib/ai-text";
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
  { value: "CANCELLED", label: "Cancelado", color: "border-white/[0.1] text-white/55" },
];

export function ProjectBuilder({ clients, creatorName: _creatorName }: ProjectBuilderProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [expanding, setExpanding] = useState(false);
  const [expandCost, setExpandCost] = useState<number | null>(null);
  const [tempProjectId] = useState(() => `tmp-${Date.now()}`);
  // Un proyecto puede pertenecer a varios clientes (tabla ProjectClient).
  const [selectedClients, setSelectedClients] = useState<Client[]>([]);
  const [withContract, setWithContract] = useState(true);
  const [contract, setContract] = useState({
    title: "",
    value: "",
    startsAt: "",
    endsAt: "",
    responsibilities: "",
    terms: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [deliverables, setDeliverables] = useState<DeliverableDraft[]>([]);
  const [deliverablesFromDocument, setDeliverablesFromDocument] = useState(0);
  const [financingEnabled, setFinancingEnabled] = useState(false);
  const [financing, setFinancing] = useState<FinancingPlan>({
    total: 0,
    downPayment: 0,
    installments: 6,
    frequency: "MONTHLY",
    firstDueDate: "",
  });
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
        if (data.name) setValue("name", coerceAiText(data.name), { shouldDirty: true });
        if (data.description) setValue("description", coerceAiText(data.description), { shouldDirty: true });
        if (data.scope) setValue("scope", coerceAiText(data.scope), { shouldDirty: true });
        if (data.suggestedBudget != null) {
          setValue("totalBudget", String(data.suggestedBudget), { shouldDirty: true });
        }
        if (data.costUSD != null) setExpandCost(data.costUSD);
      }
    } finally {
      setExpanding(false);
    }
  }

  /** Vuelca en el formulario el contrato que la IA sacó del documento adjunto. */
  function applyAnalysis(a: ContractAnalysis) {
    if (a.projectName) setValue("name", a.projectName);
    if (a.scope) setValue("scope", a.scope);
    if (a.startsAt) setValue("startDate", a.startsAt);
    if (a.endsAt) setValue("endDate", a.endsAt);
    if (a.value != null) setValue("totalBudget", String(a.value));

    // Cliente: solo si el nombre coincide con uno ya registrado. Crear clientes
    // a partir de un PDF sería adivinar demasiado.
    if (a.clientName) {
      const match = clients.find(
        (c) =>
          c.name.toLowerCase() === a.clientName!.toLowerCase() ||
          c.company?.toLowerCase() === a.clientName!.toLowerCase()
      );
      if (match) {
        setSelectedClients((list) => (list.some((x) => x.id === match.id) ? list : [...list, match]));
      } else {
        setValue("clientName", a.clientName);
      }
    }

    setWithContract(true);
    setContract((c) => ({
      ...c,
      title: a.contractTitle || c.title,
      value: a.value != null ? String(a.value) : c.value,
      startsAt: a.startsAt || c.startsAt,
      endsAt: a.endsAt || c.endsAt,
      responsibilities: a.responsibilities || c.responsibilities,
      terms: a.terms || c.terms,
    }));

    if (a.deliverables?.length) {
      setDeliverables(
        a.deliverables.map((d) => ({
          name: d.name ?? "",
          description: d.description ?? "",
          dueDate: d.dueDate ?? "",
        }))
      );
      setDeliverablesFromDocument(a.deliverables.length);
    }

    if (a.financing) {
      setFinancingEnabled(true);
      setFinancing({
        total: a.value ?? 0,
        downPayment: a.financing.downPayment ?? 0,
        installments: a.financing.installments ?? 1,
        frequency: a.financing.frequency ?? "MONTHLY",
        firstDueDate: a.financing.firstDueDate ?? a.startsAt ?? "",
      });
    }
  }

  async function onSubmit(data: ProjectFormValues) {
    setError(null);
    if (selectedClients.length === 0) {
      setError("Elige al menos un cliente: el proyecto tiene que pertenecer a alguien.");
      return;
    }
    if (withContract && !contract.title.trim()) {
      setError("El contrato necesita un título, o desactiva «Incluir contrato».");
      return;
    }

    setSaving(true);
    try {
      const budget = data.totalBudget ? parseFloat(data.totalBudget) : undefined;
      const { project } = await createProjectWithContractAction({
        name: data.name,
        clientIds: selectedClients.map((c) => c.id),
        description: data.description || undefined,
        scope: data.scope || undefined,
        status: data.status,
        startDate: data.startDate || undefined,
        endDate: data.endDate || undefined,
        totalBudget: budget,
        deliverables: deliverables
          .filter((d) => d.name.trim())
          .map((d) => ({
            name: d.name,
            description: d.description || undefined,
            dueDate: d.dueDate || undefined,
          })),
        financingPlan: financingEnabled
          ? { ...financing, total: financing.total || budget || 0 }
          : null,
        contract: withContract
          ? {
              title: contract.title,
              // Sin valor propio, el contrato vale lo que el proyecto.
              value: contract.value ? parseFloat(contract.value) : budget,
              startsAt: contract.startsAt || data.startDate || undefined,
              endsAt: contract.endsAt || data.endDate || undefined,
              responsibilities: contract.responsibilities || undefined,
              terms: contract.terms || undefined,
              description: data.description || undefined,
            }
          : null,
      });
      router.push(`/empresa/proyectos/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el proyecto");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-semibold tracking-tight">Nuevo proyecto</h1>
          <p className="text-white/50 text-sm mt-0.5">Con su contrato, en una sola pantalla.</p>
        </div>
        <div className="inline-flex rounded-lg border border-white/[0.08] overflow-hidden">
          {(["es", "en"] as const).map((l) => (
            <button key={l} type="button"
              onClick={() => setValue("language", l)}
              className={`px-4 py-1.5 text-xs font-medium uppercase tracking-widest transition-all ${language === l ? "bg-[#C8A96E]/10 text-[#C8A96E] border-r border-[#C8A96E]/20" : "text-white/60 hover:text-white/60"}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <ContractAnalyzer onAnalyzed={applyAnalysis} />

      {/* Estado */}
      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5">
        <h3 className="text-white/60 text-xs uppercase tracking-widest font-medium mb-4">Estado</h3>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTS.map((opt) => (
            <button key={opt.value} type="button"
              onClick={() => setValue("status", opt.value as ProjectFormValues["status"])}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${status === opt.value ? opt.color + " bg-white/[0.04]" : "border-white/[0.05] text-white/55 hover:text-white/60"}`}>
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
            {isEs ? "Clientes" : "Clients"} <span className="text-red-400">*</span>
          </label>
          <p className="text-white/45 text-xs mb-2">
            {isEs
              ? "El proyecto pertenece a estos clientes; solo a ellos les aparecerá al facturar."
              : "The project belongs to these clients; it only shows up when invoicing them."}
          </p>

          {selectedClients.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {selectedClients.map((c, i) => (
                <span
                  key={c.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1AA7F0]/10 border border-[#1AA7F0]/25 text-[#1AA7F0] text-xs"
                >
                  {c.name}
                  {i === 0 && <span className="text-[9px] text-white/45 uppercase tracking-widest">principal</span>}
                  <button
                    type="button"
                    onClick={() => setSelectedClients((list) => list.filter((x) => x.id !== c.id))}
                    className="text-white/40 hover:text-red-400 ml-0.5"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          <ClientCombobox
            clients={clients.filter((c) => !selectedClients.some((s) => s.id === c.id))}
            value={watch("clientName")}
            onChange={(v) => setValue("clientName", v)}
            onSelect={(c) => {
              setSelectedClients((list) => (list.some((x) => x.id === c.id) ? list : [...list, c]));
              setValue("clientName", "");
              setValue("clientId", c.id);
            }}
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
            <button type="button" onClick={expandWithAI} disabled={expanding || !String(rawNotes ?? "").trim()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#6344E8]/10 border border-[#6344E8]/25 text-[#6344E8] text-xs font-medium hover:bg-[#6344E8]/15 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
              {expanding ? <><span className="w-1.5 h-1.5 rounded-full bg-[#6344E8] animate-pulse" /> {isEs ? "Generando..." : "Generating..."}</> : "✦ " + (isEs ? "Generar proyecto con IA" : "Generate project with AI")}
            </button>
          </div>
        </div>
        {expandCost != null && (
          <p className="text-white/50 text-[10px] font-mono">costo IA: ${expandCost.toFixed(4)}</p>
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
              text={String(watch("description") ?? "")}
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
              text={String(watch("scope") ?? "")}
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

      {/* Contrato — parte del mismo formulario, no otra pantalla */}
      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-white/60 text-xs uppercase tracking-widest font-medium">
              {isEs ? "Contrato" : "Contract"}
            </h3>
            <p className="text-white/45 text-xs mt-1">
              {isEs
                ? "Se crea junto con el proyecto y queda vinculado. Al facturar, elegirlo llena el detalle y el monto."
                : "Created together with the project and linked to it. Picking it on an invoice fills in the amount."}
            </p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={withContract}
              onChange={(e) => setWithContract(e.target.checked)}
              className="w-4 h-4 rounded border border-white/20 bg-white/[0.04] accent-[#1AA7F0]"
            />
            <span className="text-white/60 text-xs">{isEs ? "Incluir contrato" : "Include contract"}</span>
          </label>
        </div>

        {withContract && (
          <div className="space-y-4 border-t border-white/[0.05] pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-white/50 text-xs uppercase tracking-widest font-medium mb-1.5">
                  {isEs ? "Título del contrato" : "Contract title"} <span className="text-red-400">*</span>
                </label>
                <input
                  value={contract.title}
                  onChange={(e) => setContract((c) => ({ ...c, title: e.target.value }))}
                  placeholder={watch("name") ? `${isEs ? "Contrato" : "Contract"} — ${watch("name")}` : ""}
                  className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#1AA7F0]/40 transition-all"
                />
              </div>
              <div>
                <label className="block text-white/50 text-xs uppercase tracking-widest font-medium mb-1.5">
                  {isEs ? "Valor" : "Value"}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={contract.value}
                  onChange={(e) => setContract((c) => ({ ...c, value: e.target.value }))}
                  placeholder={watch("totalBudget") || "0.00"}
                  className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm font-mono placeholder-white/20 focus:outline-none focus:border-[#1AA7F0]/40 transition-all"
                />
                <p className="text-white/35 text-[10px] mt-1">
                  {isEs ? "Vacío = presupuesto del proyecto" : "Empty = project budget"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-white/50 text-xs uppercase tracking-widest font-medium mb-1.5">
                  {isEs ? "Vigente desde" : "Starts"}
                </label>
                <input
                  type="date"
                  value={contract.startsAt}
                  onChange={(e) => setContract((c) => ({ ...c, startsAt: e.target.value }))}
                  className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#1AA7F0]/40 transition-all [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="block text-white/50 text-xs uppercase tracking-widest font-medium mb-1.5">
                  {isEs ? "Vigente hasta" : "Ends"}
                </label>
                <input
                  type="date"
                  value={contract.endsAt}
                  onChange={(e) => setContract((c) => ({ ...c, endsAt: e.target.value }))}
                  className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#1AA7F0]/40 transition-all [color-scheme:dark]"
                />
              </div>
            </div>

            <div>
              <label className="block text-white/50 text-xs uppercase tracking-widest font-medium mb-1.5">
                {isEs ? "Responsabilidades" : "Responsibilities"}
              </label>
              <textarea
                rows={3}
                value={contract.responsibilities}
                onChange={(e) => setContract((c) => ({ ...c, responsibilities: e.target.value }))}
                placeholder={isEs ? "Qué entrega cada parte..." : "What each party delivers..."}
                className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white/80 text-sm placeholder-white/20 focus:outline-none focus:border-[#1AA7F0]/40 resize-none transition-all"
              />
            </div>

            <div>
              <label className="block text-white/50 text-xs uppercase tracking-widest font-medium mb-1.5">
                {isEs ? "Términos" : "Terms"}
              </label>
              <textarea
                rows={3}
                value={contract.terms}
                onChange={(e) => setContract((c) => ({ ...c, terms: e.target.value }))}
                placeholder={isEs ? "Condiciones de pago, plazos, penalidades..." : "Payment terms, deadlines, penalties..."}
                className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white/80 text-sm placeholder-white/20 focus:outline-none focus:border-[#1AA7F0]/40 resize-none transition-all"
              />
            </div>
          </div>
        )}
      </div>

      <DeliverablesEditor
        items={deliverables}
        onChange={setDeliverables}
        fromDocument={deliverablesFromDocument}
      />

      <FinancingPlanner
        plan={{
          ...financing,
          total: financing.total || Number(watch("totalBudget")) || 0,
          firstDueDate: financing.firstDueDate || watch("startDate") || "",
        }}
        onChange={setFinancing}
        enabled={financingEnabled}
        onToggle={setFinancingEnabled}
        hint="Abono inicial más cuotas mensuales o quincenales. Al facturar el proyecto, cada cuota se crea sola en Cuentas por Cobrar."
      />

      {error && (
        <div className="bg-red-500/[0.07] border border-red-500/25 rounded-xl px-4 py-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={() => router.back()} className="px-4 py-2.5 text-white/50 hover:text-white/80 text-sm transition-colors">
          {isEs ? "Cancelar" : "Cancel"}
        </button>
        <button type="submit" disabled={saving}
          className="px-6 py-2.5 bg-[#1AA7F0] hover:bg-[#0E87C8] disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-all">
          {saving
            ? (isEs ? "Guardando..." : "Saving...")
            : withContract
              ? (isEs ? "Crear proyecto y contrato" : "Create project & contract")
              : (isEs ? "Crear proyecto" : "Create project")}
        </button>
      </div>
    </form>
  );
}
