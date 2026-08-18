import type { Client, CompanyConfig, Contract, Project } from "@prisma/client";
import { isProposalContent } from "@/lib/pdf/proposal-content";
import {
  cardGrid,
  closingPage,
  contentPage,
  coverPage,
  escapeHtml,
  nl2br,
  textBlock,
} from "./template";

export interface ContractHtmlInput {
  contract: {
    title: string;
    description?: string | null;
    responsibilities?: string | null;
    terms?: string | null;
    value?: number | { toString(): string } | null;
    startsAt?: Date | null;
    endsAt?: Date | null;
    htmlContent?: string | null;
  };
  client: Pick<Client, "name" | "company" | "email"> | null;
  company: Partial<CompanyConfig> | null;
  project?: Pick<Project, "name" | "description" | "proposalContent"> | null;
}

function fmtDate(date: Date | null | undefined): string {
  if (!date) return new Date().toLocaleDateString("es-PA", { month: "long", year: "numeric" });
  return new Date(date).toLocaleDateString("es-PA", { month: "long", year: "numeric" });
}

function fmtMoney(value: number | null | undefined): string {
  if (value == null) return "—";
  return `US$ ${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function splitParagraphs(text: string, maxChars = 2200): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];
  if (normalized.length <= maxChars) return [normalized];

  const paragraphs = normalized.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = "";

  for (const p of paragraphs) {
    const candidate = current ? `${current}\n\n${p}` : p;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) chunks.push(current);
      if (p.length <= maxChars) {
        current = p;
      } else {
        const sentences = p.match(/[^.!?]+[.!?]+/g) ?? [p];
        let part = "";
        for (const s of sentences) {
          if ((part + s).length > maxChars) {
            if (part) chunks.push(part.trim());
            part = s;
          } else {
            part += s;
          }
        }
        current = part.trim();
      }
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

/** Builds default design-system HTML pages for a contract / commercial proposal. */
export function buildDefaultContractHtml(input: ContractHtmlInput): string {
  const { contract, client, company, project } = input;
  const preparedFor = client?.company ?? client?.name ?? "Cliente";
  const subtitle =
    contract.description?.split("\n")[0]?.slice(0, 280) ??
    project?.description?.slice(0, 280) ??
    "Documento comercial preparado para su revisión y aprobación.";
  const date = fmtDate(contract.startsAt ?? new Date());
  const proposal = project?.proposalContent && isProposalContent(project.proposalContent)
    ? project.proposalContent
    : null;

  const pages: string[] = [];

  pages.push(
    coverPage({
      eyebrow: `Propuesta comercial · ${escapeHtml(contract.title)}`,
      titleHtml: escapeHtml(contract.title),
      subtitle: escapeHtml(subtitle),
      preparedFor,
      preparedBy: company?.name ?? "Pime Panam&aacute;",
      date,
    })
  );

  if (proposal) {
    pages.push(
      contentPage({
        sectionTag: "Resumen ejecutivo",
        eyebrow: "01 &middot; Resumen ejecutivo",
        title: "La propuesta en una mirada",
        subtitle: "Una vista rápida de lo que construimos, por qué este enfoque y el resultado esperado.",
        bodyHtml: `
          ${cardGrid(
            proposal.pillars.slice(0, 3).map((p, i) => ({
              icon: String(i + 1),
              title: `Pilar ${i + 1}`,
              body: p,
            }))
          )}
          <div class="grid2" style="margin-top:6mm;">
            <div class="card">
              <h4>Qu&eacute; estamos construyendo</h4>
              <p>${nl2br(proposal.whatWereBuilding)}</p>
            </div>
            <div class="card">
              <h4>Por qu&eacute; este enfoque</h4>
              <p>${nl2br(proposal.whyThisApproach)}</p>
            </div>
          </div>
          <div class="card" style="margin-top:5mm; background:var(--ink); color:white; border:none;">
            <div class="pill grad" style="margin-bottom:3mm;">Modelo comercial propuesto</div>
            <div style="font-family:'Manrope'; font-weight:800; font-size:18pt;">${fmtMoney(contract.value ? Number(contract.value) : null)}</div>
          </div>`,
        page: 2,
        total: 0,
      })
    );

    pages.push(
      contentPage({
        sectionTag: "Contexto y objetivo",
        eyebrow: "02 &middot; Contexto y objetivo",
        title: "Contexto del proyecto",
        bodyHtml: textBlock(proposal.contextObjective),
        page: 3,
        total: 0,
      })
    );

    pages.push(
      contentPage({
        sectionTag: "Arquitectura",
        eyebrow: "03 &middot; Arquitectura y stack",
        title: "Construido sobre tecnología de nivel productivo",
        bodyHtml: `
          ${cardGrid([
            { icon: "Fr", title: "Interfaz", body: proposal.architecture.frontend },
            { icon: "Bk", title: "Datos y backend", body: proposal.architecture.backend },
            { icon: "Ho", title: "Infraestructura", body: proposal.architecture.infra },
          ])}
          <div style="margin-top:5mm; display:flex; flex-wrap:wrap; gap:2mm;">
            ${proposal.architecture.attributes.map((a) => `<span class="pill outline">${escapeHtml(a)}</span>`).join("")}
          </div>`,
        page: 4,
        total: 0,
      })
    );

    pages.push(
      contentPage({
        sectionTag: "Fases",
        eyebrow: "04 &middot; Fases del proyecto",
        title: "Fases independientes — se aprueban por separado",
        subtitle: proposal.investmentNote,
        bodyHtml: `
          <div class="grid3">
            ${proposal.phases
              .map(
                (ph) => `
              <div class="card" style="display:flex; flex-direction:column;">
                <span class="pill ${ph.isFirstPhase ? "" : "outline"}" style="width:fit-content; margin-bottom:3mm; font-size:6.6pt;">${escapeHtml(ph.tag)}</span>
                <h4>${escapeHtml(ph.name)}</h4>
                <div style="font-family:'Manrope'; font-weight:800; font-size:14pt; color:var(--blue); margin:2mm 0;">${escapeHtml(ph.price)}</div>
                <p style="font-size:7.6pt; color:var(--slate-light); font-weight:600;">${escapeHtml(ph.timeframe)}</p>
                <p style="flex:1;">${nl2br(ph.body)}</p>
                <span class="pill outline" style="margin-top:3mm; width:fit-content; font-size:6.6pt;">${escapeHtml(ph.footerLabel)}</span>
              </div>`
              )
              .join("")}
          </div>`,
        page: 5,
        total: 0,
      })
    );

    pages.push(
      contentPage({
        sectionTag: "Alcance",
        eyebrow: "05 &middot; Alcance",
        title: "Qué incluye y qué no incluye",
        bodyHtml: `
          <div class="grid2">
            <div>
              <h4 style="margin-bottom:4mm;">Incluye</h4>
              <ul class="check-list">${proposal.scopeIncludes.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>
            </div>
            <div>
              <h4 style="margin-bottom:4mm;">No incluye</h4>
              <ul class="x-list">${proposal.scopeExcludes.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>
            </div>
          </div>`,
        page: 6,
        total: 0,
      })
    );

    pages.push(
      closingPage({
        sectionTag: "Próximos pasos",
        title: "Cómo comenzamos",
        steps: proposal.closingSteps.map((s) => ({ title: s.title, description: s.description })),
      })
    );
  } else {
    const sections: Array<{ tag: string; eyebrow: string; title: string; text: string }> = [];
    if (contract.description?.trim()) {
      sections.push({
        tag: "Alcance",
        eyebrow: "01 &middot; Alcance",
        title: "Objeto y descripción",
        text: contract.description,
      });
    }
    if (contract.responsibilities?.trim()) {
      sections.push({
        tag: "Responsabilidades",
        eyebrow: "02 &middot; Responsabilidades",
        title: "Entregables y obligaciones",
        text: contract.responsibilities,
      });
    }
    if (contract.terms?.trim()) {
      sections.push({
        tag: "Términos",
        eyebrow: "03 &middot; Términos",
        title: "Términos y condiciones",
        text: contract.terms,
      });
    }

    if (sections.length === 0) {
      sections.push({
        tag: "Contenido",
        eyebrow: "01 &middot; Contenido",
        title: "Documento comercial",
        text: "Edite este documento visualmente para agregar el contenido de la propuesta o contrato.",
      });
    }

    let pageNum = 2;
    for (const section of sections) {
      const chunks = splitParagraphs(section.text);
      const parts = chunks.length ? chunks : [section.text];
      parts.forEach((chunk, idx) => {
        pages.push(
          contentPage({
            sectionTag: section.tag,
            eyebrow: section.eyebrow + (parts.length > 1 ? ` (${idx + 1}/${parts.length})` : ""),
            title: section.title,
            bodyHtml: `
              ${idx === 0 && contract.value != null ? `
                <div class="card" style="margin-bottom:5mm; background:var(--panel);">
                  <div style="font-size:7.6pt; color:var(--slate-light); text-transform:uppercase; letter-spacing:0.1em; font-weight:700; margin-bottom:1.5mm;">Valor del acuerdo</div>
                  <div style="font-family:'Manrope'; font-weight:800; font-size:16pt; color:var(--blue);">${fmtMoney(Number(contract.value))}</div>
                </div>` : ""}
              ${textBlock(chunk)}`,
            page: pageNum,
            total: 0,
            docLabel: "Documento Comercial Confidencial",
          })
        );
        pageNum++;
      });
    }

    pages.push(
      closingPage({
        sectionTag: "Próximos pasos",
        title: "Cómo comenzamos",
        steps: [
          { title: "Revisión del documento", description: "Validar alcance, términos y condiciones comerciales." },
          { title: "Ajustes finales", description: "Incorporar comentarios y personalizar el documento a medida." },
          { title: "Firma y arranque", description: "Formalizar el acuerdo e iniciar la ejecución del proyecto." },
        ],
      })
    );
  }

  const total = pages.length;
  return pages
    .map((page) => page.replace(/(\d{2}) \/ 00/g, (_, n) => `${n} / ${String(total).padStart(2, "0")}`))
    .join("\n");
}

export function resolveContractHtml(
  contract: ContractHtmlInput["contract"],
  client: ContractHtmlInput["client"],
  company: ContractHtmlInput["company"],
  project?: ContractHtmlInput["project"]
): string {
  if (contract.htmlContent?.trim()) return contract.htmlContent.trim();
  return buildDefaultContractHtml({ contract, client, company, project });
}
