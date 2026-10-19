import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_POR_REGLA, REGLAS_POR_DEFECTO, diaDeFecha, diaDeTarea, diaPanama, diasEntre, masReciente, planearSeguimientos, reglasAJson, reglasDe,
  tituloContactar, tituloLeadSinRespuesta, tituloRenovacion, tituloSeguimiento,
  type ClienteDato, type ContratoDato, type LeadDato, type TareaExistente,
} from "./seguimientos-reglas";
import { avisoDeTarea } from "../tasks-avisos";

const HOY = "2026-10-16";
const dia = (d: string) => new Date(`${d}T00:00:00.000Z`);
const hace = (n: number) => new Date(dia(HOY).getTime() - n * 86_400_000 + 15 * 3600_000); // a media mañana en Panamá

const lead = (o: Partial<LeadDato> = {}): LeadDato => ({ id: "l1", nombre: "Ana Pérez", status: "CONTACTADO", responsableId: "m1", nextFollowUpAt: null, ultimaActividad: hace(0), ...o });
const cliente = (o: Partial<ClienteDato> = {}): ClienteDato => ({ id: "c1", nombre: "Ferretería Sol", responsableId: null, ultimaActividad: hace(0), ...o });
const contrato = (o: Partial<ContratoDato> = {}): ContratoDato => ({ id: "k1", titulo: "Soporte anual", clientId: "c1", clienteNombre: "Ferretería Sol", responsableId: null, endsAt: dia("2026-11-10"), ...o });
const plan = (o: Partial<Parameters<typeof planearSeguimientos>[0]> = {}) =>
  planearSeguimientos({ duenoId: "dueno", hoy: HOY, reglas: REGLAS_POR_DEFECTO, leads: [], clientes: [], contratos: [], tareas: [], arranque: "2000-01-01", ...o });

// ─── Reglas guardadas ─────────────────────────────────────────────────────────

test("sin reglas guardadas se usan 3, 45 y 30 días, todas encendidas", () => {
  assert.deepEqual(reglasDe(null), REGLAS_POR_DEFECTO);
  assert.deepEqual(reglasDe({}), REGLAS_POR_DEFECTO);
  assert.equal(REGLAS_POR_DEFECTO.leadSinRespuesta.dias, 3);
  assert.equal(REGLAS_POR_DEFECTO.clienteSinContacto.dias, 45);
  assert.equal(REGLAS_POR_DEFECTO.renovacion.dias, 30);
});

test("las reglas se apagan y los días raros vuelven al valor por defecto", () => {
  const r = reglasDe({ leadSinRespuestaActiva: false, clienteSinContactoDias: 60, renovacionDias: -4 });
  assert.equal(r.leadSinRespuesta.activa, false);
  assert.equal(r.clienteSinContacto.dias, 60);
  assert.equal(r.renovacion.dias, 30);
  assert.deepEqual(reglasDe(reglasAJson(r)), r, "ida y vuelta por el JSON");
});

// ─── Días ─────────────────────────────────────────────────────────────────────

test("los días se cuentan en hora de Panamá", () => {
  // 16 oct 02:00 UTC = 15 oct 21:00 en Panamá
  assert.equal(diaPanama(new Date("2026-10-16T02:00:00Z")), "2026-10-15");
  // Una fecha de calendario (medianoche UTC) es ese día, no el anterior
  assert.equal(diaDeFecha(dia("2026-10-20")), "2026-10-20");
  assert.equal(diaDeTarea({ dueDate: dia("2026-10-20"), allDay: true }), "2026-10-20");
  assert.equal(diaDeTarea({ dueDate: new Date("2026-10-21T01:00:00Z"), allDay: false }), "2026-10-20");
  assert.equal(diasEntre("2026-10-16", "2026-11-15"), 30);
  assert.equal(masReciente([null, hace(3), hace(1), undefined])?.getTime(), hace(1).getTime());
});

// ─── Seguimiento programado del lead ──────────────────────────────────────────

test("el seguimiento del lead se crea el día que toca, con su responsable", () => {
  const [t, ...resto] = plan({ leads: [lead({ nextFollowUpAt: dia(HOY) })] });
  assert.equal(resto.length, 0);
  assert.equal(t.titulo, tituloSeguimiento("Ana Pérez"));
  assert.equal(t.leadId, "l1");
  assert.equal(t.responsableId, "m1");
  assert.equal(t.dia, HOY);
});

