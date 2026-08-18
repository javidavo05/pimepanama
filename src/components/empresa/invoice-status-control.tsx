"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateDocumentAction } from "@/app/(empresa)/empresa/actions";
import type { DocumentStatus } from "@prisma/client";

/**
 * Selector de estado de la factura.
 *
 * PAID y PARTIALLY_PAID no se ofrecen como opción: se derivan de registrar un
 * cobro. Tener dos caminos para "pagada" era justo lo que confundía —
 * uno movía el dinero y el otro no.
 */
const FLOW: { value: DocumentStatus; label: string; hint: string; dot: string }[] = [
  { value: "DRAFT", label: "Borrador", hint: "Todavía no se envía al cliente", dot: "bg-white/40" },
  { value: "SENT", label: "Enviada", hint: "Entregada, esperando respuesta", dot: "bg-blue-400" },
  { value: "ACCEPTED", label: "Aceptada", hint: "El cliente la aprobó", dot: "bg-green-400" },
];

const CLOSING: { value: DocumentStatus; label: string; hint: string; dot: string }[] = [
  { value: "REJECTED", label: "Rechazada", hint: "El cliente no la aceptó", dot: "bg-red-400" },
  { value: "CANCELLED", label: "Cancelada", hint: "Anulada, sale de Por Cobrar", dot: "bg-white/30" },
];

const LABELS: Record<DocumentStatus, string> = {
  DRAFT: "Borrador",
  SENT: "Enviada",
  ACCEPTED: "Aceptada",
  PAID: "Pagada",
  PARTIALLY_PAID: "Pago parcial",
  REJECTED: "Rechazada",
  CANCELLED: "Cancelada",
};

const CHIP: Record<DocumentStatus, string> = {
  DRAFT: "text-white/60 bg-white/[0.05] border-white/[0.12]",
  SENT: "text-blue-400 bg-blue-500/10 border-blue-500/25",
  ACCEPTED: "text-green-400 bg-green-500/10 border-green-500/25",
  PAID: "text-[#C8A96E] bg-[#C8A96E]/10 border-[#C8A96E]/25",
  PARTIALLY_PAID: "text-amber-400 bg-amber-500/10 border-amber-500/25",
  REJECTED: "text-red-400 bg-red-500/10 border-red-500/25",
  CANCELLED: "text-white/50 bg-white/[0.03] border-white/[0.08]",
};

interface InvoiceStatusControlProps {
  documentId: string;
  currentStatus: DocumentStatus;
}

export function InvoiceStatusControl({ documentId, currentStatus }: InvoiceStatusControlProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const wrapRef = useRef<HTMLDivElement>(null);

  const isPaidState = currentStatus === "PAID" || currentStatus === "PARTIALLY_PAID";

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  function apply(status: DocumentStatus) {
    if (status === currentStatus) {
      setOpen(false);
      return;
    }
    if (isPaidState) {
      const ok = window.confirm(
        "Esta factura tiene un cobro registrado. Al cambiar el estado se borrará el monto cobrado. ¿Continuar?"
      );
      if (!ok) return;
    }
    startTransition(async () => {
      await updateDocumentAction(documentId, { status });
      setOpen(false);
      router.refresh();
    });
  }

  function renderOption(opt: { value: DocumentStatus; label: string; hint: string; dot: string }) {
    const active = opt.value === currentStatus;
    return (
      <button
        key={opt.value}
        type="button"
        onClick={() => apply(opt.value)}
        disabled={pending}
        className={`w-full flex items-start gap-2.5 px-3 py-2 rounded-lg text-left transition-colors disabled:opacity-50 ${
          active ? "bg-white/[0.06]" : "hover:bg-white/[0.04]"
        }`}
      >
        <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${opt.dot}`} />
        <span className="min-w-0">
          <span className="block text-white/85 text-sm">{opt.label}</span>
          <span className="block text-white/45 text-[11px] leading-snug">{opt.hint}</span>
        </span>
        {active && <span className="text-[#1AA7F0] text-xs ml-auto shrink-0">✓</span>}
      </button>
    );
  }

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all disabled:opacity-50 hover:brightness-125 ${CHIP[currentStatus]}`}
      >
        {pending ? "Guardando…" : LABELS[currentStatus]}
        <span className="opacity-60 text-[9px]">▼</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-72 z-40 bg-[#0d0d18] border border-white/[0.1] rounded-xl shadow-2xl p-2 space-y-0.5"
        >
          <p className="px-3 pt-1 pb-1.5 text-white/40 text-[10px] uppercase tracking-widest">
            Flujo de la factura
          </p>
          {FLOW.map(renderOption)}

          <div className="border-t border-white/[0.06] my-1.5" />
          <p className="px-3 pb-1.5 text-white/40 text-[10px] uppercase tracking-widest">Cerrar</p>
          {CLOSING.map(renderOption)}

          <div className="border-t border-white/[0.06] mt-1.5 pt-2 px-3 pb-1">
            <p className="text-white/45 text-[11px] leading-snug">
              {isPaidState
                ? `Estado actual: ${LABELS[currentStatus]}. Se fijó al registrar el cobro.`
                : "«Pagada» y «Pago parcial» se activan solas al registrar un cobro."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
