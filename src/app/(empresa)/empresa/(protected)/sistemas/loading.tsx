export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-pulse" aria-busy="true" aria-label="Cargando sistemas">
      <div className="space-y-2">
        <div className="h-8 w-40 rounded-lg bg-fill-2" />
        <div className="h-4 w-72 rounded bg-fill" />
      </div>
      <div className="bg-panel border border-line rounded-2xl overflow-hidden">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[minmax(0,2fr)_auto_minmax(0,2fr)] sm:items-center sm:gap-4 px-4 sm:px-6 py-4 border-b border-line last:border-b-0">
            <div className="space-y-2">
              <div className="h-4 w-2/3 rounded bg-fill-2" />
              <div className="h-3 w-1/2 rounded bg-fill" />
            </div>
            <div className="h-6 w-32 rounded-full bg-fill-2" />
            <div className="h-3 w-3/4 rounded bg-fill" />
          </div>
        ))}
      </div>
    </div>
  );
}