test("el seguimiento no se crea antes de tiempo ni para un lead cerrado", () => {
  assert.equal(plan({ leads: [lead({ nextFollowUpAt: dia("2026-10-17") })] }).length, 0);
  assert.equal(plan({ leads: [lead({ status: "GANADO", nextFollowUpAt: dia(HOY) })] }).length, 0);
});

test("sin responsable, el seguimiento queda para el dueño", () => {
  assert.equal(plan({ leads: [lead({ responsableId: null, nextFollowUpAt: dia(HOY) })] })[0].responsableId, "dueno");
});

test("el seguimiento se crea una sola vez aunque ya se haya completado", () => {
  const hecha: TareaExistente = { titulo: tituloSeguimiento("Ana Pérez"), clientId: null, leadId: "l1", completed: true, dia: HOY };
  assert.equal(plan({ leads: [lead({ nextFollowUpAt: dia(HOY) })], tareas: [hecha] }).length, 0);
});

test("si el cron no corrió ese día, el seguimiento se recupera dentro de la semana", () => {
  assert.equal(plan({ leads: [lead({ nextFollowUpAt: dia("2026-10-14") })] })[0].dia, "2026-10-14");
  assert.equal(plan({ leads: [lead({ nextFollowUpAt: dia("2026-09-01"), ultimaActividad: hace(1) })] }).length, 0);
});

// ─── Lead sin respuesta ───────────────────────────────────────────────────────

test("lead sin movimiento en 3 días: tarea para volver a escribirle", () => {
  const [t] = plan({ leads: [lead({ ultimaActividad: hace(3) })] });
  assert.equal(t.titulo, tituloLeadSinRespuesta("Ana Pérez"));
  assert.equal(t.motivo, "lead_sin_respuesta");
  assert.equal(plan({ leads: [lead({ ultimaActividad: hace(2) })] }).length, 0);
});

test("lead sin respuesta: no si ya tiene una tarea abierta, ni si la regla está apagada, ni si está cotizando", () => {
  const abierta: TareaExistente = { titulo: "Llamar a Ana", clientId: null, leadId: "l1", completed: false, dia: null };
  assert.equal(plan({ leads: [lead({ ultimaActividad: hace(10) })], tareas: [abierta] }).length, 0);
  const apagada = { ...REGLAS_POR_DEFECTO, leadSinRespuesta: { activa: false, dias: 3 } };
  assert.equal(plan({ reglas: apagada, leads: [lead({ ultimaActividad: hace(10) })] }).length, 0);
  assert.equal(plan({ leads: [lead({ status: "COTIZANDO", ultimaActividad: hace(10) })] }).length, 0);
});

// ─── Cliente sin contacto ─────────────────────────────────────────────────────

test("cliente sin contacto en 45 días: tarea «Contactar a» para el dueño si no tiene responsable", () => {
  const [t] = plan({ clientes: [cliente({ ultimaActividad: hace(45) })] });
  assert.equal(t.titulo, tituloContactar("Ferretería Sol"));
  assert.equal(t.clientId, "c1");
  assert.equal(t.responsableId, "dueno");
  assert.equal(plan({ clientes: [cliente({ ultimaActividad: hace(44) })] }).length, 0);
  assert.equal(plan({ clientes: [cliente({ responsableId: "m2", ultimaActividad: hace(90) })] })[0].responsableId, "m2");
});

test("cliente sin contacto: no duplica una tarea abierta igual, sí vuelve si la anterior se completó", () => {
  const igual: TareaExistente = { titulo: tituloContactar("Ferretería Sol"), clientId: "c1", leadId: null, completed: false, dia: "2026-09-01" };
  assert.equal(plan({ clientes: [cliente({ ultimaActividad: hace(60) })], tareas: [igual] }).length, 0);
  assert.equal(plan({ clientes: [cliente({ ultimaActividad: hace(60) })], tareas: [{ ...igual, completed: true }] }).length, 1);
});

// ─── Renovación de contrato ───────────────────────────────────────────────────

