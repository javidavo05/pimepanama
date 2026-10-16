import { test } from "node:test";
import assert from "node:assert/strict";
import {
  embudo, tasaCierre, tiempoCierreDias, cerradasPorFuente, perdidasPorMotivo, leadsPorFuente, pronostico, nps,
  saludCliente, vencidoDeFacturas, reglasRiesgo, inicioPeriodo, claveMes, mesesEntre, antiguedadTexto, masReciente, type Opo,
} from "./reportes";

const d = (s: string) => new Date(`${s}T12:00:00Z`);
const AHORA = d("2026-10-16");

const etapas = [
  { id: "e1", nombre: "Contacto", orden: 1, tipo: "abierta" },
  { id: "e2", nombre: "Propuesta", orden: 2, tipo: "abierta" },
  { id: "e3", nombre: "Negociación", orden: 3, tipo: "abierta" },
  { id: "g", nombre: "Ganada", orden: 4, tipo: "ganada" },
  { id: "p", nombre: "Perdida", orden: 5, tipo: "perdida" },
];
let k = 0;
const opo = (x: Partial<Opo>): Opo => ({ id: `o${k++}`, etapaId: "e1", estado: "abierta", valor: 1000, probabilidad: 50, cierreEsperado: null, createdAt: d("2026-09-01"), cerradaAt: null, motivoPerdida: null, fuente: null, ...x });

test("embudo: cantidad y valor por etapa, y conversión entre etapas", () => {
  const opos = [
    opo({ etapaId: "e1", valor: 500 }),
    opo({ etapaId: "e1", valor: 500 }),
    opo({ etapaId: "e2", valor: 2000 }),
    opo({ etapaId: "e3", valor: 3000 }),
    opo({ etapaId: "g", estado: "ganada", valor: 4000 }),
    opo({ etapaId: "p", estado: "perdida", valor: 100 }),
  ];
  const f = embudo(etapas, opos);
  const e1 = f.find((x) => x.id === "e1")!, e2 = f.find((x) => x.id === "e2")!, e3 = f.find((x) => x.id === "e3")!;
  assert.equal(e1.cantidad, 2);
  assert.equal(e1.valor, 1000);
  // Llegaron a Contacto las 6; a Propuesta 3 (e2, e3, ganada); a Negociación 2; ganadas 1.
  assert.equal(e1.alcanzaron, 6);
  assert.equal(e1.conversion, 50);
  assert.equal(e2.conversion, 67);
  assert.equal(e3.conversion, 50);
  assert.equal(f.find((x) => x.id === "g")!.valor, 4000);
});

test("embudo vacío no divide por cero", () => {
  const f = embudo(etapas, []);
  assert.ok(f.every((x) => x.cantidad === 0 && x.conversion === null));
});

test("tasa de cierre: ganadas sobre cerradas", () => {
  assert.equal(tasaCierre([{ estado: "ganada" }, { estado: "perdida" }, { estado: "perdida" }, { estado: "abierta" }]), 33);
  assert.equal(tasaCierre([{ estado: "abierta" }]), null);
});

test("tiempo de cierre: promedio en días de las ganadas", () => {
  const t = tiempoCierreDias([
    { estado: "ganada", createdAt: d("2026-09-01"), cerradaAt: d("2026-09-11") },
    { estado: "ganada", createdAt: d("2026-09-01"), cerradaAt: d("2026-09-21") },
    { estado: "perdida", createdAt: d("2026-01-01"), cerradaAt: d("2026-09-21") },
    { estado: "ganada", createdAt: d("2026-09-01"), cerradaAt: null },
  ]);
  assert.equal(t, 15);
  assert.equal(tiempoCierreDias([]), null);
});

