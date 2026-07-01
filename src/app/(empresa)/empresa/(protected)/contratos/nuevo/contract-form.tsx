"use client";

import { useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createContractAction, updateContractAction } from "@/app/(empresa)/empresa/actions";
import { ClientCombobox } from "@/components/empresa/client-combobox";
import { AiEnhanceButton } from "@/components/empresa/document-builder/ai-enhance-button";
import type { Client } from "@prisma/client";
import type { SerializedContract, SerializedProject } from "@/lib/serializers";

interface ContractFormValues {
  title: string;
  clientId: string;
  clientName: string;
  projectId: string;
  description: string;
  responsibilities: string;
  terms: string;
  status: "DRAFT" | "ACTIVE" | "EXPIRED" | "TERMINATED";
  signedAt: string;
  startsAt: string;
  endsAt: string;
  value: string;
}

interface ContractFormProps {
  clients: Client[];
  projects: SerializedProject[];
  mode?: "create" | "edit";
  initial?: SerializedContract & { client?: { id: string; name: string } | null; project?: { id: string; name: string } | null };
  defaultProjectId?: string;
  defaultClientId?: string;
}

const STATUS_OPTS = [
  { value: "DRAFT", label: "Borrador", color: "border-white/[0.07] text-white/50" },
  { value: "ACTIVE", label: "Activo", color: "border-green-500/30 text-green-400" },
  { value: "EXPIRED", label: "Vencido", color: "border-white/[0.1] text-white/40" },
  { value: "TERMINATED", label: "Terminado", color: "border-red-500/30 text-red-400" },
];