test("contrato que vence dentro de 30 días: tarea de renovación con fecha del vencimiento", () => {
  const [t] = plan({ contratos: [contrato({ endsAt: dia("2026-11-15") })] });
  assert.equal(t.titulo, tituloRenovacion("Soporte anual", "Ferretería Sol"));
  assert.equal(t.dia, "2026-11-15");
  assert.equal(plan({ contratos: [contrato({ endsAt: dia("2026-11-16") })] }).length, 0, "31 días: todavía no");
  assert.equal(plan({ contratos: [contrato({ endsAt: dia("2026-10-15") })] }).length, 0, "ya venció");
});

test("la renovación se pide una vez por vencimiento, aunque se haya completado", () => {
  const k = contrato({ endsAt: dia("2026-11-10") });
  const hecha: TareaExistente = { titulo: tituloRenovacion("Soporte anual", "Ferretería Sol"), clientId: "c1", leadId: null, completed: true, dia: "2026-11-10" };
  assert.equal(plan({ contratos: [k], tareas: [hecha] }).length, 0);
  assert.equal(plan({ contratos: [k], tareas: [{ ...hecha, completed: false, dia: null }] }).length, 0);
});

test("dos reglas iguales en la misma corrida no se duplican", () => {
  const n = plan({ contratos: [contrato(), contrato({ id: "k2" })] });
  assert.equal(n.length, 1);
});

// ─── Avisos de tareas (cron task-reminders) ───────────────────────────────────

test("aviso de tarea: hoy, atrasada y pronto, cada uno una vez", () => {
  const t = (d: string, o = {}) => ({ dueDate: dia(d), allDay: true, completed: false, reminderSent: false, ...o });
  const nada = { hoy: false, atrasada: false };
  assert.equal(avisoDeTarea(t(HOY), HOY, nada), "hoy");
  assert.equal(avisoDeTarea(t(HOY), HOY, { hoy: true, atrasada: false }), null);
  assert.equal(avisoDeTarea(t("2026-10-15"), HOY, nada), "atrasada");
  assert.equal(avisoDeTarea(t("2026-10-15"), HOY, { hoy: true, atrasada: true }), null);
  assert.equal(avisoDeTarea(t("2026-09-01"), HOY, nada), null, "atrasada hace mucho: no despierta");
  assert.equal(avisoDeTarea(t("2026-10-18"), HOY, nada), "pronto");
  assert.equal(avisoDeTarea(t("2026-10-18", { reminderSent: true }), HOY, nada), null);
  assert.equal(avisoDeTarea(t("2026-10-25"), HOY, nada), null);
  assert.equal(avisoDeTarea(t(HOY, { completed: true }), HOY, nada), null);
});

// ─── Sin avalancha la primera vez ─────────────────────────────────────────────

test("la inactividad se cuenta desde el arranque de las reglas: los clientes viejos no disparan nada el primer día", () => {
  const viejos = Array.from({ length: 20 }, (_, i) => cliente({ id: `c${i}`, nombre: `Cliente ${i}`, ultimaActividad: hace(400) }));
  assert.equal(plan({ clientes: viejos, arranque: HOY }).length, 0);
  // 45 días después del arranque sí, pero solo unas pocas por día
  const despues = planearSeguimientos({ duenoId: "dueno", hoy: "2026-11-30", reglas: REGLAS_POR_DEFECTO, leads: [], clientes: viejos, contratos: [], tareas: [], arranque: HOY });
  assert.equal(despues.length, MAX_POR_REGLA);
});

test("cada regla crea a lo sumo unas pocas tareas por día, las de más tiempo quietas primero", () => {
  const clientes = Array.from({ length: 10 }, (_, i) => cliente({ id: `c${i}`, nombre: `Cliente ${i}`, ultimaActividad: hace(50 + i) }));
  const leads = Array.from({ length: 10 }, (_, i) => lead({ id: `l${i}`, nombre: `Lead ${i}`, ultimaActividad: hace(5 + i) }));
  const r = plan({ clientes, leads });
  assert.equal(r.filter((t) => t.motivo === "cliente_sin_contacto").length, MAX_POR_REGLA);
  assert.equal(r.filter((t) => t.motivo === "lead_sin_respuesta").length, MAX_POR_REGLA);
  assert.deepEqual(r.filter((t) => t.clientId).map((t) => t.clientId), ["c9", "c8", "c7"]);
});
