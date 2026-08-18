"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateDocumentAction } from "@/app/(empresa)/empresa/actions";
import type { DocumentStatus } from "@prisma/client";

const STATUSES: DocumentStatus[] = [
  "DRAFT",
  "SENT",
  "ACCEPTED",
  "PAID",
  "PARTIALLY_PAID",
  "REJECTED",
  "CANCELLED",
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

interface DocumentStatusPickerProps {
  documentId: string;
  currentStatus: DocumentStatus;
  /** Si true, no permite cambiar estado (ej. factura pagada). */
  locked?: boolean;
}

export function DocumentStatusPicker({
  documentId,
  currentStatus,
  locked = false,
}: DocumentStatusPickerProps) {
  const router = useRouter();
  const [saving, setSaving] = useState<DocumentStatus | null>(null);

  if (locked) {
    return (
      <p className="text-white/55 text-xs">
        Factura pagada: el estado y los montos están bloqueados. Puede asociar
        un cliente en la sección de abajo.
      </p>
    );
  }

  async function handleChange(status: DocumentStatus) {
    if (status === currentStatus) return;
    setSaving(status);
    try {
      await updateDocumentAction(documentId, { status });
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo actualizar el estado");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {STATUSES.map((s) => (
        <button
          key={s}
          type="button"
          disabled={saving !== null}
          onClick={() => void handleChange(s)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all disabled:opacity-50 ${
            currentStatus === s
              ? "bg-[#C8A96E]/10 border-[#C8A96E]/30 text-[#C8A96E]"
              : "border-white/[0.07] text-white/60 hover:text-white/70 hover:border-white/20"
          }`}
        >
          {saving === s ? "..." : LABELS[s]}
        </button>
      ))}
    </div>
  );
}
