"use client";

import type { UseFormRegister } from "react-hook-form";

interface ClientSelectorProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: UseFormRegister<any>;
  lang?: "es" | "en";
}

const LABELS = {
  es: {
    title: "Datos del cliente",
    name: "Nombre completo",
    company: "Empresa",
    ruc: "RUC / Cédula",
    email: "Correo electrónico",
    address: "Dirección",
  },
  en: {
    title: "Client information",
    name: "Full name",
    company: "Company",
    ruc: "Tax ID / RUC",
    email: "Email address",
    address: "Address",
  },
};

function Field({
  label,
  name,
  register,
  type = "text",
  placeholder,
}: {
  label: string;
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: UseFormRegister<any>;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-white/50 text-xs uppercase tracking-widest font-medium mb-1.5">
        {label}
      </label>
      <input
        {...register(name)}
        type={type}
        placeholder={placeholder}
        className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#C8A96E]/40 transition-all"
      />
    </div>
  );
}

export function ClientSelector({ register, lang = "es" }: ClientSelectorProps) {
  const t = LABELS[lang];

  return (
    <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5">
      <h3 className="text-white/60 text-xs uppercase tracking-widest font-medium mb-4">
        {t.title}
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <Field label={t.name} name="clientName" register={register} placeholder="Juan Pérez" />
        <Field label={t.company} name="clientCompany" register={register} placeholder="Empresa S.A." />
        <Field label={t.ruc} name="clientRuc" register={register} placeholder="8-123-456" />
        <Field label={t.email} name="clientEmail" register={register} type="email" placeholder="cliente@empresa.com" />
        <div className="col-span-2">
          <Field label={t.address} name="clientAddress" register={register} placeholder="Calle 50, Ciudad de Panamá" />
        </div>
      </div>
    </div>
  );
}
