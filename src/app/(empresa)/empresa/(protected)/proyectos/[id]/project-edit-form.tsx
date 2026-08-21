"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Client, ProjectStatus } from "@prisma/client";
import {
  updateProjectAction,
  setProjectClientsAction,
  deleteProjectAction,
} from "@/app/(empresa)/empresa/actions";
import { ClientCombobox } from "@/components/empresa/client-combobox";
import { FinancingPlanner } from "@/components/empresa/financing-planner";
import { AiEnhanceButton } from "@/components/empresa/document-builder/ai-enhance-button";
import { validatePlan, type FinancingPlan } from "@/lib/financing";
import {
  INPUT_CLASS,
  LABEL_CLASS,
  toDateInput,
  type Project,
  type ProjectClientRef,
} from "./types";

const STATUS_OPTS: { value: ProjectStatus; label: string; color: string }[] = [
  { value: "ACTIVE", label: "Activo", color: "border-green-500/30 text-green-400" },
  { value: "PAUSED", label: "Pausado", color: "border-amber-500/30 text-amber-400" },
  { value: "COMPLETED", label: "Completado", color: "border-blue-500/30 text-blue-400" },
  { value: "CANCELLED", label: "Cancelado", color: "border-white/[0.1] text-white/55" },
];

const EMPTY_PLAN: FinancingPlan = {
  total: 0,
  downPayment: 0,
  installments: 6,
  frequency: "MONTHLY",
  firstDueDate: "",
};

interface ProjectEditFormProps {
  project: Project;
  allClients: Client[];
  onClose: () => void;
}

export function ProjectEditForm({ project, allClients, onClose }: ProjectEditFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(project.name);
  const [status, setStatus] = useState<ProjectStatus>(project.status as ProjectStatus);
  const [startDate, setStartDate] = useState(toDateInput(project.startDate));
  const [endDate, setEndDate] = useState(toDateInput(project.endDate));
  const [totalBudget, setTotalBudget] = useState(
    project.totalBudget != null ? String(project.totalBudget) : ""
  );
  const [description, setDescription] = useState(project.description ?? "");
  const [scope, setScope] = useState(project.scope ?? "");
  const [clients, setClients] = useState<ProjectClientRef[]>(project.clients);
  const [clientQuery, setClientQuery] = useState("");

  const [financingEnabled, setFinancingEnabled] = useState(project.financingPlan != null);
  const [financing, setFinancing] = useState<FinancingPlan>(project.financingPlan ?? EMPTY_PLAN);

  const budgetNumber = totalBudget.trim() === "" ? null : Number(totalBudget);
  const plan: FinancingPlan = {
    ...financing,
    total: financing.total || budgetNumber || 0,
    firstDueDate: financing.firstDueDate || startDate || "",
  };

  async function handleSave() {
    setError(null);
    if (!name.trim()) {
      setError("El proyecto necesita un nombre.");
      return;
    }
    if (clients.length === 0) {
      setError("Elige al menos un cliente: el proyecto tiene que pertenecer a alguien.");
      return;
    }
    if (budgetNumber != null && Number.isNaN(budgetNumber)) {
      setError("El presupuesto no es un número válido.");
      return;
    }
    if (financingEnabled) {
      const planError = validatePlan(plan);
      if (planError) {
        setError(planError);
        return;
      }
    }

    setSaving(true);
    try {
      await updateProjectAction(project.id, {
        name: name.trim(),
        status,
        description: description.trim() || null,
        scope: scope.trim() || null,
        startDate: startDate || null,
        endDate: endDate || null,
        totalBudget: budgetNumber,
        financingPlan: financingEnabled ? plan : null,
      });

      const before = project.clients.map((c) => c.id).join(",");
      const after = clients.map((c) => c.id).join(",");
      if (before !== after) {
        await setProjectClientsAction(project.id, clients.map((c) => c.id));
      }

      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el proyecto");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await deleteProjectAction(project.id);
      router.push("/empresa/proyectos");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar el proyecto");
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-5 mb-6">
      <div className="bg-[#0a0a10] border border-[#1AA7F0]/20 rounded-xl p-5 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-white/60 text-xs uppercase tracking-widest font-medium">
            Editar proyecto
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-white/40 hover:text-white/70 text-sm transition-colors"
          >
            ✕
          </button>
        </div>

        <div>
          <label className={LABEL_CLASS}>
            Nombre <span className="text-red-400">*</span>
          </label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={INPUT_CLASS} />
        </div>

        <div>
          <span className={LABEL_CLASS}>Estado</span>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatus(opt.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                  status === opt.value
                    ? `${opt.color} bg-white/[0.04]`
                    : "border-white/[0.05] text-white/55 hover:text-white/60"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={LABEL_CLASS}>
            Clientes <span className="text-red-400">*</span>
          </label>
          {clients.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {clients.map((c, i) => (
                <span
                  key={c.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1AA7F0]/10 border border-[#1AA7F0]/25 text-[#1AA7F0] text-xs"
                >
                  {c.name}
                  {i === 0 && (
                    <span className="text-[9px] text-white/45 uppercase tracking-widest">principal</span>
                  )}
                  <button
                    type="button"
                    onClick={() => setClients((list) => list.filter((x) => x.id !== c.id))}
                    className="text-white/40 hover:text-red-400 ml-0.5"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <ClientCombobox
            clients={allClients.filter((c) => !clients.some((s) => s.id === c.id))}
            value={clientQuery}
            onChange={setClientQuery}
            onSelect={(c) => {
              setClients((list) =>
                list.some((x) => x.id === c.id)
                  ? list
                  : [...list, { id: c.id, name: c.name, company: c.company }]
              );
              setClientQuery("");
            }}
            onNewClient={() => {}}
            selectedClientId={clients[0]?.id}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={LABEL_CLASS}>Fecha inicio</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={INPUT_CLASS} />
          </div>
          <div>
            <label className={LABEL_CLASS}>Fecha fin estimada</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={INPUT_CLASS} />
          </div>
          <div>
            <label className={LABEL_CLASS}>Presupuesto (USD)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={totalBudget}
              onChange={(e) => setTotalBudget(e.target.value)}
              placeholder="0.00"
              className={`${INPUT_CLASS} font-mono`}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-white/50 text-xs uppercase tracking-widest font-medium">Descripción</label>
            <AiEnhanceButton text={description} onEnhanced={setDescription} language="es" context="project description" />
          </div>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="¿En qué consiste el proyecto?"
            className={`${INPUT_CLASS} resize-none text-white/80`}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-white/50 text-xs uppercase tracking-widest font-medium">Alcance</label>
            <AiEnhanceButton text={scope} onEnhanced={setScope} language="es" context="project scope" />
          </div>
          <textarea
            rows={4}
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            placeholder="Entregables, fases, exclusiones..."
            className={`${INPUT_CLASS} resize-none text-white/80`}
          />
        </div>
      </div>

      <FinancingPlanner
        plan={plan}
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

      <div className="flex items-center justify-between gap-3">
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-white/60 text-xs">¿Eliminar el proyecto y todo lo que cuelga de él?</span>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/20 disabled:opacity-40 transition-all"
            >
              {deleting ? "Eliminando..." : "Sí, eliminar"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="text-white/50 hover:text-white/80 text-xs transition-colors"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="text-red-400/60 hover:text-red-400 text-xs transition-colors"
          >
            Eliminar proyecto
          </button>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-white/50 hover:text-white/80 text-sm transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-[#1AA7F0] hover:bg-[#0E87C8] disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-all"
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}
