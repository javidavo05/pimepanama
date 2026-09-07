/**
 * Páginas de servicio con URL-keyword.
 *
 * Existen por una razón concreta de SEO: la competencia que rankea primero
 * para "desarrollo de software a medida en Panamá" tiene una URL dedicada a
 * esa consulta (protostech.com/desarrollo-software-panama, leo.com.pa/
 * desarrollo-de-software). La portada sola no puede competir por todas las
 * consultas comerciales a la vez.
 *
 * Todo lo que se afirma acá es verificable con lo que ya dice el sitio:
 * fundada en 2019, 5 desarrolladores, más de 30 sistemas entregados, sin
 * subcontratar y el código queda en manos del cliente. Nada de cifras,
 * plazos ni clientes inventados.
 */

export type ServiceFaq = { q: string; a: string };

export type ServiceContent = {
  slug: string;
  /** Migas de pan y título corto en la navegación interna. */
  shortName: string;
  h1: string;
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  intro: string;
  /** Tipos de servicio para el schema Service. */
  serviceTypes: string[];
  includes: { title: string; body: string }[];
  process: { step: string; title: string; body: string }[];
  /** Casos del portafolio que sirven de prueba. Enlaces internos reales. */
  cases: { slug: string; title: string; blurb: string }[];
  faqs: ServiceFaq[];
  /** Enlaces a los otros servicios: reparte autoridad entre las páginas. */
  related: string[];
};

const CTA_NOTE =
  "Contanos qué proceso querés resolver y en 24 horas hábiles te respondemos con una lectura concreta del proyecto y el siguiente paso que recomendamos.";

