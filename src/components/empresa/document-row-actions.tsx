"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteDocumentAction } from "@/app/(empresa)/empresa/actions";
import { tile } from "@/components/empresa/page-header";

interface DocumentRowActionsProps {
  documentId: string;
  editHref: string;
  editLabel?: string;
  showDelete?: boolean;
  deleteRedirect?: string;
  documentLabel?: string;
  /** "tiles": botones del mismo ancho para las tarjetas del celular; el padre pone la fila. */
  layout?: "links" | "tiles";
}

export function DocumentRowActions({
  documentId,
  editHref,
  editLabel = "Editar",
  showDelete = false,
  deleteRedirect = "/empresa",
  documentLabel = "este documento",
  layout = "links",
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

  if (layout === "tiles") {
    return (
      <>
        <Link href={editHref} className={tile.neutral}>
          {editLabel}
        </Link>
        <Link href={`/api/empresa/documents/${documentId}/pdf`} target="_blank" className={tile.accent}>
          PDF
        </Link>
        {showDelete && (
          <button type="button" onClick={handleDelete} disabled={deleting} className={tile.danger}>
            {deleting ? "Eliminando…" : "Eliminar"}
          </button>
        )}
      </>
    );
  }

  return (
    <div className="flex items-center justify-end gap-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
      <Link
        href={editHref}
        className="text-fg-dim hover:text-fg-soft text-xs transition-colors"
      >
        {editLabel}
      </Link>
      <Link
        href={`/api/empresa/documents/${documentId}/pdf`}
        target="_blank"
        className="text-sand-fg hover:text-sand-lt text-xs font-medium transition-colors"
      >
        PDF
      </Link>
      {showDelete && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="text-danger hover:text-danger disabled:opacity-40 text-xs transition-colors"
        >
          {deleting ? "..." : "Eliminar"}
        </button>
      )}
    </div>
  );
}
