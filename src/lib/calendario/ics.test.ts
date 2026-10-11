import { test } from "node:test";
import assert from "node:assert/strict";
import { direccionValida, eventosEntre } from "./ics";

const ICS = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:suelto@x
DTSTART:20261012T150000Z
DTEND:20261012T160000Z
SUMMARY:Reunión con HOLO
LOCATION:Oficina
END:VEVENT
BEGIN:VEVENT
UID:semanal@x
DTSTART;TZID=America/Panama:20261005T090000
DTEND;TZID=America/Panama:20261005T093000
RRULE:FREQ=WEEKLY;BYDAY=MO
EXDATE;TZID=America/Panama:20261019T090000
SUMMARY:Daily del equipo
END:VEVENT
BEGIN:VEVENT
UID:dia@x
DTSTART;VALUE=DATE:20261012
DTEND;VALUE=DATE:20261013
SUMMARY:Feriado
END:VEVENT
BEGIN:VEVENT
UID:otro@x
DTSTART:20261020T150000Z
DTEND:20261020T160000Z
SUMMARY:Otro día
END:VEVENT
END:VCALENDAR`;

test("eventos de hoy: sueltos, repetidos y de todo el día", () => {
  const hoy = new Date("2026-10-12T05:00:00Z"), manana = new Date("2026-10-13T05:00:00Z");
  const ev = eventosEntre(ICS, hoy, manana);
  const t = ev.map((e) => e.titulo);
  assert.ok(t.includes("Reunión con HOLO"));
  assert.ok(t.includes("Daily del equipo"), "la repetición del lunes 12");
  assert.ok(t.includes("Feriado"));
  assert.ok(!t.includes("Otro día"));
  const daily = ev.find((e) => e.titulo === "Daily del equipo")!;
  assert.equal(daily.inicio.toISOString(), "2026-10-12T14:00:00.000Z", "9:00 de Panamá");
});

test("la excepción del 19 no aparece", () => {
  const ev = eventosEntre(ICS, new Date("2026-10-19T05:00:00Z"), new Date("2026-10-20T05:00:00Z"));
  assert.ok(!ev.some((e) => e.titulo === "Daily del equipo"));
});

test("solo direcciones secretas de Google", () => {
  assert.equal(direccionValida("https://calendar.google.com/calendar/ical/javi%40gmail.com/private-abc123/basic.ics"), true);
  assert.equal(direccionValida("http://calendar.google.com/calendar/ical/a/private-b/basic.ics"), false);
  assert.equal(direccionValida("https://evil.com/calendar/ical/a/basic.ics"), false);
});