export function ContractForm({ clients, projects, mode = "create", initial, defaultProjectId, defaultClientId }: ContractFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const defaultClient = initial?.client ?? clients.find((c) => c.id === (initial?.clientId ?? defaultClientId));

  const { register, setValue, watch, control, handleSubmit } = useForm<ContractFormValues>({
    defaultValues: {
      title: initial?.title ?? "",
      clientId: initial?.clientId ?? defaultClientId ?? "",
      clientName: defaultClient?.name ?? "",
      projectId: initial?.projectId ?? defaultProjectId ?? "",
      description: initial?.description ?? "",
      responsibilities: initial?.responsibilities ?? "",
      terms: initial?.terms ?? "",
      status: (initial?.status as ContractFormValues["status"]) ?? "DRAFT",
      signedAt: initial?.signedAt ? initial.signedAt.split("T")[0] : "",
      startsAt: initial?.startsAt ? initial.startsAt.split("T")[0] : "",
      endsAt: initial?.endsAt ? initial.endsAt.split("T")[0] : "",
      value: initial?.value != null ? String(initial.value) : "",
    },
  });

  const status = useWatch({ control, name: "status" });
  const clientId = watch("clientId");
  const projectId = watch("projectId");

  async function onSubmit(data: ContractFormValues) {
    setSaving(true);
    try {
      const payload = {
        title: data.title,
        clientId: data.clientId || undefined,
        projectId: data.projectId || undefined,
        description: data.description || undefined,
        responsibilities: data.responsibilities || undefined,
        terms: data.terms || undefined,
        status: data.status,
        signedAt: data.signedAt || undefined,
        startsAt: data.startsAt || undefined,
        endsAt: data.endsAt || undefined,
        value: data.value ? parseFloat(data.value) : undefined,
      };

      if (mode === "edit" && initial) {
        await updateContractAction(initial.id, payload);
        router.push(`/empresa/contratos/${initial.id}`);
      } else {
        const contract = await createContractAction(payload);
        router.push(`/empresa/contratos/${contract.id}`);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-white text-2xl font-semibold tracking-tight">
          {mode === "edit" ? "Editar contrato" : "Nuevo contrato"}
        </h1>
      </div>

      {/* Estado */}
      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5">
        <h3 className="text-white/60 text-xs uppercase tracking-widest font-medium mb-4">Estado</h3>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTS.map((opt) => (
            <button key={opt.value} type="button"
              onClick={() => setValue("status", opt.value as ContractFormValues["status"])}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${status === opt.value ? opt.color + " bg-white/[0.04]" : "border-white/[0.05] text-white/30 hover:text-white/60"}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Info básica */}
      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5 space-y-4">
        <h3 className="text-white/60 text-xs uppercase tracking-widest font-medium">Información</h3>
        <div>
          <label className="block text-white/50 text-xs uppercase tracking-widest font-medium mb-1.5">
            Título del contrato <span className="text-red-400">*</span>
          </label>
          <input {...register("title", { required: true })}
            placeholder="Ej. Contrato de desarrollo de software"
            className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#C8A96E]/40 transition-all" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-white/50 text-xs uppercase tracking-widest font-medium mb-1.5">Cliente</label>
            <ClientCombobox
              clients={clients}
              value={watch("clientName")}
              onChange={(v) => setValue("clientName", v)}
              onSelect={(c) => { setValue("clientId", c.id); setValue("clientName", c.name); }}
              onNewClient={() => {}}
              selectedClientId={clientId || undefined}
            />
          </div>
          <div>
            <label className="block text-white/50 text-xs uppercase tracking-widest font-medium mb-1.5">Proyecto</label>
            <select {...register("projectId")}
              className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#1AA7F0]/40 transition-all">
              <option value="">Sin proyecto</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            {projectId && (
              <p className="text-[#1AA7F0]/50 text-xs mt-1">
                Proyecto: {projects.find((p) => p.id === projectId)?.name}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-white/50 text-xs uppercase tracking-widest font-medium mb-1.5">Valor (USD)</label>
            <input {...register("value")} type="number" min="0" step="0.01" placeholder="0.00"
              className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#C8A96E]/40 transition-all" />
          </div>
          <div>
            <label className="block text-white/50 text-xs uppercase tracking-widest font-medium mb-1.5">Fecha firma</label>
            <input {...register("signedAt")} type="date"
              className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#1AA7F0]/40 transition-all" />
          </div>
          <div>
            <label className="block text-white/50 text-xs uppercase tracking-widest font-medium mb-1.5">Vigencia inicio</label>
            <input {...register("startsAt")} type="date"
              className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#1AA7F0]/40 transition-all" />
          </div>
        </div>

        <div>
          <label className="block text-white/50 text-xs uppercase tracking-widest font-medium mb-1.5">Vigencia fin</label>
          <input {...register("endsAt")} type="date"
            className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#1AA7F0]/40 transition-all" />
        </div>
      </div>

      {/* Contenido */}
      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5 space-y-4">
        <h3 className="text-white/60 text-xs uppercase tracking-widest font-medium">Contenido del contrato</h3>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-white/50 text-xs uppercase tracking-widest font-medium">Descripción</label>
            <AiEnhanceButton text={watch("description")} language="es" context="contract description"
              onEnhanced={(v) => setValue("description", v)} />
          </div>
          <textarea {...register("description")} rows={3}
            placeholder="Objeto del contrato..."
            className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white/80 text-sm placeholder-white/20 focus:outline-none focus:border-[#1AA7F0]/40 resize-none transition-all" />
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-white/50 text-xs uppercase tracking-widest font-medium">Responsabilidades de la empresa</label>
            <AiEnhanceButton text={watch("responsibilities")} language="es" context="company responsibilities in contract"
              onEnhanced={(v) => setValue("responsibilities", v)} />
          </div>
          <textarea {...register("responsibilities")} rows={4}
            placeholder="Entregables, plazos, garantías que la empresa proveerá..."
            className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white/80 text-sm placeholder-white/20 focus:outline-none focus:border-[#1AA7F0]/40 resize-none transition-all" />
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-white/50 text-xs uppercase tracking-widest font-medium">Términos y condiciones</label>
            <AiEnhanceButton text={watch("terms")} language="es" context="contract terms and conditions"
              onEnhanced={(v) => setValue("terms", v)} />
          </div>
          <textarea {...register("terms")} rows={4}
            placeholder="Condiciones generales, pagos, penalidades..."
            className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white/80 text-sm placeholder-white/20 focus:outline-none focus:border-[#1AA7F0]/40 resize-none transition-all" />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={() => router.back()} className="px-4 py-2.5 text-white/50 hover:text-white/80 text-sm transition-colors">Cancelar</button>
        <button type="submit" disabled={saving}
          className="px-6 py-2.5 bg-[#1AA7F0] hover:bg-[#0E87C8] disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-all">
          {saving ? "Guardando..." : mode === "edit" ? "Guardar cambios" : "Crear contrato"}
        </button>
      </div>
    </form>
  );
}
