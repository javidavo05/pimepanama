"use client";

/** Todos los datos del lead en un formulario: contacto, valor, seguimiento, motivo de pérdida, etiquetas y notas. */
import { useActionState } from "react";
import { btn } from "@/components/empresa/page-header";
import { campo, etiqueta } from "@/components/empresa/clientes/formularios";
import { MensajeEstado } from "@/components/empresa/crm/mensaje-estado";
import { guardarLeadAction } from "../../acciones-embudo";
import { FUENTES, fechaInput } from "@/lib/crm/embudo";

type LeadDatos = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  source: string;
  status: string;
  estimatedValue: number | null;
  nextFollowUpAt: string | null;
  lostReason: string | null;
  etiquetas: string[];
  notes: string | null;
};

export function DatosLeadForm({ lead }: { lead: LeadDatos }) {
  const [estado, guardar, guardando] = useActionState(guardarLeadAction, null);
  const f = (k: string) => `lead-${k}-${lead.id}`;
  return (
    <form action={guardar} className="space-y-4">
      <input type="hidden" name="id" value={lead.id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label htmlFor={f("name")} className={etiqueta}>Contacto</label><input id={f("name")} name="name" required maxLength={120} defaultValue={lead.name} className={campo} autoComplete="off" /></div>
        <div><label htmlFor={f("company")} className={etiqueta}>Empresa</label><input id={f("company")} name="company" maxLength={120} defaultValue={lead.company ?? ""} className={campo} autoComplete="off" /></div>
        <div><label htmlFor={f("email")} className={etiqueta}>Correo</label><input id={f("email")} name="email" type="email" inputMode="email" defaultValue={lead.email ?? ""} className={campo} autoComplete="off" /></div>
        <div><label htmlFor={f("phone")} className={etiqueta}>Teléfono</label><input id={f("phone")} name="phone" inputMode="tel" defaultValue={lead.phone ?? ""} className={campo} autoComplete="off" /></div>
        <div><label htmlFor={f("address")} className={etiqueta}>Dirección</label><input id={f("address")} name="address" defaultValue={lead.address ?? ""} className={campo} /></div>
        <div><label htmlFor={f("city")} className={etiqueta}>Ciudad</label><input id={f("city")} name="city" defaultValue={lead.city ?? ""} className={campo} /></div>
        <div>
          <label htmlFor={f("source")} className={etiqueta}>Fuente</label>
          <select id={f("source")} name="source" defaultValue={lead.source} className={`${campo} field-select pr-8`}>
            {FUENTES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
          </select>
        </div>
        <div><label htmlFor={f("value")} className={etiqueta}>Valor estimado (USD)</label><input id={f("value")} name="estimatedValue" inputMode="decimal" defaultValue={lead.estimatedValue != null ? lead.estimatedValue.toFixed(2) : ""} className={campo} placeholder="0.00" /></div>
        <div>
          <label htmlFor={f("seg")} className={etiqueta}>Próximo seguimiento</label>
          <input id={f("seg")} name="nextFollowUpAt" type="date" defaultValue={fechaInput(lead.nextFollowUpAt)} className={campo} />
          <p className="mt-1 text-xs text-fg-faint">Déjalo vacío si no hay nada agendado.</p>
        </div>
        <div>
          <label htmlFor={f("tags")} className={etiqueta}>Etiquetas</label>
          <input id={f("tags")} name="etiquetas" defaultValue={lead.etiquetas.join(", ")} className={campo} placeholder="restaurante, urgente" autoComplete="off" />
          <p className="mt-1 text-xs text-fg-faint">Separadas por coma.</p>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={f("lost")} className={etiqueta}>Motivo de pérdida</label>
          <input id={f("lost")} name="lostReason" maxLength={300} defaultValue={lead.lostReason ?? ""} className={campo} placeholder={lead.status === "PERDIDO" ? "Por qué no se cerró" : "Solo si se perdió"} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={f("notes")} className={etiqueta}>Notas</label>
          <textarea id={f("notes")} name="notes" rows={4} defaultValue={lead.notes ?? ""} className={`${campo} py-2`} placeholder="Contexto, necesidades, próximos pasos" />
        </div>
      </div>
      <MensajeEstado estado={estado} />
      <div className="flex justify-end">
        <button type="submit" className={`${btn.secondary} w-full sm:w-auto`} disabled={guardando}>{guardando ? "Guardando…" : "Guardar datos del lead"}</button>
      </div>
    </form>
  );
}
