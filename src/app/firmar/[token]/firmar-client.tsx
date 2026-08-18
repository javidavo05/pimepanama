"use client";

import { useEffect, useState } from "react";
import { SignaturePad } from "@/components/pimesign/signature-pad";

type SigningInfo = {
  role: string;
  status: string;
  contractTitle: string;
  companyName: string | null;
  clientName: string | null;
  signerLabel: string | null;
  expiresAt: string;
};

export function FirmarClient({ token }: { token: string }) {
  const [info, setInfo] = useState<SigningInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    fetch(`/api/signing/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Enlace inválido");
        setInfo(data);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error"));
  }, [token]);

  async function submit() {
    if (!signature || !accepted) {
      setError("Dibuja tu firma y acepta los términos.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/signing/${token}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureDataUrl: signature, accepted: true, signerName: info?.signerLabel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al firmar");
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  async function decline() {
    if (!confirm("¿Rechazar la firma de este contrato?")) return;
    setLoading(true);
    try {
      await fetch(`/api/signing/${token}/sign`, { method: "DELETE", body: JSON.stringify({}) });
      setError("Has rechazado la firma.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <main className="min-h-screen bg-[#030611] text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <div className="text-4xl">✓</div>
          <h1 className="text-xl font-semibold">Firma registrada</h1>
          <p className="text-white/60 text-sm">
            {info?.role === "CLIENT"
              ? "Gracias. La empresa recibirá una notificación para completar su firma."
              : "El contrato quedó firmado por ambas partes."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#030611] text-white">
      <div className="max-w-lg mx-auto px-5 py-10 space-y-6">
        <div>
          <p className="text-[#C8A96E] text-xs uppercase tracking-widest mb-2">PimeSign</p>
          <h1 className="text-2xl font-semibold">{info?.contractTitle ?? "Contrato"}</h1>
          {info ? (
            <p className="text-white/55 text-sm mt-2">
              {info.companyName} · Firmar como <strong className="text-white/80">{info.signerLabel}</strong>
            </p>
          ) : null}
        </div>

        {error && !info ? (
          <p className="text-red-400 text-sm">{error}</p>
        ) : info ? (
          <>
            <SignaturePad onChange={setSignature} />
            <label className="flex items-start gap-2 text-sm text-white/60">
              <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-1" />
              <span>
                He leído el contrato y acepto firmarlo digitalmente. Entiendo que esta firma tiene efecto legal.
              </span>
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                disabled={loading}
                onClick={submit}
                className="flex-1 px-4 py-3 bg-[#C8A96E] hover:bg-[#d4b87a] disabled:opacity-50 text-[#030611] font-semibold rounded-lg"
              >
                {loading ? "Guardando…" : "Firmar contrato"}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={decline}
                className="px-4 py-3 border border-white/10 text-white/60 hover:text-white/80 rounded-lg text-sm"
              >
                Rechazar
              </button>
            </div>
            {error ? <p className="text-red-400 text-sm">{error}</p> : null}
          </>
        ) : (
          <p className="text-white/50 text-sm">Cargando…</p>
        )}
      </div>
    </main>
  );
}
