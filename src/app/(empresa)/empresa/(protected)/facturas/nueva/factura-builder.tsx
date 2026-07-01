"use client";

import { useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useState, useMemo, useEffect } from "react";
import { createDocumentAction, updateDocumentAction, createClientAction, createPaymentSchedulesAction } from "@/app/(empresa)/empresa/actions";
import { ClientSelector } from "@/components/empresa/document-builder/client-selector";
import { LanguageToggle } from "@/components/empresa/document-builder/language-toggle";
import { LineItemsEditor, type DocumentFormValues } from "@/components/empresa/document-builder/line-items-editor";
import { AiEnhanceButton } from "@/components/empresa/document-builder/ai-enhance-button";
import { PaymentSelector } from "@/components/empresa/payment-selector";
import type { Client } from "@prisma/client";
import type { SerializedPaymentMethod, SerializedProject, SerializedContract, SerializedDocument } from "@/lib/serializers";

function getInitialValues(
  doc?: SerializedDocument,
  currency = "USD",
  taxRate = 7
): Partial<DocumentFormValues> {
  if (!doc) {
    return {
      language: "es",
      currency,
      clientId: "",
      clientName: "",
      saveAsNewClient: false,
      paymentMethodId: "",
      issueDate: new Date().toISOString().split("T")[0],
      lineItems: [
        {
          description: "",
          quantity: 1,
          unitPrice: 0,
          taxPercent: taxRate,
          discount: 0,
        },
      ],
    };
  }

  const content = doc.content as Record<string, unknown>;
  return {
    language: (doc.language as "es" | "en") ?? "es",
    currency: doc.currency,
    clientId: doc.clientId ?? "",
    clientName: doc.clientName ?? "",
    clientEmail: doc.clientEmail ?? "",
    clientCompany: doc.clientCompany ?? "",
    clientAddress: doc.clientAddress ?? "",
    clientRuc: doc.clientRuc ?? "",
    issueDate: new Date(doc.issueDate).toISOString().split("T")[0],
    dueDate: doc.dueDate ? new Date(doc.dueDate).toISOString().split("T")[0] : "",
    notes: (content?.notes as string) ?? "",
    paymentMethodId: doc.paymentMethodId ?? "",
    saveAsNewClient: false,
    lineItems:
      (content?.lineItems as DocumentFormValues["lineItems"]) ?? [
        {
          description: "",
          quantity: 1,
          unitPrice: 0,
          taxPercent: taxRate,
          discount: 0,
        },
      ],
  };
}

interface FacturaBuilderProps {
  taxRateDefault: number;
  currency: string;
  clients: Client[];
  paymentMethods: SerializedPaymentMethod[];
  projects?: SerializedProject[];
  contracts?: SerializedContract[];
  mode?: "create" | "edit";
  initialDocument?: SerializedDocument;
}

