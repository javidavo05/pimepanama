/**
 * Pruebas de la minuta técnica que no necesitan OpenAI ni base de datos.
 *
 *   npx tsx scripts/check-technical-merge.ts           # la fusión no pierde detalle
 *   npx tsx scripts/check-technical-merge.ts --legacy  # el formato anterior se sigue leyendo
 *
 * Imprime un token de éxito y sale con 0, o explica qué falló y sale con 1.
 */
import {
  assembleTechnical,
  isLegacyTechnical,
  mergeExpansion,
  topicWindows,
  transcriptWindow,
  normalizeTechnical,
  parseMergePlan,
  parseTechnicalMinutes,
  technicalDetailSize,
  technicalDigest,
} from "../src/lib/meetings/technical";
import type { TechnicalMinutes } from "../src/lib/meetings/types";

const failures: string[] = [];
function expect(cond: unknown, message: string) {
  if (!cond) failures.push(message);
}

function finish(token: string) {
  if (failures.length > 0) {
    console.error(`FALLÓ (${failures.length}):\n- ${failures.join("\n- ")}`);
    process.exit(1);
  }
  console.log(token);
}

if (process.argv.includes("--legacy")) {
  // Exactamente la forma que se guardaba antes del formato por temas.
  const stored = {
    summary: "Se pidió un filtro por estado en cotizaciones.",
    architecture: ["Se reutiliza el listado actual"],
    changes: [{ area: "Cotizaciones", what: "Agregar filtro por estado", why: "Encontrar las pendientes" }],
    dependencies: [],
    openQuestions: ["¿El filtro se recuerda entre sesiones?"],
  };
  const parsed = parseTechnicalMinutes(stored);
  expect(parsed !== null, "una minuta anterior se leyó como null");
  if (parsed) {
    expect(Array.isArray(parsed.topics) && parsed.topics.length === 0, "topics debería ser []");
    expect(Array.isArray(parsed.businessRules) && parsed.businessRules.length === 0, "businessRules debería ser []");
    expect(parsed.summary === stored.summary, "se perdió el resumen");
    expect(parsed.changes.length === 1 && parsed.changes[0].why === "Encontrar las pendientes", "se perdieron los cambios");
    expect(parsed.openQuestions.length === 1, "se perdieron las preguntas abiertas");
    expect(isLegacyTechnical(parsed), "no se reconoció como formato anterior");
    expect(technicalDigest(parsed).includes("Agregar filtro por estado"), "el resumen para las etapas siguientes perdió los cambios");
  }
  expect(parseTechnicalMinutes(null) === null, "null debería leerse como null");
  expect(parseTechnicalMinutes("texto") === null, "un string debería leerse como null");
  expect(parseTechnicalMinutes([]) === null, "un array debería leerse como null");
  const junk = parseTechnicalMinutes({ topics: [null, 3, { title: "" }, { title: "Sin contenido" }], changes: [{}] });
  expect(junk !== null && junk.topics.length === 0 && junk.changes.length === 0, "basura en topics/changes no se descartó");
  // Timestamps: el modelo manda "mm:ss"; lo inventado fuera de la reunión se descarta.
  const timed = normalizeTechnical(
    {
      topics: [
        { title: "Dentro", start: "12:30", discussion: "x" },
        { title: "Fuera", start: "99:00", discussion: "x" },
        { title: "Guardado", startMs: 5000, discussion: "x" },
      ],
    },
    30 * 60_000
  );
  // Salen en orden cronológico aunque el modelo los devuelva desordenados; el
  // que no tiene minuto va al final.
  expect(
    timed.topics.map((t) => t.title).join(",") === "Guardado,Dentro,Fuera",
    `los temas no se ordenaron por minuto: ${timed.topics.map((t) => t.title).join(",")}`
  );
  expect(timed.topics[1].startMs === 750_000, `12:30 debería ser 750000 ms, fue ${timed.topics[1].startMs}`);
  expect(timed.topics[2].startMs === null, "un minuto fuera de la reunión debería descartarse");
  expect(timed.topics[0].startMs === 5000, "un startMs ya guardado debería conservarse");
  finish("LEGACY_PARSE_OK");
} else {
  const topic = (title: string, startMs: number, tag: string) => ({
    title,
    startMs,
    discussion: `Discusión larga de ${tag}: el cliente explicó el flujo completo, las excepciones y los volúmenes.`,
    details: [`${tag}: 1.200 facturas al mes`, `${tag}: el campo RUC es obligatorio`],
    decisions: [`${tag}: se usa el módulo existente`],
    pending: [`${tag}: falta confirmar el formato`],
  });

  const partials: TechnicalMinutes[] = [
    normalizeTechnical({
      summary: "Tramo 1",
      topics: [topic("Facturación", 0, "A"), topic("Pagos parciales", 600_000, "B")],
      businessRules: ["Una factura pagada no se edita"],
      openQuestions: ["¿Se aceptan pagos en efectivo?"],
    }),
    normalizeTechnical({
      summary: "Tramo 2",
      // "Pagos parciales" sigue en el tramo 2: es el mismo tema cortado.
      topics: [topic("Pagos parciales (cont.)", 1_300_000, "C"), topic("Reportes", 1_900_000, "D")],
      dependencies: ["Acceso a la cuenta del banco"],
    }),
  ];

  // Un plan adversarial: une bien el tema cortado, pero omite "2.1", nombra un id
  // que no existe, repite "1.0" y vacía las listas.
  const plan = parseMergePlan({
    summary: "Reunión completa",
    topicGroups: [["1.0"], ["1.1", "2.0"], ["9.9"], ["1.0"]],
    architecture: [],
    changes: [],
    businessRules: [],
    dependencies: [],
    openQuestions: [],
  });
  const merged = assembleTechnical(partials, plan);

  for (const p of partials) {
    for (const t of p.topics) {
      expect(merged.topics.some((m) => m.discussion.includes(t.discussion)), `se perdió la discusión de «${t.title}»`);
      for (const d of [...t.details, ...t.decisions, ...t.pending]) {
        expect(merged.topics.some((m) => [...m.details, ...m.decisions, ...m.pending].includes(d)), `se perdió «${d}»`);
      }
    }
  }

  const before = partials.reduce((n, p) => n + technicalDetailSize(p), 0);
  const after = technicalDetailSize(merged);
  // Unir dos discusiones agrega un separador; nunca debería quedar menos.
  expect(after >= before, `la fusión condensó: ${before} → ${after} caracteres`);

  expect(merged.topics.length === 3, `deberían quedar 3 temas (A, B+C, D), quedaron ${merged.topics.length}`);
  const joined = merged.topics.find((t) => t.title === "Pagos parciales");
  expect(joined && joined.startMs === 600_000, "el tema unido debería arrancar en el minuto más temprano");
  expect(
    merged.topics.map((t) => t.startMs).join(",") === "0,600000,1900000",
    `los temas no quedaron en orden cronológico: ${merged.topics.map((t) => t.startMs).join(",")}`
  );
  expect(merged.businessRules.includes("Una factura pagada no se edita"), "una lista vaciada por el plan no se recuperó");
  expect(merged.dependencies.includes("Acceso a la cuenta del banco"), "las dependencias de los tramos se perdieron");
  expect(merged.summary === "Reunión completa", "el resumen del plan no se usó");

  // Con un plan válido, las listas del plan mandan: ahí es donde se depura.
  const curated = assembleTechnical(
    partials,
    parseMergePlan({ topicGroups: [["1.0"], ["1.1", "2.0"], ["2.1"]], openQuestions: ["Solo esta"] })
  );
  expect(
    curated.openQuestions.length === 1 && curated.openQuestions[0] === "Solo esta",
    "cuando el plan depura una lista, la depuración debería respetarse"
  );

  // ── Profundizar un tema: nunca achica ─────────────────────────────────────
  const original = merged.topics[0];
  const poorer = mergeExpansion(original, { discussion: "corta", details: ["uno solo"] });
  expect(poorer.discussion === original.discussion, "una discusión más corta reemplazó a la original");
  for (const d of original.details) expect(poorer.details.includes(d), `la profundización perdió «${d}»`);
  expect(poorer.decisions.length >= original.decisions.length, "la profundización perdió decisiones");
  expect(poorer.title === original.title && poorer.startMs === original.startMs, "cambió el título o el minuto");
  const richer = mergeExpansion(original, {
    discussion: original.discussion + " Y además el cliente explicó cómo lo hacen hoy a mano, con una planilla.",
    details: [...original.details.map((d) => d + " (confirmado)"), "Nuevo dato"],
  });
  expect(richer.details.length === original.details.length + 1, "una lista más completa debería reemplazar a la anterior");
  expect(richer.discussion.includes("planilla"), "una discusión más larga debería ganar");

  // ── El tramo de cada tema ─────────────────────────────────────────────────
  const transcript = [
    "**Javier** (00:10): Hablemos de facturación.",
    "sigue la misma idea",
    "**Ana** (05:00): Ahora pagos parciales.",
    "**Javier** (10:00): Pasemos a reportes.",
  ].join("\n");
  const slice = transcriptWindow(transcript, 300_000, 600_000, 0);
  expect(slice.includes("pagos parciales") && !slice.includes("facturación") && !slice.includes("reportes"), `tramo mal cortado: ${slice}`);
  expect(transcriptWindow(transcript, 0, 300_000, 0).includes("sigue la misma idea"), "una línea de continuación se separó de su turno");
  const windows = topicWindows(merged.topics, 2_400_000);
  expect(windows[0]?.from === 0 && windows[0]?.to === 600_000, `tramo del primer tema: ${JSON.stringify(windows[0])}`);
  expect(windows[windows.length - 1]?.to === 2_400_000, "el último tema debería llegar hasta el final de la reunión");

  console.log(`detalle antes ${before} · después ${after} · temas ${merged.topics.length}`);
  finish("MERGE_GUARD_OK");
}
