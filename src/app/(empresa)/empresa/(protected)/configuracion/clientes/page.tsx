import Link from "@/components/empresa/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { prisma } from "@/lib/prisma";
import { reglasDe, tarifaDe } from "@/lib/portal/horas";
import { saldoCliente } from "@/lib/portal/saldo";
import { dinero } from "@/lib/portal/datos";
import { EnviosClientes, LineaCliente, TarifasForm } from "./formularios";

export const metadata = { title: "Clientes Normal y Premium — Pime Suite" };

const card = "bg-panel border border-line rounded-2xl p-4 sm:p-6 min-w-0";

export default async function ConfigClientesPage() {
  const u = await getEmpresaUser();
  const reglas = reglasDe(u.config);
  const clientes = await prisma.client.findMany({
    where: { userId: u.id, archivedAt: null, NOT: { name: { startsWith: "[prueba]" } } },
    orderBy: [{ brandLine: "desc" }, { name: "asc" }],
    select: { id: true, name: true, company: true, brandLine: true, hourlyRate: true, documents: { where: { type: "FACTURA" }, select: { id: true, status: true, total: true, amountPaid: true } }, payments: { select: { documentId: true, amount: true, status: true } } },
  });
  const filas = clientes.map((c) => ({ ...c, facturado: saldoCliente(c.documents, c.payments).facturado, tarifa: tarifaDe(c, reglas) })).sort((a, b) => b.facturado - a.facturado);
  const premium = filas.filter((c) => c.brandLine === "premium").length;
  const envios = !!u.config?.clientEmailsEnabled;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <nav className="flex items-center gap-2 text-sm text-fg-dim" aria-label="Ruta">
        <Link href="/empresa/configuracion" className="inline-flex items-center min-h-11 sm:min-h-8 hover:text-fg-mute">Configuración</Link><span aria-hidden>/</span><span className="text-fg-mute">Clientes</span>
      </nav>
      <div>
        <h1 className="text-fg text-2xl font-semibold tracking-tight">Clientes Normal y Premium</h1>
        <p className="text-fg-dim text-sm mt-1">La tarifa por hora de cada línea, en qué línea está cada cliente y si Pime les escribe.</p>
      </div>

      <section className={card}>
        <h2 className="text-fg text-base font-semibold">Tarifa por hora</h2>
        <p className="text-fg-dim text-sm mt-1">Un cliente con tarifa propia mantiene la suya. Las horas ya registradas no cambian.</p>
        <div className="mt-4"><TarifasForm normal={reglas.tarifaNormal} premium={reglas.tarifaPremium} /></div>
      </section>

      <section className={`${card} ${envios ? "" : "border-warn/40"}`}>
        <EnviosClientes encendidos={envios} />
      </section>

      <section className={card}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-fg text-base font-semibold">Línea de cada cliente</h2>
          <p className="text-fg-dim text-sm">{filas.length - premium} Normal · {premium} Premium</p>
        </div>
        <p className="text-fg-dim text-sm mt-1">Ordenados por lo facturado, para decidir quién pasa a Premium. Premium cambia su cuenta a negro y oro y su tarifa.</p>
        {filas.length === 0 ? (
          <div className="mt-4 rounded-xl bg-fill p-6 text-center space-y-2">
            <p className="text-fg font-medium">Todavía no hay clientes.</p>
            <Link href="/empresa/clientes/nuevo" className="text-brand-fg font-semibold hover:underline">Crear el primer cliente</Link>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {filas.map((c) => (
              <li key={c.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <Link href={`/empresa/clientes/${c.id}`} className="block text-fg text-sm font-semibold truncate hover:underline">{c.company || c.name}</Link>
                  <p className="text-fg-dim text-xs">Facturado {dinero(c.facturado)} · {dinero(c.tarifa)}/h{c.hourlyRate != null ? " (tarifa propia)" : ""}</p>
                </div>
                <LineaCliente clientId={c.id} linea={c.brandLine === "premium" ? "premium" : "normal"} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
