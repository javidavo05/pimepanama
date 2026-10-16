/** Reportes cargando: encabezado, pestañas, periodo, cifras y una gráfica. */
export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-pulse" aria-busy="true" aria-label="Cargando los reportes">
      <div className="space-y-2">
        <div className="h-8 w-40 rounded-lg bg-fill-2" />
        <div className="h-4 w-2/3 rounded bg-fill-2" />
      </div>
      <div className="flex gap-6 border-b border-line pb-3 overflow-hidden">
        {Array.from({ length: 5 }, (_, i) => <div key={i} className="h-4 w-24 shrink-0 rounded bg-fill-2" />)}
      </div>
      <div className="h-12 rounded-xl bg-fill" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <div key={i} className="h-24 rounded-2xl bg-panel border border-line" />)}
      </div>
      <div className="h-72 rounded-2xl bg-panel border border-line" />
    </div>
  );
}
