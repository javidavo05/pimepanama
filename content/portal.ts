/* Sección «Su cuenta»: cómo trabaja el cliente dentro del sistema de Pime (pedido de Javier, 2026-10-16).
   La ventana es una demostración con datos de ejemplo, marcada como tal; los textos de cada parte describen
   lo que la cuenta real hace hoy: avance por fase que se mueve con lo que el equipo cierra en el código,
   aviso y factura al terminar una fase, tickets con estimado para aprobar y facturas con su saldo. */
import type { Lang } from "./site";

export type Fase = { nombre: string; tareas: string[]; hechas: number; precio: number };
export type Ticket = { id: string; titulo: string; estado: "resuelto" | "en_curso" | "recibido"; quien?: string };
export type Factura = { id: string; concepto: string; monto: number; estado: "pagada" | "pendiente"; fecha: string; lineas: string[] };

export type Portal = {
  eyebrow: string;
  titulo: string[];
  bajada: string;
  sellos: string[];
  pasos: { id: "avance" | "tickets" | "facturas"; titulo: string; texto: string }[];
  ventana: {
    ejemplo: string;
    cliente: string;
    proyecto: string;
    avanceTotal: string;
    faseDe: (n: number, total: number) => string;
    estados: { hecha: string; curso: string; revision: string; pendiente: string };
    feedTitulo: string;
    desdeCodigo: string;
    ahora: string;
    listo: (fase: string, tarea: string) => string;
    faseLista: (fase: string) => string;
    cobro: (fase: string, monto: string) => string;
    verEnVivo: string;
    siguiente: string;
    repetir: string;
    pausa: string;
    fases: Fase[];
    feedInicial: string[];
    tickets: {
      nuevo: string;
      tipo: string;
      tipos: string[];
      detalle: string;
      ejemplo: string;
      vacio: string;
      enviar: string;
      lista: string;
      estados: { resuelto: string; en_curso: string; recibido: string };
      respuesta: string;
      equipo: string;
      estimado: string;
      aprobar: string;
      aprobado: string;
      items: Ticket[];
    };
    facturas: {
      pagado: string;
      pendiente: string;
      proximo: string;
      estados: { pagada: string; pendiente: string };
      verDetalle: string;
      pdf: string;
      pdfNota: string;
      pdfHref: string;
      pagar: string;
      items: Factura[];
    };
  };
  cta: { href: string; label: string };
  cta2: { texto: string; href: string; label: string };
};

