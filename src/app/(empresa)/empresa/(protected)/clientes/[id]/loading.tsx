/** Ficha del cliente cargando: encabezado con saldo, pestañas y la primera pestaña. */
export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-pulse" aria-busy="true" aria-label="Cargando la ficha del cliente">
      <div className="h-4 w-40 rounded bg-fill-2" />
      <div className="bg-panel border border-line rounded-2xl p-4 sm:p-6 space-y-4">
        <div className="h-6 w-32 rounded-full bg-fill-2" />
        <div className="h-8 w-2/3 rounded-lg bg-fill-2" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-16 rounded-xl bg-fill" />
          ))}
        </div>
      </div>
      <div className="flex gap-6 border-b border-line pb-3 overflow-hidden">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-4 w-20 shrink-0 rounded bg-fill-2" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 h-64 rounded-2xl bg-panel border border-line" />
        <div className="h-40 rounded-2xl bg-panel border border-line" />
      </div>
    </div>
  );
}
