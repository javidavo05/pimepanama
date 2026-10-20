"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Client, ProjectStatus } from "@prisma/client";
import {
  updateProjectAction,
  setProjectClientsAction,
  deleteProjectAction,
} from "@/app/(empresa)/empresa/actions";
import { ClientCombobox } from "@/components/empresa/client-combobox";
import { ActionRow, btn } from "@/components/empresa/page-header";
import { FinancingPlanner } from "@/components/empresa/financing-planner";
import { AiEnhanceButton } from "@/components/empresa/document-builder/ai-enhance-button";
import { planPorDefecto, validatePlan, type FinancingPlan } from "@/lib/financing";
import { guardarMantenimientoAction } from "@/lib/crm/mantenimiento-acciones";
import {
  INPUT_CLASS,
  LABEL_CLASS,
  TEXTAREA_CLASS,
  toDateInput,
  type Project,
  type ProjectClientRef,
} from "./types";

const STATUS_OPTS: { value: ProjectStatus; label: string; color: string }[] = [
  { value: "ACTIVE", label: "Activo", color: "border-ok/30 text-ok" },
  { value: "PAUSED", label: "Pausado", color: "border-warn/30 text-warn" },
  { value: "COMPLETED", label: "Completado", color: "border-info/30 text-info" },
  { value: "CANCELLED", label: "Cancelado", color: "border-line-mid text-fg-dim" },
];

/** Sin plan todavía: arranca en el 50/50 de siempre. */
const EMPTY_PLAN: FinancingPlan = planPorDefecto();

export type EditSection = "form" | "financing";

/** Campos del mantenimiento mensual que trae el proyecto serializado (page.tsx los pasa con el resto). */
type ConMantenimiento = Project & { mantenimientoActivo?: boolean; mantenimientoMonto?: number | null; mantenimientoDia?: number };

interface ProjectEditFormProps {
  project: Project;
  allClients: Client[];
  /** Desde dónde se abrió, para llevar la vista a esa parte del formulario. */
  focusSection?: EditSection;
  onClose: () => void;
}

