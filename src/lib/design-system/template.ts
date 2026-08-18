import { DESIGN_SYSTEM_BASE } from "./document";

const LOGO = `${DESIGN_SYSTEM_BASE}/logo_icon.png`;

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function nl2br(text: string): string {
  return escapeHtml(text).replace(/\n/g, "<br/>");
}

export function docHeader(sectionTag: string): string {
  return `
    <div class="doc-header">
      <div class="brand"><img src="${LOGO}" alt=""><span>PIME</span></div>
      <div class="tag">${sectionTag}</div>
    </div>`;
}

export function docFooter(page: number, total: number, docLabel = "Propuesta Comercial Confidencial"): string {
  return `
    <div class="doc-footer">
      <div>Pime Panam&aacute; <span class="dot">&middot;</span> ${docLabel}</div>
      <div>${String(page).padStart(2, "0")} / ${String(total).padStart(2, "0")}</div>
    </div>`;
}

export interface CoverPageInput {
  eyebrow: string;
  titleHtml: string;
  subtitle: string;
  preparedFor: string;
  preparedBy?: string;
  date: string;
}

export function coverPage(input: CoverPageInput): string {
  const preparedBy = input.preparedBy ?? "Pime Panam&aacute;";
  return `
<div class="page" style="background:var(--white); color:var(--ink);">
  <div style="position:absolute; top:0; left:0; right:0; height:5mm; background:var(--grad);"></div>
  <div style="position:relative; padding:22mm 18mm 18mm 18mm; height:292mm; display:flex; flex-direction:column;">
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <div style="display:flex; align-items:center; gap:9px;">
        <img src="${LOGO}" style="height:20px;" alt="">
        <span style="font-family:'Manrope'; font-weight:800; font-size:13pt; letter-spacing:-0.01em; color:var(--ink);">PIME</span>
      </div>
      <div style="font-size:8pt; letter-spacing:0.14em; text-transform:uppercase; color:var(--slate-light); font-weight:600;">
        Panam&aacute; &middot; Desarrollo de Software
      </div>
    </div>
    <div style="flex:1; display:flex; flex-direction:column; justify-content:center; margin-top:6mm;">
      <div class="eyebrow" style="margin-bottom:9mm;">${input.eyebrow}</div>
      <h1 style="font-family:'Manrope'; font-weight:800; font-size:33pt; line-height:1.14; max-width:150mm; letter-spacing:-0.02em; color:var(--ink);">
        ${input.titleHtml}
      </h1>
      <div style="width:22mm; height:2px; background:var(--grad); margin:8mm 0;"></div>
      <p style="font-size:11pt; color:var(--slate); max-width:122mm; line-height:1.75; font-weight:400;">${input.subtitle}</p>
      <div style="display:flex; gap:14mm; margin-top:15mm;">
        <div>
          <div style="font-size:7.6pt; color:var(--slate-light); text-transform:uppercase; letter-spacing:0.1em; font-weight:700; margin-bottom:1.8mm;">Preparado para</div>
          <div style="font-size:10pt; font-weight:600; color:var(--ink);">${escapeHtml(input.preparedFor)}</div>
        </div>
        <div>
          <div style="font-size:7.6pt; color:var(--slate-light); text-transform:uppercase; letter-spacing:0.1em; font-weight:700; margin-bottom:1.8mm;">Preparado por</div>
          <div style="font-size:10pt; font-weight:600; color:var(--ink);">${preparedBy}</div>
        </div>
        <div>
          <div style="font-size:7.6pt; color:var(--slate-light); text-transform:uppercase; letter-spacing:0.1em; font-weight:700; margin-bottom:1.8mm;">Fecha</div>
          <div style="font-size:10pt; font-weight:600; color:var(--ink);">${escapeHtml(input.date)}</div>
        </div>
      </div>
    </div>
    <div style="display:flex; justify-content:space-between; align-items:flex-end; border-top:1px solid var(--line); padding-top:6mm;">
      <div style="font-size:7.8pt; color:var(--slate-light); font-weight:500;">Documento confidencial &middot; Preparado exclusivamente para el destinatario</div>
      <div style="font-size:7.8pt; color:var(--slate-light); font-weight:500;">pimepanama.com</div>
    </div>
  </div>
</div>`;
}

export interface ContentPageInput {
  sectionTag: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  bodyHtml: string;
  page: number;
  total: number;
  docLabel?: string;
}

