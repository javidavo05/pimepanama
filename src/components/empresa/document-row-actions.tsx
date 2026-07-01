"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteDocumentAction } from "@/app/(empresa)/empresa/actions";

interface DocumentRowActionsProps {
  documentId: string;
  editHref: string;
  editLabel?: string;
  showDelete?: boolean;
  deleteRedirect?: string;
  documentLabel?: string;
}

export function DocumentRowActions({
  documentId,
  editHref,
  editLabel = "Editar",
  showDelete = false,
  deleteRedirect = "/empresa",
  documentLabel = "este documento",
}: DocumentRowActionsProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (
      !confirm(
        `¿Eliminar ${documentLabel}? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      await deleteDocumentAction(documentId);
      router.push(deleteRedirect);
      router.refresh();
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "No se pudo eliminar el documento"
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
      <Link
        href={editHref}
        className="text-white/40 hover:text-white/80 text-xs transition-colors"
      >
        {editLabel}
      </Link>
      <Link
        href={`/api/empresa/documents/${documentId}/pdf`}
        target="_blank"
        className="text-[#C8A96E] hover:text-[#d4b87a] text-xs font-medium transition-colors"
      >
        PDF
      </Link>
      {showDelete && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="text-red-400/50 hover:text-red-400 disabled:opacity-40 text-xs transition-colors"
        >
          {deleting ? "..." : "Eliminar"}
        </button>
      )}
    </div>
  );
}
