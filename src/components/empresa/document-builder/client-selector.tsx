"use client";

import type { UseFormRegister, UseFormSetValue, UseFormWatch } from "react-hook-form";
import type { Client } from "@prisma/client";
import { ClientCombobox } from "@/components/empresa/client-combobox";

interface ClientSelectorProps {
  clients: Client[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: UseFormRegister<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setValue: UseFormSetValue<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  watch: UseFormWatch<any>;
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
    newClientHint: "Se guardará como nuevo cliente",
  },
  en: {
    title: "Client information",
    name: "Full name",
    company: "Company",
    ruc: "Tax ID / RUC",
    email: "Email address",
    address: "Address",
    newClientHint: "Will be saved as new client",
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

export function ClientSelector({ clients, register, setValue, watch, lang = "es" }: ClientSelectorProps) {
  const t = LABELS[lang];

  function handleClientSelect(client: Client) {
    setValue("clientId", client.id);
    setValue("clientName", client.name);
    setValue("clientEmail", client.email ?? "");
    setValue("clientCompany", client.company ?? "");
    setValue("clientAddress", client.address ?? "");
    setValue("clientRuc", client.ruc ?? "");
    setValue("clientPhone", client.phone ?? "");
    setValue("saveAsNewClient", false);
  }

  return (
    <div className="bg-[#0a0a10] border border-white/[0.06] rounded-xl p-5">
      <h3 className="text-white/60 text-xs uppercase tracking-widest font-medium mb-4">
        {t.title}
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <ClientCombobox
            clients={clients}
            value={watch("clientName") ?? ""}
            onChange={(name) => {
              setValue("clientName", name);
              setValue("clientId", "");
              setValue("saveAsNewClient", false);
            }}
            onSelect={handleClientSelect}
            onNewClient={() => setValue("saveAsNewClient", true)}
            label={t.name}
            placeholder="Juan Pérez"
            selectedClientId={watch("clientId") || undefined}
          />
          {watch("saveAsNewClient") && (
            <p className="mt-1.5 text-[10px] text-[#1AA7F0]/70 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1AA7F0]/60 inline-block" />
              {t.newClientHint}
            </p>
          )}
        </div>
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