export const PORTAL: Record<Lang, Portal> = {
  es: {
    eyebrow: "06 · Su cuenta",
    titulo: ["Su proyecto,", "en vivo, paso a paso"],
    bajada: "Trabajamos con un sistema propio de manejo de proyectos. Desde el primer día usted tiene su cuenta: ve el estado real de su proyecto en todo momento, descarga sus facturas y pide cambios con tickets, sin esperar un correo ni pedir un reporte. Esta es una demostración con datos de ejemplo: toque cada parte para verla funcionar.",
    sellos: ["Estado del proyecto en tiempo real", "Facturas en PDF cuando las necesite", "Tickets con respuesta y estimado"],
    pasos: [
      { id: "avance", titulo: "Avance en vivo", texto: "Cada fase tiene su barra. Se mueve sola cuando el equipo cierra una tarea en el código, y usted lee qué quedó listo con sus palabras." },
      { id: "tickets", titulo: "Tickets y cambios", texto: "Pide un cambio o reporta un problema desde su cuenta. Ve quién lo tiene, cada respuesta y el estimado antes de aprobarlo." },
      { id: "facturas", titulo: "Facturas y pagos", texto: "Cada fase se cobra al entregarse. Ve lo pagado, lo pendiente y el detalle de cada factura." },
    ],
    ventana: {
      ejemplo: "Ejemplo",
      cliente: "Su empresa",
      proyecto: "Sistema de pedidos y entregas",
      avanceTotal: "Avance total",
      faseDe: (n, t) => `Fase ${n} de ${t} en curso`,
      estados: { hecha: "Entregada", curso: "En curso", revision: "Lista para su revisión", pendiente: "Pendiente" },
      feedTitulo: "Lo último",
      desdeCodigo: "Desde el código",
      ahora: "ahora",
      listo: (f, t) => `Listo en ${f}: ${t}`,
      faseLista: (f) => `${f} está lista para su revisión`,
      cobro: (f, m) => `Factura de ${f}: ${m}, se paga al entregar`,
      verEnVivo: "Ver el avance en vivo",
      siguiente: "Siguiente avance",
      repetir: "Repetir",
      pausa: "Pausar",
      fases: [
        { nombre: "Fase 1 · Catálogo y pedidos", tareas: ["Los vendedores toman pedidos desde el celular", "Catálogo con precios por cliente"], hechas: 2, precio: 3600 },
        { nombre: "Fase 2 · Entregas", tareas: ["Rutas del día por camión", "El chofer marca cada entrega con foto", "El cliente recibe aviso al salir su pedido", "Devoluciones registradas en el momento", "Cierre de ruta con lo cobrado"], hechas: 2, precio: 2400 },
        { nombre: "Fase 3 · Cobros", tareas: ["Estados de cuenta por cliente", "Recordatorios de pago automáticos"], hechas: 0, precio: 2200 },
        { nombre: "Fase 4 · Reportes", tareas: ["Ventas por vendedor y por zona", "Tablero para gerencia"], hechas: 0, precio: 1600 },
      ],
      feedInicial: ["Listo en Fase 2: El chofer marca cada entrega con foto", "Listo en Fase 2: Rutas del día por camión"],
      tickets: {
        nuevo: "Nuevo ticket",
        tipo: "Tipo",
        tipos: ["Soporte", "Cambio", "Idea nueva"],
        detalle: "¿Qué necesita?",
        ejemplo: "Agregar el reporte de ventas por sucursal",
        vacio: "Escriba qué necesita para poder enviarlo.",
        enviar: "Enviar ticket",
        lista: "Sus tickets",
        estados: { resuelto: "Resuelto", en_curso: "En curso", recibido: "Recibido" },
        respuesta: "Lo revisamos hoy. Estimado: 3 horas.",
        equipo: "Equipo Pime",
        estimado: "Estimado 3 h · espera su aprobación",
        aprobar: "Aprobar estimado",
        aprobado: "Aprobado · ya se está haciendo",
        items: [
          { id: "T-0145", titulo: "Logo nuevo en las facturas", estado: "en_curso", quien: "Diseño" },
          { id: "T-0142", titulo: "No llega el correo de confirmación", estado: "resuelto" },
        ],
      },
      facturas: {
        pagado: "Pagado",
        pendiente: "Pendiente",
        proximo: "Próximo pago: Fase 2, al entregarse",
        estados: { pagada: "Pagada", pendiente: "Pendiente" },
        verDetalle: "Ver detalle",
        pdf: "Descargar PDF",
        pdfNota: "Factura de ejemplo con datos ficticios.",
        pdfHref: "/demo/factura-ejemplo.pdf",
        pagar: "Se paga con tarjeta o transferencia desde su cuenta.",
        items: [
          { id: "FAC-0038", concepto: "Fase 2 · Entregas", monto: 2400, estado: "pendiente", fecha: "Al entregar", lineas: ["Rutas, entregas con foto y avisos al cliente", "Devoluciones y cierre de ruta"] },
          { id: "FAC-0035", concepto: "Soporte · 3 horas", monto: 120, estado: "pagada", fecha: "02 oct", lineas: ["T-0142 · Correo de confirmación", "3 h a US$ 40 la hora"] },
          { id: "FAC-0031", concepto: "Fase 1 · Catálogo y pedidos", monto: 3600, estado: "pagada", fecha: "12 sep", lineas: ["Pedidos desde el celular", "Catálogo con precios por cliente"] },
        ],
      },
    },
    cta: { href: "/cliente/acceso", label: "Entrar a su cuenta" },
    cta2: { texto: "¿Todavía no es cliente?", href: "/es/contacto", label: "Pida una propuesta" },
  },
  en: {
    eyebrow: "06 · Your account",
    titulo: ["Your project,", "live, step by step"],
    bajada: "We run every project on our own project-management system. From day one you get your account: see the real status of your project at any moment, download your invoices and request changes with tickets, without waiting for an email or asking for a report. This is a demo with sample data: tap each part to see it work.",
    sellos: ["Real-time project status", "Invoices in PDF whenever you need them", "Tickets with replies and estimates"],
    pasos: [
      { id: "avance", titulo: "Live progress", texto: "Each phase has its own bar. It moves on its own when the team closes a task in the code, and you read what got done in plain words." },
      { id: "tickets", titulo: "Tickets and changes", texto: "Request a change or report a problem from your account. See who has it, every reply and the estimate before you approve it." },
      { id: "facturas", titulo: "Invoices and payments", texto: "Each phase is billed when it is delivered. See what is paid, what is pending and the detail of every invoice." },
    ],
    ventana: {
      ejemplo: "Example",
      cliente: "Your company",
      proyecto: "Orders and deliveries system",
      avanceTotal: "Overall progress",
      faseDe: (n, t) => `Phase ${n} of ${t} in progress`,
      estados: { hecha: "Delivered", curso: "In progress", revision: "Ready for your review", pendiente: "Pending" },
      feedTitulo: "Latest",
      desdeCodigo: "From the code",
      ahora: "now",
      listo: (f, t) => `Done in ${f}: ${t}`,
      faseLista: (f) => `${f} is ready for your review`,
      cobro: (f, m) => `Invoice for ${f}: ${m}, due on delivery`,
      verEnVivo: "Watch progress live",
      siguiente: "Next update",
      repetir: "Replay",
      pausa: "Pause",
      fases: [
        { nombre: "Phase 1 · Catalog and orders", tareas: ["Sales reps take orders from their phone", "Catalog with per-client prices"], hechas: 2, precio: 3600 },
        { nombre: "Phase 2 · Deliveries", tareas: ["Daily routes per truck", "Drivers log each delivery with a photo", "Clients get a notice when their order leaves", "Returns recorded on the spot", "Route close-out with what was collected"], hechas: 2, precio: 2400 },
        { nombre: "Phase 3 · Collections", tareas: ["Account statements per client", "Automatic payment reminders"], hechas: 0, precio: 2200 },
        { nombre: "Phase 4 · Reports", tareas: ["Sales by rep and by zone", "Management dashboard"], hechas: 0, precio: 1600 },
      ],
      feedInicial: ["Done in Phase 2: Drivers log each delivery with a photo", "Done in Phase 2: Daily routes per truck"],
      tickets: {
        nuevo: "New ticket",
        tipo: "Type",
        tipos: ["Support", "Change", "New idea"],
        detalle: "What do you need?",
        ejemplo: "Add the sales report by branch",
        vacio: "Write what you need to send it.",
        enviar: "Send ticket",
        lista: "Your tickets",
        estados: { resuelto: "Resolved", en_curso: "In progress", recibido: "Received" },
        respuesta: "We'll review it today. Estimate: 3 hours.",
        equipo: "Pime team",
        estimado: "Estimate 3 h · awaiting your approval",
        aprobar: "Approve estimate",
        aprobado: "Approved · already in progress",
        items: [
          { id: "T-0145", titulo: "New logo on invoices", estado: "en_curso", quien: "Design" },
          { id: "T-0142", titulo: "Confirmation email not arriving", estado: "resuelto" },
        ],
      },
      facturas: {
        pagado: "Paid",
        pendiente: "Pending",
        proximo: "Next payment: Phase 2, on delivery",
        estados: { pagada: "Paid", pendiente: "Pending" },
        verDetalle: "View detail",
        pdf: "Download PDF",
        pdfNota: "Sample invoice with fictitious data.",
        pdfHref: "/demo/sample-invoice.pdf",
        pagar: "Pay by card or transfer from your account.",
        items: [
          { id: "FAC-0038", concepto: "Phase 2 · Deliveries", monto: 2400, estado: "pendiente", fecha: "On delivery", lineas: ["Routes, photo-logged deliveries and client notices", "Returns and route close-out"] },
          { id: "FAC-0035", concepto: "Support · 3 hours", monto: 120, estado: "pagada", fecha: "Oct 02", lineas: ["T-0142 · Confirmation email", "3 h at US$ 40 per hour"] },
          { id: "FAC-0031", concepto: "Phase 1 · Catalog and orders", monto: 3600, estado: "pagada", fecha: "Sep 12", lineas: ["Orders from the phone", "Catalog with per-client prices"] },
        ],
      },
    },
    cta: { href: "/cliente/acceso", label: "Sign in to your account" },
    cta2: { texto: "Not a client yet?", href: "/en/contacto", label: "Request a proposal" },
  },
};
