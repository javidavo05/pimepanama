"use client";

export default function PlatformsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="w-full max-w-6xl">
      <div className="bg-panel border border-line rounded-xl px-6 py-12 text-center" role="alert">
        <p className="text-fg-mute font-medium">No se pudieron cargar las plataformas</p>
        <p className="text-fg-dim text-sm mt-1">Puede ser la conexión con la base de datos. Tus datos no se perdieron.</p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 px-4 min-h-11 bg-brand hover:bg-brand-hi text-on-brand text-sm font-semibold rounded-lg transition-colors"
        >
          Volver a intentar
        </button>
      </div>
    </div>
  );
}
