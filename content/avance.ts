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
    estado: "aprobado",
    ruta: "/avance",
    revisar: [
      "Que el proyecto arranca en localhost:3000 sin tocar el repo viejo.",
      "Que este tablero lee bien en el teléfono y en escritorio.",
    ],
    capturas: { w375: "/avance/paso-01-375.png", w1440: "/avance/paso-01-1440.png" },
    notas: [
      "Preflight: identidad OK (perfil pime). Falta token de Vercel y publicar el repo en GitHub (gh no tiene sesión de javidavo05).",
      "Aprobado por Javier el 2026-10-08 desde el artifact. Decidido: acento = azul profundo del solape del logo (#2306D4), misma cuenta de Vercel que pimepanama, repo GitHub cuando haya sesión gh de javidavo05.",
    ],
    actualizado: "2026-10-08",
  },
  {
    n: 2,
    titulo: "Sistema visual",
    descripcion: "Paleta, escala tipográfica, espaciado, componentes base y demos vivas de movimiento en /avance/sistema.",
    estado: "aprobado",
    ruta: "/avance/sistema",
    revisar: [
      "Paleta: el acento es el azul del solape del logo. Ningún rastro del azul ni del púrpura viejos.",
      "Tipografía: Manrope 800 en títulos y cifras, Inter en todo lo demás. Mirá que no salte nada al cargar.",
      "Movimiento: en cada demo tocá «Reproducir». Acercá el mouse a los botones (imán), entrá a los enlaces por la izquierda y por la derecha (subrayado), movelo sobre la tarjeta de Academyx (inclinación y luz).",
      "Tocá «Simular movimiento reducido» arriba: todo pasa a fundidos cortos sin desplazamiento.",
    ],
    capturas: { w375: "/avance/paso-02-375.png", w1440: "/avance/paso-02-1440.png" },
    lighthouseMovil: 97,
    notas: [
      "docs/01-referencia.md, docs/02-mapa-referencia.md, src/styles/tokens.css y scripts/check-motion.ts quedaron escritos. Tailwind se quitó: sus utilidades chocaban con las clases del sistema y no se usaba.",
      "Lighthouse móvil (mediana de 5 corridas, build local en :3001): rendimiento 97, accesibilidad 100, buenas prácticas 100. SEO 63 porque la página lleva noindex a propósito. Escritorio: 100/100/100. El LCP observado es de 41 ms; el simulado (2.0–2.6 s) es un artefacto del modelo de Lighthouse que cuenta los 153 KB de runtime de Next como dependencia. Se ataca en el paso del hero con el analizador de bundle.",
      "El gris de metadatos de la referencia (#8A93A6) daba 3.0:1 de contraste; se oscureció a #667087 (4.8:1) para cumplir AA.",
      "Aprobado por Javier el 2026-10-08 desde el artifact.",
    ],
    actualizado: "2026-10-08",
  },
  {
    n: 3,
    titulo: "Navegación",
    descripcion: "Escritorio y móvil, con ocultar/mostrar al scroll, indicador deslizante y menú coreografiado.",
    estado: "en_revision",
    ruta: "/es",
    revisar: [
      "Bajá y subí: la barra se esconde al bajar y vuelve al subir. Pasados 48 px se compacta y aparece el fondo con la línea.",
      "Escritorio (≥ 1024): el subrayado se desliza entre Trabajo, Capacidades, Proceso e Industrias según la sección en pantalla. A la derecha, el nombre de la sección en mayúsculas cambia con un fundido, como la cabecera de la propuesta.",
      "Teléfono: tocá las dos líneas. La cortina baja, los enlaces entran uno por uno y al final aparecen el teléfono y el botón. Escape cierra. Las líneas se cruzan en X.",
      "Probá en /en: mismo menú en inglés. El EN/ES de la derecha cambia de idioma.",
      "La home todavía es un esqueleto de secciones para que la navegación tenga dónde vivir.",
    ],
    capturas: { w375: "/avance/paso-03-375.png", w1440: "/avance/paso-03-1440.png" },
    lighthouseMovil: 98,
    notas: [
      "Lighthouse móvil en /es (mediana de 3, build local): rendimiento 98, accesibilidad 100, buenas prácticas 100. Escritorio 100/100/96: las 96 son por dos 404 de precarga a /es/portfolio y /es/contacto, que todavía no existen. SEO 58 por el noindex a propósito.",
      "Revisión en teléfonos (quick, 6 modelos: iPhone 17e, iPhone 18 Pro Max, Galaxy S26, Pixel 11 Pro XL, Z Fold 8 abierto y cerrado) con los motores de Safari y Chrome: 0 problemas graves, 1 aviso de toque justo en Fold 8 abierto que corresponde al botón de herramientas de desarrollo de Next, no al sitio.",
      "Las rutas quedaron en /es y /en con layout propio; / redirige a /es. Las páginas de avance viven en un grupo aparte.",
    ],
    actualizado: "2026-10-08",
  },
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
