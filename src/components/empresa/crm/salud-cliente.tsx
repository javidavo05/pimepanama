import Link from "@/components/empresa/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { puedeVer } from "@/lib/auth/permisos";
import { saludDeUnCliente } from "@/lib/crm/reportes-datos";

const NIVEL = {
  sana: { label: "Sana", punto: "bg-ok", texto: "text-ok", fondo: "bg-ok/10 border-ok/20" },
  atencion: { label: "Atención", punto: "bg-warn", texto: "text-warn", fondo: "bg-warn/10 border-warn/20" },
  riesgo: { label: "En riesgo", punto: "bg-danger", texto: "text-danger", fondo: "bg-danger/10 border-danger/20" },
} as const;

/**
 * Salud del cliente en una línea: sana, atención o en riesgo, con el motivo. Mismas reglas que
 * «Clientes en riesgo» en /empresa/reportes (src/lib/crm/reportes.ts → saludCliente). Componente de servidor:
 * `<SaludCliente clientId={c.id} />`. Si falla la consulta, no muestra nada (nunca rompe la ficha).
 */
export async function SaludCliente({ clientId }: { clientId: string }) {
  let s: Awaited<ReturnType<typeof saludDeUnCliente>> = null;
  let verReportes = false;
  try {
    const u = await getEmpresaUser();
    verReportes = puedeVer(u.miembro.area, "reportes");
    s = await saludDeUnCliente(u.id, clientId, puedeVer(u.miembro.area, "dinero"));
  } catch (err) {
    console.error("[crm] salud del cliente", clientId, err);
    return null;
  }
  if (!s) return null;
  const n = NIVEL[s.nivel];
  const motivo = s.motivos.length ? s.motivos.map((m) => m.texto).join(" · ") : "Sin pendientes: al día, sin tickets viejos y con movimiento reciente.";
  return (
    <div className={`flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border px-3 py-2 text-sm ${n.fondo}`} role="status">
      <span className={`inline-flex shrink-0 items-center gap-2 font-semibold ${n.texto}`}>
        <span className={`h-2 w-2 rounded-full ${n.punto}`} aria-hidden />
        Salud: {n.label}
      </span>
      <span className="min-w-0 grow basis-48 text-fg-mute [overflow-wrap:anywhere]">{motivo}</span>
      {verReportes && s.nivel !== "sana" && (
        <Link href="/empresa/reportes?vista=riesgo" className="inline-flex min-h-11 shrink-0 items-center text-brand-fg text-xs font-semibold hover:underline">Ver clientes en riesgo</Link>
      )}
    </div>
  );
}

export default SaludCliente;
