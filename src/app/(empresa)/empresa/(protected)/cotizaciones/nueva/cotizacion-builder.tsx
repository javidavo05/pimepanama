"use client";

import { useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createDocumentAction, updateDocumentAction, createClientAction } from "@/app/(empresa)/empresa/actions";
import { LanguageToggle } from "@/components/empresa/document-builder/language-toggle";
import { LineItemsEditor, type DocumentFormValues } from "@/components/empresa/document-builder/line-items-editor";
import { AiEnhanceButton } from "@/components/empresa/document-builder/ai-enhance-button";
import { ClientCombobox } from "@/components/empresa/client-combobox";
import { PaymentSelector } from "@/components/empresa/payment-selector";
import type { Client, Document as PrismaDocument, PaymentMethod } from "@prisma/client";

interface CotizacionBuilderProps {
  taxRateDefault: number;
  currency: string;
  clients: Client[];
  paymentMethods: PaymentMethod[];
  mode?: "create" | "edit";
  initialDocument?: PrismaDocument;
}

const STATUS_OPTS = [
  { value: "DRAFT",    label: "Borrador",  labelEn: "Draft",    color: "border-white/[0.07] text-white/50" },
  { value: "SENT",     label: "Enviada",   labelEn: "Sent",     color: "border-blue-500/30 text-blue-400" },
  { value: "ACCEPTED", label: "Aceptada",  labelEn: "Accepted", color: "border-green-500/30 text-green-400" },
  { value: "REJECTED", label: "Rechazada", labelEn: "Rejected", color: "border-red-500/30 text-red-400" },
];

