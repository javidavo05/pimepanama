/**
 * Google Calendar por dirección secreta iCal (solo lectura). Lee los eventos de un rango, expandiendo
 * los que se repiten (RRULE) y saltando las excepciones (EXDATE) y los cancelados.
 */
import ical from "node-ical";

export type EventoCalendario = { id: string; titulo: string; inicio: Date; fin: Date | null; todoElDia: boolean; lugar: string | null; enlace: string | null };

export function direccionValida(url: string): boolean {
  try {
    const u = new URL(url.trim());
    return u.protocol === "https:" && /(^|\.)google\.com$/.test(u.hostname) && /\/calendar\/ical\/.+\.ics$/.test(u.pathname);
  } catch {
    return false;
  }
}

/** Los eventos que tocan [desde, hasta). Puro: recibe el texto .ics. */
export function eventosEntre(texto: string, desde: Date, hasta: Date): EventoCalendario[] {
  const datos = ical.sync.parseICS(texto);
  const out: EventoCalendario[] = [];
  for (const k of Object.keys(datos)) {
    const ev = datos[k] as ical.VEvent;
    if (!ev || ev.type !== "VEVENT" || (ev as { status?: string }).status === "CANCELLED") continue;
    const todoElDia = (ev.datetype as string) === "date";
    const dur = ev.end && ev.start ? new Date(ev.end).getTime() - new Date(ev.start).getTime() : 0;
    const titulo = (typeof ev.summary === "string" ? ev.summary : (ev.summary as { val?: string })?.val) || "(Sin título)";
    const lugar = typeof ev.location === "string" ? ev.location : null;
    const enlace = typeof ev.url === "string" ? ev.url : null;
    // Todo el día: la fecha vale en Panamá (medianoche = 05:00 UTC), sin depender de la zona del servidor.
    const aPanama = (d: Date) => (todoElDia ? new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 5)) : d);
    const poner = (inicioCrudo: Date, idExtra = "") => {
      const inicio = aPanama(inicioCrudo);
      const fin = dur ? new Date(inicio.getTime() + dur) : null;
      if (inicio < hasta && (fin ?? inicio) >= desde) out.push({ id: `${ev.uid}${idExtra}`, titulo, inicio, fin, todoElDia, lugar, enlace });
    };
    if (ev.rrule) {
      // rrule devuelve horas «flotantes» (la hora local escrita como si fuera UTC). La diferencia entre el
      // inicio real del evento y el inicio que guarda rrule corrige cada repetición a su hora real.
      // Según la zona del servidor, rrule ya devuelve la hora real o la flotante: se mide contra la primera
      // repetición, que siempre coincide con el inicio real del evento.
      const primera = ev.rrule.options.dtstart ? ev.rrule.after(new Date(ev.rrule.options.dtstart.getTime() - 24 * 3600_000), true) : null;
      const desfase = ev.start && primera ? new Date(ev.start).getTime() - primera.getTime() : 0;
      const real = (d: Date) => new Date(d.getTime() + desfase);
      const excluidas = new Set(Object.values(ev.exdate ?? {}).map((d) => new Date(d as Date).toISOString().slice(0, 16)));
      // Instancias que se movieron o editaron viven en `recurrences`.
      const cambiadas = ev.recurrences ?? {};
      for (const flotante of ev.rrule.between(new Date(desde.getTime() - Math.max(dur, 0) - desfase - 86_400_000), new Date(hasta.getTime() - desfase + 86_400_000), true)) {
        const d = real(flotante);
        const clave = d.toISOString().slice(0, 16);
        if (excluidas.has(clave)) continue;
        const cambio = Object.values(cambiadas).find((r) => r.recurrenceid && new Date(r.recurrenceid as Date).toISOString().slice(0, 16) === clave);
        if (cambio) {
          if ((cambio as { status?: string }).status === "CANCELLED") continue;
          const ini = new Date(cambio.start as Date);
          const fin = cambio.end ? new Date(cambio.end as Date) : null;
          if (ini < hasta && (fin ?? ini) >= desde) out.push({ id: `${ev.uid}-${clave}`, titulo: (typeof cambio.summary === "string" ? cambio.summary : titulo), inicio: ini, fin, todoElDia, lugar, enlace });
          continue;
        }
        poner(d, `-${clave}`);
      }
    } else if (ev.start) {
      poner(new Date(ev.start));
    }
  }
  return out.sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
}

/** Descarga la agenda (con caché de 5 minutos del lado de Next) y devuelve los eventos del rango. */
export async function leerCalendario(url: string, desde: Date, hasta: Date): Promise<EventoCalendario[]> {
  const r = await fetch(url, { next: { revalidate: 300 }, signal: AbortSignal.timeout(10_000), headers: { "user-agent": "PimeSuite/1.0" } });
  if (!r.ok) throw new Error(r.status === 404 ? "Google ya no reconoce esa dirección (¿la restableciste?)." : `Google respondió ${r.status}.`);
  const texto = await r.text();
  if (!texto.includes("BEGIN:VCALENDAR")) throw new Error("Esa dirección no devolvió un calendario.");
  return eventosEntre(texto, desde, hasta);
}
