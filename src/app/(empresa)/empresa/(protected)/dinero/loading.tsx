/** Dinero cargando: encabezado, filtros, seis cifras, la gráfica y la lista. */
export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-pulse" aria-busy="true" aria-label="Cargando el dinero">
      <div className="space-y-2">
        <div className="h-8 w-40 rounded-lg bg-fill-2" />
        <div className="h-4 w-2/3 rounded bg-fill-2" />
      </div>
      <div className="h-16 rounded-2xl bg-fill" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-24 rounded-2xl bg-panel border border-line" />)}
      </div>
      <div className="h-96 rounded-2xl bg-panel border border-line" />
      <div className="h-72 rounded-2xl bg-panel border border-line" />
    </div>
  );
}
