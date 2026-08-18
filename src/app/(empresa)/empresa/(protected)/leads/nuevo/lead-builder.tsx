"use client";

import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createLeadAction } from "@/app/(empresa)/empresa/actions";
import type { LeadSource } from "@prisma/client";

interface LeadFormValues {
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  source: LeadSource;
  estimatedValue: string;
  nextFollowUpAt: string;
  notes: string;
}

const SOURCE_OPTS: { value: LeadSource; label: string }[] = [
  { value: "REFERIDO", label: "Referido" },
  { value: "WEB", label: "Sitio web" },
  { value: "REDES_SOCIALES", label: "Redes sociales" },
  { value: "FERIA", label: "Feria/Evento" },
  { value: "LLAMADA_FRIA", label: "Llamada fría" },
  { value: "OTRO", label: "Otro" },
];

export function LeadBuilder() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit } = useForm<LeadFormValues>({
    defaultValues: {
      name: "", company: "", email: "", phone: "", address: "", city: "",
      source: "OTRO", estimatedValue: "", nextFollowUpAt: "", notes: "",
    },
  });

  async function onSubmit(data: LeadFormValues) {
    setSaving(true);
    try {
      const lead = await createLeadAction({
        name: data.name,
        company: data.company || undefined,
        email: data.email || undefined,
        phone: data.phone || undefined,
        address: data.address || undefined,
        city: data.city || undefined,
        source: data.source,
        estimatedValue: data.estimatedValue ? parseFloat(data.estimatedValue) : undefined,
        nextFollowUpAt: data.nextFollowUpAt || undefined,
        notes: data.notes || undefined,
      });
      router.push(`/empresa/leads/${lead.id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <h1 className="text-white text-2xl font-semibold tracking-tight">Nuevo lead</h1>

      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5 space-y-4">
        <h3 className="text-white/60 text-xs uppercase tracking-widest font-medium">Datos del prospecto</h3>

        <div>
          <label className="block text-white/50 text-xs uppercase tracking-widest mb-1.5">
            Nombre <span className="text-red-400">*</span>
          </label>
          <input {...register("name", { required: true })}
            placeholder="Juan Pérez"
            className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#1AA7F0]/40 transition-all" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-white/50 text-xs uppercase tracking-widest mb-1.5">Empresa</label>
            <input {...register("company")} placeholder="Empresa S.A."
              className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#1AA7F0]/40 transition-all" />
          </div>
          <div>
            <label className="block text-white/50 text-xs uppercase tracking-widest mb-1.5">Fuente</label>
            <select {...register("source")} aria-label="Fuente"
              className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#1AA7F0]/40 transition-all">
              {SOURCE_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-white/50 text-xs uppercase tracking-widest mb-1.5">Correo electrónico</label>
            <input {...register("email")} type="email" placeholder="cliente@empresa.com"
              className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#1AA7F0]/40 transition-all" />
          </div>
          <div>
            <label className="block text-white/50 text-xs uppercase tracking-widest mb-1.5">Teléfono</label>
            <input {...register("phone")} placeholder="+507 6000-0000"
              className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#1AA7F0]/40 transition-all" />
          </div>
          <div>
            <label className="block text-white/50 text-xs uppercase tracking-widest mb-1.5">Ciudad</label>
            <input {...register("city")} placeholder="Ciudad de Panamá"
              className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#1AA7F0]/40 transition-all" />
          </div>
          <div>
            <label className="block text-white/50 text-xs uppercase tracking-widest mb-1.5">Dirección</label>
            <input {...register("address")} placeholder="Calle 50"
              className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#1AA7F0]/40 transition-all" />
          </div>
        </div>
      </div>

      <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5 space-y-4">
        <h3 className="text-white/60 text-xs uppercase tracking-widest font-medium">Seguimiento</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-white/50 text-xs uppercase tracking-widest mb-1.5">Valor estimado (USD)</label>
            <input {...register("estimatedValue")} type="number" min="0" step="0.01" placeholder="0.00"
              className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#C8A96E]/40 transition-all" />
          </div>
          <div>
            <label className="block text-white/50 text-xs uppercase tracking-widest mb-1.5">Próximo seguimiento</label>
            <input {...register("nextFollowUpAt")} type="date"
              className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#1AA7F0]/40 transition-all" />
          </div>
        </div>
        <div>
          <label className="block text-white/50 text-xs uppercase tracking-widest mb-1.5">Notas</label>
          <textarea {...register("notes")} rows={3} placeholder="Contexto, necesidades, próximos pasos..."
            className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white/80 text-sm placeholder-white/20 focus:outline-none focus:border-[#1AA7F0]/40 resize-none transition-all" />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={() => router.back()} className="px-4 py-2.5 text-white/50 hover:text-white/80 text-sm transition-colors">
          Cancelar
        </button>
        <button type="submit" disabled={saving} className="px-6 py-2.5 bg-[#1AA7F0] hover:bg-[#0E87C8] disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-all">
          {saving ? "Guardando..." : "Crear lead"}
        </button>
      </div>
    </form>
  );
}
