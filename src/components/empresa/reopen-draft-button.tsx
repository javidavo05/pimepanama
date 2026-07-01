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
      className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-50 text-white/50 hover:text-white/80 text-sm font-medium rounded-lg border border-white/[0.07] hover:border-white/[0.15] transition-all"
    >
      {pending ? "..." : "✎ Reabrir borrador"}
    </button>
  );
}
