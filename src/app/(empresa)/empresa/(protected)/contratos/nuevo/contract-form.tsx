"use client";

import { useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createContractAction, updateContractAction, updateDocumentAction } from "@/app/(empresa)/empresa/actions";
import { ClientCombobox } from "@/components/empresa/client-combobox";
import { AiEnhanceButton } from "@/components/empresa/document-builder/ai-enhance-button";
import { DesignSystemHtmlEditor } from "@/components/empresa/design-system/html-document-editor";
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
  initial?: SerializedContract & {
    htmlContent?: string | null;
    client?: { id: string; name: string } | null;
    project?: { id: string; name: string } | null;
  };
  defaultProjectId?: string;
  defaultClientId?: string;
  linkDocumentId?: string;
  returnTo?: string;
  signingManaged?: boolean;
}

const STATUS_OPTS = [
  { value: "DRAFT", label: "Borrador", color: "border-line text-fg-faint" },
  { value: "ACTIVE", label: "Activo", color: "border-green-500/30 text-ok" },
  { value: "EXPIRED", label: "Vencido", color: "border-line-mid text-fg-dim" },
  { value: "TERMINATED", label: "Terminado", color: "border-red-500/30 text-danger" },
];

export function ContractForm({ clients, projects, mode = "create", initial, defaultProjectId, defaultClientId, linkDocumentId, returnTo, signingManaged }: ContractFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [htmlContent, setHtmlContent] = useState(initial?.htmlContent ?? "");
  const [htmlBootstrapping, setHtmlBootstrapping] = useState(false);
  const [showLegacyFields, setShowLegacyFields] = useState(false);

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
  const allValues = useWatch({ control });

  const bootstrapPayload = {
    title: allValues.title,
    description: allValues.description,
    responsibilities: allValues.responsibilities,
    terms: allValues.terms,
    startsAt: allValues.startsAt,
    endsAt: allValues.endsAt,
    value: allValues.value,
    clientId: allValues.clientId || undefined,
    clientName: allValues.clientName,
    projectId: allValues.projectId || undefined,
  };

  const bootstrapHtml = useCallback(async () => {
    setHtmlBootstrapping(true);
    try {
      const res = await fetch("/api/empresa/contracts/preview/html", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bootstrapPayload),
      });
      if (!res.ok) throw new Error("No se pudo generar la plantilla");
      const data = (await res.json()) as { htmlContent: string };
      setHtmlContent(data.htmlContent);
    } finally {
      setHtmlBootstrapping(false);
    }
  }, [bootstrapPayload]);

  useEffect(() => {
    if (!htmlContent && allValues.title?.trim()) {
      void bootstrapHtml();
    }
    // Only bootstrap once on mount when empty
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        htmlContent: htmlContent || undefined,
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
        if (linkDocumentId) {
          await updateDocumentAction(linkDocumentId, { contractId: contract.id });
        }
        router.push(returnTo ?? `/empresa/contratos/${contract.id}`);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-fg text-2xl font-semibold tracking-tight">
          {mode === "edit" ? "Editar contrato" : "Nuevo contrato"}
        </h1>
      </div>

      <div className="bg-panel border border-line rounded-xl p-5">
        <h3 className="text-fg-dim text-xs uppercase tracking-widest font-medium mb-4">Estado</h3>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTS.map((opt) => (
            <button key={opt.value} type="button"
              onClick={() => setValue("status", opt.value as ContractFormValues["status"])}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${status === opt.value ? opt.color + " bg-fill" : "border-line text-fg-dim hover:text-fg-dim"}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-panel border border-line rounded-xl p-5 space-y-4">
        <h3 className="text-fg-dim text-xs uppercase tracking-widest font-medium">Información</h3>
        <div>
          <label className="block text-fg-faint text-xs uppercase tracking-widest font-medium mb-1.5">
            Título del contrato <span className="text-danger">*</span>
          </label>
          <input {...register("title", { required: true })}
            placeholder="Ej. Propuesta Academyx REGULAR"
            className="w-full bg-fill border border-line rounded-lg px-3 py-2.5 text-fg text-sm placeholder-fg-trace focus:outline-none focus:border-azure/40 transition-all" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-fg-faint text-xs uppercase tracking-widest font-medium mb-1.5">Cliente</label>
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
            <label className="block text-fg-faint text-xs uppercase tracking-widest font-medium mb-1.5">Proyecto</label>
            <select {...register("projectId")} aria-label="Proyecto"
              className="w-full bg-fill border border-line rounded-lg px-3 py-2.5 text-fg text-sm focus:outline-none focus:border-azure/40 transition-all">
              <option value="">Sin proyecto</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-fg-faint text-xs uppercase tracking-widest font-medium mb-1.5">Valor (USD)</label>
            <input {...register("value")} type="number" min="0" step="0.01" placeholder="0.00"
              className="w-full bg-fill border border-line rounded-lg px-3 py-2.5 text-fg text-sm placeholder-fg-trace focus:outline-none focus:border-azure/40 transition-all" />
          </div>
          <div>
            <label className="block text-fg-faint text-xs uppercase tracking-widest font-medium mb-1.5">Fecha firma</label>
            {signingManaged ? (
              <p className="text-fg-faint text-sm py-2.5">Gestionada por PimeSign al completar la firma.</p>
            ) : (
              <input {...register("signedAt")} type="date"
                className="w-full bg-fill border border-line rounded-lg px-3 py-2.5 text-fg text-sm focus:outline-none focus:border-azure/40 transition-all" />
            )}
          </div>
          <div>
            <label className="block text-fg-faint text-xs uppercase tracking-widest font-medium mb-1.5">Vigencia inicio</label>
            <input {...register("startsAt")} type="date"
              className="w-full bg-fill border border-line rounded-lg px-3 py-2.5 text-fg text-sm focus:outline-none focus:border-azure/40 transition-all" />
          </div>
        </div>

        <div>
          <label className="block text-fg-faint text-xs uppercase tracking-widest font-medium mb-1.5">Vigencia fin</label>
          <input {...register("endsAt")} type="date"
            className="w-full bg-fill border border-line rounded-lg px-3 py-2.5 text-fg text-sm focus:outline-none focus:border-azure/40 transition-all" />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-fg-dim text-xs uppercase tracking-widest font-medium">Documento visual (plantilla Pime)</h3>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={htmlBootstrapping}
            onClick={() => void bootstrapHtml()}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-line text-fg-faint hover:text-fg-mute disabled:opacity-50 transition-colors"
          >
            {htmlBootstrapping ? "Generando…" : "Regenerar desde campos"}
          </button>
          <button
            type="button"
            onClick={() => setShowLegacyFields((v) => !v)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-line text-fg-faint hover:text-fg-mute transition-colors"
          >
            {showLegacyFields ? "Ocultar campos texto" : "Campos de texto"}
          </button>
        </div>
      </div>

      {showLegacyFields && (
        <div className="bg-panel border border-line rounded-xl p-5 space-y-4">
          <p className="text-fg-ghost text-xs">Estos campos alimentan la plantilla al regenerar. El documento final se edita visualmente abajo.</p>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-fg-faint text-xs uppercase tracking-widest font-medium">Descripción</label>
              <AiEnhanceButton text={watch("description")} language="es" context="contract description"
                onEnhanced={(v) => setValue("description", v)} />
            </div>
            <textarea {...register("description")} rows={3}
              className="w-full bg-fill border border-line rounded-lg px-3 py-2.5 text-fg-soft text-sm resize-none focus:outline-none focus:border-azure/40 transition-all" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-fg-faint text-xs uppercase tracking-widest font-medium">Responsabilidades</label>
              <AiEnhanceButton text={watch("responsibilities")} language="es" context="company responsibilities in contract"
                onEnhanced={(v) => setValue("responsibilities", v)} />
            </div>
            <textarea {...register("responsibilities")} rows={3}
              className="w-full bg-fill border border-line rounded-lg px-3 py-2.5 text-fg-soft text-sm resize-none focus:outline-none focus:border-azure/40 transition-all" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-fg-faint text-xs uppercase tracking-widest font-medium">Términos</label>
              <AiEnhanceButton text={watch("terms")} language="es" context="contract terms and conditions"
                onEnhanced={(v) => setValue("terms", v)} />
            </div>
            <textarea {...register("terms")} rows={3}
              className="w-full bg-fill border border-line rounded-lg px-3 py-2.5 text-fg-soft text-sm resize-none focus:outline-none focus:border-azure/40 transition-all" />
          </div>
        </div>
      )}

      {htmlContent ? (
        <DesignSystemHtmlEditor value={htmlContent} onChange={setHtmlContent} />
      ) : (
        <div className="bg-panel border border-line rounded-xl p-8 text-center text-fg-faint text-sm">
          {htmlBootstrapping ? "Generando plantilla del design-system…" : "Completa el título y espera la plantilla, o pulsa Regenerar."}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={() => router.back()} className="px-4 py-2.5 text-fg-faint hover:text-fg-soft text-sm transition-colors">Cancelar</button>
        <button type="submit" disabled={saving}
          className="px-6 py-2.5 bg-azure hover:bg-brand-hi disabled:opacity-50 text-on-brand text-sm font-semibold rounded-lg transition-all">
          {saving ? "Guardando..." : mode === "edit" ? "Guardar cambios" : "Crear contrato"}
        </button>
      </div>
    </form>
  );
}
