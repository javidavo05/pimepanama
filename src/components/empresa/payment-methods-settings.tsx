"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  createPaymentMethodAction,
  updatePaymentMethodAction,
  deletePaymentMethodAction,
} from "@/app/(empresa)/empresa/actions";
import type { SerializedPaymentMethod } from "@/lib/serializers";

const BANK_TYPES = new Set(["BANK_TRANSFER", "CHECK"]);
const CARD_TYPES = new Set(["CARD", "CASH", "OTHER"]);

const TYPE_LABELS: Record<string, string> = {
  BANK_TRANSFER: "Transferencia",
  CHECK: "Cheque",
  CARD: "Tarjeta / punto de pago",
  CASH: "Efectivo",
  OTHER: "Otro",
};

const inputCls =
  "no-number-spinner w-full bg-[#12121a] border border-white/10 rounded-lg px-3 py-2.5 text-white/90 text-sm placeholder:text-white/40 focus:outline-none focus:border-[#C8A96E]/50 transition-all";

const selectCls = `${inputCls} appearance-none cursor-pointer`;

const optionCls = "bg-[#12121a] text-white";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-white/55 text-[10px] uppercase tracking-widest font-medium mb-1">
      {children}
    </label>
  );
}

function MethodRow({
  method,
  onUpdated,
}: {
  method: SerializedPaymentMethod;
  onUpdated: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: method.name,
    bankName: method.bankName ?? "",
    accountNumber: method.accountNumber ?? "",
    accountType: method.accountType ?? "",
    accountHolder: method.accountHolder ?? "",
    commissionPct: Number(method.commissionPct),
    commissionFlat: Number(method.commissionFlat),
    commissionTax: Number(method.commissionTax),
  });

  const isBank = BANK_TYPES.has(method.type);

  async function handleSave() {
    setSaving(true);
    try {
      await updatePaymentMethodAction(method.id, {
        name: form.name.trim(),
        bankName: form.bankName.trim() || undefined,
        accountNumber: form.accountNumber.trim() || undefined,
        accountType: form.accountType.trim() || undefined,
        accountHolder: form.accountHolder.trim() || undefined,
        commissionPct: form.commissionPct,
        commissionFlat: form.commissionFlat,
        commissionTax: form.commissionTax,
      });
      setEditing(false);
      onUpdated();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar "${method.name}"?`)) return;
    try {
      await deletePaymentMethodAction(method.id);
      onUpdated();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al eliminar");
    }
  }

  if (editing) {
    return (
      <div className="p-4 rounded-xl bg-[#0a0a10] border border-white/[0.08] space-y-3">
        <input
          className={inputCls}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Nombre"
        />
        {isBank ? (
          <div className="grid grid-cols-2 gap-3">
            <input className={inputCls} value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} placeholder="Banco" />
            <input className={inputCls} value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} placeholder="Número de cuenta" />
            <input className={inputCls} value={form.accountType} onChange={(e) => setForm({ ...form, accountType: e.target.value })} placeholder="Tipo (Ahorros, Corriente)" />
            <input className={inputCls} value={form.accountHolder} onChange={(e) => setForm({ ...form, accountHolder: e.target.value })} placeholder="Titular" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <input className={inputCls} type="number" step="0.01" value={form.commissionPct} onChange={(e) => setForm({ ...form, commissionPct: parseFloat(e.target.value) || 0 })} placeholder="% comisión" />
            <input className={inputCls} type="number" step="0.01" value={form.commissionFlat} onChange={(e) => setForm({ ...form, commissionFlat: parseFloat(e.target.value) || 0 })} placeholder="Fijo USD" />
            <input className={inputCls} type="number" step="0.01" value={form.commissionTax} onChange={(e) => setForm({ ...form, commissionTax: parseFloat(e.target.value) || 0 })} placeholder="ITBMS % s/comisión" />
          </div>
        )}
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={() => setEditing(false)} className="text-white/40 text-xs hover:text-white/70">Cancelar</button>
          <button type="button" disabled={saving} onClick={() => void handleSave()} className="px-3 py-1.5 bg-[#C8A96E]/15 text-[#C8A96E] text-xs font-medium rounded-lg">
            {saving ? "..." : "Guardar"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-white/[0.04] last:border-0">
      <div className="min-w-0">
        <p className="text-white/80 text-sm font-medium">{method.name}</p>
        <p className="text-white/30 text-xs mt-0.5">{TYPE_LABELS[method.type] ?? method.type}</p>
        {isBank ? (
          <p className="text-white/40 text-xs mt-1 font-mono">
            {[method.bankName, method.accountNumber, method.accountType, method.accountHolder].filter(Boolean).join(" · ")}
          </p>
        ) : (
          <p className="text-white/40 text-xs mt-1">
            {Number(method.commissionPct) > 0 || Number(method.commissionFlat) > 0
              ? `${Number(method.commissionPct)}% + $${Number(method.commissionFlat).toFixed(2)} · ITBMS ${Number(method.commissionTax)}%`
              : "Sin comisión"}
          </p>
        )}
      </div>
      <div className="flex gap-3 shrink-0">
        <button type="button" onClick={() => setEditing(true)} className="text-white/40 hover:text-white/70 text-xs">Editar</button>
        <button type="button" onClick={() => void handleDelete()} className="text-red-400/50 hover:text-red-400 text-xs">Eliminar</button>
      </div>
    </div>
  );
}

function AddBankForm({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    bankName: "",
    accountNumber: "",
    accountType: "Ahorros",
    accountHolder: "",
  });

  async function handleAdd() {
    if (!form.name.trim() || !form.bankName.trim()) {
      alert("Nombre y banco son obligatorios.");
      return;
    }
    setSaving(true);
    try {
      await createPaymentMethodAction({
        type: "BANK_TRANSFER",
        name: form.name.trim(),
        bankName: form.bankName.trim(),
        accountNumber: form.accountNumber.trim() || undefined,
        accountType: form.accountType.trim() || undefined,
        accountHolder: form.accountHolder.trim() || undefined,
      });
      setForm({ name: "", bankName: "", accountNumber: "", accountType: "Ahorros", accountHolder: "" });
      setOpen(false);
      onAdded();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al crear");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-[#C8A96E]/70 hover:text-[#C8A96E] text-xs font-medium">
        + Agregar cuenta bancaria
      </button>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-[#0a0a10] border border-[#C8A96E]/20 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Etiqueta</FieldLabel>
          <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Banco General" />
        </div>
        <div>
          <FieldLabel>Banco</FieldLabel>
          <input className={inputCls} value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} placeholder="Banco General" />
        </div>
        <div>
          <FieldLabel>Número de cuenta</FieldLabel>
          <input className={inputCls} value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} placeholder="04-44-99-9991-783" />
        </div>
        <div>
          <FieldLabel>Tipo de cuenta</FieldLabel>
          <select className={selectCls} value={form.accountType} onChange={(e) => setForm({ ...form, accountType: e.target.value })}>
            <option className={optionCls} value="Ahorros">Ahorros</option>
            <option className={optionCls} value="Corriente">Corriente</option>
          </select>
        </div>
        <div className="col-span-2">
          <FieldLabel>Titular</FieldLabel>
          <input className={inputCls} value={form.accountHolder} onChange={(e) => setForm({ ...form, accountHolder: e.target.value })} placeholder="Pime Panamá" />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={() => setOpen(false)} className="text-white/50 hover:text-white/80 text-xs">Cancelar</button>
        <button type="button" disabled={saving} onClick={() => void handleAdd()} className="px-3 py-1.5 bg-[#C8A96E] text-[#030611] text-xs font-semibold rounded-lg">
          {saving ? "..." : "Agregar"}
        </button>
      </div>
    </div>
  );
}

function AddCommissionForm({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "CARD" as "CARD" | "CASH" | "OTHER",
    commissionPct: 0,
    commissionFlat: 0,
    commissionTax: 7,
  });

  async function handleAdd() {
    if (!form.name.trim()) {
      alert("El nombre es obligatorio.");
      return;
    }
    setSaving(true);
    try {
      await createPaymentMethodAction({
        type: form.type,
        name: form.name.trim(),
        commissionPct: form.commissionPct,
        commissionFlat: form.commissionFlat,
        commissionTax: form.commissionTax,
      });
      setForm({ name: "", type: "CARD", commissionPct: 0, commissionFlat: 0, commissionTax: 7 });
      setOpen(false);
      onAdded();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al crear");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-[#C8A96E]/70 hover:text-[#C8A96E] text-xs font-medium">
        + Agregar tarjeta o punto de pago
      </button>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-[#0a0a10] border border-[#C8A96E]/20 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Nombre</FieldLabel>
          <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Visa, Yappy, Paguelo..." />
        </div>
        <div>
          <FieldLabel>Tipo</FieldLabel>
          <select className={selectCls} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as typeof form.type })}>
            <option className={optionCls} value="CARD">Tarjeta / punto de pago</option>
            <option className={optionCls} value="CASH">Efectivo</option>
            <option className={optionCls} value="OTHER">Otro</option>
          </select>
        </div>
        <div>
          <FieldLabel>% comisión</FieldLabel>
          <input className={inputCls} type="number" step="0.01" value={form.commissionPct} onChange={(e) => setForm({ ...form, commissionPct: parseFloat(e.target.value) || 0 })} placeholder="0" />
        </div>
        <div>
          <FieldLabel>Comisión fija (USD)</FieldLabel>
          <input className={inputCls} type="number" step="0.01" value={form.commissionFlat} onChange={(e) => setForm({ ...form, commissionFlat: parseFloat(e.target.value) || 0 })} placeholder="0.00" />
        </div>
        <div className="col-span-2">
          <FieldLabel>ITBMS % sobre comisión</FieldLabel>
          <input className={inputCls} type="number" step="0.01" value={form.commissionTax} onChange={(e) => setForm({ ...form, commissionTax: parseFloat(e.target.value) || 0 })} placeholder="7" />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={() => setOpen(false)} className="text-white/50 hover:text-white/80 text-xs">Cancelar</button>
        <button type="button" disabled={saving} onClick={() => void handleAdd()} className="px-3 py-1.5 bg-[#C8A96E] text-[#030611] text-xs font-semibold rounded-lg">
          {saving ? "..." : "Agregar"}
        </button>
      </div>
    </div>
  );
}

export function PaymentMethodsSettings({
  methods: initialMethods,
}: {
  methods: SerializedPaymentMethod[];
}) {
  const router = useRouter();
  const bankMethods = initialMethods.filter((m) => BANK_TYPES.has(m.type));
  const cardMethods = initialMethods.filter((m) => CARD_TYPES.has(m.type));

  function refresh() {
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl p-6">
        <h2 className="text-[#C8A96E] text-xs uppercase tracking-widest font-medium mb-2">
          Cuentas bancarias
        </h2>
        <p className="text-white/30 text-xs mb-4">
          Cuentas para transferencias que aparecen en cotizaciones y facturas.
        </p>
        {bankMethods.length > 0 ? (
          <div className="mb-4">
            {bankMethods.map((m) => (
              <MethodRow key={m.id} method={m} onUpdated={refresh} />
            ))}
          </div>
        ) : (
          <p className="text-white/25 text-sm mb-4">No hay cuentas registradas.</p>
        )}
        <AddBankForm onAdded={refresh} />
      </div>

      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl p-6">
        <h2 className="text-[#C8A96E] text-xs uppercase tracking-widest font-medium mb-2">
          Tarjetas y puntos de pago — comisiones
        </h2>
        <p className="text-white/30 text-xs mb-4">
          Define el costo de procesamiento para calcular el neto recibido en cotizaciones y facturas.
        </p>
        {cardMethods.length > 0 ? (
          <div className="mb-4">
            {cardMethods.map((m) => (
              <MethodRow key={m.id} method={m} onUpdated={refresh} />
            ))}
          </div>
        ) : (
          <p className="text-white/25 text-sm mb-4">No hay métodos con comisión registrados.</p>
        )}
        <AddCommissionForm onAdded={refresh} />
      </div>
    </div>
  );
}
