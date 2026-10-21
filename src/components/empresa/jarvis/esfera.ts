/**
 * La esfera de Jarvis: miles de partículas en 3D. Cada conexión (o cada área de código, en Memoria) es una
 * región de la esfera con su propio color, su nodo encima y sus enlaces con las demás. Se gira arrastrando,
 * gira sola cuando nadie la toca y respira con la voz. Al cargar, las partículas forman el símbolo de Pime.
 */

export type EstadoEsfera = "espera" | "escuchando" | "transcribiendo" | "pensando" | "hablando";
export type Vivo = {
  estado: EstadoEsfera; encendidos: string[]; hover: string | null; modo: "conexiones" | "memoria";
  finArrastre: number;
};
type Ancla = { id: string; x: number; y: number; z: number; color: string; peso: number };

/** Un color por conexión: [tema oscuro, tema claro], en canales RGB. */
const COLORES: Record<string, [string, string]> = {
  pime: ["111 168 255", "31 91 255"],
  correo: ["34 211 238", "8 145 178"],
  agenda: ["167 139 250", "109 40 217"],
  github: ["244 114 182", "190 24 93"],
  sistemas: ["52 211 153", "4 120 87"],
  portal: ["251 146 60", "194 65 12"],
  oido: ["96 165 250", "29 78 216"],
  asistente: ["192 132 252", "126 34 206"],
  voz: ["45 212 191", "15 118 110"],
};
/** Por dónde viajan los datos entre los sistemas. */
export const ENLACES: [string, string][] = [
  ["pime", "correo"], ["pime", "agenda"], ["pime", "github"], ["pime", "sistemas"], ["pime", "portal"],
  ["pime", "asistente"], ["oido", "asistente"], ["asistente", "voz"], ["correo", "asistente"],
  ["agenda", "asistente"], ["sistemas", "portal"], ["github", "sistemas"],
];
/** Colores para las áreas de la Memoria: una rueda de tonos parejos. */
function colorArea(i: number, n: number, claro: boolean): string {
  const h = (i / n) * 360, s = 0.75, l = claro ? 0.42 : 0.66;
  const k = (m: number) => (m + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (m: number) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(m) - 3, 9 - k(m), 1))));
  return `${f(0)} ${f(8)} ${f(4)}`;
}
/** Color de cada cosa. Las personas del equipo reciben un tono propio, estable, sacado de su id. */
export const colorDe = (id: string, claro: boolean) => {
  if (COLORES[id]) return COLORES[id][claro ? 1 : 0];
  let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return colorArea(h % 360, 360, claro);
};
/** Con qué sistemas trabaja cada área del equipo. */
const SISTEMAS_DEL_AREA: Record<string, string[]> = {
  dueno: ["pime", "asistente"], ventas: ["pime", "correo", "agenda"], proyectos: ["pime", "github", "sistemas"], finanzas: ["pime", "portal"],
};

type Opciones = {
  lienzo: HTMLCanvasElement; escenario: HTMLElement;
  vivo: { current: Vivo };
  conexiones: { id: string; estado: string; area?: string }[];
  memoria: { areas: { id: string; n: number }[]; links: [string, string, number][] } | null;
};

