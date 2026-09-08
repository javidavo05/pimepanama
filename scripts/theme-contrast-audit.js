/**
 * Auditor de contraste y de superficies para el tema claro/oscuro de /empresa.
 *
 * Se inyecta en la página ya renderizada (window.__themeAudit()). Mide sobre el
 * DOM real, no sobre el código: es la única forma de cazar un color que llega
 * por composición (opacidad heredada, fondo de un ancestro, gradiente).
 *
 * Devuelve dos familias de defecto:
 *  - contraste: texto que no llega al mínimo AA sobre su fondo efectivo.
 *  - superficie: una isla oscura incrustada en un canvas claro (o al revés),
 *    que es exactamente el defecto de la captura del usuario.
 */
(() => {
  const parseRGB = (s) => {
    const m = String(s).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };

  const lin = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const lum = ({ r, g, b }) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  // Composición source-over con alfa correcto. Devolver `a: 1` a secas hacía que
  // dos capas translúcidas apiladas (una píldora al 15 % sobre una fila al 8 %)
  // se dieran por opacas y la búsqueda del fondo se detuviera antes de llegar al
  // panel: el resultado era un azul sólido inventado y cientos de falsos avisos.
  const over = (fg, bg) => {
    const a = fg.a + bg.a * (1 - fg.a);
    if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
    return {
      r: (fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / a,
      g: (fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / a,
      b: (fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / a,
      a,
    };
  };
  const ratio = (a, b) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };

  // Fondo efectivo: compone hacia arriba hasta encontrar algo opaco.
  function bgOf(el) {
    let acc = null;
    let node = el;
    while (node && node.nodeType === 1) {
      const cs = getComputedStyle(node);
      if (cs.backgroundImage && cs.backgroundImage !== "none") return { unknown: true };
      const c = parseRGB(cs.backgroundColor);
      if (c && c.a > 0) {
        acc = acc ? over(acc, c) : c;
        if (acc.a >= 0.999) return acc;
      }
      node = node.parentElement;
    }
    const page = parseRGB(getComputedStyle(document.body).backgroundColor);
    return acc ? over(acc, page || { r: 255, g: 255, b: 255, a: 1 }) : page;
  }

  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) < 0.15) return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  };

  const contrast = [];
  const surfaces = [];

  const canvasLum = lum(bgOf(document.querySelector(".empresa-app") || document.body));
  const themeIsLight = canvasLum > 0.5;

  for (const el of document.querySelectorAll(".empresa-app *")) {
    if (!visible(el)) continue;
    // Un subárbol marcado como superficie fija no sigue al tema por diseño: su
    // contenido es un documento (el HTML de un correo, una firma, un PDF) con
    // sus propios colores. Medirlo contra el tema no dice nada útil.
    if (el.closest('[data-theme-surface="fixed"]')) continue;
    const cs = getComputedStyle(el);

    // ── texto ──────────────────────────────────────────────────────────────
    const text = [...el.childNodes]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent.trim())
      .join(" ")
      .trim();
    if (text) {
      const fg = parseRGB(cs.color);
      const bg = bgOf(el);
      if (fg && bg && !bg.unknown) {
        const eff = fg.a < 1 ? over(fg, bg) : fg;
        const cr = ratio(eff, bg);
        const size = parseFloat(cs.fontSize);
        const bold = Number(cs.fontWeight) >= 700;
        const large = size >= 24 || (size >= 18.66 && bold);
        const min = large ? 3 : 4.5;
        if (cr < min) {
          contrast.push({
            ratio: +cr.toFixed(2),
            min,
            text: text.slice(0, 60),
            color: cs.color,
            bg: `rgb(${Math.round(bg.r)} ${Math.round(bg.g)} ${Math.round(bg.b)})`,
            sel: el.tagName.toLowerCase() + (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).slice(0, 4).join(".") : ""),
          });
        }
      }
    }

    // ── superficie ────────────────────────────────────────────────────────
    const own = parseRGB(cs.backgroundColor);
    // `data-theme-surface="fixed"` marca una superficie que a propósito no sigue
    // al tema (el lienzo blanco de un correo, la mesa gris de un visor de PDF).
    if (own && own.a > 0.85) {
      const r = el.getBoundingClientRect();
      if (r.width * r.height > 8000) {
        const l = lum(own);
        // Una isla que va a contracorriente del canvas es el defecto de la captura.
        if (themeIsLight && l < 0.12) {
          surfaces.push({ kind: "panel-oscuro-en-tema-claro", lum: +l.toFixed(3), bg: cs.backgroundColor, area: Math.round(r.width * r.height), sel: el.tagName.toLowerCase() + "." + String(el.className).trim().split(/\s+/).slice(0, 4).join(".") });
        }
        if (!themeIsLight && l > 0.7) {
          surfaces.push({ kind: "panel-claro-en-tema-oscuro", lum: +l.toFixed(3), bg: cs.backgroundColor, area: Math.round(r.width * r.height), sel: el.tagName.toLowerCase() + "." + String(el.className).trim().split(/\s+/).slice(0, 4).join(".") });
        }
      }
    }
  }

  const seen = new Set();
  const dedupe = (arr, key) => arr.filter((x) => { const k = key(x); if (seen.has(k)) return false; seen.add(k); return true; });

  return {
    url: location.pathname,
    // `theme` se deriva del canvas medido, no de lo que el llamador creía haber
    // puesto: si no coinciden, la medición es de otro tema y no vale.
    theme: themeIsLight ? "light" : "dark",
    domTheme: document.documentElement.getAttribute("data-theme"),
    canvasLum: +canvasLum.toFixed(3),
    contrast: dedupe(contrast, (x) => x.sel + x.ratio).slice(0, 25),
    surfaces: dedupe(surfaces, (x) => x.sel + x.bg).slice(0, 15),
    contrastCount: contrast.length,
    surfaceCount: surfaces.length,
  };
})();
