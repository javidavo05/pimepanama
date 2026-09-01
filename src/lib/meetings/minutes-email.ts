import type { ExecutiveMinutes, MeetingAttendee } from "./types";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 1em 0;line-height:1.65;">${escapeHtml(text).replace(/\n/g, "<br>")}</p>`;
}

function section(title: string, inner: string): string {
  if (!inner) return "";
  return `<h3 style="margin:1.6em 0 .5em 0;font-size:14px;text-transform:uppercase;letter-spacing:.06em;color:#5b6472;">${escapeHtml(title)}</h3>${inner}`;
}

function bullets(items: string[]): string {
  if (items.length === 0) return "";
  return `<ul style="margin:0 0 1em 0;padding-left:1.2em;line-height:1.65;">${items
    .map((i) => `<li style="margin-bottom:.35em;">${escapeHtml(i)}</li>`)
    .join("")}</ul>`;
}

export interface MinutesEmailInput {
  title: string;
  meetingDate: Date;
  executive: ExecutiveMinutes;
  attendees: MeetingAttendee[];
  actionItems: { title: string; owner: string | null; dueDate: Date | null }[];
  projectName: string | null;
}

export function minutesEmailSubject(input: MinutesEmailInput): string {
  const date = input.meetingDate.toLocaleDateString("es-PA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `Minuta — ${input.title} (${date})`;
}

/**
 * La minuta ejecutiva como cuerpo de correo. Se manda solo la parte ejecutiva:
 * la técnica y el prompt son de uso interno y mandarlos al cliente sería
 * enseñarle la cocina.
 *
 * Va como HTML sencillo, sin CSS externo ni imágenes, porque los clientes de
 * correo recortan cualquier cosa más elaborada — y encima queda un texto que se
 * puede reenviar como constancia de lo acordado.
 */
export function minutesEmailBody(input: MinutesEmailInput): string {
  const { executive, attendees, actionItems, projectName, meetingDate } = input;

  const date = meetingDate.toLocaleDateString("es-PA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const people = attendees.filter((a) => a.name.trim());
  const attendeesHtml =
    people.length > 0
      ? bullets(people.map((a) => `${a.name}${a.role ? ` — ${a.role}` : ""}`))
      : "";

  const itemsHtml =
    actionItems.length > 0
      ? bullets(
          actionItems.map((i) => {
            const owner = i.owner ?? "por definir";
            const due = i.dueDate ? i.dueDate.toISOString().split("T")[0] : "sin fecha";
            return `${i.title} — responsable: ${owner}, fecha: ${due}`;
          })
        )
      : "";

  return [
    paragraph(
      `A continuación la minuta de la reunión del ${date}${projectName ? ` sobre ${projectName}` : ""}. Si algo no refleja lo que acordamos, respóndenos este correo y lo corregimos.`
    ),
    section("De qué se habló", executive.agenda ? paragraph(executive.agenda) : ""),
    section("Decisiones", bullets(executive.decisions)),
    section("Compromisos", bullets(executive.commitments)),
    section("Riesgos y bloqueos", bullets(executive.risks)),
    section("Próximos pasos", executive.nextSteps ? paragraph(executive.nextSteps) : ""),
    section("Pendientes", itemsHtml),
    section("Asistentes", attendeesHtml),
    section(
      "Próxima reunión",
      executive.nextMeeting ? paragraph(executive.nextMeeting) : ""
    ),
  ]
    .filter(Boolean)
    .join("");
}
