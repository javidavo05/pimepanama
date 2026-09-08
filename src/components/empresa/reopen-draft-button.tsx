"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateDocumentAction } from "@/app/(empresa)/empresa/actions";

interface ReopenDraftButtonProps {
  documentId: string;
}

export function ReopenDraftButton({ documentId }: ReopenDraftButtonProps) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      await updateDocumentAction(documentId, { status: "DRAFT" });
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      title="Reabrir como borrador para editar"
      className="inline-flex items-center gap-2 px-4 py-2.5 bg-fill hover:bg-fill-2 disabled:opacity-50 text-fg-faint hover:text-fg-soft text-sm font-medium rounded-lg border border-line hover:border-line-mid transition-all"
    >
      {pending ? "..." : "✎ Reabrir borrador"}
    </button>
  );
}
