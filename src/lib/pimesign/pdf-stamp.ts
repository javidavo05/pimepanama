import { PDFDocument, rgb } from "pdf-lib";

export type SignaturePlacement = "CLIENT" | "COMPANY";

const PLACEMENTS: Record<
  SignaturePlacement,
  { x: number; y: number; width: number; height: number; label: string }
> = {
  COMPANY: { x: 72, y: 95, width: 200, height: 45, label: "Empresa" },
  CLIENT: { x: 340, y: 95, width: 200, height: 45, label: "Cliente" },
};

function parseDataUrl(dataUrl: string): { mime: string; bytes: Uint8Array } {
  const match = /^data:([^;]+);base64,([\s\S]+)$/.exec(dataUrl.trim());
  if (!match) throw new Error("Formato de firma inválido");
  return { mime: match[1], bytes: Uint8Array.from(Buffer.from(match[2], "base64")) };
}

export async function stampSignatureOnPdf(
  pdfBytes: Buffer,
  placement: SignaturePlacement,
  signatureDataUrl: string,
  signerName: string
): Promise<Buffer> {
  const doc = await PDFDocument.load(pdfBytes);
  const page = doc.getPages()[doc.getPageCount() - 1];
  const { x, y, width, height } = PLACEMENTS[placement];
  const { mime, bytes } = parseDataUrl(signatureDataUrl);

  const image =
    mime.includes("png") ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);

  const scale = Math.min(width / image.width, height / image.height);
  const imgW = image.width * scale;
  const imgH = image.height * scale;

  page.drawImage(image, {
    x: x + (width - imgW) / 2,
    y: y + (height - imgH) / 2,
    width: imgW,
    height: imgH,
  });

  const dateStr = new Date().toLocaleDateString("es-PA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  page.drawText(`${signerName} · ${dateStr}`, {
    x,
    y: y - 10,
    size: 7,
    color: rgb(0.35, 0.4, 0.5),
  });

  return Buffer.from(await doc.save());
}

export async function buildSignedPdf(
  basePdf: Buffer,
  opts: {
    clientSignature?: { dataUrl: string; name: string } | null;
    companySignature?: { dataUrl: string; name: string } | null;
  }
): Promise<Buffer> {
  let pdf = basePdf;
  if (opts.clientSignature) {
    pdf = await stampSignatureOnPdf(pdf, "CLIENT", opts.clientSignature.dataUrl, opts.clientSignature.name);
  }
  if (opts.companySignature) {
    pdf = await stampSignatureOnPdf(pdf, "COMPANY", opts.companySignature.dataUrl, opts.companySignature.name);
  }
  return pdf;
}
