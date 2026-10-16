/** Mientras llegan los documentos: la forma de la pantalla, sin saltos al cargar. */
export default function CargandoDocumentos() {
  return (
    <div className="space-y-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando tus documentos…</span>
      <div className="space-y-3">
        <div className="h-3 w-24 rounded bg-fill-2 animate-pulse" />
        <div className="h-10 w-2/3 max-w-md rounded-lg bg-fill-2 animate-pulse" />
        <div className="h-4 w-full max-w-xl rounded bg-fill animate-pulse" />
      </div>
      <div className="p-card p-4 sm:p-6 space-y-4">
        {[0, 1, 2].map((i) => <div key={i} className="h-14 rounded-lg bg-fill animate-pulse" />)}
      </div>
    </div>
  );
}
