#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Plantilla base del sistema de diseño de propuestas Pime Panamá.
Copiar a la carpeta del nuevo proyecto y usar como punto de partida.
No modificar los tokens de marca (colores/tipografías) — ver PROMPT_CLAUDE_CODE.md §1-2.
"""

# Ajustar SIEMPRE al número real de páginas del documento final.
TOTAL = 14


def header(tag: str) -> str:
    """Header estándar de página interna. `tag` = nombre de la sección en curso."""
    return f'''
    <div class="doc-header">
      <div class="brand"><img src="assets/logo_icon.png"><span>PIME</span></div>
      <div class="tag">{tag}</div>
    </div>'''


def footer(n: int) -> str:
    """Footer estándar de página interna. `n` = número de página actual (1-indexed)."""
    return f'''
    <div class="doc-footer">
      <div>Pime Panam&aacute; <span class="dot">&middot;</span> Propuesta Comercial Confidencial</div>
      <div>{n:02d} / {TOTAL}</div>
    </div>'''


def plan_card(name: str, price: str, desc: str, features: list[str], highlight: bool = False) -> str:
    """Tarjeta de plan/precio. Usar en filas de 3-4 con display:flex y align-items:stretch."""
    bg = "var(--ink)" if highlight else "white"
    color = "white" if highlight else "var(--ink)"
    sub_color = "rgba(255,255,255,0.65)" if highlight else "var(--slate)"
    border = "none" if highlight else "1px solid var(--line)"
    badge = '<div class="pill grad" style="margin-bottom:4mm;">M&Aacute;S ELEGIDO</div>' if highlight else '<div style="height:6mm;"></div>'
    feat_text_color = "rgba(255,255,255,0.82)" if highlight else "var(--ink-soft)"
    feats = "".join(
        f'<li style="display:flex;gap:2.2mm;align-items:flex-start;font-size:8.1pt;'
        f'color:{feat_text_color};margin-bottom:2.2mm;font-weight:500;line-height:1.4;">'
        f'<span style="width:3.4mm;height:3.4mm;border-radius:3px;background:var(--grad);'
        f'margin-top:0.8mm;flex:none;"></span>{ft}</li>'
        for ft in features
    )
    return f'''
    <div style="flex:1; border-radius:12px; background:{bg}; border:{border}; padding:6.5mm 5.5mm; display:flex; flex-direction:column;">
      {badge}
      <div style="font-family:'Manrope'; font-weight:700; font-size:11.5pt; color:{color};">{name}</div>
      <div style="margin-top:2mm; display:flex; align-items:baseline; gap:1.4mm;">
        <span style="font-family:'Manrope'; font-weight:800; font-size:19pt; color:{color};">${price}</span>
        <span style="font-size:8pt; color:{sub_color}; font-weight:500;">/mes</span>
      </div>
      <div style="font-size:8.2pt; color:{sub_color}; margin-top:1.6mm; margin-bottom:4.5mm;">{desc}</div>
      <ul style="list-style:none; flex:1;">{feats}</ul>
    </div>'''


def phase_card(tag: str, tag_outline: bool, name: str, price: str, timeframe: str,
               body: str, footer_pill: str) -> str:
    """Tarjeta de fase — SIEMPRE usar este patrón para fases, nunca una timeline conectada.
    Ver PROMPT_CLAUDE_CODE.md §4.11: las fases son aprobaciones independientes."""
    pill_class = "pill outline" if tag_outline else "pill"
    border = "1px solid var(--line)" if tag_outline else "1.4px solid var(--ink)"
    return f'''
    <div style="border-radius:12px; border:{border}; padding:4.8mm; display:flex; flex-direction:column;">
      <div class="{pill_class}" style="width:fit-content; margin-bottom:3mm; font-size:6.6pt; padding:1.4mm 2.8mm;">{tag}</div>
      <div style="font-family:'Manrope'; font-weight:800; font-size:11.5pt;">{name}</div>
      <div style="font-family:'Manrope'; font-weight:800; font-size:14.5pt; color:var(--blue); margin-top:1.6mm;">{price}</div>
      <div style="font-size:7.6pt; color:var(--slate-light); font-weight:600; margin:1.2mm 0 3mm 0;">{timeframe}</div>
      <p class="body" style="flex:1; font-size:8.1pt; line-height:1.55;">{body}</p>
      <div class="pill outline" style="margin-top:3mm; width:fit-content; font-size:6.6pt; padding:1.4mm 2.8mm;">{footer_pill}</div>
    </div>'''


def cover_page(eyebrow: str, title_html: str, subtitle: str, prepared_for: str,
               prepared_by: str = "Pime Panam&aacute;", date: str = "") -> str:
    """Portada estándar: blanca, seria, con barra de acento superior. Nunca oscura/neon."""
    return f'''
<div class="page" style="background:var(--white); color:var(--ink);">
  <div style="position:absolute; top:0; left:0; right:0; height:5mm; background:var(--grad);"></div>
  <div style="position:relative; padding:22mm 18mm 18mm 18mm; height:292mm; display:flex; flex-direction:column;">
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <div style="display:flex; align-items:center; gap:9px;">
        <img src="assets/logo_icon.png" style="height:20px;">
        <span style="font-family:'Manrope'; font-weight:800; font-size:13pt; letter-spacing:-0.01em; color:var(--ink);">PIME</span>
      </div>
      <div style="font-size:8pt; letter-spacing:0.14em; text-transform:uppercase; color:var(--slate-light); font-weight:600;">
        Panam&aacute; &middot; Desarrollo de Software
      </div>
    </div>
    <div style="flex:1; display:flex; flex-direction:column; justify-content:center; margin-top:6mm;">
      <div class="eyebrow" style="margin-bottom:9mm;">{eyebrow}</div>
      <h1 style="font-family:'Manrope'; font-weight:800; font-size:33pt; line-height:1.14; max-width:150mm; letter-spacing:-0.02em; color:var(--ink);">
        {title_html}
      </h1>
      <div style="width:22mm; height:2px; background:var(--grad); margin:8mm 0;"></div>
      <p style="font-size:11pt; color:var(--slate); max-width:122mm; line-height:1.75; font-weight:400;">{subtitle}</p>
      <div style="display:flex; gap:14mm; margin-top:15mm;">
        <div>
          <div style="font-size:7.6pt; color:var(--slate-light); text-transform:uppercase; letter-spacing:0.1em; font-weight:700; margin-bottom:1.8mm;">Preparado para</div>
          <div style="font-size:10pt; font-weight:600; color:var(--ink);">{prepared_for}</div>
        </div>
        <div>
          <div style="font-size:7.6pt; color:var(--slate-light); text-transform:uppercase; letter-spacing:0.1em; font-weight:700; margin-bottom:1.8mm;">Preparado por</div>
          <div style="font-size:10pt; font-weight:600; color:var(--ink);">{prepared_by}</div>
        </div>
        <div>
          <div style="font-size:7.6pt; color:var(--slate-light); text-transform:uppercase; letter-spacing:0.1em; font-weight:700; margin-bottom:1.8mm;">Fecha</div>
          <div style="font-size:10pt; font-weight:600; color:var(--ink);">{date}</div>
        </div>
      </div>
    </div>
    <div style="display:flex; justify-content:space-between; align-items:flex-end; border-top:1px solid var(--line); padding-top:6mm;">
      <div style="font-size:7.8pt; color:var(--slate-light); font-weight:500;">Documento confidencial &middot; Preparado exclusivamente para el destinatario</div>
      <div style="font-size:7.8pt; color:var(--slate-light); font-weight:500;">pimepanama.com</div>
    </div>
  </div>
</div>'''


def closing_page(section_tag: str, title: str, steps: list[tuple[str, str]]) -> str:
    """Página de cierre — única página con fondo oscuro permitido fuera de la portada (que es blanca)."""
    steps_html = "".join(f'''
        <div style="display:flex; gap:5mm; align-items:flex-start; border-bottom:1px solid rgba(255,255,255,0.12); padding-bottom:5mm;">
          <div style="width:8mm; height:8mm; border-radius:50%; border:1.4px solid rgba(255,255,255,0.4); display:flex; align-items:center; justify-content:center; font-family:'Manrope'; font-weight:800; font-size:9.5pt; flex:none;">{i+1}</div>
          <div>
            <div style="font-weight:700; font-size:10.5pt;">{t}</div>
            <div style="font-size:8.8pt; color:rgba(255,255,255,0.6); margin-top:1mm;">{d}</div>
          </div>
        </div>''' for i, (t, d) in enumerate(steps))
    return f'''
<div class="page" style="background:var(--ink); color:white;">
  <div style="position:absolute; inset:0; background:
      radial-gradient(circle at 85% 15%, rgba(85,46,255,0.45), transparent 45%),
      radial-gradient(circle at 10% 90%, rgba(5,134,254,0.4), transparent 45%),
      #0B0D14;"></div>
  <div style="position:relative; padding:20mm 18mm; height:297mm; display:flex; flex-direction:column;">
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <div style="display:flex; align-items:center; gap:9px;">
        <img src="assets/logo_icon.png" style="height:16px;">
        <span style="font-family:'Manrope'; font-weight:800; font-size:11pt;">PIME</span>
      </div>
      <div style="font-size:8pt; letter-spacing:0.1em; text-transform:uppercase; color:rgba(255,255,255,0.45); font-weight:600;">{section_tag}</div>
    </div>
    <div style="margin-top:14mm;">
      <div class="eyebrow" style="color:#7fb8ff;">Pr&oacute;ximos pasos</div>
      <h2 style="font-family:'Manrope'; font-weight:800; font-size:26pt; margin-top:3mm; line-height:1.15;">{title}</h2>
      <div style="margin-top:10mm; display:flex; flex-direction:column; gap:5mm;">
        {steps_html}
      </div>
    </div>
    <div style="flex:1;"></div>
    <div style="border-top:1px solid rgba(255,255,255,0.14); padding-top:7mm; display:flex; justify-content:space-between; align-items:flex-end;">
      <div>
        <div style="font-family:'Manrope'; font-weight:800; font-size:13pt;">Pime Panam&aacute;</div>
        <div style="font-size:8.4pt; color:rgba(255,255,255,0.55); margin-top:1.5mm;">Desarrollo de software empresarial &middot; Panam&aacute;</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:8.4pt; color:rgba(255,255,255,0.55);">pimepanama.com</div>
        <div style="font-size:8.4pt; color:rgba(255,255,255,0.55); margin-top:1mm;">Gracias por la confianza.</div>
      </div>
    </div>
  </div>
</div>'''


# ---------------------------------------------------------------------------
# Ejemplo de ensamblado final (adaptar):
#
# PAGES = []
# PAGES.append(cover_page(...))
# PAGES.append(...)  # índice, resumen ejecutivo, etc.
# PAGES.append(closing_page(...))
#
# html = f'''<!DOCTYPE html>
# <html lang="es"><head><meta charset="UTF-8"><link rel="stylesheet" href="style.css"></head>
# <body>{"".join(PAGES)}</body></html>'''
#
# with open("index.html", "w") as f:
#     f.write(html)
#
# Luego ejecutar render.py para producir el PDF, y validar con el checklist
# de la sección 5 y 8 de PROMPT_CLAUDE_CODE.md antes de entregar.
# ---------------------------------------------------------------------------