export const SERVICES: ServiceContent[] = [
  {
    slug: "desarrollo-de-software-a-medida",
    shortName: "Software a medida",
    h1: "Desarrollo de software a medida en Panamá",
    metaTitle: "Desarrollo de Software a Medida en Panamá | Pime Panamá",
    metaDescription:
      "Desarrollamos software a medida para empresas en Panamá: sistemas de gestión, plataformas SaaS, CRM y automatización. Equipo propio, sin subcontratar, y el código queda tuyo.",
    eyebrow: "Servicio",
    intro:
      "Un software a medida se justifica cuando el negocio ya no cabe en una herramienta genérica: cuando el equipo mantiene el proceso vivo a fuerza de hojas de cálculo, cuando dos sistemas no se hablan y alguien copia datos de uno a otro, o cuando la licencia mensual crece con cada usuario sin que la herramienta se adapte a cómo trabajan de verdad. Construimos ese sistema desde cero, con el flujo real de la empresa, no con el que el proveedor decidió que debería tener.",
    serviceTypes: [
      "Desarrollo de software a medida",
      "Sistemas de gestión empresarial",
      "Automatización de procesos",
      "Integración de sistemas",
    ],
    includes: [
      {
        title: "Levantamiento del proceso real",
        body: "Antes de escribir código mapeamos cómo trabaja hoy el equipo, incluidos los atajos y las excepciones que nadie documentó. La mayoría de los sistemas fracasan por diseñarse contra el proceso ideal en vez del que ocurre.",
      },
      {
        title: "El sistema, no una plantilla",
        body: "Módulos construidos para tu operación: inventario, cobros, agenda, reportes, roles y permisos, lo que el negocio necesite. Sin pagar por funcionalidades que nunca vas a usar ni pelear con las que faltan.",
      },
      {
        title: "Integración con lo que ya usás",
        body: "Conectamos el sistema nuevo con la contabilidad, la pasarela de pago, WhatsApp, el correo o el ERP que ya tengan. El objetivo es que se deje de copiar datos a mano entre herramientas.",
      },
      {
        title: "El código es tuyo",
        body: "Al terminar el repositorio queda a tu nombre. No hay rehén técnico: si mañana querés seguir con otro equipo, podés. Es una decisión deliberada nuestra, no un extra que se cobra aparte.",
      },
    ],
    process: [
      {
        step: "01",
        title: "Diagnóstico",
        body: "Una conversación técnica para entender el proceso y su tamaño real. Salís de ahí con una lectura honesta de si conviene software a medida o si una herramienta existente te resuelve más barato.",
      },
      {
        step: "02",
        title: "Alcance y propuesta",
        body: "Definimos qué entra en la primera versión y qué queda para después. Preferimos un sistema chico funcionando en producción antes que uno grande a medio construir.",
      },
      {
        step: "03",
        title: "Construcción por fases",
        body: "Entregas parciales que se pueden usar y criticar. Quien te cotiza es quien programa: no hay una capa de gerentes traduciendo entre vos y el equipo técnico.",
      },
      {
        step: "04",
        title: "Puesta en marcha y acompañamiento",
        body: "Migración de datos, capacitación del equipo y ajustes con el sistema ya en uso. La adopción se gana en las primeras semanas de operación, no en la demo.",
      },
    ],
    cases: [
      { slug: "tdp", title: "Ticketing de transporte nacional", blurb: "Portal público, terminales POS en taquilla y panel financiero en un solo sistema." },
      { slug: "academyx", title: "CRM para una academia deportiva", blurb: "Inscripciones multi-rol, cobros y seguimiento de alumnos." },
      { slug: "godmode", title: "Centro de control B2B", blurb: "Suscripciones, inventario y jerarquías de usuarios en un panel unificado." },
    ],
    faqs: [
      {
        q: "¿Cuánto cuesta desarrollar un software a medida en Panamá?",
        a: "Depende del alcance, y cualquiera que dé un número sin conocer el proceso está adivinando. Lo que sí podemos hacer rápido es acotarlo: en una conversación de diagnóstico identificamos qué parte del proceso da el mayor retorno, la cotizamos primero y dejamos el resto para fases siguientes. Así el primer desembolso es acotado y verificás resultados antes de comprometer el presupuesto completo.",
      },
      {
        q: "¿Cuánto tarda un proyecto?",
        a: "Una primera versión útil en producción suele tomar entre 6 y 12 semanas, según la cantidad de módulos y las integraciones con sistemas existentes. Trabajamos por fases justamente para que no tengas que esperar al final del proyecto para empezar a usar algo.",
      },
      {
        q: "¿Conviene software a medida o una herramienta ya hecha?",
        a: "Si un producto del mercado cubre tu proceso, conviene ese producto: sale más barato y está probado. El software a medida se justifica cuando el proceso es una ventaja competitiva, cuando las licencias por usuario ya cuestan más que construir, o cuando estás forzando la herramienta con planillas y trabajo manual para que haga lo que necesitás. En el diagnóstico te lo decimos con franqueza, aunque la respuesta sea que no nos contrates.",
      },
      {
        q: "¿Quién queda como dueño del código?",
        a: "Vos. El repositorio se entrega a tu nombre y no retenemos accesos como forma de asegurar la relación. Tampoco cobramos comisión sobre las transacciones que procese el sistema.",
      },
      {
        q: "¿Subcontratan el desarrollo?",
        a: "No. Somos un equipo de cinco desarrolladores en Ciudad de Panamá y los proyectos los construimos nosotros. La persona que te cotiza es la que programa, que es lo que evita que el alcance se pierda en traducciones.",
      },
    ],
    related: ["sistemas-empresariales-erp", "desarrollo-de-aplicaciones-web", "desarrollo-de-aplicaciones-moviles"],
  },
  {
    slug: "sistemas-empresariales-erp",
    shortName: "Sistemas empresariales",
    h1: "Sistemas empresariales y ERP a medida en Panamá",
    metaTitle: "Sistemas Empresariales y ERP a Medida en Panamá | Pime Panamá",
    metaDescription:
      "Sistemas empresariales tipo ERP construidos a medida para empresas en Panamá: inventario, compras, facturación, trazabilidad y reportes gerenciales, integrados en una sola operación.",
    eyebrow: "Servicio",
    intro:
      "Un ERP de caja obliga a la empresa a operar como el software supone que opera. Cuando el negocio tiene un proceso propio —rutas de producción que cambian por proyecto, una estructura de precios particular, trazabilidad que el rubro exige— esa fricción se paga todos los días en trabajo manual. Construimos el sistema empresarial alrededor de la operación real: los módulos que hacen falta, conectados entre sí, con la información gerencial saliendo del mismo lugar donde se captura.",
    serviceTypes: [
      "Sistemas empresariales ERP a medida",
      "Control de inventario y almacenes",
      "Trazabilidad de producción",
      "Reportes gerenciales y tableros de control",
    ],
    includes: [
      {
        title: "Módulos según la operación",
        body: "Inventario, compras, ventas, facturación, cuentas por cobrar y por pagar, producción, planilla. Se construyen los que el negocio necesita y en el orden en que le duelen.",
      },
      {
        title: "Una sola fuente de verdad",
        body: "El dato se captura una vez, donde ocurre, y alimenta todo lo demás. Se acaba la conciliación entre la planilla de bodega, la del vendedor y la de contabilidad.",
      },
      {
        title: "Tableros para decidir",
        body: "Reportes gerenciales que responden preguntas concretas —qué se está atrasando, dónde está el cuello de botella, qué margen deja cada línea— en vez de volcar tablas para que alguien las interprete.",
      },
      {
        title: "Roles y trazabilidad",
        body: "Cada acción queda registrada con quién y cuándo. Permisos por rol para que cada quien vea lo suyo, requisito habitual en auditoría y en operaciones con varias sedes.",
      },
    ],
    process: [
      { step: "01", title: "Mapa de la operación", body: "Recorremos el flujo completo, del pedido a la entrega, e identificamos dónde se pierde información hoy." },
      { step: "02", title: "Matriz de capacidades", body: "Definimos qué tiene que poder hacer el sistema y qué queda explícitamente fuera. Sin esto, un ERP crece sin límite y no se termina nunca." },
      { step: "03", title: "Construcción modular", body: "Se despliega por módulos, empezando por el que más trabajo manual elimina. Cada uno entra en producción antes de empezar el siguiente." },
      { step: "04", title: "Adopción en piso", body: "Capacitación y acompañamiento con el sistema funcionando. En operaciones con personal de planta, la interfaz tiene que ser obvia o el dato no se captura." },
    ],
    cases: [
      { slug: "godmode", title: "Centro de control B2B", blurb: "Suscripciones, inventario automotriz y jerarquías de usuarios unificados." },
      { slug: "sembradores", title: "SaaS de gestión multi-sede", blurb: "Plataforma white-label con miembros, donaciones y eventos en varias sedes." },
      { slug: "tdp", title: "Operación de transporte nacional", blurb: "Venta en taquilla, portal público y control financiero en el mismo sistema." },
    ],
    faqs: [
      {
        q: "¿Qué diferencia hay entre un ERP comercial y uno a medida?",
        a: "Un ERP comercial trae procesos ya definidos y buenas prácticas de la industria: si tu operación se parece a esa plantilla, es la opción más rápida y barata. Uno a medida tiene sentido cuando el proceso propio es parte de la ventaja competitiva, o cuando la parametrización del producto comercial ya requiere tanto desarrollo y trabajo manual que deja de ser más económica.",
      },
      {
        q: "¿Se puede integrar con el sistema contable que ya usamos?",
        a: "Sí, y suele ser lo recomendable. Rara vez conviene reemplazar la contabilidad: es más sensato que el sistema nuevo se encargue de la operación y le entregue a contabilidad la información ya cuadrada, por integración y no por digitación.",
      },
      {
        q: "¿Hay que migrar los datos históricos?",
        a: "Se migra lo que se va a usar: catálogos, clientes, saldos y el histórico que la operación o la auditoría necesiten consultar. Arrastrar todo sin criterio es una de las razones más comunes por las que una implementación se atrasa.",
      },
      {
        q: "¿Qué pasa si el personal de planta no es técnico?",
        a: "Es la restricción de diseño más importante en estos proyectos. Las interfaces de captura tienen que ser visuales y resolverse en pocos toques, con lectura de códigos donde se pueda. Un sistema que agrega carga a quien ya está saturado no se usa, y sin captura no hay datos.",
      },
    ],
    related: ["desarrollo-de-software-a-medida", "desarrollo-de-aplicaciones-web", "desarrollo-de-aplicaciones-moviles"],
  },
  {
    slug: "desarrollo-de-aplicaciones-web",
    shortName: "Aplicaciones web",
    h1: "Desarrollo de aplicaciones web en Panamá",
    metaTitle: "Desarrollo de Aplicaciones Web en Panamá | Pime Panamá",
    metaDescription:
      "Desarrollo de aplicaciones web y plataformas SaaS en Panamá: portales de clientes, marketplaces, sistemas multi-usuario y paneles de gestión. Rápidas, seguras y hechas para escalar.",
    eyebrow: "Servicio",
    intro:
      "Una aplicación web es la forma más directa de poner un proceso en manos de mucha gente a la vez: clientes, proveedores y equipo entrando desde el navegador, sin instalar nada. Construimos portales de clientes, marketplaces, plataformas SaaS multi-inquilino y paneles internos, con la parte aburrida bien hecha: permisos, rendimiento, respaldo y seguridad.",
    serviceTypes: [
      "Desarrollo de aplicaciones web",
      "Plataformas SaaS multi-inquilino",
      "Portales de clientes y proveedores",
      "Marketplaces",
    ],
    includes: [
      { title: "Multi-usuario y multi-rol", body: "Cada perfil ve y puede lo suyo: cliente, vendedor, administrador, auditor. Los permisos se diseñan al principio, no se parchan después." },
      { title: "Rendimiento que aguanta", body: "Sistemas dimensionados para el uso real. Uno de los que construimos maneja más de 50.000 transacciones diarias; la arquitectura se elige según el volumen que se espera, no por moda." },
      { title: "Pagos e integraciones", body: "Pasarelas de pago, facturación electrónica, notificaciones por correo y WhatsApp, y conexión con los sistemas que ya usa la empresa." },
      { title: "SEO desde la arquitectura", body: "Si la plataforma tiene que aparecer en Google, eso condiciona cómo se renderiza. Se decide al construir: agregarlo después casi siempre implica rehacer." },
    ],
    process: [
      { step: "01", title: "Definición del producto", body: "Quién lo usa, qué tiene que lograr y cómo se ve el éxito en números. Sin eso, una plataforma web crece a fuerza de pedidos sueltos." },
      { step: "02", title: "Arquitectura y diseño", body: "Modelo de datos, permisos y las pantallas críticas. Las decisiones de arquitectura son las caras de revertir; se toman temprano y explícitas." },
      { step: "03", title: "Desarrollo iterativo", body: "Versiones desplegadas que se pueden probar desde el navegador durante todo el proyecto, no una entrega única al final." },
      { step: "04", title: "Salida a producción", body: "Dominio, certificados, respaldos, monitoreo y analítica. Y una ventana de acompañamiento con usuarios reales adentro." },
    ],
    cases: [
      { slug: "tickets", title: "Plataforma de ticketing", blurb: "Multi-inquilino, dimensionada para más de 50.000 transacciones diarias." },
      { slug: "bnb-real-estate", title: "Marketplace inmobiliario", blurb: "CMS integrado, portales de comprador y vendedor, SEO en tres idiomas." },
      { slug: "wedding-saas", title: "SaaS multi-inquilino", blurb: "Plataforma white-label con soporte para siete idiomas." },
    ],
    faqs: [
      {
        q: "¿Cuál es la diferencia entre una página web y una aplicación web?",
        a: "Una página web informa: cuenta quién sos y qué vendés. Una aplicación web hace trabajo: la gente entra, se identifica, carga datos, hace transacciones y obtiene un resultado. Si tu necesidad incluye usuarios que inician sesión y un proceso que ocurre adentro, es una aplicación.",
      },
      {
        q: "¿Puede aparecer en Google una aplicación web?",
        a: "Las partes públicas sí, y depende de decisiones de arquitectura tomadas al construir: qué se renderiza en el servidor, cómo se estructuran las URLs y cómo se sirven las páginas de catálogo. Si el posicionamiento importa, hay que plantearlo desde el inicio; incorporarlo sobre una plataforma ya hecha suele costar más que haberlo previsto.",
      },
      {
        q: "¿Dónde queda alojada?",
        a: "Normalmente en infraestructura en la nube a nombre de tu empresa, para que las cuentas, el dominio y los datos sean tuyos. Te dejamos el despliegue documentado.",
      },
      {
        q: "¿Qué pasa después de lanzar?",
        a: "Podés seguir con nosotros por mantenimiento y evolución, o llevarte el proyecto a otro equipo: el código queda a tu nombre. No cobramos comisión por transacción ni retenemos accesos.",
      },
    ],
    related: ["desarrollo-de-software-a-medida", "sistemas-empresariales-erp", "desarrollo-de-aplicaciones-moviles"],
  },
  {
    slug: "desarrollo-de-aplicaciones-moviles",
    shortName: "Aplicaciones móviles",
    h1: "Desarrollo de aplicaciones móviles en Panamá",
    metaTitle: "Desarrollo de Aplicaciones Móviles en Panamá | Pime Panamá",
    metaDescription:
      "Desarrollo de aplicaciones móviles en Panamá para iOS y Android: apps de campo, portales para clientes y captura de datos en operación. También apps instalables sin pasar por las tiendas.",
    eyebrow: "Servicio",
    intro:
      "Una app móvil se justifica cuando el trabajo ocurre lejos del escritorio: un inspector en patio, un vendedor en ruta, un técnico en sitio, un cliente que necesita resolver algo desde el teléfono. Construimos aplicaciones para iOS y Android, y también aplicaciones web instalables (PWA) cuando conviene evitar el ciclo de aprobación de las tiendas.",
    serviceTypes: [
      "Desarrollo de aplicaciones móviles",
      "Aplicaciones iOS y Android",
      "Aplicaciones web progresivas (PWA)",
      "Captura de datos en campo",
    ],
    includes: [
      { title: "Trabajo en campo", body: "Captura de datos, fotos, firmas y lectura de códigos donde ocurre la operación, con sincronización cuando vuelve la señal." },
      { title: "iOS, Android o PWA", body: "La decisión se toma según el caso, no por defecto. Una app instalable desde el navegador evita el ciclo de revisión de las tiendas y se actualiza al instante; una app nativa da acceso pleno al hardware. Te explicamos cuál conviene y por qué." },
      { title: "Notificaciones que llegan", body: "Avisos push al teléfono para lo que no puede esperar a que alguien abra un panel: una orden nueva, una aprobación pendiente, una alerta de operación." },
      { title: "Conectada al sistema central", body: "La app no vive sola: es la ventana móvil del mismo sistema que usa la oficina, con los mismos datos y permisos." },
    ],
    process: [
      { step: "01", title: "Definir el momento de uso", body: "Dónde está la persona, cuánto tiempo tiene y con qué señal cuenta. Una app de campo se diseña distinto a una de oficina." },
      { step: "02", title: "Prototipo navegable", body: "Las pantallas principales antes de programarlas, para corregir el flujo cuando cambiarlo todavía es barato." },
      { step: "03", title: "Desarrollo y pruebas en dispositivo", body: "Se prueba en teléfonos reales y en las condiciones reales de uso, no solo en el emulador." },
      { step: "04", title: "Publicación", body: "Distribución en App Store y Google Play, o instalación directa si es PWA. Las tiendas tienen sus propios tiempos de revisión y los planificamos como parte del proyecto." },
    ],
    cases: [
      { slug: "tdp", title: "Terminales de venta en taquilla", blurb: "Puntos de venta conectados al mismo sistema que el portal público." },
      { slug: "academyx", title: "Gestión con acceso multi-rol", blurb: "Padres, entrenadores y administración entrando cada uno a lo suyo." },
      { slug: "wedding-site", title: "App colaborativa en tiempo real", blurb: "Confirmaciones y galerías compartidas actualizándose al instante." },
    ],
    faqs: [
      {
        q: "¿Conviene una app nativa o una aplicación web instalable?",
        a: "Si necesitás cámara avanzada, funcionamiento sin señal prolongado, Bluetooth o presencia en las tiendas, va nativa. Si el objetivo es que el equipo tenga un acceso rápido desde el teléfono y poder actualizar sin esperar revisión, una PWA sale más económica y se despliega el mismo día. La mayoría de los proyectos internos se resuelven bien con PWA.",
      },
      {
        q: "¿Funciona sin internet?",
        a: "Se puede diseñar para operar sin conexión y sincronizar al recuperar señal. Agrega complejidad, así que conviene definir desde el inicio qué parte tiene que funcionar offline de verdad y cuál no.",
      },
      {
        q: "¿Se publica en App Store y Google Play?",
        a: "Sí, y gestionamos la publicación. Vale saber que las tiendas revisan cada versión y ese plazo depende de ellas, no de nosotros: se planifica como parte del cronograma en vez de prometer una fecha exacta.",
      },
      {
        q: "¿La app reemplaza al sistema de escritorio?",
        a: "Casi nunca. Lo normal es que sea la ventana móvil del mismo sistema: el trabajo de campo se hace en el teléfono y la administración sigue en pantalla grande, sobre los mismos datos.",
      },
    ],
    related: ["desarrollo-de-software-a-medida", "sistemas-empresariales-erp", "desarrollo-de-aplicaciones-web"],
  },
];