export function FacturaBuilder({
  taxRateDefault,
  currency,
  clients,
  paymentMethods,
  projects = [],
  contracts = [],
  mode = "create",
  initialDocument,
}: FacturaBuilderProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [isPartialPayment, setIsPartialPayment] = useState(false);
  const [remainingDueDate, setRemainingDueDate] = useState("");

  const { register, control, setValue, handleSubmit, watch } =
    useForm<DocumentFormValues>({
      defaultValues: getInitialValues(
        initialDocument,
        currency,
        taxRateDefault
      ) as DocumentFormValues,
    });

  const language = useWatch({ control, name: "language" });
  const paymentMethodId = useWatch({ control, name: "paymentMethodId" });
  const projectId = useWatch({ control, name: "projectId" });
  const contractId = useWatch({ control, name: "contractId" });
  const watchedClientId = useWatch({ control, name: "clientId" });
  const notes = watch("notes");
  const lineItems = watch("lineItems") ?? [];

  const filteredProjects = useMemo(
    () => watchedClientId ? projects.filter((p) => p.clientId === watchedClientId) : projects,
    [projects, watchedClientId]
  );

  // Reset project/contract when the client changes and the selected project no longer belongs to the new client
  useEffect(() => {
    if (!projectId) return;
    const currentProject = projects.find((p) => p.id === projectId);
    if (currentProject && watchedClientId && currentProject.clientId !== watchedClientId) {
      setValue("projectId", "");
      setValue("contractId", "");
      setIsPartialPayment(false);
    }
  }, [watchedClientId]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedProject = useMemo(() => projects.find((p) => p.id === projectId) ?? null, [projects, projectId]);
  const filteredContracts = useMemo(
    () => contracts.filter((c) => !projectId || c.projectId === projectId),
    [contracts, projectId]
  );
  const activeContract = useMemo(
    () => filteredContracts.find((c) => c.id === contractId) ?? filteredContracts.find((c) => c.status === "ACTIVE") ?? null,
    [filteredContracts, contractId]
  );

  const grossTotal = lineItems.reduce((acc, item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    const disc = Number(item.discount) || 0;
    const tax = Number(item.taxPercent) || 0;
    const base = qty * price * (1 - disc / 100);
    return acc + base * (1 + tax / 100);
  }, 0);

  async function onSubmit(data: DocumentFormValues) {
    setSaving(true);
    try {
      const lineItems = data.lineItems ?? [];
      const subtotal = lineItems.reduce((acc, item) => {
        const qty = Number(item.quantity) || 0;
        const price = Number(item.unitPrice) || 0;
        const disc = Number(item.discount) || 0;
        return acc + qty * price * (1 - disc / 100);
      }, 0);
      const taxAmount = lineItems.reduce((acc, item) => {
        const qty = Number(item.quantity) || 0;
        const price = Number(item.unitPrice) || 0;
        const disc = Number(item.discount) || 0;
        const tax = Number(item.taxPercent) || 0;
        const base = qty * price * (1 - disc / 100);
        return acc + base * (tax / 100);
      }, 0);

      const total = subtotal + taxAmount;

      let commissionAmt: number | undefined;
      let netAmount: number | undefined;
      if (data.paymentMethodId) {
        const pm = paymentMethods.find((m) => m.id === data.paymentMethodId);
        if (pm) {
          const { calcCommission } = await import("@/lib/commission");
          const result = calcCommission(
            total,
            Number(pm.commissionPct),
            Number(pm.commissionFlat),
            Number(pm.commissionTax)
          );
          commissionAmt = result.totalCommission;
          netAmount = result.netAmount;
        }
      }

      let clientId = data.clientId || undefined;
      if (!clientId && data.saveAsNewClient && data.clientName?.trim()) {
        const newClient = await createClientAction({
          name: data.clientName,
          company: data.clientCompany || undefined,
          ruc: data.clientRuc || undefined,
          email: data.clientEmail || undefined,
          phone: data.clientPhone || undefined,
          address: data.clientAddress || undefined,
        });
        clientId = newClient.id;
      }

      const payload = {
        title: data.clientName || initialDocument?.title || `Factura ${new Date().toLocaleDateString()}`,
        language: data.language,
        clientId,
        clientName: data.clientName,
        clientEmail: data.clientEmail,
        clientCompany: data.clientCompany,
        clientAddress: data.clientAddress,
        clientRuc: data.clientRuc,
        content: {
          lineItems: data.lineItems,
          notes: data.notes,
          currency: data.currency,
        },
        issueDate: new Date(data.issueDate),
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        subtotal,
        taxAmount,
        total,
        commissionAmt,
        netAmount,
        currency: data.currency,
        paymentMethodId: data.paymentMethodId || undefined,
        projectId: data.projectId || undefined,
        contractId: data.contractId || undefined,
      };

      if (mode === "edit" && initialDocument) {
        await updateDocumentAction(initialDocument.id, payload);
        router.push(`/empresa/facturas/${initialDocument.id}`);
        router.refresh();
      } else {
        const doc = await createDocumentAction({ type: "FACTURA", ...payload });

        // Si es pago parcial, crear cuota por el monto restante
        if (isPartialPayment && selectedProject?.totalBudget != null) {
          const remaining = Number(selectedProject.totalBudget) - total;
          if (remaining > 0) {
            const dueDateStr = remainingDueDate || new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
            await createPaymentSchedulesAction(doc.id, [{
              description: `Saldo restante — ${selectedProject.name}`,
              amount: remaining,
              dueDate: dueDateStr,
            }]);
          }
        }

        router.push(`/empresa/facturas/${doc.id}`);
      }
    } finally {
      setSaving(false);
    }
  }

  const isEs = language === "es";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-semibold tracking-tight">
            {mode === "edit"
              ? isEs
                ? "Editar Factura"
                : "Edit Invoice"
              : isEs
                ? "Nueva Factura"
                : "New Invoice"}
          </h1>
          <p className="text-white/40 text-sm mt-1">
            {mode === "edit" && initialDocument?.number ? (
              <span className="font-mono">{initialDocument.number}</span>
            ) : isEs ? (
              "Complete los datos para generar la factura"
            ) : (
              "Fill in the details to generate the invoice"
            )}
          </p>
        </div>
        <LanguageToggle value={language} onChange={(l) => setValue("language", l)} />
      </div>

      {/* Client */}
      <ClientSelector register={register} setValue={setValue} watch={watch} clients={clients} lang={language} />

      {/* Proyecto y Contrato */}
      {projects.length > 0 && (filteredProjects.length > 0 || !watchedClientId) && (
        <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5 space-y-4">
          <h3 className="text-white/60 text-xs uppercase tracking-widest font-medium">
            {isEs ? "Proyecto y contrato" : "Project & contract"}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white/50 text-xs uppercase tracking-widest font-medium mb-1.5">
                {isEs ? "Proyecto" : "Project"}
              </label>
              <select
                {...register("projectId")}
                onChange={(e) => { setValue("projectId", e.target.value); setValue("contractId", ""); setIsPartialPayment(false); }}
                className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#1AA7F0]/40 transition-all"
              >
                <option value="">{isEs ? "Sin proyecto" : "No project"}</option>
                {filteredProjects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}{p.totalBudget != null ? ` — $${p.totalBudget.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : ""}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-white/50 text-xs uppercase tracking-widest font-medium mb-1.5">
                {isEs ? "Contrato" : "Contract"}
              </label>
              <select
                {...register("contractId")}
                className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#1AA7F0]/40 transition-all"
              >
                <option value="">{isEs ? "Sin contrato" : "No contract"}</option>
                {filteredContracts.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}{c.value != null ? ` — $${Number(c.value).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : ""}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Active contract banner */}
          {activeContract?.responsibilities && (
            <div className="bg-[#C8A96E]/[0.05] border border-[#C8A96E]/20 rounded-lg p-4">
              <p className="text-[#C8A96E] text-[10px] uppercase tracking-widest font-medium mb-1.5">
                {isEs ? "Responsabilidades del contrato" : "Contract responsibilities"}
              </p>
              <p className="text-white/60 text-xs leading-relaxed whitespace-pre-line line-clamp-4">
                {activeContract.responsibilities}
              </p>
            </div>
          )}

          {/* Partial payment section */}
          {selectedProject?.totalBudget != null && (
            <div className="border-t border-white/[0.05] pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/50 text-xs uppercase tracking-widest font-medium">
                    {isEs ? "Presupuesto del proyecto" : "Project budget"}
                  </p>
                  <p className="text-[#C8A96E] font-mono text-base font-semibold mt-0.5">
                    ${selectedProject.totalBudget.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-white/50 text-xs uppercase tracking-widest font-medium">
                    {isEs ? "Esta factura" : "This invoice"}
                  </p>
                  <p className="text-white/70 font-mono text-base mt-0.5">
                    ${grossTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                {grossTotal < selectedProject.totalBudget && (
                  <div className="text-right">
                    <p className="text-white/50 text-xs uppercase tracking-widest font-medium">
                      {isEs ? "Restante" : "Remaining"}
                    </p>
                    <p className="text-amber-400 font-mono text-base font-semibold mt-0.5">
                      ${(selectedProject.totalBudget - grossTotal).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
              </div>

              {grossTotal < selectedProject.totalBudget && (
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPartialPayment}
                    onChange={(e) => setIsPartialPayment(e.target.checked)}
                    className="w-4 h-4 rounded border border-white/20 bg-white/[0.04] accent-[#1AA7F0]"
                  />
                  <span className="text-white/60 text-sm">
                    {isEs ? "Pago parcial — crear cuota pendiente por el saldo restante" : "Partial payment — create pending installment for remaining balance"}
                  </span>
                </label>
              )}

              {isPartialPayment && grossTotal < selectedProject.totalBudget && (
                <div className="bg-amber-500/[0.06] border border-amber-500/20 rounded-lg p-4 space-y-3">
                  <p className="text-amber-400 text-xs">
                    {isEs
                      ? `Se creará una cuota de $${(selectedProject.totalBudget - grossTotal).toLocaleString("en-US", { minimumFractionDigits: 2 })} en "Por Cobrar" al guardar.`
                      : `A $${(selectedProject.totalBudget - grossTotal).toLocaleString("en-US", { minimumFractionDigits: 2 })} installment will be created in "Receivables" on save.`}
                  </p>
                  <div>
                    <label className="block text-white/50 text-xs uppercase tracking-widest font-medium mb-1.5">
                      {isEs ? "Fecha de vencimiento del saldo" : "Balance due date"}
                    </label>
                    <input
                      type="date"
                      value={remainingDueDate}
                      onChange={(e) => setRemainingDueDate(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-400/40 transition-all"
                    />
                  </div>
                </div>
              )}

              {grossTotal >= selectedProject.totalBudget && (
                <div className="flex items-center gap-2 text-green-400 text-xs">
                  <span>✓</span>
                  <span>{isEs ? "Esta factura cubre el 100% del presupuesto del proyecto." : "This invoice covers 100% of the project budget."}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Dates + currency */}
      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5">
        <h3 className="text-white/60 text-xs uppercase tracking-widest font-medium mb-4">
          {isEs ? "Detalles del documento" : "Document details"}
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-white/50 text-xs uppercase tracking-widest mb-1.5">
              {isEs ? "Fecha de emisión" : "Issue date"}
            </label>
            <input
              {...register("issueDate")}
              type="date"
              className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#C8A96E]/40 transition-all"
            />
          </div>
          <div>
            <label className="block text-white/50 text-xs uppercase tracking-widest mb-1.5">
              {isEs ? "Fecha de vencimiento" : "Due date"}
            </label>
            <input
              {...register("dueDate")}
              type="date"
              className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#C8A96E]/40 transition-all"
            />
          </div>
          <div>
            <label className="block text-white/50 text-xs uppercase tracking-widest mb-1.5">
              {isEs ? "Moneda" : "Currency"}
            </label>
            <select
              {...register("currency")}
              className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#C8A96E]/40 transition-all"
            >
              <option value="USD">USD — Dólar</option>
              <option value="PAB">PAB — Balboa</option>
              <option value="EUR">EUR — Euro</option>
            </select>
          </div>
        </div>
      </div>

      {/* Line items */}
      <LineItemsEditor
        control={control}
        register={register}
        setValue={setValue}
        language={language}
        taxRateDefault={taxRateDefault}
      />

      {paymentMethods.length > 0 && (
        <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5">
          <h3 className="text-white/60 text-xs uppercase tracking-widest font-medium mb-4">
            {isEs ? "Método de pago" : "Payment method"}
          </h3>
          <p className="text-white/30 text-xs mb-4">
            {isEs
              ? "Seleccione cómo se recibió el pago para calcular comisión y neto recibido."
              : "Select how payment was received to calculate commission and net amount."}
          </p>
          <PaymentSelector
            methods={paymentMethods}
            selectedId={paymentMethodId ?? ""}
            grossAmount={grossTotal}
            onChange={(id) => setValue("paymentMethodId", id)}
            lang={language}
          />
        </div>
      )}

      {/* Notes */}
      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <label className="text-white/60 text-xs uppercase tracking-widest font-medium">
            {isEs ? "Notas / términos de pago" : "Notes / payment terms"}
          </label>
          <AiEnhanceButton
            text={notes ?? ""}
            language={language}
            context="payment terms and notes for a corporate invoice"
            onEnhanced={(t) => setValue("notes", t)}
          />
        </div>
        <textarea
          {...register("notes")}
          rows={3}
          placeholder={isEs ? "Condiciones de pago, instrucciones bancarias..." : "Payment conditions, bank details..."}
          className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white/80 text-sm placeholder-white/20 focus:outline-none focus:border-[#C8A96E]/40 resize-none transition-all"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2.5 text-white/50 hover:text-white/80 text-sm transition-colors"
        >
          {isEs ? "Cancelar" : "Cancel"}
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 bg-[#C8A96E] hover:bg-[#d4b87a] disabled:opacity-50 text-[#030611] text-sm font-semibold rounded-lg transition-all"
        >
          {saving
            ? isEs
              ? "Guardando..."
              : "Saving..."
            : mode === "edit"
              ? isEs
                ? "Guardar cambios"
                : "Save changes"
              : isEs
                ? "Crear factura"
                : "Create invoice"}
        </button>
      </div>
    </form>
  );
}