test("cerradas por fuente y perdidas por motivo", () => {
  const opos = [
    opo({ estado: "ganada", fuente: "Referido", valor: 1000 }),
    opo({ estado: "perdida", fuente: "Referido", motivoPerdida: "Precio" }),
    opo({ estado: "perdida", fuente: null, motivoPerdida: "Precio" }),
    opo({ estado: "perdida", motivoPerdida: " " }),
    opo({ estado: "abierta", fuente: "Web" }),
  ];
  const f = cerradasPorFuente(opos);
  assert.deepEqual(f[0], { clave: "Referido", ganadas: 1, perdidas: 1, valorGanado: 1000 });
  assert.equal(f.find((x) => x.clave === "Sin fuente")!.perdidas, 2);
  assert.ok(!f.some((x) => x.clave === "Web"), "las abiertas no cuentan");
  const m = perdidasPorMotivo(opos);
  assert.equal(m[0].clave, "Precio");
  assert.equal(m[0].cantidad, 2);
  assert.equal(m[1].clave, "Sin motivo anotado");
});

test("leads por fuente y su conversión a cliente", () => {
  const r = leadsPorFuente([
    { source: "WEB", convertedAt: d("2026-09-01") },
    { source: "WEB", convertedAt: null },
    { source: "WEB", convertedAt: null },
    { source: "REFERIDO", convertedAt: d("2026-09-01") },
  ]);
  assert.equal(r[0].etiqueta, "Sitio web");
  assert.equal(r[0].tasa, 33);
  assert.equal(r[1].tasa, 100);
});

test("pronóstico: ponderado por mes; atrasadas al mes actual; sin fecha y más allá aparte", () => {
  const r = pronostico([
    opo({ valor: 1000, probabilidad: 50, cierreEsperado: d("2026-10-30") }),
    opo({ valor: 2000, probabilidad: 25, cierreEsperado: d("2026-08-10") }),
    opo({ valor: 1000, probabilidad: 100, cierreEsperado: d("2027-01-15") }),
    opo({ valor: 800, probabilidad: 50, cierreEsperado: null }),
    opo({ valor: 900, probabilidad: 100, cierreEsperado: d("2027-09-01") }),
    opo({ estado: "ganada", valor: 5000, cierreEsperado: d("2026-11-01") }),
  ], AHORA);
  assert.equal(r.meses.length, 6);
  assert.equal(r.meses[0].clave, "2026-10");
  assert.equal(r.meses[5].clave, "2027-03");
  assert.equal(r.meses[0].ponderado, 1000);
  assert.equal(r.meses[0].cantidad, 2);
  assert.equal(r.meses[1].ponderado, 0, "la ganada no entra");
  assert.equal(r.meses[3].ponderado, 1000);
  assert.equal(r.sinFecha, 400);
  assert.equal(r.despues, 900);
  assert.equal(r.total, 2000);
});

test("pronóstico: el 1 de mes temprano en Panamá sigue en el mes de Panamá", () => {
  // 2026-11-01 03:00 UTC es 31 de octubre a las 22:00 en Panamá.
  assert.equal(claveMes(new Date("2026-11-01T03:00:00Z")), "2026-10");
});

test("NPS: promotores menos detractores", () => {
  const r = nps([10, 9, 9, 8, 7, 6, 3, null, 11]);
  assert.equal(r.respondidas, 7);
  assert.equal(r.promotores, 3);
  assert.equal(r.pasivos, 2);
  assert.equal(r.detractores, 2);
  assert.equal(r.nps, 14);
  assert.equal(r.promedio, 7.4);
  assert.equal(nps([]).nps, null);
  assert.equal(nps([0, 0]).nps, -100);
});

test("periodo: inicio del mes, trimestre y año en Panamá", () => {
  assert.equal(inicioPeriodo("mes", AHORA)!.toISOString(), "2026-10-01T05:00:00.000Z");
  assert.equal(inicioPeriodo("trimestre", AHORA)!.toISOString(), "2026-10-01T05:00:00.000Z");
  assert.equal(inicioPeriodo("trimestre", d("2026-08-20"))!.toISOString(), "2026-07-01T05:00:00.000Z");
  assert.equal(inicioPeriodo("anio", AHORA)!.toISOString(), "2026-01-01T05:00:00.000Z");
  assert.equal(inicioPeriodo("todo", AHORA), null);
});

