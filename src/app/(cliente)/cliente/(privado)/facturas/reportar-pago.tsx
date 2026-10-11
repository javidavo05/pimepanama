"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { reportarPagoAction } from "../acciones";
import { SubirArchivos } from "@/components/portal/subir-archivos";
import { btnPrincipal } from "@/components/portal/ui";
import { campo, errorBox, etiqueta, okBox } from "@/components/auth/auth-shell";

export function ReportarPago({ facturas }: { facturas: { id: string; etiqueta: string; falta: number }[] }) {
  const [estado, accion, enviando] = useActionState(reportarPagoAction, null);
  const [factura, setFactura] = useState(facturas[0]?.id ?? "");
  const monto = facturas.find((f) => f.id === factura)?.falta;
  const form = useRef<HTMLFormElement>(null);
  const [clave, setClave] = useState(0);
  useEffect(() => { if (estado?.ok) { form.current?.reset(); setClave((k) => k + 1); } }, [estado]);
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Panama" });
  return (
    <form ref={form} action={accion} className="space-y-4">
      {estado?.ok && <p className={okBox} role="status">{estado.mensaje}</p>}
      <div>
        <label htmlFor="factura" className={etiqueta}>Factura</label>
        <select id="factura" name="factura" value={factura} onChange={(e) => setFactura(e.target.value)} className={`${campo} field-select pr-8`}>
          {facturas.map((f) => <option key={f.id} value={f.id}>{f.etiqueta}</option>)}
          <option value="">Abono sin factura</option>
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="monto" className={etiqueta}>Monto (USD)</label>
          <input id="monto" name="monto" inputMode="decimal" required key={`${factura}-${clave}`} defaultValue={monto ? monto.toFixed(2) : ""} className={`${campo} tabular-nums`} />
        </div>
        <div>
          <label htmlFor="fecha" className={etiqueta}>Fecha</label>
          <input id="fecha" name="fecha" type="date" required defaultValue={hoy} max={hoy} className={campo} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="metodo" className={etiqueta}>Cómo pagaste</label>
          <select id="metodo" name="metodo" defaultValue="transferencia" className={`${campo} field-select pr-8`}>
            <option value="transferencia">Transferencia</option><option value="yappy">Yappy</option><option value="cheque">Cheque</option><option value="efectivo">Efectivo</option><option value="otro">Otro</option>
          </select>
        </div>
        <div>
          <label htmlFor="referencia" className={etiqueta}>Referencia</label>
          <input id="referencia" name="referencia" maxLength={120} className={campo} placeholder="Número de la transacción" />
        </div>
      </div>
      <SubirArchivos key={clave} max={1} etiqueta="Adjuntar comprobante" />
      {estado?.error && <p className={errorBox} role="alert">{estado.error}</p>}
      <button type="submit" className={`${btnPrincipal} w-full`} disabled={enviando}>{enviando ? "Enviando…" : "Reportar el pago"}</button>
    </form>
  );
}
