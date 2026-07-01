"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { convertQuoteToInvoiceAction } from "@/app/(empresa)/empresa/actions";

interface ConvertToInvoiceButtonProps {
  quoteId: string;
  quoteStatus: string;
  linkedInvoiceId?: string;
  variant?: "row" | "banner";
}

export function ConvertToInvoiceButton({
  quoteId,
  quoteStatus,
  linkedInvoiceId,
  variant = "row",
}: ConvertToInvoiceButtonProps) {
  const router = useRouter();
  const [converting, setConverting] = useState(false);

  if (linkedInvoiceId) {
    const linkClass =
      variant === "banner"
        ? "px-4 py-2 bg-[#C8A96E] hover:bg-[#d4b87a] text-[#030611] text-sm font-semibold rounded-lg transition-all"
        : "text-[#C8A96E] hover:text-[#d4b87a] text-xs font-medium transition-colors";

    return (
      <Link href={`/empresa/facturas/${linkedInvoiceId}`} className={linkClass}>
        {variant === "banner" ? "Ver factura →" : "Factura"}
      </Link>
    );
  }

  if (quoteStatus !== "ACCEPTED") return null;

  async function handleConvert() {
    setConverting(true);
    try {
      const invoice = await convertQuoteToInvoiceAction(quoteId);
      router.push(`/empresa/facturas/${invoice.id}`);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "No se pudo crear la factura");
    } finally {
      setConverting(false);
    }
  }

  if (variant === "banner") {
    return (
      <button
        type="button"
        onClick={() => void handleConvert()}
        disabled={converting}
        className="px-4 py-2 bg-[#C8A96E] hover:bg-[#d4b87a] disabled:opacity-50 text-[#030611] text-sm font-semibold rounded-lg transition-all"
      >
        {converting ? "Creando factura..." : "Convertir a factura"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void handleConvert()}
      disabled={converting}
      className="text-[#C8A96E] hover:text-[#d4b87a] disabled:opacity-40 text-xs font-medium transition-colors"
    >
      {converting ? "..." : "→ Factura"}
    </button>
  );
}
