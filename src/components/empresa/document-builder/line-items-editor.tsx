"use client";

import { useFieldArray, useWatch, Control, UseFormRegister, UseFormSetValue } from "react-hook-form";
import { AiEnhanceButton } from "./ai-enhance-button";

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxPercent: number;
  discount: number;
}

export interface DocumentFormValues {
  title: string;
  language: "es" | "en";
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientCompany: string;
  clientAddress: string;
  clientRuc: string;
  clientPhone: string;
  currency: string;
  issueDate: string;
  dueDate: string;
  validUntil: string;
  notes: string;
  terms: string;
  quoteStatus: "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "PAID" | "CANCELLED";
  paymentMethodId: string;
  saveAsNewClient: boolean;
  lineItems: LineItem[];
  // bitacora fields
  attendees: string;
  pimeAttendees: string;
  meetingDate: string;
  project: string;
  rawNotes: string;
  agenda: string;
  decisions: string;
  actionItems: string;
  nextMeeting: string;
  // correo fields
  toEmail: string;
  ccEmail: string;
  subject: string;
  body: string;
  tone: string;
  // project/contract
  projectId: string;
  contractId: string;
  paymentSchedules: { description: string; amount: number; dueDate: string }[];
}

interface LineItemsEditorProps {
  control: Control<DocumentFormValues>;
  register: UseFormRegister<DocumentFormValues>;
  setValue: UseFormSetValue<DocumentFormValues>;
  language: "es" | "en";
  taxRateDefault?: number;
}

const LABELS = {
  es: {
    description: "Descripción",
    qty: "Cant.",
    price: "Precio unitario",
    tax: "ITBMS %",
    discount: "Descuento %",
    amount: "Total",
    add: "+ Agregar línea",
    subtotal: "Subtotal",
    totalTax: "ITBMS",
    total: "Total",
  },
  en: {
    description: "Description",
    qty: "Qty",
    price: "Unit price",
    tax: "Tax %",
    discount: "Discount %",
    amount: "Amount",
    add: "+ Add line",
    subtotal: "Subtotal",
    totalTax: "Tax",
    total: "Total",
  },
};