export function contentPage(input: ContentPageInput): string {
  const subtitle = input.subtitle
    ? `<p class="section-sub">${input.subtitle}</p>`
    : "";
  return `
<div class="page">
  ${docHeader(input.sectionTag)}
  <div class="pad" style="padding-top:12mm;">
    <div class="eyebrow">${input.eyebrow}</div>
    <h2 class="section-title">${input.title}</h2>
    ${subtitle}
    <div style="margin-top:8mm;">${input.bodyHtml}</div>
  </div>
  ${docFooter(input.page, input.total, input.docLabel)}
</div>`;
}

export interface ClosingPageInput {
  sectionTag: string;
  title: string;
  steps: Array<{ title: string; description: string }>;
}

export function closingPage(input: ClosingPageInput): string {
  const stepsHtml = input.steps
    .map(
      (step, i) => `
        <div style="display:flex; gap:5mm; align-items:flex-start; border-bottom:1px solid rgba(255,255,255,0.12); padding-bottom:5mm;">
          <div style="width:8mm; height:8mm; border-radius:50%; border:1.4px solid rgba(255,255,255,0.4); display:flex; align-items:center; justify-content:center; font-family:'Manrope'; font-weight:800; font-size:9.5pt; flex:none;">${i + 1}</div>
          <div>
            <div style="font-weight:700; font-size:10.5pt;">${escapeHtml(step.title)}</div>
            <div style="font-size:8.8pt; color:rgba(255,255,255,0.6); margin-top:1mm;">${escapeHtml(step.description)}</div>
          </div>
        </div>`
    )
    .join("");

  return `
<div class="page" style="background:var(--ink); color:white;">
  <div style="position:absolute; inset:0; background:
      radial-gradient(circle at 85% 15%, rgba(85,46,255,0.45), transparent 45%),
      radial-gradient(circle at 10% 90%, rgba(5,134,254,0.4), transparent 45%),
      #0B0D14;"></div>
  <div style="position:relative; padding:20mm 18mm; height:297mm; display:flex; flex-direction:column;">
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <div style="display:flex; align-items:center; gap:9px;">
        <img src="${LOGO}" style="height:16px;" alt="">
        <span style="font-family:'Manrope'; font-weight:800; font-size:11pt;">PIME</span>
      </div>
      <div style="font-size:8pt; letter-spacing:0.1em; text-transform:uppercase; color:rgba(255,255,255,0.45); font-weight:600;">${input.sectionTag}</div>
    </div>
    <div style="margin-top:14mm;">
      <div class="eyebrow" style="color:#7fb8ff;">Pr&oacute;ximos pasos</div>
      <h2 style="font-family:'Manrope'; font-weight:800; font-size:26pt; margin-top:3mm; line-height:1.15;">${escapeHtml(input.title)}</h2>
      <div style="margin-top:10mm; display:flex; flex-direction:column; gap:5mm;">
        ${stepsHtml}
      </div>
    </div>
    <div style="margin-top:auto; padding-top:10mm; border-top:1px solid rgba(255,255,255,0.12);">
      <div style="font-family:'Manrope'; font-weight:800; font-size:12pt;">Pime Panam&aacute;</div>
      <div style="font-size:8.5pt; color:rgba(255,255,255,0.55); margin-top:1.5mm;">Desarrollo de software empresarial &middot; Panam&aacute;</div>
      <div style="font-size:8.5pt; color:rgba(255,255,255,0.45); margin-top:4mm;">pimepanama.com</div>
      <div style="font-size:9pt; color:rgba(255,255,255,0.7); margin-top:8mm;">Gracias por la confianza.</div>
    </div>
  </div>
</div>`;
}

export function textBlock(text: string): string {
  if (!text.trim()) return `<p class="body" style="color:var(--slate-light); font-style:italic;">Sin contenido.</p>`;
  return `<p class="body">${nl2br(text)}</p>`;
}

export function cardGrid(cards: Array<{ icon: string; title: string; body: string }>): string {
  const cols = cards.length <= 2 ? "grid2" : cards.length === 3 ? "grid3" : "grid4";
  const items = cards
    .map(
      (c) => `
      <div class="card">
        <div class="icon-chip">${escapeHtml(c.icon)}</div>
        <h4>${escapeHtml(c.title)}</h4>
        <p>${nl2br(c.body)}</p>
      </div>`
    )
    .join("");
  return `<div class="${cols}">${items}</div>`;
}