export function ProjectEditForm({
  project,
  allClients,
  focusSection = "form",
  onClose,
}: ProjectEditFormProps) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const financingRef = useRef<HTMLDivElement>(null);
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

  const mant = project as ConMantenimiento;
  const [mantActivo, setMantActivo] = useState(Boolean(mant.mantenimientoActivo));
  const [mantMonto, setMantMonto] = useState(mant.mantenimientoMonto != null ? String(mant.mantenimientoMonto) : "");
  const [mantDia, setMantDia] = useState(String(mant.mantenimientoDia ?? 1));

  // El formulario se abre arriba del todo; si se pidió desde un atajo de la
  // barra lateral hay que llevar la vista, o parece que el botón no hizo nada.
  useEffect(() => {
    const target = focusSection === "financing" ? financingRef.current : rootRef.current;
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [focusSection]);

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
    const montoMant = mantMonto.trim() === "" ? null : Number(mantMonto);
    const diaMant = Number(mantDia);
    if (mantActivo && !(montoMant != null && montoMant > 0)) {
      setError("Escribe el monto mensual del mantenimiento o apágalo.");
      return;
    }
    if (!Number.isInteger(diaMant) || diaMant < 1 || diaMant > 28) {
      setError("El día del mes del mantenimiento va del 1 al 28.");
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

      const mantCambio =
        mantActivo !== Boolean(mant.mantenimientoActivo) ||
        (montoMant ?? null) !== (mant.mantenimientoMonto ?? null) ||
        diaMant !== (mant.mantenimientoDia ?? 1);
      if (mantCambio) {
        const r = await guardarMantenimientoAction(project.id, { activo: mantActivo, monto: montoMant, dia: diaMant });
        if (r.error) throw new Error(r.error);
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
    <div ref={rootRef} className="space-y-5 mb-6 scroll-mt-6">
      <div className="bg-panel border border-brand/20 rounded-xl p-5 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-fg-dim text-xs uppercase tracking-widest font-medium">
            Editar proyecto
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar edición"
            className="inline-flex items-center justify-center w-11 h-11 sm:w-8 sm:h-8 -mr-2 sm:mr-0 text-fg-ghost hover:text-fg-mute text-sm transition-colors"
          >
            ✕
          </button>
        </div>

        <div>
          <label className={LABEL_CLASS}>
            Nombre <span className="text-danger">*</span>
          </label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={INPUT_CLASS} />
        </div>

        <div>
          <span className={LABEL_CLASS}>Estado</span>
          {/* En el celular, cuadrícula de dos columnas iguales en vez de chips
              que se parten en filas disparejas. */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {STATUS_OPTS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatus(opt.value)}
                className={`min-h-11 sm:min-h-8 min-w-0 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                  status === opt.value
                    ? `${opt.color} bg-fill`
                    : "border-line text-fg-dim hover:text-fg-dim"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={LABEL_CLASS}>
            Clientes <span className="text-danger">*</span>
          </label>
          {clients.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {clients.map((c, i) => (
                <span
                  key={c.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand/10 border border-brand/25 text-brand-fg text-xs"
                >
                  {c.name}
                  {i === 0 && (
                    <span className="text-[9px] text-fg-faint uppercase tracking-widest">principal</span>
                  )}
                  <button
                    type="button"
                    onClick={() => setClients((list) => list.filter((x) => x.id !== c.id))}
                    aria-label={`Quitar ${c.name}`}
                    className="inline-flex items-center justify-center w-11 h-11 -my-3 -mr-3 sm:w-auto sm:h-auto sm:m-0 sm:ml-0.5 text-fg-ghost hover:text-danger"
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
            <label className="text-fg-faint text-xs uppercase tracking-widest font-medium">Descripción</label>
            <AiEnhanceButton text={description} onEnhanced={setDescription} language="es" context="project description" />
          </div>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="¿En qué consiste el proyecto?"
            className={TEXTAREA_CLASS}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-fg-faint text-xs uppercase tracking-widest font-medium">Alcance</label>
            <AiEnhanceButton text={scope} onEnhanced={setScope} language="es" context="project scope" />
          </div>
          <textarea
            rows={4}
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            placeholder="Entregables, fases, exclusiones..."
            className={TEXTAREA_CLASS}
          />
        </div>
      </div>

      <div className="bg-panel border border-line rounded-xl p-5 space-y-4">
        <label className="flex items-start justify-between gap-4 cursor-pointer">
          <span className="min-w-0">
            <span className="block text-fg text-sm font-semibold">Mantenimiento mensual</span>
            <span className="block text-fg-dim text-xs mt-1">
              La factura se arma sola en borrador ese día; tú la revisas y la envías.
            </span>
          </span>
          <span className="relative inline-flex items-center min-h-11 shrink-0">
            <input type="checkbox" checked={mantActivo} onChange={(e) => setMantActivo(e.target.checked)} className="peer sr-only" />
            <span aria-hidden className="w-12 h-7 rounded-full bg-fill-2 border border-line-mid peer-checked:bg-brand peer-checked:border-brand peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40 transition-colors" />
            <span aria-hidden className="absolute left-1 w-5 h-5 rounded-full bg-panel shadow transition-transform peer-checked:translate-x-5" />
          </span>
        </label>
        {mantActivo && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="min-w-0">
              <label className={LABEL_CLASS}>Monto al mes (USD)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={mantMonto}
                onChange={(e) => setMantMonto(e.target.value)}
                placeholder="0.00"
                className={`${INPUT_CLASS} font-mono`}
              />
              <p className="text-fg-faint text-xs mt-1">Antes de impuestos; el ITBMS se suma como en las demás facturas.</p>
            </div>
            <div className="min-w-0">
              <label className={LABEL_CLASS}>Día del mes</label>
              <select value={mantDia} onChange={(e) => setMantDia(e.target.value)} className={INPUT_CLASS}>
                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    Día {d}
                  </option>
                ))}
              </select>
              <p className="text-fg-faint text-xs mt-1">Hasta el 28, para que exista en todos los meses.</p>
            </div>
          </div>
        )}
      </div>

      <div ref={financingRef} className="scroll-mt-6">
        <FinancingPlanner
          plan={plan}
          onChange={setFinancing}
          enabled={financingEnabled}
          onToggle={setFinancingEnabled}
          hint="Abono inicial más cuotas mensuales o quincenales. Al facturar el proyecto, cada cuota se crea sola en Cuentas por Cobrar."
        />
      </div>

      {error && (
        <div className="bg-danger/[0.07] border border-danger/25 rounded-xl px-4 py-3">
          <p className="text-danger text-sm">{error}</p>
        </div>
      )}

      {/* En el celular: Guardar/Cancelar arriba en columnas iguales y el
          borrado debajo, lejos del dedo; desde tablet, una sola fila. */}
      <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        {confirmDelete ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-fg-dim text-xs">¿Eliminar el proyecto y todo lo que cuelga de él?</span>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="min-h-11 sm:min-h-8 px-3 py-1.5 rounded-lg bg-danger/15 border border-danger/30 text-danger text-xs font-medium hover:bg-danger/20 disabled:opacity-40 transition-all"
            >
              {deleting ? "Eliminando..." : "Sí, eliminar"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="min-h-11 sm:min-h-8 px-2 text-fg-faint hover:text-fg-soft text-xs transition-colors"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="self-start min-h-11 sm:min-h-8 text-danger hover:text-danger text-xs transition-colors"
          >
            Eliminar proyecto
          </button>
        )}

        <ActionRow>
          <button type="button" onClick={onClose} className={btn.secondary}>
            Cancelar
          </button>
          <button type="button" onClick={handleSave} disabled={saving} className={btn.primary}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </ActionRow>
      </div>
    </div>
  );
}
