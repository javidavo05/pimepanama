"use client";

import { useState, useTransition } from "react";
import { markDocumentPaidAction } from "@/app/(empresa)/empresa/actions";

interface MarkPaidButtonProps {
  documentId: string;
}

export function MarkPaidButton({ documentId }: MarkPaidButtonProps) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  function handleClick() {
    startTransition(async () => {
      await markDocumentPaidAction(documentId);
      setDone(true);
    });
  }

  if (done) {
    return (
      <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-500/15 border border-green-500/30 text-green-400 text-sm font-medium">
        ✓ Marcada como cobrada
      </span>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/25 text-green-400 text-sm font-medium hover:bg-green-500/15 disabled:opacity-50 transition-all"
    >
      {pending ? "Procesando..." : "✓ Marcar como cobrada"}
    </button>
  );
}
