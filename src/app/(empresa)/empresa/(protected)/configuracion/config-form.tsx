"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  saveCompanyConfigFormAction,
  type CompanyConfigFormState,
} from "@/app/(empresa)/empresa/actions";
import type { CompanyConfig } from "@prisma/client";
import { LogoUploader } from "@/components/empresa/logo-uploader";

const initialState: CompanyConfigFormState = {};

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-white/50 text-xs uppercase tracking-widest font-medium mb-1.5">
        {label}
      </label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        step={type === "number" ? "0.01" : undefined}
        className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#C8A96E]/40 transition-all"
      />
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-6 py-2.5 bg-[#C8A96E] hover:bg-[#d4b87a] disabled:opacity-50 text-[#030611] text-sm font-semibold rounded-lg transition-all"
    >
      {pending ? "Guardando..." : "Guardar configuración"}
    </button>
  );
}

export function ConfigForm({ config }: { config: CompanyConfig | null }) {
  const [state, formAction] = useFormState(
    saveCompanyConfigFormAction,
    initialState
  );
  const [showSuccess, setShowSuccess] = useState(false);
  const [logoUrl, setLogoUrl] = useState(config?.logoUrl ?? "");

  useEffect(() => {
    if (!state.success) return;
    setShowSuccess(true);
    const timer = window.setTimeout(() => setShowSuccess(false), 5000);
    return () => window.clearTimeout(timer);
  }, [state.success]);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="logoUrl" value={logoUrl} />
      {showSuccess && (
        <div
          role="status"
          className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm"
        >
          <span aria-hidden>✓</span>
          Configuración guardada correctamente.
        </div>
      )}

      {state.error && (
        <div
          role="alert"
          className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
        >
          {state.error}
        </div>
      )}

      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl p-6">
        <h2 className="text-[#C8A96E] text-xs uppercase tracking-widest font-medium mb-5">
          Identidad corporativa
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Nombre de la empresa"
            name="name"
            defaultValue={config?.name}
            placeholder="Pime Panamá"
          />
          <Field
            label="Razón social / Nombre legal"
            name="legalName"
            defaultValue={config?.legalName}
          />
          <Field label="RUC" name="ruc" defaultValue={config?.ruc} placeholder="8-123-456 DV 9" />
          <Field label="País" name="country" defaultValue={config?.country ?? "Panamá"} />
          <Field
            label="Ciudad"
            name="city"
            defaultValue={config?.city}
            placeholder="Ciudad de Panamá"
          />
          <Field
            label="Dirección"
            name="address"
            defaultValue={config?.address}
            placeholder="Calle 50, Piso 3"
          />
          <Field
            label="Teléfono"
            name="phone"
            defaultValue={config?.phone}
            placeholder="+507 6000-0000"
          />
          <Field
            label="Correo"
            name="email"
            defaultValue={config?.email}
            type="email"
            placeholder="info@pimepanama.com"
          />
          <Field
            label="Sitio web"
            name="website"
            defaultValue={config?.website}
            placeholder="pimepanama.com"
          />
          <LogoUploader value={logoUrl} onChange={setLogoUrl} />
        </div>
      </div>

      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl p-6">
        <h2 className="text-[#C8A96E] text-xs uppercase tracking-widest font-medium mb-5">
          Configuración de documentos
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Prefijo de facturas"
            name="invoicePrefix"
            defaultValue={config?.invoicePrefix ?? "INV"}
          />
          <Field
            label="Prefijo de cotizaciones"
            name="quotePrefix"
            defaultValue={config?.quotePrefix ?? "COT"}
          />
          <Field label="Moneda por defecto" name="currency" defaultValue={config?.currency ?? "USD"} />
          <Field
            label="Días de crédito por defecto"
            name="paymentTermsDays"
            defaultValue={config?.paymentTermsDays ?? 30}
            type="number"
          />
          <Field
            label="Tasa de ITBMS (%)"
            name="taxRatePercent"
            defaultValue={Number(config?.taxRatePercent ?? 7)}
            type="number"
          />
        </div>
      </div>

      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl p-6">
        <h2 className="text-[#C8A96E] text-xs uppercase tracking-widest font-medium mb-5">
          Pie de página en documentos
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-white/50 text-xs uppercase tracking-widest font-medium mb-1.5">
              Pie de página (español)
            </label>
            <textarea
              name="footerNotes_es"
              defaultValue={config?.footerNotes_es ?? ""}
              rows={2}
              placeholder="Ej: Gracias por su confianza. Servicios sujetos a los términos y condiciones."
              className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white/80 text-sm placeholder-white/20 focus:outline-none focus:border-[#C8A96E]/40 resize-none transition-all"
            />
          </div>
          <div>
            <label className="block text-white/50 text-xs uppercase tracking-widest font-medium mb-1.5">
              Pie de página (inglés)
            </label>
            <textarea
              name="footerNotes_en"
              defaultValue={config?.footerNotes_en ?? ""}
              rows={2}
              placeholder="E.g.: Thank you for your trust. Services subject to terms and conditions."
              className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white/80 text-sm placeholder-white/20 focus:outline-none focus:border-[#C8A96E]/40 resize-none transition-all"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
