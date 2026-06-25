import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { updateCompanyConfigAction } from "@/app/(empresa)/empresa/actions";

export const metadata = { title: "Configuración — Pime Suite" };

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-white/50 text-xs uppercase tracking-widest font-medium mb-1.5">
        {label}
      </label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        step={type === "number" ? "0.01" : undefined}
        className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#C8A96E]/40 transition-all"
      />
    </div>
  );
}

export default async function ConfiguracionPage() {
  const user = await getEmpresaUser();
  const c = user.config;

  async function handleSubmit(formData: FormData) {
    "use server";
    await updateCompanyConfigAction({
      name: formData.get("name") as string,
      legalName: formData.get("legalName") as string,
      ruc: formData.get("ruc") as string,
      address: formData.get("address") as string,
      city: formData.get("city") as string,
      country: formData.get("country") as string,
      phone: formData.get("phone") as string,
      email: formData.get("email") as string,
      website: formData.get("website") as string,
      logoUrl: formData.get("logoUrl") as string,
      currency: formData.get("currency") as string,
      invoicePrefix: formData.get("invoicePrefix") as string,
      quotePrefix: formData.get("quotePrefix") as string,
      paymentTermsDays: parseInt(formData.get("paymentTermsDays") as string) || 30,
      taxRatePercent: parseFloat(formData.get("taxRatePercent") as string) || 7,
      footerNotes_es: formData.get("footerNotes_es") as string,
      footerNotes_en: formData.get("footerNotes_en") as string,
    });
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-white text-2xl font-semibold tracking-tight">Configuración</h1>
        <p className="text-white/40 text-sm mt-1">
          Datos de la empresa que aparecen en todos los documentos
        </p>
      </div>

      <form action={handleSubmit} className="space-y-6">
        {/* Company identity */}
        <div className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl p-6">
          <h2 className="text-[#C8A96E] text-xs uppercase tracking-widest font-medium mb-5">
            Identidad corporativa
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Nombre de la empresa" name="name" defaultValue={c?.name} placeholder="Pime Panamá" />
            <Field label="Razón social / Nombre legal" name="legalName" defaultValue={c?.legalName} />
            <Field label="RUC" name="ruc" defaultValue={c?.ruc} placeholder="8-123-456 DV 9" />
            <Field label="País" name="country" defaultValue={c?.country ?? "Panamá"} />
            <Field label="Ciudad" name="city" defaultValue={c?.city} placeholder="Ciudad de Panamá" />
            <Field label="Dirección" name="address" defaultValue={c?.address} placeholder="Calle 50, Piso 3" />
            <Field label="Teléfono" name="phone" defaultValue={c?.phone} placeholder="+507 6000-0000" />
            <Field label="Correo" name="email" defaultValue={c?.email} type="email" placeholder="info@pimepanama.com" />
            <Field label="Sitio web" name="website" defaultValue={c?.website} placeholder="pimepanama.com" />
            <Field label="URL del logo (PNG/SVG)" name="logoUrl" defaultValue={c?.logoUrl} placeholder="https://..." />
          </div>
        </div>

        {/* Document defaults */}
        <div className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl p-6">
          <h2 className="text-[#C8A96E] text-xs uppercase tracking-widest font-medium mb-5">
            Configuración de documentos
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Prefijo de facturas" name="invoicePrefix" defaultValue={c?.invoicePrefix ?? "INV"} />
            <Field label="Prefijo de cotizaciones" name="quotePrefix" defaultValue={c?.quotePrefix ?? "COT"} />
            <Field label="Moneda por defecto" name="currency" defaultValue={c?.currency ?? "USD"} />
            <Field label="Días de crédito por defecto" name="paymentTermsDays" defaultValue={c?.paymentTermsDays ?? 30} type="number" />
            <Field label="Tasa de ITBMS (%)" name="taxRatePercent" defaultValue={Number(c?.taxRatePercent ?? 7)} type="number" />
          </div>
        </div>

        {/* Footer notes */}
        <div className="bg-[#0a0a10] border border-white/[0.06] rounded-2xl p-6">
          <h2 className="text-[#C8A96E] text-xs uppercase tracking-widest font-medium mb-5">
            Pie de página en documentos
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-white/50 text-xs uppercase tracking-widest font-medium mb-1.5">
                Pie de página (español)
              </label>
              <textarea
                name="footerNotes_es"
                defaultValue={c?.footerNotes_es ?? ""}
                rows={2}
                placeholder="Ej: Gracias por su confianza. Servicios sujetos a los términos y condiciones."
                className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white/80 text-sm placeholder-white/20 focus:outline-none focus:border-[#C8A96E]/40 resize-none transition-all"
              />
            </div>
            <div>
              <label className="block text-white/50 text-xs uppercase tracking-widest font-medium mb-1.5">
                Pie de página (inglés)
              </label>
              <textarea
                name="footerNotes_en"
                defaultValue={c?.footerNotes_en ?? ""}
                rows={2}
                placeholder="E.g.: Thank you for your trust. Services subject to terms and conditions."
                className="w-full bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white/80 text-sm placeholder-white/20 focus:outline-none focus:border-[#C8A96E]/40 resize-none transition-all"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 bg-[#C8A96E] hover:bg-[#d4b87a] text-[#030611] text-sm font-semibold rounded-lg transition-all"
          >
            Guardar configuración
          </button>
        </div>
      </form>
    </div>
  );
}