export const CTA_COPY = CTA_NOTE;

export function getService(slug: string): ServiceContent | undefined {
  return SERVICES.find((s) => s.slug === slug);
}


/**
 * Preguntas de la portada. Son las que la gente escribe en Google antes de
 * contratar; responderlas en la página que compite por la consulta principal
 * gana el fragmento destacado y sube el CTR sin subir de posición.
 */
export const HOME_FAQS: ServiceFaq[] = [
  {
    q: "¿Qué hace una empresa de desarrollo de software en Panamá?",
    a: "Construye sistemas que no existen en el mercado o que no se ajustan a cómo trabaja una empresa concreta: sistemas de gestión, plataformas SaaS, CRM, aplicaciones web y móviles, e integraciones entre herramientas que hoy no se hablan entre sí. En Pime Panamá lo hacemos con equipo propio en Ciudad de Panamá, sin subcontratar.",
  },
  {
    q: "¿Cuánto cuesta desarrollar un sistema a medida en Panamá?",
    a: "Depende del alcance, y dar una cifra sin conocer el proceso es adivinar. Lo que sí se puede acotar rápido es por dónde empezar: identificamos la parte del proceso que da mayor retorno, la cotizamos primero y el resto queda para fases siguientes, de modo que el primer desembolso sea acotado y verificable.",
  },
  {
    q: "¿Cuánto tarda un proyecto de software?",
    a: "Una primera versión en producción suele tomar entre 6 y 12 semanas según los módulos y las integraciones. Trabajamos por fases para que puedas usar algo antes de que termine el proyecto completo.",
  },
  {
    q: "¿El código del sistema queda a nombre de mi empresa?",
    a: "Sí. El repositorio se entrega a tu nombre y no retenemos accesos. Tampoco cobramos comisión sobre las transacciones que procese el sistema.",
  },
  {
    q: "¿Atienden empresas fuera de Panamá?",
    a: "Sí. Trabajamos con empresas de Panamá, Centroamérica y el resto de Latinoamérica. La zona horaria de Panamá coincide con buena parte de la región y con el este de Estados Unidos, lo que permite trabajar en horario compartido.",
  },
];
