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
      "2026-10-09, pedido de Javier: versión oscura del sitio. Sigue al sistema (prefers-color-scheme) y se puede forzar con el selector Auto · Claro · Oscuro de la navegación (y del menú móvil). Se guarda en el navegador y se aplica antes del primer paint. Los bloques de tinta siguen siendo oscuros en ambos temas; en tema oscuro llevan un tono más profundo y líneas.",
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
    estado: "aprobado",
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
      "Aprobado por Javier el 2026-10-08 desde el artifact.",
    ],
    actualizado: "2026-10-08",
  },
  {
    n: 4,
    titulo: "Hero",
    descripcion: "Titular a todo el ancho (ERP y CRM a medida, desde cero) y un panel de demostración con cuatro tableros distintos, cada uno con su layout y sus gráficas.",
    estado: "aprobado",
    ruta: "/es",
    revisar: [
      "Cuarta versión: cada vista es un tablero distinto. Operaciones: kanban de tres columnas, carga por responsable (barras horizontales) y semana en curso (Gantt); filtrá por responsable. Cobros: cifra grande con anillo de meta, área de cobros con tres períodos, antigüedad de la cartera y próximos vencimientos. Clientes: embudo comercial tocable, tarjetas con salud de la cuenta y mapa de calor de satisfacción. Documentos: carpetas, lista, columnas apiladas por tipo, calendario de actividad y lista de firmas con casillas que funcionan.",
      "Nada se mueve solo ni reacciona al cursor; solo cuando tocás algo. Pasá el mouse por el área de cobros y por las columnas apiladas para ver los valores.",
      "Titular: «Su ERP o CRM, construido desde cero para su empresa». Probá también /en.",
    ],
    capturas: { w375: "/avance/paso-04-375.png", w1440: "/avance/paso-04-1440.png" },
    lighthouseMovil: 97,
    notas: [
      "Notas de Javier (2026-10-08): v1 «se ve como lo previo, necesito algo que impresione, full height moderno»; v2 «sin parallax, que se mueva se ve falso; funcional, más gráficas; enfatizar ERP/CRM a medida desde cero»; v3 «las pantallas son las mismas: tableros completamente diferentes, distintos tipos de gráficas y layouts en todos».",
      "Lighthouse móvil en /es (3 corridas, build local): rendimiento 97–99, accesibilidad 100, buenas prácticas 96 (dos 404 de precarga a páginas que aún no existen). Escritorio 100/100/96.",
      "Teléfonos (quick, 6 modelos actuales, motores reales de Safari y Chrome): 0 graves tras pasar los chips a una fila con scroll. Quedan avisos de toque justo en chips del panel.",
      "Ocho tipos de gráfica, todos en SVG/CSS de un solo tono o familia secuencial del acento: barras horizontales, Gantt, área con tooltip, anillo de progreso, embudo, mapa de calor, calendario y columnas apiladas con leyenda.",
      "Aprobado por Javier el 2026-10-09 desde el artifact (cuarta versión).",
    ],
    actualizado: "2026-10-09",
  },
  {
    n: 5,
    titulo: "Prueba: cifras y clientes",
    descripcion: "Bloque oscuro con las tres cifras reales, dígitos que ruedan al entrar, y una cinta infinita que acelera con el scroll.",
    estado: "aprobado",
    ruta: "/es#prueba",
    revisar: [
      "Es el único bloque oscuro de la home fuera del footer, como el bloque de cifras clave de la propuesta.",
      "Bajá hasta la sección: el titular entra por líneas y los dígitos ruedan desde 0 hasta 7+, 30+ y 3. Volvé a subir y bajar para repetirlo no hace falta: cuenta una sola vez.",
      "La cinta de abajo avanza sola, se pausa al pasar el cursor y acelera cuando hacés scroll rápido. Con movimiento reducido queda quieta y envuelve.",
      "Cinta «Confían en Pime» con los logos en blanco: Svitzer (tomado de su sitio), Iglesia Adventista del Séptimo Día, B&B Real Estate, HOLO Realty, Academyx, Revive (Smart Church), John Henry, Misaza; MedSuite va como wordmark. Javier pidió quitar Sembradores y Suarez Academy. Debajo, una segunda cinta con los tipos de sistema construidos.",
      "El monto desarrollado no aparece hasta que lo confirmes: la cifra está preparada en content/site.ts.",
    ],
    capturas: { w375: "/avance/paso-05-375.png", w1440: "/avance/paso-05-1440.png" },
    lighthouseMovil: 99,
    notas: [
      "Lighthouse móvil en /es (3 corridas, build local): rendimiento 97–99, accesibilidad 100, buenas prácticas 96 (dos 404 de precarga a páginas que aún no existen). Escritorio 100/100/96.",
      "Teléfonos (quick, 6 modelos actuales, motores reales de Safari y Chrome): 0 graves. Avisos de toque justo solo en los chips del panel de demostración del hero.",
      "La cinta es una isla de 30 líneas con rAF y solo transform; las cifras usan el contador CSS del sistema disparado por el IntersectionObserver compartido.",
      "Javier (2026-10-09): «pon los logos de las empresas que tenemos, Svitzer y la iglesia adventista, todos en blanco; son más de 50 plataformas entregadas». Los PNG se pasaron a blanco sobre transparente con Pillow; los SVG se invierten por CSS.",
      "Aprobado por Javier el 2026-10-09 desde el artifact.",
    ],
    actualizado: "2026-10-09",
  },
  {
    n: 6,
    titulo: "Capacidades",
    descripcion: "Sección sticky: la capacidad activa cambia con el scroll y la pantalla de la derecha se transforma con una escena distinta por capacidad.",
    estado: "aprobado",
    ruta: "/es#capacidades",
    revisar: [
      "Cinco capacidades: ERP y sistemas internos, CRM y ventas, SaaS multi-tenant y white-label, portales y CMS, integraciones y automatización con IA. Vienen de la página «El sistema en detalle» de la propuesta.",
      "En escritorio: bajá despacio. La pantalla de la derecha queda fija y, al cruzar cada capacidad, cambia de escena con un fundido y un cambio de layout: KPIs con barras y Gantt, embudo con contactos, grilla de empresas con anillo de plan, editor de páginas con reservas, flujo de IA con mapa de calor. Los puntos de arriba a la derecha marcan cuál está activa.",
      "Tocá el título de una capacidad: la página se desplaza hasta ella. Las capacidades inactivas bajan de tono y esconden sus módulos.",
      "En teléfono no hay panel fijo: cada capacidad lleva su propia escena debajo.",
      "Las cinco escenas son mini-aplicaciones funcionales y llenan la pantalla: ERP (filtro por área, alta de órdenes, tabla, carga y Gantt), CRM (cifras, embudo que filtra, cuentas que avanzan de etapa, actividad), SaaS (cifras, empresas seleccionables, plan con anillo e interruptores de módulos), Portal (páginas, bloques que se ocultan y vuelven, botón Publicar con estado, reservas por período) e IA (cola de mensajes, procesamiento paso a paso, resultado, respuesta al cliente, mapa de calor).",
    ],
    capturas: { w375: "/avance/paso-06-375.png", w1440: "/avance/paso-06-1440.png" },
    lighthouseMovil: 99,
    notas: [
      "Lighthouse móvil en /es (3 corridas, build local): rendimiento 99, accesibilidad 100, buenas prácticas 96 (dos 404 de precarga a páginas que aún no existen). Escritorio 100/96/96 antes del último ajuste: las capacidades inactivas usaban opacidad 0.4 y fallaban contraste; ahora cambian de color, no de opacidad.",
      "Teléfonos (quick, 6 modelos actuales, motores reales de Safari y Chrome): 0 graves tras subir los títulos de capacidad a 44 px de alto. Primera corrida: clase «caps» chocaba con la utilidad de mayúsculas del sistema y toda la sección salía en mayúsculas grises; se renombró.",
      "El mapa de calor ya no lleva números dentro de las celdas (fallaban contraste a 10 px): los valores van en el título de cada celda y en el aria-label, con una escala de intensidad debajo.",
      "Nota de Javier (2026-10-08): «la imagen del sistema se ve vacía abajo e incompleta; deben estar completos y todos funcionales». Se rehicieron las cinco escenas; la activa define la altura de la pantalla fija.",
      "Aprobado por Javier el 2026-10-09 desde el artifact.",
    ],
    actualizado: "2026-10-09",
  },
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