export function iniciarEsfera({ lienzo, escenario, vivo, conexiones, memoria }: Opciones): () => void {
  const ctx0 = lienzo.getContext("2d");
  if (!ctx0) return () => {};
  const ctx: CanvasRenderingContext2D = ctx0;
  const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esClaro = () => document.documentElement.dataset.theme === "light";
  let W = 0, H = 0, raf = 0, ultimo = 0, visible = true, t0 = performance.now();

  // ── Anclas: una por conexión o por área, repartidas en la esfera (espiral de Fibonacci). ──
  const fib = (i: number, n: number) => {
    const k = i + 0.5, phi = Math.acos(1 - (2 * k) / n), th = Math.PI * (1 + Math.sqrt(5)) * k;
    return { x: Math.cos(th) * Math.sin(phi), y: Math.cos(phi), z: Math.sin(th) * Math.sin(phi) };
  };
  const anclasDe = (modo: "conexiones" | "memoria"): Ancla[] => {
    const claro = esClaro();
    if (modo === "memoria" && memoria) {
      const max = memoria.areas[0]?.n ?? 1;
      return memoria.areas.map((a, i) => ({ id: `m:${a.id}`, ...fib(i, memoria.areas.length), color: colorArea(i, memoria.areas.length, claro), peso: 0.4 + 0.6 * Math.sqrt(a.n / max) }));
    }
    return conexiones.map((c, i) => ({ id: c.id, ...fib(i, conexiones.length), color: colorDe(c.id, claro), peso: 1 }));
  };
  const enlacesDe = (modo: "conexiones" | "memoria"): [string, string, number][] =>
    modo === "memoria" && memoria ? memoria.links.map(([a, b, w]) => [`m:${a}`, `m:${b}`, w]) : [
      ...ENLACES.filter(([a, b]) => conexiones.some((c) => c.id === a) && conexiones.some((c) => c.id === b)).map(([a, b]): [string, string, number] => [a, b, 1]),
      ...conexiones.filter((c) => c.id.startsWith("p:")).flatMap((c) => (SISTEMAS_DEL_AREA[c.area ?? "dueno"] ?? ["pime"]).filter((s) => conexiones.some((x) => x.id === s)).map((s): [string, string, number] => [c.id, s, 0.6])),
    ];

  // ── Partículas ──
  const NP = Math.min(2600, Math.max(900, Math.round((escenario.clientWidth || 600) * 3.4)));
  const sx = new Float32Array(NP), sy = new Float32Array(NP), sz = new Float32Array(NP);
  const lx = new Float32Array(NP), ly = new Float32Array(NP), capa = new Uint8Array(NP);
  const dueno = new Int16Array(NP), retraso = new Float32Array(NP), tam = new Float32Array(NP), fase = new Float32Array(NP);
  const px = new Float32Array(NP), py = new Float32Array(NP);
  // El símbolo de Pime, del SVG de marca (viewBox 100): rombo arriba, dos chevrones abajo.
  const dentroRombo = (x: number, y: number) => Math.abs(x - 50) / 30 + Math.abs(y - 36) / (y < 36 ? 20 : 12) <= 1;
  const enChevron = (y0: number) => { const u = Math.random(), x = 20 + u * 60, y = y0 + (u < 0.5 ? u * 2 : (1 - u) * 2) * 12; return [x + (Math.random() - 0.5) * 6, y + (Math.random() - 0.5) * 6]; };
  for (let i = 0; i < NP; i++) {
    const p = fib(i, NP); sx[i] = p.x; sy[i] = p.y; sz[i] = p.z;
    const r = Math.random(); let x: number, y: number;
    if (r < 0.5) { capa[i] = 0; do { x = 20 + Math.random() * 60; y = 16 + Math.random() * 32; } while (!dentroRombo(x, y)); }
    else if (r < 0.75) { capa[i] = 1; [x, y] = enChevron(54); } else { capa[i] = 2; [x, y] = enChevron(72); }
    lx[i] = (x - 50) / 34; ly[i] = (y - 50) / 34;
    retraso[i] = Math.random() * 0.45; tam[i] = 1.3 + Math.random() * 1.9; fase[i] = Math.random() * 6.283;
  }
  let modo = vivo.current.modo, anclas = anclasDe(modo), enlaces = enlacesDe(modo);
  const repartir = () => {
    // Cada partícula pertenece a la región de la ancla más cercana (ponderada por su peso).
    for (let i = 0; i < NP; i++) {
      let mejor = 0, md = -9;
      for (let k = 0; k < anclas.length; k++) { const a = anclas[k]; const d = (sx[i] * a.x + sy[i] * a.y + sz[i] * a.z) + a.peso * 0.15; if (d > md) { md = d; mejor = k; } }
      dueno[i] = mejor;
    }
  };
  repartir();

  // ── Giro: arrastrar con inercia; solo, despacio, cuando nadie toca. ──
  let yaw = 0.6, pitch = -0.32, vyaw = 0, vpitch = 0, arrastrando = false, ax = 0, ay = 0, movido = 0, ultimoToque = 0;
  const puntero = { x: -9999, y: -9999 };
  const pos = (e: PointerEvent) => { const r = escenario.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const bajar = (e: PointerEvent) => { if ((e.target as HTMLElement).closest(".jv-node, .jv-mnode")) return; arrastrando = true; movido = 0; [ax, ay] = pos(e); };
  const mover = (e: PointerEvent) => {
    const [x, y] = pos(e); puntero.x = x; puntero.y = y;
    if (!arrastrando) return;
    const dx = x - ax, dy = y - ay; ax = x; ay = y; movido += Math.abs(dx) + Math.abs(dy);
    if (movido > 6) { escenario.setPointerCapture?.(e.pointerId); vyaw = dx * 0.008; vpitch = dy * 0.008; yaw += vyaw; pitch = Math.max(-1.2, Math.min(1.2, pitch + vpitch)); ultimoToque = performance.now(); if (quieto) dibujar(performance.now()); }
  };
  const soltar = (e: PointerEvent) => { if (arrastrando && movido > 6) vivo.current.finArrastre = Date.now(); arrastrando = false; escenario.releasePointerCapture?.(e.pointerId); };
  const salir = () => { puntero.x = -9999; puntero.y = -9999; };
  escenario.addEventListener("pointerdown", bajar); escenario.addEventListener("pointermove", mover);
  escenario.addEventListener("pointerup", soltar); escenario.addEventListener("pointercancel", soltar); escenario.addEventListener("pointerleave", salir);

  // ── Pulsos por los enlaces ──
  const pulsos: { e: number; t: number; v: number; grande: boolean }[] = [];
  let antes: string[] = [];

  const nodosDom = () => Array.from(escenario.querySelectorAll<HTMLElement>("[data-ancla]"));
  let nodos = nodosDom();

  const medir = () => {
    const r = escenario.getBoundingClientRect(); W = r.width; H = r.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    lienzo.width = Math.round(W * dpr); lienzo.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    nodos = nodosDom();
    if (quieto) dibujar(performance.now());
  };

  let morf = 0;
  function dibujar(ms: number) {
    const v = vivo.current, t = (ms - t0) / 1000, claro = esClaro();
    if (v.modo !== modo) { modo = v.modo; anclas = anclasDe(modo); enlaces = enlacesDe(modo); repartir(); nodos = nodosDom(); pulsos.length = 0; }
    const cx = W / 2, cy = H / 2, RS = Math.min(W, H) * 0.4, BASE = claro ? "31 91 255" : "111 168 255";
    const vel = v.estado === "pensando" || v.estado === "transcribiendo" ? 3 : v.estado === "escuchando" ? 1.6 : 1;
    ctx.clearRect(0, 0, W, H);

    // Giro e inercia.
    if (!arrastrando && !quieto) {
      vyaw *= 0.94; vpitch *= 0.94; yaw += vyaw; pitch = Math.max(-1.2, Math.min(1.2, pitch + vpitch));
      if (performance.now() - ultimoToque > 1500) yaw += 0.0035 * vel;
    }
    const cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const rot = (x: number, y: number, z: number) => { const x1 = x * cyw + z * syw, z1 = -x * syw + z * cyw; return [x1, y * cp - z1 * sp, y * sp + z1 * cp]; };
    const proy = (x: number, y: number, z: number, r = 1) => { const [a, b, c] = rot(x * r, y * r, z * r); const k = 1 / (1.7 - c * 0.55); return [cx + a * RS * k * 1.05, cy + b * RS * k * 1.05, c, k]; };

    // Halo y anillos de HUD alrededor.
    const g = ctx.createRadialGradient(cx, cy, RS * 0.2, cx, cy, RS * 1.25);
    g.addColorStop(0, `rgb(${BASE} / ${claro ? 0.1 : 0.2})`); g.addColorStop(1, `rgb(${BASE} / 0)`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const anillo = (r: number, w: number, a: number, a0 = 0, a1 = Math.PI * 2) => { ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1); ctx.lineWidth = w; ctx.strokeStyle = `rgb(${BASE} / ${a})`; ctx.stroke(); };
    ctx.save(); ctx.setLineDash([2, 8]); anillo(RS * 1.12, 1, 0.3); ctx.restore();
    for (let k = 0; k < 3; k++) { const a0 = -t * 0.3 * vel + k * 2.094; anillo(RS * 1.17, 2, 0.6, a0, a0 + 0.5); }
    ctx.strokeStyle = `rgb(${BASE} / .22)`; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 0; i < 120; i++) { const a = t * 0.03 * vel + (i * Math.PI * 2) / 120, L = i % 10 === 0 ? 8 : 4, r = RS * 1.24; ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); ctx.lineTo(cx + Math.cos(a) * (r - L), cy + Math.sin(a) * (r - L)); }
    ctx.stroke();

    // Del símbolo a la esfera: al cargar las partículas dibujan el logo y luego se abren en la esfera.
    const objetivo = t < 2.2 ? 0 : 1;
    morf += (objetivo - morf) * (quieto ? 1 : 0.05);
    const amp = v.estado === "hablando" ? 0.12 : v.estado === "escuchando" ? 0.08 : v.estado === "pensando" || v.estado === "transcribiendo" ? 0.045 : 0.015;
    const enfocado = v.hover ?? (v.encendidos.length ? null : null);
    const lit = new Set(v.encendidos); if (enfocado) lit.add(enfocado);
    const hayLuz = lit.size > 0;
    const abre = (Math.sin(t * 1.3) * 0.5 + 0.5) * 0.09, RL = RS * 0.85, logo = ["111 168 255", claro ? "31 91 255" : "76 125 255", claro ? "11 29 58" : "232 240 255"];

    // Enlaces entre sistemas: arcos sobre la superficie, del color de un extremo al del otro.
    const idx = new Map(anclas.map((a, i) => [a.id, i]));
    const wmax = Math.max(1, ...enlaces.map((e) => e[2]));
    const arco = (A: Ancla, B: Ancla, u: number) => {
      // Interpolación esférica con una pequeña elevación al centro del arco.
      const dot = Math.max(-1, Math.min(1, A.x * B.x + A.y * B.y + A.z * B.z)), om = Math.acos(dot) || 1e-3, so = Math.sin(om);
      const a = Math.sin((1 - u) * om) / so, b = Math.sin(u * om) / so, lift = 1.04 + Math.sin(u * Math.PI) * 0.16;
      return [(A.x * a + B.x * b) * lift, (A.y * a + B.y * b) * lift, (A.z * a + B.z * b) * lift];
    };
    if (morf > 0.6) {
      enlaces.forEach(([ia, ib, w], e) => {
        const ai = idx.get(ia), bi = idx.get(ib); if (ai === undefined || bi === undefined) return;
        const A = anclas[ai], B = anclas[bi], on = lit.has(ia) || lit.has(ib);
        const pa = proy(...arco(A, B, 0) as [number, number, number]), pb = proy(...arco(A, B, 1) as [number, number, number]);
        const grad = ctx.createLinearGradient(pa[0], pa[1], pb[0], pb[1]);
        const base = (0.18 + 0.4 * (w / wmax)) * (hayLuz && !on ? 0.35 : 1) * (on ? 2.2 : 1) * (morf - 0.6) * 2.5;
        grad.addColorStop(0, `rgb(${A.color} / ${Math.min(1, base)})`); grad.addColorStop(1, `rgb(${B.color} / ${Math.min(1, base)})`);
        ctx.beginPath();
        for (let s = 0; s <= 24; s++) { const p = proy(...arco(A, B, s / 24) as [number, number, number]); if (s === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]); }
        ctx.strokeStyle = grad; ctx.lineWidth = on ? 2 : 1 + (w / wmax); ctx.stroke();
        if (!quieto && Math.random() < 0.01 * (w / wmax) * vel) pulsos.push({ e, t: 0, v: 0.012 + Math.random() * 0.01, grande: false });
      });
      // Pulsos al encenderse una conexión.
      for (const id of v.encendidos) if (!antes.includes(id)) enlaces.forEach(([a, b], e) => { if (a === id || b === id) for (let k = 0; k < 3; k++) pulsos.push({ e, t: -k * 0.12, v: 0.025, grande: true }); });
      antes = v.encendidos.slice();
      for (let p = pulsos.length - 1; p >= 0; p--) {
        const q = pulsos[p]; q.t += quieto ? 0 : q.v; if (q.t > 1) { pulsos.splice(p, 1); continue; } if (q.t < 0) continue;
        const [ia, ib] = enlaces[q.e] ?? []; const ai = idx.get(ia), bi = idx.get(ib); if (ai === undefined || bi === undefined) { pulsos.splice(p, 1); continue; }
        const A = anclas[ai], B = anclas[bi], pp = proy(...arco(A, B, q.t) as [number, number, number]);
        ctx.beginPath(); ctx.arc(pp[0], pp[1], q.grande ? 3.5 : 2, 0, 6.283);
        ctx.fillStyle = q.grande ? (claro ? `rgb(${B.color})` : "rgb(255 255 255)") : `rgb(${q.t < 0.5 ? A.color : B.color} / .95)`;
        ctx.shadowColor = `rgb(${B.color})`; ctx.shadowBlur = q.grande ? 14 : 6; ctx.fill(); ctx.shadowBlur = 0;
      }
    }

    // Partículas.
    ctx.save();
    if (!claro) ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < NP; i++) {
      const dy = capa[i] === 0 ? -abre : capa[i] === 2 ? abre : 0;
      const lxp = cx + lx[i] * Math.cos(Math.sin(t * 0.6) * 0.35) * RL, lyp = cy + (ly[i] + dy) * RL;
      const ruido = 1 + amp * Math.sin(t * 7 + fase[i] * 3 + sy[i] * 5);
      const pp = proy(sx[i], sy[i], sz[i], ruido);
      const m = Math.min(1, Math.max(0, morf * 1.45 - retraso[i])), e = m * m * (3 - 2 * m);
      let tx = lxp + (pp[0] - lxp) * e, ty = lyp + (pp[1] - lyp) * e;
      const ddx = tx - puntero.x, ddy = ty - puntero.y, d2 = ddx * ddx + ddy * ddy;
      if (d2 < 2500 && !arrastrando && !quieto) { const f = (1 - d2 / 2500) * 10, d = Math.sqrt(d2) || 1; tx += (ddx / d) * f; ty += (ddy / d) * f; }
      px[i] += (tx - px[i]) * (px[i] === 0 ? 1 : 0.4); py[i] += (ty - py[i]) * (py[i] === 0 ? 1 : 0.4);
      const an = anclas[dueno[i]], suyo = an && lit.has(an.id);
      const color = e < 0.5 ? logo[capa[i]] : an?.color ?? BASE;
      const atras = (1 - pp[2]) / 2;
      let a = (claro ? 0.8 + 0.2 * Math.sin(t * 2 + fase[i]) : 0.55 + 0.45 * Math.sin(t * 2 + fase[i])) * (1 - e * atras * 0.75);
      if (hayLuz && e > 0.5) a *= suyo ? 1.3 : 0.35;
      const s = tam[i] * (1 + e * (pp[3] - 0.6)) * (suyo ? 1.4 : 1);
      ctx.fillStyle = `rgb(${color} / ${Math.min(1, a).toFixed(2)})`;
      ctx.fillRect(px[i] - s / 2, py[i] - s / 2, s, s);
    }
    ctx.restore();

    // Los nodos HTML viajan con su región: los de atrás se achican y se apagan.
    const mapa = new Map(anclas.map((a) => [a.id, a]));
    for (const el of nodos) {
      const a = mapa.get(el.dataset.ancla ?? ""); if (!a) continue;
      const p = proy(a.x, a.y, a.z, 1.08);
      const frente = (p[2] + 1) / 2, sc = 0.7 + 0.35 * frente * Math.min(1, morf * 1.2);
      el.style.left = `${p[0]}px`; el.style.top = `${p[1]}px`;
      el.style.transform = `translate(-50%, -50%) scale(${sc.toFixed(3)})`;
      el.style.opacity = morf < 0.5 ? "0" : (0.3 + 0.7 * frente).toFixed(2);
      el.style.zIndex = String(Math.round(frente * 10) + 1);
      el.style.pointerEvents = morf < 0.5 || frente < 0.25 ? "none" : "";
      el.dataset.atras = frente < 0.45 ? "1" : "0";
    }
  }

  const bucle = (ms: number) => {
    raf = requestAnimationFrame(bucle);
    if (!visible || document.hidden || ms - ultimo < 33) return;
    ultimo = ms; dibujar(ms);
  };
  const ro = new ResizeObserver(medir); ro.observe(escenario); medir();
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }); io.observe(escenario);
  const mo = new MutationObserver(() => { anclas = anclasDe(modo); nodos = nodosDom(); if (quieto) dibujar(performance.now()); });
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  if (quieto) { t0 = performance.now() - 5000; morf = 1; dibujar(performance.now()); } else raf = requestAnimationFrame(bucle);
  return () => {
    cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); mo.disconnect();
    escenario.removeEventListener("pointerdown", bajar); escenario.removeEventListener("pointermove", mover);
    escenario.removeEventListener("pointerup", soltar); escenario.removeEventListener("pointercancel", soltar); escenario.removeEventListener("pointerleave", salir);
  };
}
