import type { Client, CompanyConfig, Contract, Project } from "@prisma/client";
import { renderContractPdf } from "@/lib/pdf/render";
import { resolveContractHtml } from "@/lib/design-system/contract-html";
import { renderHtmlToPdfBuffer } from "@/lib/design-system/html-to-pdf";
import { Readable } from "stream";

export async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream as AsyncIterable<Buffer | Uint8Array | string>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function renderContractPdfBuffer(
  contract: Contract,
  client: Client | null,
  company: Partial<CompanyConfig> | null,
  project?: Pick<Project, "name" | "description" | "proposalContent"> | null
): Promise<Buffer> {
  try {
    const pagesHtml = resolveContractHtml(contract, client, company, project);
    return await renderHtmlToPdfBuffer(pagesHtml);
  } catch (htmlErr) {
    console.warn("HTML→PDF failed for signing, falling back to react-pdf:", htmlErr);
    const stream = await renderContractPdf(contract, client, company);
    return streamToBuffer(stream as Readable);
  }
}
