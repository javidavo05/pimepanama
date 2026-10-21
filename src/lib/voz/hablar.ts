/**
 * La voz de Jarvis. En la Mac con el servicio local usa Kokoro (voz masculina en español, ver ~/jarvis/oido),
 * pasada por un filtro suave de «asistente»: presencia en los medios, un eco muy corto y compresión.
 * Sin servicio local, la voz masculina del navegador, un poco más grave y pausada.
 * Habla frase por frase: mientras suena una, ya se está generando la siguiente.
 */
const LOCAL = "http://localhost:8765";

let ctx: AudioContext | null = null;
let cadena: AudioNode | null = null;
let analizador: AnalyserNode | null = null;
let actual: { cancelar: () => void } | null = null;

/** Hay que llamarla dentro de un toque o tecla: los navegadores solo dejan sonar audio después de un gesto. */
export function prepararAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
      // Filtro de «asistente»: corta graves sucios, sube presencia, eco cortísimo y compresión.
      const paso = ctx.createBiquadFilter(); paso.type = "highpass"; paso.frequency.value = 110;
      const presencia = ctx.createBiquadFilter(); presencia.type = "peaking"; presencia.frequency.value = 3200; presencia.gain.value = 3; presencia.Q.value = 0.9;
      const brillo = ctx.createBiquadFilter(); brillo.type = "highshelf"; brillo.frequency.value = 7000; brillo.gain.value = 2;
      const eco = ctx.createDelay(); eco.delayTime.value = 0.018;
      const mezclaEco = ctx.createGain(); mezclaEco.gain.value = 0.18;
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -20; comp.ratio.value = 3;
      analizador = ctx.createAnalyser(); analizador.fftSize = 512;
      paso.connect(presencia); presencia.connect(brillo); brillo.connect(comp);
      brillo.connect(eco); eco.connect(mezclaEco); mezclaEco.connect(comp);
      comp.connect(analizador); analizador.connect(ctx.destination);
      cadena = paso;
    }
    if (ctx.state === "suspended") void ctx.resume();
  } catch { /* sin Web Audio: queda la voz del navegador */ }
}

/** Volumen de la voz en este instante (0 a 1), para que la esfera respire con ella. */
export function nivelDeVoz(): number {
  if (!analizador) return 0;
  const datos = new Uint8Array(analizador.fftSize);
  analizador.getByteTimeDomainData(datos);
  let suma = 0;
  for (const d of datos) { const v = (d - 128) / 128; suma += v * v; }
  return Math.min(1, Math.sqrt(suma / datos.length) * 4);
}

let vozLocal: boolean | null = null, revisado = 0;
async function hayVozLocal(): Promise<boolean> {
  if (vozLocal !== null && Date.now() - revisado < 60_000) return vozLocal;
  try {
    const r = await fetch(`${LOCAL}/salud`, { cache: "no-store", signal: AbortSignal.timeout(800) });
    vozLocal = r.ok && !!((await r.json()) as { voz?: boolean }).voz;
  } catch { vozLocal = false; }
  revisado = Date.now();
  return vozLocal;
}

/** Texto apto para decirse: montos en palabras de dinero, siglas sin puntos, sin viñetas ni símbolos sueltos. */
function limpio(t: string) {
  return t
    .replace(/USD\s?([\d,]+)(?:\.(\d{2}))?/g, (_, entero: string, cent?: string) => `${entero.replace(/,/g, "")} dólares${cent && cent !== "00" ? ` con ${Number(cent)} ${Number(cent) === 1 ? "centavo" : "centavos"}` : ""}`)
    .replace(/\bS\.\s?A\./g, "S A")
    .replace(/(\d),(\d{3})/g, "$1$2")
    .replace(/[*_#>`•·]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 900);
}
/** Frases para decir una por una: corta en punto, signo de interrogación o exclamación seguido de mayúscula. */
function frases(t: string) {
  return t.split(/(?<=[.!?])\s+(?=[¿¡A-ZÁÉÍÓÚÑ0-9])/).map((f) => f.trim()).filter(Boolean);
}

async function audioLocal(frase: string): Promise<AudioBuffer> {
  const r = await fetch(`${LOCAL}/hablar`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texto: frase }), signal: AbortSignal.timeout(20_000) });
  if (!r.ok || !ctx) throw new Error("sin voz local");
  return ctx.decodeAudioData(await r.arrayBuffer());
}

function vozNavegador(texto: string, alTerminar: () => void) {
  if (!("speechSynthesis" in window)) { alTerminar(); return; }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(texto);
  const voces = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith("es"));
  // Una voz masculina si el equipo la tiene (Jorge, Diego, Juan, Carlos, Pablo…).
  u.voice = voces.find((v) => /jorge|diego|juan|carlos|pablo|andr[eé]s|enrique|male|hombre/i.test(v.name)) ?? voces.find((v) => v.lang === "es-MX") ?? voces[0] ?? null;
  u.lang = u.voice?.lang ?? "es-MX"; u.rate = 0.98; u.pitch = 0.85;
  u.onend = alTerminar; u.onerror = alTerminar;
  window.speechSynthesis.speak(u);
}

/** Dice el texto con la voz de Jarvis. alTerminar se llama al acabar o si se cancela. */
export async function hablar(texto: string, alTerminar: () => void): Promise<void> {
  detener();
  const t = limpio(texto);
  if (!t) { alTerminar(); return; }
  let cancelado = false;
  let fuente: AudioBufferSourceNode | null = null;
  const yo = { cancelar: () => { cancelado = true; try { fuente?.stop(); } catch { /* ya terminó */ } window.speechSynthesis?.cancel(); } };
  actual = yo;
  const fin = () => { if (actual === yo) actual = null; alTerminar(); };

  if (ctx && cadena && (await hayVozLocal())) {
    try {
      const lista = frases(t);
      let siguiente = audioLocal(lista[0]);
      for (let i = 0; i < lista.length && !cancelado; i++) {
        const buf = await siguiente;
        if (i + 1 < lista.length) siguiente = audioLocal(lista[i + 1]);
        if (cancelado) break;
        await new Promise<void>((listo) => {
          fuente = ctx!.createBufferSource(); fuente.buffer = buf; fuente.connect(cadena!);
          fuente.onended = () => listo(); fuente.start();
        });
      }
      fin();
      return;
    } catch {
      vozLocal = false; revisado = Date.now();
      if (cancelado) { fin(); return; }
    }
  }
  vozNavegador(t, fin);
}

export function detener() {
  actual?.cancelar();
  actual = null;
}