test("vencido: saldo de facturas vencidas o sus cuotas vencidas", () => {
  const v = vencidoDeFacturas([
    { id: "a", status: "SENT", total: 1000, amountPaid: 0, dueDate: d("2026-10-01") },
    { id: "b", status: "SENT", total: 1000, amountPaid: 0, dueDate: d("2026-12-01") },
    { id: "c", status: "PARTIALLY_PAID", total: 900, amountPaid: 300, dueDate: d("2026-12-01"), paymentSchedules: [
      { amount: 300, dueDate: d("2026-09-01"), status: "PAID" },
      { amount: 300, dueDate: d("2026-10-01"), status: "PENDING" },
      { amount: 300, dueDate: d("2026-11-01"), status: "PENDING" },
    ] },
    { id: "d", status: "DRAFT", total: 5000, amountPaid: 0, dueDate: d("2026-01-01") },
    { id: "e", status: "PAID", total: 5000, amountPaid: 0, dueDate: d("2026-01-01") },
  ], [{ documentId: "a", amount: 400, status: "confirmado" }], AHORA);
  assert.equal(v, 600 + 300);
});

test("salud: riesgo por sistema caído o saldo vencido; atención por tickets viejos o inactividad", () => {
  const reglas = reglasRiesgo({ diasSinActividad: 30 });
  assert.equal(reglas.diasTicketViejo, 14);
  const base = { ultimoMovimiento: d("2026-10-10"), vencido: 0, ticketsAbiertos: [], sistemas: [] };
  assert.deepEqual(saludCliente(base, reglas, AHORA), { nivel: "sana", motivos: [] });

  const caido = saludCliente({ ...base, sistemas: [{ name: "Tienda", status: "caido" }] }, reglas, AHORA);
  assert.equal(caido.nivel, "riesgo");
  assert.equal(caido.motivos[0].texto, "Tienda está caído");

  const deuda = saludCliente({ ...base, vencido: 250 }, reglas, AHORA);
  assert.equal(deuda.nivel, "riesgo");
  assert.match(deuda.motivos[0].texto, /250\.00 vencido/);
  assert.equal(saludCliente({ ...base, vencido: 250, verMontos: false }, reglas, AHORA).motivos[0].texto, "Tiene saldo vencido");

  const ticket = saludCliente({ ...base, ticketsAbiertos: [{ number: "TK-0007", createdAt: d("2026-09-16") }, { number: "TK-0009", createdAt: d("2026-10-14") }] }, reglas, AHORA);
  assert.equal(ticket.nivel, "atencion");
  assert.equal(ticket.motivos[0].texto, "Ticket TK-0007 abierto hace 30 días");

  const quieto = saludCliente({ ...base, ultimoMovimiento: d("2026-09-01") }, reglas, AHORA);
  assert.equal(quieto.nivel, "atencion");
  assert.equal(quieto.motivos[0].texto, "Sin movimiento hace 45 días");

  const todo = saludCliente({ ultimoMovimiento: null, vencido: 10, ticketsAbiertos: [], sistemas: [{ name: "X", status: "degradado" }] }, reglas, AHORA);
  assert.deepEqual(todo.motivos.map((m) => m.tipo), ["vencido", "sistema", "inactivo"], "lo grave primero");
});

test("reglas: valores inválidos usan los de omisión", () => {
  assert.deepEqual(reglasRiesgo(null), { diasSinActividad: 45, diasTicketViejo: 14 });
  assert.deepEqual(reglasRiesgo({ diasSinActividad: -3, diasTicketViejo: "x" }), { diasSinActividad: 45, diasTicketViejo: 14 });
});

test("antigüedad y fecha más reciente", () => {
  assert.equal(mesesEntre(d("2025-03-20"), AHORA), 18);
  assert.equal(antiguedadTexto(18), "1 año y 6 meses");
  assert.equal(antiguedadTexto(0), "Menos de un mes");
  assert.equal(masReciente(null, d("2026-01-01"), undefined, d("2026-05-01"))?.toISOString().slice(0, 10), "2026-05-01");
  assert.equal(masReciente(null), null);
});
