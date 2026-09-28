import type { ReactNode } from "react";

/**
 * Botones de la suite. Todos comparten alto, radio y peso: lo único que cambia
 * entre variantes es el color. En el celular miden 44 px de alto (el mínimo
 * cómodo para el dedo); desde tablet bajan a 40.
 */
const BTN_BASE =
  "inline-flex items-center justify-center gap-2 min-h-11 sm:min-h-10 px-4 py-2 rounded-lg text-sm font-semibold text-center sm:whitespace-nowrap transition-colors disabled:opacity-50 disabled:pointer-events-none";

export const btn = {
  /** Acción principal de la pantalla. */
  primary: `${BTN_BASE} bg-brand hover:bg-brand-hi text-on-brand`,
  /** Acción principal en color arena: documentos (facturas, cotizaciones, bitácoras). */
  accent: `${BTN_BASE} bg-sand hover:bg-sand-lt text-on-accent`,
  /** Acción secundaria al lado de la principal. */
  secondary: `${BTN_BASE} border border-line-mid hover:border-line-loud text-fg-mute hover:text-fg`,
};

/**
 * Fila de acciones: en el celular ocupa todo el ancho y reparte los botones en
 * columnas iguales; desde tablet vuelve a ser una fila compacta a la derecha.
 * Así dos botones nunca quedan de tamaños distintos ni uno se sale del borde.
 */
export function ActionRow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`grid grid-flow-col auto-cols-fr gap-2 sm:flex sm:items-center sm:shrink-0 ${className}`}>
      {children}
    </div>
  );
}

/**
 * Encabezado de cada pantalla de la suite: título, descripción y acciones. En
 * el celular las acciones van debajo del título, a lo ancho; desde tablet, a
 * la derecha. Antes cada página armaba el suyo y en el celular el título y los
 * botones se apretaban en la misma fila hasta salirse de la pantalla.
 */
export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  className = "",
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Línea chica sobre el título (volver, estado de sincronización…). */
  eyebrow?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between ${className}`}>
      <div className="min-w-0">
        {eyebrow}
        <h1 className="text-fg text-2xl font-semibold tracking-tight break-words">{title}</h1>
        {description && <div className="text-fg-dim text-sm mt-1">{description}</div>}
      </div>
      {actions && <ActionRow>{actions}</ActionRow>}
    </div>
  );
}

/**
 * Control segmentado (Tabla / Tablero, Todos / Pendiente / Pagado…). En el
 * celular ocupa el ancho completo con segmentos iguales; desde tablet se
 * ajusta a su contenido.
 */
export const seg = {
  group: "grid grid-flow-col auto-cols-fr gap-1 p-1 bg-fill border border-line rounded-xl sm:inline-grid",
  item: (active: boolean) =>
    `inline-flex items-center justify-center gap-2 min-h-10 sm:min-h-9 px-3 rounded-lg text-sm font-medium transition-colors ${
      active ? "bg-panel text-fg shadow-sm" : "text-fg-dim hover:text-fg"
    }`,
};

/**
 * Botones de las tarjetas en el celular (Ver, PDF, Editar, Eliminar…). Van en
 * una fila de columnas iguales (`tileRow`), así cada tarjeta tiene sus acciones
 * alineadas y del mismo tamaño en vez de enlaces de texto sueltos.
 */
const TILE_BASE =
  "inline-flex items-center justify-center gap-2 min-h-11 px-3 rounded-lg border text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none";

export const tile = {
  row: "grid grid-flow-col auto-cols-fr gap-2",
  neutral: `${TILE_BASE} border-line text-fg-mute hover:text-fg hover:border-line-mid`,
  accent: `${TILE_BASE} border-sand/30 bg-sand/10 text-sand-fg hover:bg-sand/15`,
  danger: `${TILE_BASE} border-danger/25 text-danger hover:bg-danger/10`,
};
