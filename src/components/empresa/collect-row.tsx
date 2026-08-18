"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { collectReceivableAction } from "@/app/(empresa)/empresa/actions";

interface CollectRowProps {
  kind: "invoice" | "quote" | "schedule";
  documentId: string;
  scheduleId: string | null;
  /** Saldo pendiente de este ítem. */
  outstanding: number;
  currency: string;
  /** true si al cobrar se emitirá una factura nueva. */
  willCreateInvoice: boolean;
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Panel de cobro que se expande en la misma fila — sin popup, como pediste.
 * El botón abre el formulario debajo del ítem y el cobro se aplica ahí mismo.
 */
export function CollectRow({
  kind,
  documentId,
  scheduleId,
  outstanding,
  currency,
  willCreateInvoice,
}: CollectRowProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(outstanding.toFixed(2));
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ number: string | null; created: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  const value = Number(amount) || 0;
  const isPartial = value > 0 && value < outstanding - 0.01;
  const remaining = Math.max(0, Math.round((outstanding - value) * 100) / 100);

  function submit() {
    setError(null);
    if (value <= 0) {
      setError("Ingresa un monto mayor a cero");
      return;
    }
    startTransition(async () => {
      try {
        const res = await collectReceivableAction({ kind, documentId, scheduleId, amount: value });
        setDone({ number: res.invoiceNumber, created: res.invoiceCreated });
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo registrar el cobro");
      }
    });
  }

  if (done) {
    return (
      <div className="w-full mt-2 rounded-lg border border-green-500/25 bg-green-500/[0.07] px-3 py-2">
        <p className="text-green-400 text-xs">
          ✓ Cobro registrado
          {done.number && (
            <>
              {" "}
              en{" "}
              <a href={`/empresa/facturas/${documentId}`} className="underline font-mono">
                {done.number}
              </a>
            </>
          )}
          {done.created && " — factura emitida automáticamente"}
        </p>
      </div>
    );
  }

  // Botón y panel son hermanos dentro de un contenedor con flex-wrap: el botón
  // se queda en su línea y el panel, al ser w-full, baja a la siguiente.
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setAmount(outstanding.toFixed(2));
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        className={`shrink-0 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
          open
            ? "bg-white/[0.06] border-white/20 text-white/70"
            : "bg-green-500/10 border-green-500/25 text-green-400 hover:bg-green-500/20"
        }`}
      >
        {open ? "Cerrar" : "Cobrar"}
      </button>

      {open && (
    <div className="w-full mt-1 rounded-lg border border-[#1AA7F0]/25 bg-[#1AA7F0]/[0.04] p-3">
      <div className="flex items-end gap-3 flex-wrap">
        <div className="min-w-[140px]">
          <label className="block text-white/50 text-[10px] uppercase tracking-widest font-medium mb-1">
            Monto recibido
          </label>
          <div className="flex items-center gap-1.5">
            <span className="text-white/40 text-xs font-mono">{currency}</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              autoFocus
              onChange={(e) => setAmount(e.target.value)}
              className="w-28 bg-white/[0.04] border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-sm text-white/90 font-mono outline-none focus:border-[#1AA7F0]/50"
            />
          </div>
        </div>

        <div className="flex gap-1.5 pb-1.5">
          {[0.5, 1].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setAmount((outstanding * f).toFixed(2))}
              className="px-2 py-1 text-[10px] rounded border border-white/[0.1] text-white/50 hover:text-white/90 hover:border-white/25 transition-colors"
            >
              {f === 1 ? "Todo" : "50%"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto pb-0.5">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-white/40 hover:text-white/80 text-xs px-2 py-1.5"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="px-3 py-1.5 bg-green-500/90 hover:bg-green-500 disabled:opacity-40 text-[#04140a] text-xs font-semibold rounded-lg transition-all"
          >
            {pending ? "Registrando…" : "Registrar cobro"}
          </button>
        </div>
      </div>

      <div className="mt-2 space-y-1">
        {willCreateInvoice && (
          <p className="text-[#1AA7F0] text-[11px]">
            Se emitirá una factura por {currency} {fmt(value || outstanding)} al registrar el cobro.
          </p>
        )}
        {isPartial && (
          <p className="text-amber-400 text-[11px]">
            Pago parcial — quedan {currency} {fmt(remaining)} por cobrar.
          </p>
        )}
        {error && <p className="text-red-400 text-[11px]">{error}</p>}
      </div>
    </div>
      )}
    </>
  );
}
