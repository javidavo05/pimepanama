export type PdfLang = "es" | "en";

export type PdfTranslations = {
  invoice: string;
  quote: string;
  log: string;
  email: string;
  billTo: string;
  quoteTo: string;
  issueDate: string;
  dueDate: string;
  validUntil: string;
  description: string;
  quantity: string;
  unitPrice: string;
  taxPct: string;
  discount: string;
  amount: string;
  subtotal: string;
  tax: string;
  total: string;
  notes: string;
  terms: string;
  authorizedBy: string;
  receivedBy: string;
  signature: string;
  date: string;
  page: string;
  of: string;
  attendees: string;
  agenda: string;
  decisions: string;
  actionItems: string;
  nextMeeting: string;
  project: string;
  subject: string;
  to: string;
  cc: string;
  emailBody: string;
  thankyou: string;
  acceptance: string;
  acceptanceText: string;
  paymentMethods: string;
};

const translations: Record<PdfLang, PdfTranslations> = {
  es: {
    invoice: "FACTURA",
    quote: "COTIZACIÓN",
    log: "BITÁCORA",
    email: "COMUNICACIÓN",
    billTo: "FACTURAR A",
    quoteTo: "PROPUESTA PARA",
    issueDate: "FECHA DE EMISIÓN",
    dueDate: "FECHA DE VENCIMIENTO",
    validUntil: "VÁLIDA HASTA",
    description: "DESCRIPCIÓN",
    quantity: "CANT.",
    unitPrice: "PRECIO UNITARIO",
    taxPct: "ITBMS %",
    discount: "DESC. %",
    amount: "TOTAL",
    subtotal: "SUBTOTAL",
    tax: "ITBMS (7%)",
    total: "TOTAL",
    notes: "NOTAS",
    terms: "TÉRMINOS Y CONDICIONES",
    authorizedBy: "AUTORIZADO POR",
    receivedBy: "RECIBIDO POR",
    signature: "FIRMA",
    date: "FECHA",
    page: "Página",
    of: "de",
    attendees: "PARTICIPANTES",
    agenda: "RESUMEN",
    decisions: "ACUERDOS Y DECISIONES",
    actionItems: "TAREAS PENDIENTES",
    nextMeeting: "PRÓXIMA REUNIÓN",
    project: "PROYECTO",
    subject: "ASUNTO",
    to: "PARA",
    cc: "COPIA",
    emailBody: "CONTENIDO",
    thankyou: "Gracias por su confianza.",
    acceptance: "ACEPTACIÓN",
    acceptanceText: "Al firmar el presente documento, el cliente acepta los términos y condiciones de esta cotización.",
    paymentMethods: "FORMAS DE PAGO",
  },
  en: {
    invoice: "INVOICE",
    quote: "QUOTE",
    log: "ACTIVITY LOG",
    email: "COMMUNICATION",
    billTo: "BILL TO",
    quoteTo: "PROPOSAL FOR",
    issueDate: "ISSUE DATE",
    dueDate: "DUE DATE",
    validUntil: "VALID UNTIL",
    description: "DESCRIPTION",
    quantity: "QTY",
    unitPrice: "UNIT PRICE",
    taxPct: "TAX %",
    discount: "DISC. %",
    amount: "AMOUNT",
    subtotal: "SUBTOTAL",
    tax: "TAX (7%)",
    total: "TOTAL",
    notes: "NOTES",
    terms: "TERMS & CONDITIONS",
    authorizedBy: "AUTHORIZED BY",
    receivedBy: "RECEIVED BY",
    signature: "SIGNATURE",
    date: "DATE",
    page: "Page",
    of: "of",
    attendees: "ATTENDEES",
    agenda: "SUMMARY",
    decisions: "DECISIONS",
    actionItems: "ACTION ITEMS",
    nextMeeting: "NEXT MEETING",
    project: "PROJECT",
    subject: "SUBJECT",
    to: "TO",
    cc: "CC",
    emailBody: "BODY",
    thankyou: "Thank you for your trust.",
    acceptance: "ACCEPTANCE",
    acceptanceText: "By signing this document, the client accepts the terms and conditions of this quote.",
    paymentMethods: "PAYMENT METHODS",
  },
};

export function t(lang: PdfLang): PdfTranslations {
  return translations[lang];
}

export function fmtCurrency(amount: number, lang: PdfLang, currency = "USD"): string {
  return `${currency} ${amount.toLocaleString(lang === "es" ? "es-PA" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function fmtDate(date: Date | string, lang: PdfLang): string {
  return new Date(date).toLocaleDateString(lang === "es" ? "es-PA" : "en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
