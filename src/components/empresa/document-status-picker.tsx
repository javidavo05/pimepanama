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
      <p className="text-fg-dim text-xs">
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
              ? "bg-sand/10 border-sand/30 text-sand-fg"
              : "border-line text-fg-dim hover:text-fg-mute hover:border-line-loud"
          }`}
        >
          {saving === s ? "..." : LABELS[s]}
        </button>
      ))}
    </div>
  );
}
