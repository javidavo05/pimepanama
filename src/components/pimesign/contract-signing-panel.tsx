"use client";

import { useCallback, useEffect, useState } from "react";
import type { SigningStatus } from "@prisma/client";
import { SignaturePad } from "@/components/pimesign/signature-pad";

type SigningEvent = {
  id: string;
  action: string;
  actorEmail: string | null;
  createdAt: string;
};

type SigningData = {
  id: string;
  status: SigningStatus;
  clientEmail: string;
  companyEmail: string;
  signedPdfR2Key: string | null;
  expiresAt: string;
  events: SigningEvent[];
};

const STATUS_LABEL: Record<SigningStatus, string> = {
  DRAFT: "Borrador",
  PENDING_CLIENT: "Esperando cliente",
  PENDING_COMPANY: "Esperando empresa",
  COMPLETED: "Firmado",
  DECLINED: "Rechazado",
  EXPIRED: "Expirado",
};

const STATUS_COLOR: Record<SigningStatus, string> = {
  DRAFT: "text-fg-faint border-line-mid",
  PENDING_CLIENT: "text-warn border-amber-500/30",
  PENDING_COMPANY: "text-info border-blue-500/30",
  COMPLETED: "text-ok border-green-500/30",
  DECLINED: "text-danger border-red-500/30",
  EXPIRED: "text-fg-ghost border-line-mid",
};

export function ContractSigningPanel({
  contractId,
  clientEmail,
  signingStatus,
}: {
  contractId: string;
  clientEmail?: string | null;
  signingStatus?: SigningStatus | null;
}) {
  const [signing, setSigning] = useState<SigningData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/empresa/contracts/${contractId}/signing`);
    const data = await res.json();
    if (data.signing) setSigning(data.signing);
  }, [contractId]);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  const status = signing?.status ?? signingStatus ?? null;
  const canSend = !status || status === "DECLINED" || status === "EXPIRED" || status === "COMPLETED";
  const canCompanySign = status === "PENDING_COMPANY";

  async function sendForSigning() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/empresa/contracts/${contractId}/signing/send`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al enviar");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  async function companySign() {
    if (!signature || !accepted) {
      setError("Dibuja tu firma y acepta los términos.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/empresa/contracts/${contractId}/signing/company-sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureDataUrl: signature, accepted: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al firmar");
      await load();
      setSignature(null);
      setAccepted(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 bg-panel border border-line rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-line flex items-center justify-between gap-3">
        <h3 className="text-fg-faint text-xs uppercase tracking-widest font-medium">Firma digital (PimeSign)</h3>
        {status ? (
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${STATUS_COLOR[status]}`}>
            {STATUS_LABEL[status]}
          </span>
        ) : null}
      </div>

      <div className="p-5 space-y-4">
        {!clientEmail ? (
          <p className="text-warn/90 text-sm">Asigna un cliente con email para enviar a firma.</p>
        ) : canSend && status !== "COMPLETED" ? (
          <button
            type="button"
            disabled={loading}
            onClick={sendForSigning}
            className="px-4 py-2.5 bg-sand hover:bg-sand-lt disabled:opacity-50 text-on-accent text-sm font-semibold rounded-lg transition-all"
          >
            {loading ? "Enviando…" : "Enviar para firma digital"}
          </button>
        ) : null}

        {status === "PENDING_CLIENT" ? (
          <p className="text-fg-dim text-sm">
            Email enviado a <span className="text-fg-soft">{signing?.clientEmail ?? clientEmail}</span>. Esperando firma del cliente.
          </p>
        ) : null}

        {canCompanySign ? (
          <div className="space-y-3 border-t border-line pt-4">
            <p className="text-fg-dim text-sm">El cliente ya firmó. Firma como empresa:</p>
            <SignaturePad onChange={setSignature} />
            <label className="flex items-start gap-2 text-sm text-fg-dim cursor-pointer">
              <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-1" />
              <span>Acepto que esta firma digital tiene efecto legal sobre el contrato.</span>
            </label>
            <button
              type="button"
              disabled={loading}
              onClick={companySign}
              className="px-4 py-2.5 bg-brand hover:bg-[#33b4f3] disabled:opacity-50 text-on-brand text-sm font-semibold rounded-lg"
            >
              {loading ? "Firmando…" : "Firmar como empresa"}
            </button>
          </div>
        ) : null}

        {status === "COMPLETED" && signing?.signedPdfR2Key ? (
          <a
            href={`/api/empresa/r2/asset?key=${encodeURIComponent(signing.signedPdfR2Key)}`}
            className="inline-flex text-sm text-sand-fg hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            Descargar PDF firmado
          </a>
        ) : null}

        {error ? <p className="text-danger text-sm">{error}</p> : null}

        {signing?.events?.length ? (
          <div className="border-t border-line pt-4">
            <p className="text-fg-ghost text-xs uppercase tracking-widest mb-2">Historial</p>
            <ul className="space-y-1.5 text-xs text-fg-dim">
              {signing.events.map((ev) => (
                <li key={ev.id} className="flex justify-between gap-2">
                  <span>{ev.action}{ev.actorEmail ? ` · ${ev.actorEmail}` : ""}</span>
                  <span className="text-fg-ghost shrink-0">
                    {new Date(ev.createdAt).toLocaleString("es-PA", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
