import type { Lang } from "./site";

/**
 * Preguntas frecuentes (home y página de EE. UU.). Respuestas confirmadas por Javier el 2026-10-11:
 * desde USD 40 la hora y precio cerrado por fase; código y datos 100 % del cliente; inglés y español;
 * llamada inicial gratis de 30 min, lunes a viernes 9:00–17:00 hora de Panamá. Panamá usa el dólar y está en
 * UTC−5 todo el año (Nueva York en invierno, Chicago en verano). Nada inventado.
 */
export type Pregunta = { p: string; r: string };

export const FAQ: Record<Lang, { eyebrow: string; titulo: string[]; preguntas: Pregunta[] }> = {
  es: {
    eyebrow: "07 · Preguntas",
    titulo: ["Lo que nos preguntan", "antes de empezar"],
    preguntas: [
      { p: "¿Cuánto cuesta un sistema a medida?", r: "Trabajamos desde USD 40 la hora. Cada proyecto tiene una propuesta con precio cerrado por fase: sabe cuánto paga antes de empezar y ese precio no cambia durante el proyecto." },
      { p: "¿De quién es el código cuando terminan?", r: "Suyo. El código y los datos son 100 % del cliente. No cobramos licencias ajenas ni por usuario." },
      { p: "¿Quién me atiende?", r: "Usted habla directo con el equipo que diseña y programa su sistema, desde la primera llamada hasta la entrega." },
      { p: "¿Trabajan con empresas de Estados Unidos?", r: "Sí. Trabajamos en español y en inglés, cobramos en dólares (la moneda de Panamá) y compartimos horario: Panamá tiene la hora de Nueva York en invierno y la de Chicago en verano." },
      { p: "¿Cuánto tarda?", r: "Depende del alcance. Trabajamos por fases y cada una se usa desde el día en que se entrega; la propuesta dice el plazo de cada fase." },
      { p: "¿Qué pasa después de la entrega?", r: "Tres meses de garantía: cualquier error se corrige sin costo. Después, si quiere, soporte por horas." },
      { p: "¿Cómo empezamos?", r: "Con una llamada gratis de 30 minutos. Elija el horario que le quede, de lunes a viernes de 9:00 a 17:00, hora de Panamá." },
    ],
  },
  en: {
    eyebrow: "07 · Questions",
    titulo: ["What companies ask us", "before we start"],
    preguntas: [
      { p: "How much does custom software cost?", r: "Our rates start at USD 40 per hour. Every project gets a proposal with a fixed price per phase: you know what you'll pay before we start, and that price doesn't change during the project." },
      { p: "Who owns the code when you're done?", r: "You do. The code and the data are 100% yours. No third-party licenses and no per-user fees." },
      { p: "Who will I work with?", r: "You talk directly to the team that designs and codes your system, from the first call to delivery." },
      { p: "Do you work with US companies?", r: "Yes. We work in English and Spanish, we bill in US dollars (Panama's currency) and we share your hours: Panama is on New York time in winter and Chicago time in summer." },
      { p: "How long does it take?", r: "It depends on the scope. We work in phases and each one is in use from the day it ships; the proposal states the timeline of every phase." },
      { p: "What happens after delivery?", r: "A three-month warranty: any bug is fixed at no cost. After that, optional hourly support." },
      { p: "How do we start?", r: "With a free 30-minute call. Pick a time that works for you, Monday to Friday, 9:00 to 17:00 Panama time." },
    ],
  },
};

/** FAQPage de schema.org para que Google pueda mostrar las respuestas en los resultados. */
export function jsonLdFaq(lang: Lang) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: lang === "es" ? "es-PA" : "en-US",
    mainEntity: FAQ[lang].preguntas.map((x) => ({ "@type": "Question", name: x.p, acceptedAnswer: { "@type": "Answer", text: x.r } })),
  };
}