function getInitialValues(doc?: PrismaDocument, currency = "USD", taxRate = 7): Partial<DocumentFormValues> {
  if (!doc) {
    return {
      language: "es", currency,
      issueDate: new Date().toISOString().split("T")[0],
      quoteStatus: "DRAFT", paymentMethodId: "", clientId: "", saveAsNewClient: false,
      lineItems: [{ description: "", quantity: 1, unitPrice: 0, taxPercent: taxRate, discount: 0 }],
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
    validUntil: doc.validUntil ? new Date(doc.validUntil).toISOString().split("T")[0] : "",
    notes: (content?.notes as string) ?? "",
    terms: (content?.terms as string) ?? "",
    quoteStatus: (doc.status as "DRAFT" | "ACCEPTED" | "REJECTED" | "SENT") ?? "DRAFT",
    paymentMethodId: doc.paymentMethodId ?? "",
    saveAsNewClient: false,
    lineItems: (content?.lineItems as DocumentFormValues["lineItems"]) ?? [
      { description: "", quantity: 1, unitPrice: 0, taxPercent: taxRate, discount: 0 },
    ],
  };
}

export function CotizacionBuilder({
  taxRateDefault, currency, clients, paymentMethods, mode = "create", initialDocument,
}: CotizacionBuilderProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const { register, control, setValue, handleSubmit, watch } = useForm<DocumentFormValues>({
    defaultValues: getInitialValues(initialDocument, currency, taxRateDefault) as DocumentFormValues,
  });

  const language = useWatch({ control, name: "language" });
  const quoteStatus = useWatch({ control, name: "quoteStatus" });
  const paymentMethodId = useWatch({ control, name: "paymentMethodId" });
  const notes = watch("notes");
  const terms = watch("terms");
  const lineItems = watch("lineItems") ?? [];
  const isEs = language === "es";

  const grossTotal = lineItems.reduce((acc, item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    const disc = Number(item.discount) || 0;
    const tax = Number(item.taxPercent) || 0;
    const base = qty * price * (1 - disc / 100);
    return acc + base * (1 + tax / 100);
  }, 0);

  function handleClientSelect(client: Client | null) {
    if (!client) return;
    setValue("clientId", client.id);
    setValue("clientName", client.name);
    setValue("clientEmail", client.email ?? "");
    setValue("clientCompany", client.company ?? "");
    setValue("clientAddress", client.address ?? "");
    setValue("clientRuc", client.ruc ?? "");
    setValue("clientPhone", client.phone ?? "");
  }

  async function onSubmit(data: DocumentFormValues) {
    setSaving(true);
    try {
      const lineItemsData = data.lineItems ?? [];
      const subtotal = lineItemsData.reduce((acc, item) => {
        const qty = Number(item.quantity) || 0;
        const price = Number(item.unitPrice) || 0;
        const disc = Number(item.discount) || 0;
        return acc + qty * price * (1 - disc / 100);
      }, 0);
      const taxAmount = lineItemsData.reduce((acc, item) => {
        const qty = Number(item.quantity) || 0;
        const price = Number(item.unitPrice) || 0;
        const disc = Number(item.discount) || 0;
        const tax = Number(item.taxPercent) || 0;
        const base = qty * price * (1 - disc / 100);
        return acc + base * (tax / 100);
      }, 0);
      const total = subtotal + taxAmount;

      // Commission calculation
      let commissionAmt: number | undefined;
      let netAmount: number | undefined;
      if (data.paymentMethodId) {
        const pm = paymentMethods.find((m) => m.id === data.paymentMethodId);
        if (pm) {
          const { calcCommission } = await import("@/lib/commission");
          const result = calcCommission(total, Number(pm.commissionPct), Number(pm.commissionFlat), Number(pm.commissionTax));
          commissionAmt = result.totalCommission;
          netAmount = result.netAmount;
        }
      }

      // Auto-create new client if requested
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
        type: "COTIZACION" as const,
        title: data.clientName || `Cotización ${new Date().toLocaleDateString()}`,
        language: data.language,
        clientName: data.clientName,
        clientEmail: data.clientEmail,
        clientCompany: data.clientCompany,
        clientAddress: data.clientAddress,
        clientRuc: data.clientRuc,
        clientId,
        content: { lineItems: data.lineItems, notes: data.notes, terms: data.terms, currency: data.currency },
        issueDate: new Date(data.issueDate),
        validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
        subtotal,
        taxAmount,
        total,
        commissionAmt,
        netAmount,
        currency: data.currency,
        status: (data.quoteStatus ?? "DRAFT") as "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED",
        paymentMethodId: data.paymentMethodId || undefined,
      };

      if (mode === "edit" && initialDocument) {
        await updateDocumentAction(initialDocument.id, payload);
        router.push(`/empresa/cotizaciones/${initialDocument.id}`);
      } else {
        const doc = await createDocumentAction(payload);
        router.push(`/empresa/cotizaciones/${doc.id}`);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-semibold tracking-tight">
            {mode === "edit"
              ? (isEs ? "Editar Cotización" : "Edit Quote")
              : (isEs ? "Nueva Cotización" : "New Quote")}
          </h1>
          {mode === "edit" && initialDocument?.number && (
            <p className="text-white/40 text-sm mt-1 font-mono">{initialDocument.number}</p>
          )}
        </div>
        <LanguageToggle value={language} onChange={(l) => setValue("language", l)} />
      </div>

      {/* Status selector */}
      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5">
        <h3 className="text-white/60 text-xs uppercase tracking-widest font-medium mb-4">
          {isEs ? "Estado de la cotización" : "Quote status"}
        </h3>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setValue("quoteStatus", opt.value as DocumentFormValues["quoteStatus"])}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                quoteStatus === opt.value
                  ? `${opt.color} bg-white/[0.04]`
                  : "border-white/[0.05] text-white/30 hover:text-white/60"
              }`}
            >
              {isEs ? opt.label : opt.labelEn}
            </button>
          ))}
        </div>
      </div>

      {/* Client picker */}
      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5">
        <h3 className="text-white/60 text-xs uppercase tracking-widest font-medium mb-4">
          {isEs ? "Cliente" : "Client"}
        </h3>
        <div className="mb-4">
          <ClientCombobox
            clients={clients}
            onSelect={handleClientSelect}
            initialName={initialDocument?.clientName ?? ""}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { name: "clientName", label: isEs ? "Nombre completo" : "Full name", placeholder: "Juan Pérez" },
            { name: "clientCompany", label: isEs ? "Empresa" : "Company", placeholder: "Empresa S.A." },
            { name: "clientRuc", label: "RUC / Cédula", placeholder: "8-123-456" },
            { name: "clientEmail", label: isEs ? "Correo electrónico" : "Email", placeholder: "cliente@empresa.com", type: "email" },
            { name: "clientPhone", label: isEs ? "Teléfono" : "Phone", placeholder: "+507 6000-0000" },
          ].map(({ name, label, placeholder, type }) => (
            <div key={name}>
              <label className="block text-white/50 text-xs uppercase tracking-widest mb-1.5">{label}</label>
              <input
                {...register(name as keyof DocumentFormValues)}
                type={type ?? "text"}
                placeholder={placeholder}
                className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#1AA7F0]/40 transition-all"
              />
            </div>
          ))}
          <div className="col-span-2">
            <label className="block text-white/50 text-xs uppercase tracking-widest mb-1.5">{isEs ? "Dirección" : "Address"}</label>
            <input
              {...register("clientAddress")}
              placeholder="Calle 50, Ciudad de Panamá"
              className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#1AA7F0]/40 transition-all"
            />
          </div>
          <div className="col-span-2 flex items-center gap-3 pt-1">
            <input
              {...register("saveAsNewClient")}
              type="checkbox"
              id="saveAsNewClient"
              className="rounded border-white/20 bg-white/[0.03] accent-[#1AA7F0]"
            />
            <label htmlFor="saveAsNewClient" className="text-white/50 text-sm">
              {isEs ? "Guardar como nuevo cliente en el historial" : "Save as new client in history"}
            </label>
          </div>
        </div>
      </div>

      {/* Dates */}
      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5">
        <h3 className="text-white/60 text-xs uppercase tracking-widest font-medium mb-4">
          {isEs ? "Vigencia" : "Validity"}
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-white/50 text-xs uppercase tracking-widest mb-1.5">{isEs ? "Fecha de emisión" : "Issue date"}</label>
            <input {...register("issueDate")} type="date" className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#1AA7F0]/40 transition-all" />
          </div>
          <div>
            <label className="block text-white/50 text-xs uppercase tracking-widest mb-1.5">{isEs ? "Válida hasta" : "Valid until"}</label>
            <input {...register("validUntil")} type="date" className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#1AA7F0]/40 transition-all" />
          </div>
        </div>
      </div>

      {/* Line items */}
      <LineItemsEditor control={control} register={register} setValue={setValue} language={language} taxRateDefault={taxRateDefault} />

      {/* Notes + Terms */}
      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-white/60 text-xs uppercase tracking-widest font-medium">
              {isEs ? "Alcance del proyecto" : "Project scope"}
            </label>
            <AiEnhanceButton text={notes ?? ""} language={language} context="project scope for a corporate proposal" onEnhanced={(t) => setValue("notes", t)} />
          </div>
          <textarea {...register("notes")} rows={3} placeholder={isEs ? "Describe el alcance del proyecto..." : "Describe project scope..."} className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white/80 text-sm placeholder-white/20 focus:outline-none focus:border-[#1AA7F0]/40 resize-none transition-all" />
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-white/60 text-xs uppercase tracking-widest font-medium">
              {isEs ? "Términos y condiciones" : "Terms and conditions"}
            </label>
            <AiEnhanceButton text={terms ?? ""} language={language} context="terms and conditions for a corporate quote" onEnhanced={(t) => setValue("terms", t)} />
          </div>
          <textarea {...register("terms")} rows={3} placeholder={isEs ? "Condiciones generales, garantías..." : "General conditions, warranties..."} className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white/80 text-sm placeholder-white/20 focus:outline-none focus:border-[#1AA7F0]/40 resize-none transition-all" />
        </div>
      </div>

      {/* Payment method (shown when Accepted or Paid) */}
      {(quoteStatus === "ACCEPTED" || quoteStatus === "PAID") && paymentMethods.length > 0 && (
        <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5">
          <h3 className="text-white/60 text-xs uppercase tracking-widest font-medium mb-4">
            {isEs ? "Método de pago recibido" : "Payment method received"}
          </h3>
          <PaymentSelector
            methods={paymentMethods}
            selectedId={paymentMethodId ?? ""}
            grossAmount={grossTotal}
            onChange={(id) => setValue("paymentMethodId", id)}
            lang={language}
          />
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={() => router.back()} className="px-4 py-2.5 text-white/50 hover:text-white/80 text-sm transition-colors">
          {isEs ? "Cancelar" : "Cancel"}
        </button>
        <button type="submit" disabled={saving} className="px-6 py-2.5 bg-[#1AA7F0] hover:bg-[#0E87C8] disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-all">
          {saving
            ? (isEs ? "Guardando..." : "Saving...")
            : mode === "edit"
              ? (isEs ? "Guardar cambios" : "Save changes")
              : (isEs ? "Crear cotización" : "Create quote")}
        </button>
      </div>
    </form>
  );
}
