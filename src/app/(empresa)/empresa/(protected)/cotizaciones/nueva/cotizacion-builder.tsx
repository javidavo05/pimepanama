"use client";

import { useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createDocumentAction } from "@/app/(empresa)/empresa/actions";
import { ClientSelector } from "@/components/empresa/document-builder/client-selector";
import { LanguageToggle } from "@/components/empresa/document-builder/language-toggle";
import { LineItemsEditor, type DocumentFormValues } from "@/components/empresa/document-builder/line-items-editor";
import { AiEnhanceButton } from "@/components/empresa/document-builder/ai-enhance-button";

interface CotizacionBuilderProps {
  taxRateDefault: number;
  currency: string;
}

export function CotizacionBuilder({ taxRateDefault, currency }: CotizacionBuilderProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const { register, control, setValue, handleSubmit, watch } =
    useForm<DocumentFormValues>({
      defaultValues: {
        language: "es",
        currency,
        issueDate: new Date().toISOString().split("T")[0],
        lineItems: [
          { description: "", quantity: 1, unitPrice: 0, taxPercent: taxRateDefault, discount: 0 },
        ],
      },
    });

  const language = useWatch({ control, name: "language" });
  const notes = watch("notes");
  const terms = watch("terms");

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

      const doc = await createDocumentAction({
        type: "COTIZACION",
        title: data.clientName || `Cotización ${new Date().toLocaleDateString()}`,
        language: data.language,
        clientName: data.clientName,
        clientEmail: data.clientEmail,
        clientCompany: data.clientCompany,
        clientAddress: data.clientAddress,
        clientRuc: data.clientRuc,
        content: {
          lineItems: data.lineItems,
          notes: data.notes,
          terms: data.terms,
          currency: data.currency,
        },
        issueDate: new Date(data.issueDate),
        validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
        subtotal,
        taxAmount,
        total: subtotal + taxAmount,
        currency: data.currency,
      });

      router.push(`/empresa/cotizaciones/${doc.id}`);
    } finally {
      setSaving(false);
    }
  }

  const isEs = language === "es";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-semibold tracking-tight">
            {isEs ? "Nueva Cotización" : "New Quote"}
          </h1>
          <p className="text-white/40 text-sm mt-1">
            {isEs ? "Propuesta comercial profesional" : "Professional commercial proposal"}
          </p>
        </div>
        <LanguageToggle value={language} onChange={(l) => setValue("language", l)} />
      </div>

      <ClientSelector register={register} lang={language} />

      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5">
        <h3 className="text-white/60 text-xs uppercase tracking-widest font-medium mb-4">
          {isEs ? "Vigencia de la propuesta" : "Proposal validity"}
        </h3>
        <div className="grid grid-cols-2 gap-4">
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
              {isEs ? "Válida hasta" : "Valid until"}
            </label>
            <input
              {...register("validUntil")}
              type="date"
              className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#C8A96E]/40 transition-all"
            />
          </div>
        </div>
      </div>

      <LineItemsEditor
        control={control}
        register={register}
        setValue={setValue}
        language={language}
        taxRateDefault={taxRateDefault}
      />

      {/* Notes */}
      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-white/60 text-xs uppercase tracking-widest font-medium">
              {isEs ? "Alcance del proyecto" : "Project scope"}
            </label>
            <AiEnhanceButton
              text={notes ?? ""}
              language={language}
              context="project scope description for a corporate proposal"
              onEnhanced={(t) => setValue("notes", t)}
            />
          </div>
          <textarea
            {...register("notes")}
            rows={3}
            placeholder={isEs ? "Describe el alcance del proyecto..." : "Describe the project scope..."}
            className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white/80 text-sm placeholder-white/20 focus:outline-none focus:border-[#C8A96E]/40 resize-none transition-all"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-white/60 text-xs uppercase tracking-widest font-medium">
              {isEs ? "Términos y condiciones" : "Terms and conditions"}
            </label>
            <AiEnhanceButton
              text={terms ?? ""}
              language={language}
              context="professional terms and conditions for a corporate quote"
              onEnhanced={(t) => setValue("terms", t)}
            />
          </div>
          <textarea
            {...register("terms")}
            rows={3}
            placeholder={isEs ? "Condiciones generales, garantías..." : "General conditions, warranties..."}
            className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white/80 text-sm placeholder-white/20 focus:outline-none focus:border-[#C8A96E]/40 resize-none transition-all"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={() => router.back()} className="px-4 py-2.5 text-white/50 hover:text-white/80 text-sm transition-colors">
          {isEs ? "Cancelar" : "Cancel"}
        </button>
        <button type="submit" disabled={saving} className="px-6 py-2.5 bg-[#C8A96E] hover:bg-[#d4b87a] disabled:opacity-50 text-[#030611] text-sm font-semibold rounded-lg transition-all">
          {saving ? (isEs ? "Guardando..." : "Saving...") : (isEs ? "Crear cotización" : "Create quote")}
        </button>
      </div>
    </form>
  );
}