export function LineItemsEditor({
  control,
  register,
  setValue,
  language,
  taxRateDefault = 7,
}: LineItemsEditorProps) {
  const t = LABELS[language];
  const { fields, append, remove } = useFieldArray({
    control,
    name: "lineItems",
  });

  const lineItems = useWatch({ control, name: "lineItems" }) ?? [];

  function calcLineTotal(item: Partial<LineItem>) {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    const tax = Number(item.taxPercent) || 0;
    const disc = Number(item.discount) || 0;
    const base = qty * price * (1 - disc / 100);
    return base * (1 + tax / 100);
  }

  const subtotal = lineItems.reduce((acc, item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    const disc = Number(item.discount) || 0;
    return acc + qty * price * (1 - disc / 100);
  }, 0);

  const taxTotal = lineItems.reduce((acc, item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    const disc = Number(item.discount) || 0;
    const tax = Number(item.taxPercent) || 0;
    const base = qty * price * (1 - disc / 100);
    return acc + base * (tax / 100);
  }, 0);

  const grandTotal = subtotal + taxTotal;

  const fmt = (n: number) =>
    n.toLocaleString(language === "es" ? "es-PA" : "en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const numInputCls =
    "no-number-spinner bg-transparent border-b border-white/[0.07] pb-1 text-white/70 text-sm text-right focus:outline-none focus:border-[#C8A96E]/40 w-full transition-all";

  function blockArrowIncrement(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
    }
  }

  return (
    <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl overflow-hidden">
      {/* Table header */}
      <div className="grid grid-cols-[1fr_80px_120px_80px_80px_100px_32px] gap-2 px-4 py-3 border-b border-white/[0.06] bg-[#C8A96E]/5">
        {[t.description, t.qty, t.price, t.tax, t.discount, t.amount, ""].map(
          (h, i) => (
            <span
              key={i}
              className="text-[#a8895a] text-[10px] uppercase tracking-widest font-medium"
            >
              {h}
            </span>
          )
        )}
      </div>

      {/* Rows */}
      <div className="divide-y divide-white/[0.04]">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="grid grid-cols-[1fr_80px_120px_80px_80px_100px_32px] gap-2 px-4 py-3 items-start"
          >
            {/* Description + AI */}
            <div className="flex flex-col gap-1">
              <input
                {...register(`lineItems.${index}.description`)}
                placeholder={language === "es" ? "Descripción del servicio" : "Service description"}
                className="w-full bg-transparent border-b border-white/[0.07] pb-1 text-white/80 text-sm placeholder-white/20 focus:outline-none focus:border-[#C8A96E]/40 transition-all"
              />
              <AiEnhanceButton
                text={lineItems[index]?.description ?? ""}
                language={language}
                context="line item description for a corporate invoice or quote"
                onEnhanced={(text) =>
                  setValue(`lineItems.${index}.description`, text, {
                    shouldDirty: true,
                  })
                }
              />
            </div>

            {/* Quantity */}
            <input
              {...register(`lineItems.${index}.quantity`, { valueAsNumber: true })}
              type="number"
              min="0"
              step="0.01"
              defaultValue={1}
              onKeyDown={blockArrowIncrement}
              className={numInputCls}
            />

            {/* Unit price */}
            <input
              {...register(`lineItems.${index}.unitPrice`, { valueAsNumber: true })}
              type="number"
              min="0"
              step="0.01"
              defaultValue={0}
              onKeyDown={blockArrowIncrement}
              className={numInputCls}
            />

            {/* Tax */}
            <input
              {...register(`lineItems.${index}.taxPercent`, { valueAsNumber: true })}
              type="number"
              min="0"
              step="0.01"
              defaultValue={taxRateDefault}
              onKeyDown={blockArrowIncrement}
              className={numInputCls}
            />

            {/* Discount */}
            <input
              {...register(`lineItems.${index}.discount`, { valueAsNumber: true })}
              type="number"
              min="0"
              max="100"
              step="0.01"
              defaultValue={0}
              onKeyDown={blockArrowIncrement}
              className={numInputCls}
            />

            {/* Line total */}
            <span className="text-white/70 text-sm font-mono text-right pt-1">
              {fmt(calcLineTotal(lineItems[index] ?? {}))}
            </span>

            {/* Remove */}
            <button
              type="button"
              onClick={() => remove(index)}
              className="text-white/20 hover:text-red-400 transition-colors text-sm mt-1"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* Add row */}
      <div className="px-4 py-3 border-t border-white/[0.04]">
        <button
          type="button"
          onClick={() =>
            append({
              description: "",
              quantity: 1,
              unitPrice: 0,
              taxPercent: taxRateDefault,
              discount: 0,
            })
          }
          className="text-[#C8A96E]/70 hover:text-[#C8A96E] text-xs font-medium transition-colors"
        >
          {t.add}
        </button>
      </div>

      {/* Totals */}
      <div className="border-t border-white/[0.06] px-4 py-4 space-y-2">
        <div className="flex justify-end gap-8">
          <span className="text-white/40 text-sm">{t.subtotal}</span>
          <span className="text-white/70 font-mono text-sm w-28 text-right">
            {fmt(subtotal)}
          </span>
        </div>
        <div className="flex justify-end gap-8">
          <span className="text-white/40 text-sm">{t.totalTax}</span>
          <span className="text-white/70 font-mono text-sm w-28 text-right">
            {fmt(taxTotal)}
          </span>
        </div>
        <div className="flex justify-end gap-8 pt-2 border-t border-white/[0.06]">
          <span className="text-[#C8A96E] text-sm font-semibold">{t.total}</span>
          <span className="text-[#C8A96E] font-mono text-lg font-semibold w-28 text-right">
            {fmt(grandTotal)}
          </span>
        </div>
      </div>
    </div>
  );
}
