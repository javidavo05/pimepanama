"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Client } from "@prisma/client";
import type { SerializedPaymentMethod } from "@/lib/serializers";
import { ClientCombobox } from "@/components/empresa/client-combobox";
import { PaymentSelector } from "@/components/empresa/payment-selector";
import { createDocumentAction, createClientAction } from "@/app/(empresa)/empresa/actions";
import { calcCommission, fmtUSD } from "@/lib/commission";
import { ActionRow, btn } from "@/components/empresa/page-header";

interface ImportarFormProps {
  clients: Client[];
  paymentMethods: SerializedPaymentMethod[];
}

const STATUS_OPTS = [
  { value: "ACCEPTED", label: "Aceptada" },
  { value: "REJECTED", label: "Rechazada" },
  { value: "SENT", label: "Enviada" },
  { value: "DRAFT", label: "Borrador" },
];

export function ImportarCotizacionForm({ clients, paymentMethods }: ImportarFormProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [clientRuc, setClientRuc] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [validUntil, setValidUntil] = useState("");
  const [total, setTotal] = useState("");
  const [status, setStatus] = useState("ACCEPTED");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [notes, setNotes] = useState("");
  const [customNumber, setCustomNumber] = useState("");
  const [saveNewClient, setSaveNewClient] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const grossAmount = parseFloat(total) || 0;
  const pm = paymentMethods.find((m) => m.id === paymentMethodId);
  const commission = pm && grossAmount > 0
    ? calcCommission(grossAmount, Number(pm.commissionPct), Number(pm.commissionFlat), Number(pm.commissionTax))
    : null;

  function handleClientSelect(c: Client) {
    setSelectedClient(c);
    setClientName(c.name);
    setClientCompany(c.company ?? "");
    setClientRuc(c.ruc ?? "");
    setClientEmail(c.email ?? "");
    setSaveNewClient(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      let r2Key: string | undefined;

      if (pdfFile) {
        setUploading(true);
        const presignRes = await fetch("/api/empresa/r2/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: pdfFile.name, contentType: pdfFile.type }),
        });
        const { url, key } = await presignRes.json();
        await fetch(url, { method: "PUT", body: pdfFile, headers: { "Content-Type": pdfFile.type } });
        r2Key = key;
        setUploading(false);
      }

      let clientId = selectedClient?.id;
      if (!clientId && saveNewClient && clientName.trim()) {
        const nc = await createClientAction({
          name: clientName, company: clientCompany || undefined,
          ruc: clientRuc || undefined, email: clientEmail || undefined,
        });
        clientId = nc.id;
      }

      const doc = await createDocumentAction({
        type: "COTIZACION",
        title: clientName || "Cotización importada",
        clientName: clientName || undefined,
        clientCompany: clientCompany || undefined,
        clientRuc: clientRuc || undefined,
        clientEmail: clientEmail || undefined,
        clientId,
        content: { notes, lineItems: [], importedPdf: r2Key ? true : false },
        issueDate: new Date(issueDate),
        validUntil: validUntil ? new Date(validUntil) : undefined,
        total: grossAmount || undefined,
        commissionAmt: commission?.totalCommission,
        netAmount: commission?.netAmount ?? (grossAmount || undefined),
        status: status as "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED",
        paymentMethodId: paymentMethodId || undefined,
        r2Key,
      });

      // Override auto-generated number if custom was given
      if (customNumber.trim()) {
        const { updateDocumentAction } = await import("@/app/(empresa)/empresa/actions");
        await updateDocumentAction(doc.id, { title: customNumber });
      }

      router.push(`/empresa/cotizaciones/${doc.id}`);
    } catch (err) {
      console.error(err);
      setSaving(false);
    }
  }

  const inputCls = "w-full bg-fill border border-line rounded-lg px-3 py-2.5 text-fg text-sm placeholder-fg-trace focus:outline-none focus:border-brand/40 transition-all";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* PDF Upload */}
      <div className="bg-panel border border-dashed border-line-mid rounded-xl p-6 text-center">
        <input ref={fileRef} type="file" accept="application/pdf" className="hidden"
          onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)} />
        {pdfFile ? (
          <div className="flex items-center justify-center gap-3 min-w-0">
            <span className="text-brand-fg text-sm font-medium truncate min-w-0">📄 {pdfFile.name}</span>
            <button type="button" onClick={() => setPdfFile(null)} aria-label="Quitar PDF"
              className="inline-flex items-center justify-center shrink-0 min-h-11 min-w-11 sm:min-h-8 sm:min-w-0 text-fg-dim hover:text-danger text-sm sm:text-xs transition-colors">✕</button>
          </div>
        ) : (
          <div>
            <p className="text-fg-dim text-sm mb-2">PDF de la cotización original (opcional)</p>
            <button type="button" onClick={() => fileRef.current?.click()}
              className="min-h-11 sm:min-h-8 px-4 py-2 bg-fill border border-line rounded-lg text-fg-dim text-sm hover:text-fg-soft transition-all">
              Seleccionar PDF
            </button>
            <p className="text-fg-faint text-xs mt-2">Se sube a Cloudflare R2 y queda guardado en el historial</p>
          </div>
        )}
      </div>

      {/* Client */}
      <div className="bg-panel border border-line rounded-xl p-5 space-y-4">
        <h3 className="text-fg-dim text-xs uppercase tracking-widest font-medium">Cliente</h3>
        {/* Una columna en el celular: en dos, cada campo quedaba de 38 px. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="min-w-0">
            <ClientCombobox
              clients={clients}
              value={clientName}
              onChange={(name) => { setClientName(name); setSelectedClient(null); setSaveNewClient(false); }}
              onSelect={handleClientSelect}
              onNewClient={() => setSaveNewClient(true)}
              label="Nombre *"
              placeholder="Juan Pérez"
              selectedClientId={selectedClient?.id}
            />
            {saveNewClient && !selectedClient && (
              <p className="mt-1.5 text-[10px] text-brand-fg flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-brand/60 inline-block" />
                Se guardará como nuevo cliente
              </p>
            )}
          </div>
          <div>
            <label className="block text-fg-dim text-xs uppercase tracking-widest mb-1.5">Empresa</label>
            <input value={clientCompany} onChange={(e) => setClientCompany(e.target.value)} placeholder="Empresa S.A." className={inputCls} />
          </div>
          <div>
            <label className="block text-fg-dim text-xs uppercase tracking-widest mb-1.5">RUC</label>
            <input value={clientRuc} onChange={(e) => setClientRuc(e.target.value)} placeholder="8-123-456" className={inputCls} />
          </div>
          <div>
            <label className="block text-fg-dim text-xs uppercase tracking-widest mb-1.5">Correo</label>
            <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="cliente@empresa.com" className={inputCls} />
          </div>
        </div>
      </div>

      {/* Meta */}
      <div className="bg-panel border border-line rounded-xl p-5 space-y-4">
        <h3 className="text-fg-dim text-xs uppercase tracking-widest font-medium">Datos de la cotización</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-fg-dim text-xs uppercase tracking-widest mb-1.5">Fecha de emisión</label>
            <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-fg-dim text-xs uppercase tracking-widest mb-1.5">Válida hasta</label>
            <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-fg-dim text-xs uppercase tracking-widest mb-1.5">Número original (opcional)</label>
            <input value={customNumber} onChange={(e) => setCustomNumber(e.target.value)} placeholder="COT-2024-0042" className={inputCls} />
          </div>
          <div>
            <label className="block text-fg-dim text-xs uppercase tracking-widest mb-1.5">Total bruto (USD)</label>
            <input type="number" min="0" step="0.01" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="0.00" className={inputCls} />
          </div>
        </div>
        <div>
          <label className="block text-fg-dim text-xs uppercase tracking-widest mb-1.5">Notas / Descripción</label>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Descripción de los servicios cotizados..." className={`${inputCls} resize-none`} />
        </div>
      </div>

      {/* Status */}
      <div className="bg-panel border border-line rounded-xl p-5">
        <h3 className="text-fg-dim text-xs uppercase tracking-widest font-medium mb-4">Estado final</h3>
        {/* 2×2 de celdas iguales en el celular en vez de filas desparejas. */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STATUS_OPTS.map((opt) => (
            <button key={opt.value} type="button" onClick={() => setStatus(opt.value)}
              className={`min-h-11 sm:min-h-8 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                status === opt.value
                  ? "border-brand/40 bg-brand/10 text-brand-fg"
                  : "border-line text-fg-dim hover:text-fg-dim"
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Payment */}
      {(status === "ACCEPTED" || status === "PAID") && paymentMethods.length > 0 && (
        <div className="bg-panel border border-line rounded-xl p-5">
          <h3 className="text-fg-dim text-xs uppercase tracking-widest font-medium mb-4">Método de pago</h3>
          <PaymentSelector methods={paymentMethods} selectedId={paymentMethodId} grossAmount={grossAmount} onChange={setPaymentMethodId} />
        </div>
      )}

      {/* Commission summary */}
      {commission && (
        <div className="bg-ok/5 border border-ok/10 rounded-xl px-5 py-3 flex justify-between items-center">
          <span className="text-fg-faint text-sm">Neto real para PIME</span>
          <span className="text-ok font-mono text-xl font-bold">${fmtUSD(commission.netAmount)}</span>
        </div>
      )}

      {/* Dos columnas iguales en el celular; la acción principal a la derecha. */}
      <ActionRow className="sm:justify-end sm:gap-3">
        <button type="button" onClick={() => router.back()} className={btn.secondary}>Cancelar</button>
        <button type="submit" disabled={saving || uploading} className={btn.primary}>
          {uploading ? "Subiendo PDF..." : saving ? "Guardando..." : "Importar cotización"}
        </button>
      </ActionRow>
    </form>
  );
}
