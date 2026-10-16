"use client";

/**
 * Importar clientes en tres pasos: archivo → columnas → vista previa. Todo se lee en el navegador; el servidor solo
 * recibe las celdas y el mapeo al confirmar (acciones-importar.ts), y vuelve a revisar los correos repetidos.
 */
import { useActionState, useMemo, useState } from "react";
import Link from "@/components/empresa/link";
import { btn } from "@/components/empresa/page-header";
import { parseCsv, aCsv } from "@/lib/crm/csv";
import { CAMPOS_IMPORTAR, MAX_FILAS_IMPORTAR, revisarFilas, sugerirMapeo, type CampoImportar, type Mapeo } from "@/lib/crm/csv-importar";
import { importarClientesAction, type EstadoImportar } from "@/app/(empresa)/empresa/(protected)/acciones-importar";

const campo = "w-full min-h-11 rounded-lg border border-line-mid bg-fill px-3 text-base sm:text-sm text-fg focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";
const tarjeta = "bg-panel border border-line rounded-2xl p-4 sm:p-6 space-y-4";
const ESTADO: Record<string, { label: string; clase: string }> = {
  crear: { label: "Se crea", clase: "bg-ok/10 text-ok" },
  repetido: { label: "Se salta", clase: "bg-warn/10 text-warn" },
  error: { label: "Con error", clase: "bg-danger/10 text-danger" },
};

const PLANTILLA = aCsv(["Nombre", "Empresa", "Correo", "Teléfono", "RUC", "Persona de contacto", "Cargo", "Ciudad", "Fuente", "Industria", "Etiquetas"],
  [["María Gómez", "Constructora Gómez S.A.", "maria@gomez.com.pa", "+507 6000-0000", "155-123-45 DV 6", "María Gómez", "Gerente", "Panamá", "Referido", "Construcción", "VIP, Gobierno"]]);

