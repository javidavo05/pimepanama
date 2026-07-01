"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateDocumentAction } from "@/app/(empresa)/empresa/actions";
import { ClientCombobox } from "@/components/empresa/client-combobox";
import type { Client } from "@prisma/client";

interface FacturaClientLinkerProps {
  documentId: string;
  clients: Client[];
  clientId?: string | null;
  clientName?: string | null;
}

export function FacturaClientLinker({
  documentId,
  clients,
  clientId: initialClientId,
  clientName: initialClientName,
}: FacturaClientLinkerProps) {
  const router = useRouter();
  const [clientName, setClientName] = useState(initialClientName ?? "");
  const [clientId, setClientId] = useState(initialClientId ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSelect(client: Client) {
    setSaving(true);
    setMessage(null);
    try {
      await updateDocumentAction(documentId, {
        clientId: client.id,
        clientName: client.name,
        clientEmail: client.email ?? undefined,
        clientCompany: client.company ?? undefined,
        clientAddress: client.address ?? undefined,
        clientRuc: client.ruc ?? undefined,
      });
      setClientName(client.name);
      setClientId(client.id);
      setMessage("Cliente asociado correctamente.");
      router.refresh();
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "No se pudo asociar el cliente"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5 space-y-3">
      <div>
        <p className="text-white/60 text-xs uppercase tracking-widest font-medium">
          Asociar cliente
        </p>
        <p className="text-white/30 text-xs mt-1">
          Vincule esta factura pagada a un cliente del directorio. Los montos y
          líneas no se modifican.
        </p>
      </div>
      <ClientCombobox
        clients={clients}
        value={clientName}
        onChange={(name) => {
          setClientName(name);
          setClientId("");
        }}
        onSelect={(client) => void handleSelect(client)}
        onNewClient={() => {}}
        label="Cliente del directorio"
        placeholder="Buscar cliente..."
        selectedClientId={clientId || undefined}
      />
      {saving && (
        <p className="text-white/40 text-xs animate-pulse">Guardando...</p>
      )}
      {message && (
        <p
          className={`text-xs ${message.includes("correctamente") ? "text-green-400" : "text-red-400"}`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
