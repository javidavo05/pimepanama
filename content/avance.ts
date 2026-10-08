/** Tablero de avance del sitio nuevo. Se edita a mano al cerrar cada paso. */
export type EstadoPaso = "pendiente" | "en_revision" | "aprobado" | "con_cambios";

export type Paso = {
  n: number;
  titulo: string;
  descripcion: string;
  estado: EstadoPaso;
  /** Ruta en localhost:3000 donde se revisa esa parte. */
  ruta?: string;
  /** Qué mirar y cómo disparar las animaciones. */
  revisar?: string[];
  capturas?: { w375?: string; w1440?: string };
  /** Lighthouse móvil (0-100) de esa parte, medido contra next start -p 3001. */
  lighthouseMovil?: number;
  notas?: string[];
  actualizado?: string;
};

export const ETIQUETA_ESTADO: Record<EstadoPaso, string> = {
  pendiente: "Pendiente",
  en_revision: "En revisión",
  aprobado: "Aprobado",
  con_cambios: "Con cambios",
};

export const PASOS: Paso[] = [
  {
    n: 1,
    titulo: "Proyecto nuevo, preflight y tablero",
    descripcion: "Next.js 16 desde cero, identidad pime-git, tokens iniciales y esta página.",
    estado: "en_revision",
    ruta: "/avance",
    revisar: [
      "Que el proyecto arranca en localhost:3000 sin tocar el repo viejo.",
      "Que este tablero lee bien en el teléfono y en escritorio.",
    ],
    capturas: { w375: "/avance/paso-01-375.png", w1440: "/avance/paso-01-1440.png" },
    notas: [
      "Preflight: identidad OK (perfil pime). Falta token de Vercel y publicar el repo en GitHub (gh no tiene sesión de javidavo05).",
      "La referencia usa literalmente Manrope e Inter, así que se conservan como permite el mandato. El azul y el púrpura de la referencia están prohibidos: el acento sale del solape del logo (decisión pendiente en el artifact).",
    ],
    actualizado: "2026-10-08",
  },
  { n: 2, titulo: "Sistema visual", descripcion: "Paleta, escala tipográfica, espaciado, componentes base y demos vivas de movimiento en /avance/sistema.", estado: "pendiente", ruta: "/avance/sistema" },
  { n: 3, titulo: "Navegación", descripcion: "Escritorio y móvil, con ocultar/mostrar al scroll, indicador deslizante y menú coreografiado.", estado: "pendiente" },
  { n: 4, titulo: "Hero", descripcion: "Titular con revelado por línea y composición de UI real en HTML/CSS/SVG que se usa sola.", estado: "pendiente" },
  { n: 5, titulo: "Prueba: cifras y clientes", descripcion: "Contadores con dígitos que ruedan y marquee de clientes autorizados.", estado: "pendiente" },
  { n: 6, titulo: "Capacidades", descripcion: "Sección sticky: la capacidad activa cambia con el scroll y la UI de producto se transforma.", estado: "pendiente" },
  { n: 7, titulo: "Portfolio destacado", descripcion: "Scroll horizontal fijado, tarjetas con inclinación 3D y spotlight.", estado: "pendiente" },
  { n: 8, titulo: "Proceso", descripcion: "Línea que se dibuja con el scroll. Precio llave en mano y garantía de 3 meses.", estado: "pendiente" },
  { n: 9, titulo: "Industrias y cierre", descripcion: "Industrias atendidas y bloque de contacto.", estado: "pendiente" },
  { n: 10, titulo: "Footer", descripcion: "Wordmark gigante que se revela con el scroll.", estado: "pendiente" },
  { n: 11, titulo: "/portfolio con filtros", descripcion: "Filtrable por industria y tipo.", estado: "pendiente", ruta: "/es/portfolio" },
  { n: 12, titulo: "/portfolio/[slug]", descripcion: "Caso de estudio con transición de elemento compartido desde la tarjeta.", estado: "pendiente" },
  { n: 13, titulo: "/servicios y /empresa", descripcion: "Páginas internas.", estado: "pendiente" },
  { n: 14, titulo: "/contacto y paleta ⌘K", descripcion: "Wizard guiado con opciones preseleccionadas y buscador global.", estado: "pendiente" },
  { n: 15, titulo: "Versión EN", descripcion: "Copy nativo en inglés, hreflang y OG por idioma.", estado: "pendiente", ruta: "/en" },
  { n: 16, titulo: "Puerta final", descripcion: "npm run gate completo y docs/04-entrega.md con redirects 301.", estado: "pendiente" },
];