export function ImportarForm({ correos }: { correos: string[] }) {
  const [archivo, setArchivo] = useState<string | null>(null);
  const [encabezados, setEncabezados] = useState<string[]>([]);
  const [datos, setDatos] = useState<string[][]>([]);
  const [mapeo, setMapeo] = useState<Mapeo>({});
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const [soloProblemas, setSoloProblemas] = useState(false);
  const [estado, importar, importando] = useActionState<EstadoImportar, FormData>(importarClientesAction, null);

  const revision = useMemo(() => (datos.length ? revisarFilas(datos, mapeo, correos) : null), [datos, mapeo, correos]);
  const tieneNombre = Object.values(mapeo).some((v) => v === "name" || v === "company");

  async function leer(file: File | undefined) {
    setErrorArchivo(null);
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setErrorArchivo("El archivo pesa más de 5 MB. Divídelo en partes."); return; }
    const texto = await file.text();
    const filas = parseCsv(texto);
    if (filas.length < 2) { setErrorArchivo("No encontré filas de clientes. La primera fila debe tener los nombres de las columnas y las siguientes, un cliente cada una."); return; }
    if (filas.length - 1 > MAX_FILAS_IMPORTAR) { setErrorArchivo(`El archivo tiene ${filas.length - 1} filas; se pueden importar hasta ${MAX_FILAS_IMPORTAR} por vez. Divídelo en partes.`); return; }
    const [cab, ...resto] = filas;
    setArchivo(file.name); setEncabezados(cab); setDatos(resto); setMapeo(sugerirMapeo(cab));
  }
  function reiniciar() { setArchivo(null); setEncabezados([]); setDatos([]); setMapeo({}); }

  if (estado?.ok) {
    return (
      <div className={`${tarjeta} text-center`}>
        <p className="text-fg text-lg font-semibold" role="status">{estado.mensaje}</p>
        <p className="text-fg-dim text-sm">Quedan con la fuente que traía la hoja o «Importación». Salen primero en la lista: márcalos para asignarles responsable o etiqueta de una vez.</p>
        <div className="flex flex-col justify-center gap-2 sm:flex-row">
          <Link href="/empresa/clientes" className={btn.primary}>Ver los clientes</Link>
          <button type="button" onClick={() => location.reload()} className={btn.secondary}>Importar otra hoja</button>
        </div>
      </div>
    );
  }

  const muestra = (revision?.filas ?? []).filter((f) => !soloProblemas || f.estado !== "crear").slice(0, 10);

  return (
    <div className="space-y-6">
      <section className={tarjeta} aria-labelledby="paso-1">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 id="paso-1" className="text-fg font-semibold">1. Elige el archivo</h2>
            <p className="text-fg-dim text-sm">CSV separado por comas o por punto y coma. En Excel: Archivo → Guardar como → CSV UTF-8.</p>
          </div>
          <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(PLANTILLA)}`} download="plantilla-clientes.csv" className={btn.secondary}>Descargar plantilla</a>
        </div>
        {archivo ? (
          <div className="flex flex-col gap-3 rounded-xl border border-line bg-fill p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="min-w-0 text-sm text-fg [overflow-wrap:anywhere]"><span className="font-semibold">{archivo}</span> · {datos.length} {datos.length === 1 ? "fila" : "filas"} · {encabezados.length} columnas</p>
            <button type="button" onClick={reiniciar} className={btn.secondary}>Cambiar archivo</button>
          </div>
        ) : (
          <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line-mid p-6 text-center hover:border-brand">
            <span className="text-fg font-semibold">Toca para elegir el archivo CSV</span>
            <span className="text-fg-dim text-xs">Hasta {MAX_FILAS_IMPORTAR} clientes y 5 MB</span>
            <input type="file" accept=".csv,text/csv,text/plain" className="sr-only" onChange={(e) => leer(e.target.files?.[0])} />
          </label>
        )}
        {errorArchivo && <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{errorArchivo}</p>}
      </section>

      {archivo && (
        <section className={tarjeta} aria-labelledby="paso-2">
          <div>
            <h2 id="paso-2" className="text-fg font-semibold">2. Revisa las columnas</h2>
            <p className="text-fg-dim text-sm">Ya sugerimos a qué dato va cada columna por su nombre. Cambia lo que no esté bien o elige «No traer».</p>
          </div>
          <ul className="divide-y divide-line">
            {encabezados.map((h, i) => {
              const ejemplo = datos.find((f) => f[i])?.[i] ?? "";
              const info = CAMPOS_IMPORTAR.find((c) => c.id === mapeo[i]);
              return (
                <li key={i} className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_240px] sm:items-center sm:gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-fg [overflow-wrap:anywhere]">{h || `Columna ${i + 1}`}</p>
                    <p className="text-xs text-fg-dim truncate">{ejemplo ? `Ej.: ${ejemplo}` : "Vacía en todas las filas"}</p>
                  </div>
                  <label className="block min-w-0">
                    <span className="sr-only">Dato de la columna {h}</span>
                    <select value={mapeo[i] ?? ""} onChange={(e) => setMapeo((m) => ({ ...m, [i]: e.target.value as CampoImportar | "" }))} className={campo}>
                      <option value="">No traer</option>
                      {CAMPOS_IMPORTAR.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                    {info?.leyenda && <span className="mt-1 block text-xs text-fg-dim">{info.leyenda}</span>}
                  </label>
                </li>
              );
            })}
          </ul>
          {!tieneNombre && <p className="rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-sm text-warn" role="alert">Elige qué columna es el Nombre o la Empresa: sin eso no se puede crear el cliente.</p>}
        </section>
      )}

      {archivo && revision && tieneNombre && (
        <section className={tarjeta} aria-labelledby="paso-3">
          <div>
            <h2 id="paso-3" className="text-fg font-semibold">3. Vista previa</h2>
            <p className="text-fg-dim text-sm">Se saltan las filas sin nombre, con correo inválido o con un correo que ya tiene cliente o se repite en el archivo.</p>
          </div>
          <dl className="grid grid-cols-3 gap-2 sm:gap-4">
            {([["Se crean", revision.crear, "text-ok"], ["Repetidos", revision.repetidos, "text-warn"], ["Con error", revision.errores, "text-danger"]] as const).map(([l, n, c]) => (
              <div key={l} className="rounded-xl border border-line bg-fill p-3">
                <dt className="text-xs text-fg-dim">{l}</dt>
                <dd className={`font-mono text-2xl font-semibold ${n ? c : "text-fg-faint"}`}>{n}</dd>
              </div>
            ))}
          </dl>
          {revision.crear < revision.filas.length && (
            <label className="flex min-h-11 items-center gap-3 text-sm text-fg cursor-pointer">
              <input type="checkbox" checked={soloProblemas} onChange={(e) => setSoloProblemas(e.target.checked)} className="h-5 w-5 accent-brand" />
              Ver solo las filas que se saltan
            </label>
          )}
          <ul className="divide-y divide-line rounded-xl border border-line">
            {muestra.map((f) => (
              <li key={f.fila} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-fg [overflow-wrap:anywhere]">{f.company || f.name || "Sin nombre"}{f.company && f.name !== f.company ? <span className="font-normal text-fg-dim"> · {f.name}</span> : null}</p>
                  <p className="text-xs text-fg-dim [overflow-wrap:anywhere]">Fila {f.fila}{f.email ? ` · ${f.email}` : ""}{f.phone ? ` · ${f.phone}` : ""}{f.etiquetas.length ? ` · ${f.etiquetas.join(", ")}` : ""}</p>
                  {f.motivo && <p className={`text-xs font-semibold ${f.estado === "error" ? "text-danger" : "text-warn"}`}>{f.motivo}</p>}
                </div>
                <span className={`shrink-0 self-start rounded-full px-3 py-1 text-xs font-semibold sm:self-center ${ESTADO[f.estado].clase}`}>{ESTADO[f.estado].label}</span>
              </li>
            ))}
          </ul>
          {revision.filas.length > 10 && <p className="text-xs text-fg-dim">Se muestran las primeras 10 de {soloProblemas ? revision.filas.length - revision.crear : revision.filas.length} filas.</p>}

          <form action={importar} className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
            <input type="hidden" name="datos" value={JSON.stringify(datos)} />
            <input type="hidden" name="mapeo" value={JSON.stringify(mapeo)} />
            <p className="text-sm text-fg-dim">Cada cliente con persona, correo o teléfono queda con su contacto principal.</p>
            <button disabled={importando || !revision.crear} className={btn.primary}>
              {importando ? "Creando clientes…" : revision.crear ? `Crear ${revision.crear} ${revision.crear === 1 ? "cliente" : "clientes"}` : "No hay clientes nuevos"}
            </button>
          </form>
          {estado?.error && <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{estado.error}</p>}
        </section>
      )}
    </div>
  );
}
