/**
 * El núcleo de Jarvis: una esfera de puntos unidos en red (plexo) que gira, se arrastra y respira con la voz.
 * Los íconos de cada sistema y de cada persona del equipo quedan afuera, en un anillo fijo y legible; cada
 * uno se une con una línea de su color a su región de la esfera, y los sistemas se unen entre sí con arcos
 * sobre la superficie. Al cargar, los puntos forman el símbolo de Pime y luego se abren en la esfera.
 */

export type EstadoEsfera = "espera" | "escuchando" | "transcribiendo" | "pensando" | "hablando";
export type Vivo = {
  estado: EstadoEsfera; encendidos: string[]; hover: string | null; modo: "conexiones" | "memoria";
  finArrastre: number;
  /** true: el núcleo muestra el símbolo de Pime en vez de la esfera. */
  logo: boolean;
};
type Ancla = { id: string; x: number; y: number; z: number; color: string };

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
/** Con qué sistemas trabaja cada área del equipo. */
const SISTEMAS_DEL_AREA: Record<string, string[]> = {
  dueno: ["pime", "asistente"], ventas: ["pime", "correo", "agenda"], proyectos: ["pime", "github", "sistemas"], finanzas: ["pime", "portal"],
};
/** Una rueda de tonos parejos (para las áreas de la Memoria y las personas). */
function tono(h: number, claro: boolean): string {
  const s = 0.75, l = claro ? 0.42 : 0.66;
  const k = (m: number) => (m + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (m: number) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(m) - 3, 9 - k(m), 1))));
  return `${f(0)} ${f(8)} ${f(4)}`;
}
/** Color de cada cosa. Las personas del equipo reciben un tono propio, estable, sacado de su id. */
export const colorDe = (id: string, claro: boolean) => {
  if (COLORES[id]) return COLORES[id][claro ? 1 : 0];
  let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return tono(h % 360, claro);
};
/** Posición fija de cada ícono en el anillo de afuera, en % del escenario. */
export const posicionEnAnillo = (i: number, n: number, radio = 44) => {
  const a = -Math.PI / 2 + (i * Math.PI * 2) / Math.max(1, n);
  return { x: 50 + Math.cos(a) * radio, y: 50 + Math.sin(a) * radio, a };
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

  const fib = (i: number, n: number) => {
    const k = i + 0.5, phi = Math.acos(1 - (2 * k) / n), th = Math.PI * (1 + Math.sqrt(5)) * k;
    return { x: Math.cos(th) * Math.sin(phi), y: Math.cos(phi), z: Math.sin(th) * Math.sin(phi) };
  };
  // Cada ícono apunta a la región de la esfera que queda hacia su lado del anillo.
  const anclasDe = (modo: "conexiones" | "memoria"): Ancla[] => {
    const claro = esClaro();
    const lista = modo === "memoria" && memoria ? memoria.areas.map((a) => `m:${a.id}`) : conexiones.map((c) => c.id);
    return lista.map((id, i) => {
      const { a } = posicionEnAnillo(i, lista.length);
      const z = Math.sin(i * 2.399) * 0.55, r = Math.sqrt(1 - z * z);
      return { id, x: Math.cos(a) * r, y: Math.sin(a) * r, z, color: id.startsWith("m:") ? tono((i / lista.length) * 360, claro) : colorDe(id, claro) };
    });
  };
  const enlacesDe = (modo: "conexiones" | "memoria"): [string, string, number][] =>
    modo === "memoria" && memoria ? memoria.links.map(([a, b, w]) => [`m:${a}`, `m:${b}`, w]) : [
      ...ENLACES.filter(([a, b]) => conexiones.some((c) => c.id === a) && conexiones.some((c) => c.id === b)).map(([a, b]): [string, string, number] => [a, b, 1]),
      ...conexiones.filter((c) => c.id.startsWith("p:")).flatMap((c) => (SISTEMAS_DEL_AREA[c.area ?? "dueno"] ?? ["pime"]).filter((s) => conexiones.some((x) => x.id === s)).map((s): [string, string, number] => [c.id, s, 0.6])),
    ];

  // ── Puntos de la red ──
  const NP = Math.min(900, Math.max(560, Math.round((escenario.clientWidth || 600) * 1.2)));
  const sx = new Float32Array(NP), sy = new Float32Array(NP), sz = new Float32Array(NP);
  const lx = new Float32Array(NP), ly = new Float32Array(NP), capa = new Uint8Array(NP);
  const dueno = new Int16Array(NP), retraso = new Float32Array(NP), tam = new Float32Array(NP), fase = new Float32Array(NP);
  const px = new Float32Array(NP), py = new Float32Array(NP), pz = new Float32Array(NP);
  // El símbolo de Pime, del SVG de marca (viewBox 100): rombo arriba, dos chevrones abajo.
  const dentroRombo = (x: number, y: number) => Math.abs(x - 50) / 30 + Math.abs(y - 36) / (y < 36 ? 20 : 12) <= 1;
  const enChevron = (y0: number) => { const u = Math.random(), x = 20 + u * 60, y = y0 + (u < 0.5 ? u * 2 : (1 - u) * 2) * 12; return [x + (Math.random() - 0.5) * 6, y + (Math.random() - 0.5) * 6]; };
  for (let i = 0; i < NP; i++) {
    // Un poco de volumen: algunos puntos van por dentro, como en una nube.
    const p = fib(i, NP), r = 0.82 + Math.random() * 0.18;
    sx[i] = p.x * r; sy[i] = p.y * r; sz[i] = p.z * r;
    const q = Math.random(); let x: number, y: number;
    if (q < 0.5) { capa[i] = 0; do { x = 20 + Math.random() * 60; y = 16 + Math.random() * 32; } while (!dentroRombo(x, y)); }
    else if (q < 0.75) { capa[i] = 1; [x, y] = enChevron(54); } else { capa[i] = 2; [x, y] = enChevron(72); }
    lx[i] = (x - 50) / 34; ly[i] = (y - 50) / 34;
    retraso[i] = Math.random() * 0.45; tam[i] = 1.2 + Math.random() * 1.8; fase[i] = Math.random() * 6.283;
  }
  // Polvo del símbolo: muchos puntos chicos repartidos en las tres capas del logo (solo se ven mientras está formado).
  const NL = Math.min(5200, Math.max(2600, Math.round((escenario.clientWidth || 600) * 6)));
  const dx = new Float32Array(NL), dyy = new Float32Array(NL), dcapa = new Uint8Array(NL), dtam = new Float32Array(NL), dfase = new Float32Array(NL);
  for (let i = 0; i < NL; i++) {
    const q = Math.random(); let x: number, y: number;
    if (q < 0.55) { dcapa[i] = 0; do { x = 20 + Math.random() * 60; y = 16 + Math.random() * 32; } while (!dentroRombo(x, y)); }
    else if (q < 0.78) { dcapa[i] = 1; [x, y] = enChevron(54); } else { dcapa[i] = 2; [x, y] = enChevron(72); }
    dx[i] = (x - 50) / 34; dyy[i] = (y - 50) / 34; dtam[i] = 0.8 + Math.random() * 1.4; dfase[i] = Math.random() * 6.283;
  }
  // Pares cercanos: la red se calcula una vez (girar no cambia las distancias).
  const pares: number[] = [];
  const umbral = 0.24 * Math.sqrt(500 / NP);
  for (let i = 0; i < NP; i++) for (let j = i + 1; j < NP; j++) {
    const dx = sx[i] - sx[j], dy = sy[i] - sy[j], dz = sz[i] - sz[j];
    if (dx * dx + dy * dy + dz * dz < umbral * umbral) pares.push(i, j);
  }

  let modo = vivo.current.modo, anclas = anclasDe(modo), enlaces = enlacesDe(modo);
  const repartir = () => {
    for (let i = 0; i < NP; i++) {
      let mejor = 0, md = -9;
      for (let k = 0; k < anclas.length; k++) { const a = anclas[k]; const d = sx[i] * a.x + sy[i] * a.y + sz[i] * a.z; if (d > md) { md = d; mejor = k; } }
      dueno[i] = mejor;
    }
  };
  repartir();

  // ── Giro: arrastrar con inercia; solo, despacio, cuando nadie toca. ──
  let yaw = 0.4, pitch = -0.25, vyaw = 0, vpitch = 0, arrastrando = false, ax = 0, ay = 0, movido = 0, ultimoToque = 0;
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

  const pulsos: { e: number; t: number; v: number; grande: boolean; nodo?: boolean }[] = [];
  let antes: string[] = [];
  const nodosDom = () => Array.from(escenario.querySelectorAll<HTMLElement>("[data-ancla]"));
  let nodos = nodosDom();
  /** Dónde arranca la línea de cada ícono (centro de su ícono), y su curva, para los pulsos. */
  const curvas = new Map<string, number[]>();

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
    const cx = W / 2, cy = H / 2, RS = Math.min(W, H) * 0.31, BASE = claro ? "31 91 255" : "140 185 255";
    const vel = v.estado === "pensando" || v.estado === "transcribiendo" ? 3 : v.estado === "escuchando" ? 1.6 : 1;
    ctx.clearRect(0, 0, W, H);

    if (!arrastrando && !quieto) {
      vyaw *= 0.94; vpitch *= 0.94; yaw += vyaw; pitch = Math.max(-1.2, Math.min(1.2, pitch + vpitch));
      if (performance.now() - ultimoToque > 1500) yaw += 0.003 * vel;
    }
    const cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const rot = (x: number, y: number, z: number) => { const x1 = x * cyw + z * syw, z1 = -x * syw + z * cyw; return [x1, y * cp - z1 * sp, y * sp + z1 * cp]; };
    const proy = (x: number, y: number, z: number, r = 1) => { const [a, b, c] = rot(x * r, y * r, z * r); const k = 1 / (1.7 - c * 0.55); return [cx + a * RS * k * 1.1, cy + b * RS * k * 1.1, c, k]; };

    // Piso de retícula en perspectiva, bajo la esfera, y el halo.
    const piso = cy + RS * 1.05;
    ctx.save();
    ctx.strokeStyle = `rgb(${BASE} / ${claro ? 0.12 : 0.1})`; ctx.lineWidth = 1; ctx.beginPath();
    for (let k = 0; k < 9; k++) { const y = piso + Math.pow(k / 8, 1.8) * (H - piso); ctx.moveTo(0, y); ctx.lineTo(W, y); }
    for (let k = -12; k <= 12; k++) { ctx.moveTo(cx + k * 12, piso); ctx.lineTo(cx + k * W * 0.12, H); }
    ctx.stroke(); ctx.restore();
    const g = ctx.createRadialGradient(cx, cy, RS * 0.1, cx, cy, RS * 1.5);
    g.addColorStop(0, `rgb(${BASE} / ${claro ? 0.1 : 0.18})`); g.addColorStop(1, `rgb(${BASE} / 0)`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // Símbolo al cargar (3 s) y siempre que el modo Logo esté encendido.
    const objetivo = t < 3 || v.logo ? 0 : 1;
    morf += (objetivo - morf) * (quieto ? 1 : 0.05);
    const amp = v.estado === "hablando" ? 0.1 : v.estado === "escuchando" ? 0.07 : v.estado === "pensando" || v.estado === "transcribiendo" ? 0.04 : 0.012;
    const lit = new Set(v.encendidos); if (v.hover) lit.add(v.hover);
    const hayLuz = lit.size > 0;
    const abre = (Math.sin(t * 1.3) * 0.5 + 0.5) * 0.1, RL = RS * 0.86;
    const logo = ["111 168 255", claro ? "31 91 255" : "76 125 255", claro ? "11 29 58" : "232 240 255"];

    // Posición de cada punto (símbolo → esfera) y el puntero que los aparta.
    for (let i = 0; i < NP; i++) {
      const dy = capa[i] === 0 ? -abre : capa[i] === 2 ? abre : 0;
      const lxp = cx + lx[i] * Math.cos(Math.sin(t * 0.6) * 0.35) * RL, lyp = cy + (ly[i] + dy) * RL;
      const ruido = 1 + amp * Math.sin(t * 7 + fase[i] * 3 + sy[i] * 5);
      const pp = proy(sx[i], sy[i], sz[i], ruido);
      const m = Math.min(1, Math.max(0, morf * 1.45 - retraso[i])), e = m * m * (3 - 2 * m);
      let tx = lxp + (pp[0] - lxp) * e, ty = lyp + (pp[1] - lyp) * e;
      const ddx = tx - puntero.x, ddy = ty - puntero.y, d2 = ddx * ddx + ddy * ddy;
      if (d2 < 2500 && !arrastrando && !quieto) { const f = (1 - d2 / 2500) * 10, d = Math.sqrt(d2) || 1; tx += (ddx / d) * f; ty += (ddy / d) * f; }
      px[i] += (tx - px[i]) * (px[i] === 0 ? 1 : 0.4); py[i] += (ty - py[i]) * (py[i] === 0 ? 1 : 0.4); pz[i] = pp[2] * e;
    }

    // La red: líneas finas entre vecinos, más tenues atrás.
    if (morf > 0.5) {
      const a0 = (morf - 0.5) * 2;
      ctx.lineWidth = 0.7;
      for (let k = 0; k < pares.length; k += 2) {
        const i = pares[k], j = pares[k + 1];
        const fondo = ((pz[i] + pz[j]) / 2 + 1) / 2;
        const an = anclas[dueno[i]], suyo = !!an && lit.has(an.id) && dueno[i] === dueno[j];
        const col = suyo ? an.color : BASE;
        const a = (claro ? 0.1 + 0.28 * fondo : 0.06 + 0.3 * fondo) * a0 * (hayLuz && !suyo ? 0.6 : suyo ? 2.2 : 1);
        ctx.strokeStyle = `rgb(${col} / ${a.toFixed(3)})`;
        ctx.beginPath(); ctx.moveTo(px[i], py[i]); ctx.lineTo(px[j], py[j]); ctx.stroke();
      }
    }

    // Arcos entre sistemas sobre la superficie.
    const idx = new Map(anclas.map((a, i) => [a.id, i]));
    const wmax = Math.max(1, ...enlaces.map((e) => e[2]));
    const arco = (A: Ancla, B: Ancla, u: number): [number, number, number] => {
      const dot = Math.max(-1, Math.min(1, A.x * B.x + A.y * B.y + A.z * B.z)), om = Math.acos(dot) || 1e-3, so = Math.sin(om);
      const a = Math.sin((1 - u) * om) / so, b = Math.sin(u * om) / so, lift = 1.02 + Math.sin(u * Math.PI) * 0.12;
      return [(A.x * a + B.x * b) * lift, (A.y * a + B.y * b) * lift, (A.z * a + B.z * b) * lift];
    };
    if (morf > 0.6) {
      enlaces.forEach(([ia, ib, w], e) => {
        const ai = idx.get(ia), bi = idx.get(ib); if (ai === undefined || bi === undefined) return;
        const A = anclas[ai], B = anclas[bi], on = lit.has(ia) || lit.has(ib);
        if (!on && hayLuz) return;
        const pa = proy(...arco(A, B, 0)), pb = proy(...arco(A, B, 1));
        const grad = ctx.createLinearGradient(pa[0], pa[1], pb[0], pb[1]);
        const al = Math.min(1, (on ? 0.85 : 0.22 + 0.25 * (w / wmax)) * (morf - 0.6) * 2.5);
        grad.addColorStop(0, `rgb(${A.color} / ${al})`); grad.addColorStop(1, `rgb(${B.color} / ${al})`);
        ctx.beginPath();
        for (let s = 0; s <= 20; s++) { const p = proy(...arco(A, B, s / 20)); if (s === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]); }
        ctx.strokeStyle = grad; ctx.lineWidth = on ? 1.8 : 1; ctx.stroke();
        if (!quieto && Math.random() < 0.006 * (w / wmax) * vel) pulsos.push({ e, t: 0, v: 0.014, grande: false });
      });
    }

    // Polvo del símbolo: puntos extra, solo del logo, que lo hacen denso mientras está formado.
    if (morf < 0.8) {
      const fuerza = Math.min(1, (0.8 - morf) / 0.5), vaiven = Math.cos(Math.sin(t * 0.6) * 0.35);
      ctx.save();
      if (!claro) ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < NL; i++) {
        const dy = dcapa[i] === 0 ? -abre : dcapa[i] === 2 ? abre : 0;
        const x = cx + dx[i] * vaiven * RL, y = cy + (dyy[i] + dy) * RL;
        const a = (claro ? 0.55 + 0.35 * Math.sin(t * 2.5 + dfase[i]) : 0.4 + 0.45 * Math.sin(t * 2.5 + dfase[i])) * fuerza;
        ctx.fillStyle = `rgb(${logo[dcapa[i]]} / ${a.toFixed(2)})`;
        ctx.fillRect(x - dtam[i] / 2, y - dtam[i] / 2, dtam[i], dtam[i]);
      }
      ctx.restore();
    }

    // Puntos.
    ctx.save();
    if (!claro) ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < NP; i++) {
      const m = Math.min(1, Math.max(0, morf * 1.45 - retraso[i])), e = m * m * (3 - 2 * m);
      const an = anclas[dueno[i]], suyo = !!an && lit.has(an.id);
      const color = e < 0.5 ? logo[capa[i]] : suyo ? an.color : (i % 4 === 0 && an ? an.color : BASE);
      const fondo = (pz[i] + 1) / 2;
      let a = (0.55 + 0.45 * Math.sin(t * 2 + fase[i])) * (e > 0.5 ? 0.35 + 0.65 * fondo : 1);
      if (hayLuz && e > 0.5) a *= suyo ? 1.4 : 0.5;
      const s = tam[i] * (e > 0.5 ? 0.6 + 0.6 * fondo : 1.25) * (suyo ? 1.5 : 1);
      ctx.fillStyle = `rgb(${color} / ${Math.min(1, a).toFixed(2)})`;
      ctx.beginPath(); ctx.arc(px[i], py[i], s, 0, 6.283); ctx.fill();
    }
    ctx.restore();

    // Íconos de afuera: una línea de su color hasta su región de la esfera.
    const caja = escenario.getBoundingClientRect();
    for (const el of nodos) {
      const id = el.dataset.ancla ?? ""; const k = idx.get(id); if (k === undefined) continue;
      el.style.opacity = morf < 0.4 && t < 3 ? "0" : morf < 0.4 ? "0.55" : "1";
      if (morf < 0.6) continue;
      const A = anclas[k], p = proy(A.x, A.y, A.z, 1.0);
      const hx = el.querySelector<HTMLElement>(".jv-hex, .jv-mdot")?.getBoundingClientRect() ?? el.getBoundingClientRect();
      const nx = hx.left + hx.width / 2 - caja.left, ny = hx.top + hx.height / 2 - caja.top;
      const on = lit.has(id), aviso = !!el.dataset.e && el.dataset.e !== "ok";
      const frente = (p[2] + 1) / 2;
      const al = (on ? 0.95 : hayLuz ? 0.12 : 0.22 + 0.35 * frente) * Math.min(1, (morf - 0.6) * 2.5);
      const mx = (nx + p[0]) / 2 + (cx - (nx + p[0]) / 2) * 0.15, my = (ny + p[1]) / 2 + (cy - (ny + p[1]) / 2) * 0.15;
      curvas.set(id, [nx, ny, p[0], p[1], mx, my]);
      ctx.save();
      if (aviso) ctx.setLineDash([3, 5]);
      ctx.strokeStyle = `rgb(${A.color} / ${al.toFixed(2)})`; ctx.lineWidth = on ? 1.6 : 1;
      ctx.beginPath(); ctx.moveTo(nx, ny); ctx.quadraticCurveTo(mx, my, p[0], p[1]); ctx.stroke(); ctx.restore();
      ctx.beginPath(); ctx.arc(p[0], p[1], on ? 4 : 2.5, 0, 6.283); ctx.fillStyle = `rgb(${A.color} / ${(0.4 + 0.6 * frente).toFixed(2)})`; ctx.fill();
      if (on && !quieto && Math.random() < 0.25) pulsos.push({ e: k, t: 0, v: 0.04, grande: true, nodo: true });
    }

    // Pulsos: por los arcos y por las líneas de los íconos.
    for (const id of v.encendidos) if (!antes.includes(id)) enlaces.forEach(([a, b], e) => { if (a === id || b === id) for (let k = 0; k < 3; k++) pulsos.push({ e, t: -k * 0.12, v: 0.025, grande: true }); });
    antes = v.encendidos.slice();
    for (let p = pulsos.length - 1; p >= 0; p--) {
      const q = pulsos[p]; q.t += quieto ? 0 : q.v; if (q.t > 1) { pulsos.splice(p, 1); continue; } if (q.t < 0) continue;
      let x: number, y: number, col: string;
      if (q.nodo) {
        const c = curvas.get(anclas[q.e]?.id ?? ""); if (!c) { pulsos.splice(p, 1); continue; }
        const [x0, y0, x1, y1, qx, qy] = c, u = 1 - q.t;
        x = u * u * x0 + 2 * u * q.t * qx + q.t * q.t * x1; y = u * u * y0 + 2 * u * q.t * qy + q.t * q.t * y1; col = anclas[q.e].color;
      } else {
        const [ia, ib] = enlaces[q.e] ?? []; const ai = idx.get(ia), bi = idx.get(ib); if (ai === undefined || bi === undefined) { pulsos.splice(p, 1); continue; }
        const A = anclas[ai], B = anclas[bi], pp = proy(...arco(A, B, q.t)); x = pp[0]; y = pp[1]; col = q.t < 0.5 ? A.color : B.color;
      }
      ctx.beginPath(); ctx.arc(x, y, q.grande ? 3 : 2, 0, 6.283);
      ctx.fillStyle = q.grande && !claro ? "rgb(255 255 255)" : `rgb(${col})`;
      ctx.shadowColor = `rgb(${col})`; ctx.shadowBlur = q.grande ? 12 : 6; ctx.fill(); ctx.shadowBlur = 0;
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
