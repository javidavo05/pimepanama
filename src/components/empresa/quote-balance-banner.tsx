import Link from "next/link";
import type { QuoteBalanceState } from "@/lib/quote-balance";

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface QuoteBalanceBannerProps {
  balance: QuoteBalanceState;
  quoteNumber?: string | null;
  invoiceNumber?: string | null;
}

export function QuoteBalanceBanner({ balance, quoteNumber, invoiceNumber }: QuoteBalanceBannerProps) {
  if (!balance.hasLinkedInvoice || balance.pendingBalance <= 0.01 || balance.collected <= 0) {
    return null;
  }

  return (
    <div className="bg-amber-500/[0.06] border border-amber-500/20 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <p className="text-amber-400 text-sm font-medium">Saldo pendiente de cobro</p>
        <p className="text-white/55 text-xs mt-1 leading-relaxed">
          {quoteNumber ? `Cotización ${quoteNumber}` : "Cotización"} por{" "}
          <span className="font-mono text-white/70">${fmt(balance.quoteTotal)}</span>
          {invoiceNumber ? ` — factura ${invoiceNumber}` : ""} cubre{" "}
          <span className="font-mono text-white/70">${fmt(balance.collected)}</span>. Quedan{" "}
          <span className="font-mono text-amber-300">${fmt(balance.pendingBalance)}</span> por cobrar.
        </p>
      </div>
      <Link
        href="/empresa/cuentas-por-cobrar"
        className="shrink-0 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-medium hover:bg-amber-500/15 transition-all text-center"
      >
        Ver en cuentas por cobrar →
      </Link>
    </div>
  );
}
