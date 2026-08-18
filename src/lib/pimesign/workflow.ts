import { randomUUID } from "crypto";
import type { Prisma, SigningStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getR2Object, putR2Object } from "@/lib/r2";
import { signingLinkTtlDays, signingTokenSecret } from "./config";
import { generateSigningToken, hashSigningToken, type SigningRole } from "./tokens";
import { renderContractPdfBuffer } from "./pdf";
import { buildSignedPdf } from "./pdf-stamp";
import {
  clientSigningEmail,
  companySigningEmail,
  sendSigningEmail,
  signingCompletedEmail,
} from "./notify";

type AuditMeta = Record<string, unknown> | undefined;

export async function logSigningEvent(
  requestId: string,
  action: string,
  opts?: { actorEmail?: string; ipAddress?: string; userAgent?: string; metadata?: AuditMeta }
) {
  await prisma.contractSigningEvent.create({
    data: {
      requestId,
      action,
      actorEmail: opts?.actorEmail,
      ipAddress: opts?.ipAddress,
      userAgent: opts?.userAgent,
      metadata: (opts?.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}

async function loadSignaturePng(key: string | null | undefined): Promise<string | null> {
  if (!key) return null;
  const obj = await getR2Object(key);
  const bytes = await obj.Body?.transformToByteArray();
  if (!bytes) return null;
  return `data:image/png;base64,${Buffer.from(bytes).toString("base64")}`;
}

async function storeSignaturePng(requestId: string, role: SigningRole, dataUrl: string): Promise<string> {
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
  const key = `contracts/signing/${requestId}/${role.toLowerCase()}.png`;
  await putR2Object(key, Buffer.from(base64, "base64"), "image/png");
  return key;
}

async function createToken(requestId: string, role: SigningRole, expiresAt: Date) {
  const secret = signingTokenSecret();
  const raw = generateSigningToken();
  await prisma.contractSigningToken.create({
    data: {
      requestId,
      role,
      tokenHash: hashSigningToken(raw, secret),
      expiresAt,
    },
  });
  return raw;
}

export async function resolveSigningToken(rawToken: string) {
  const secret = signingTokenSecret();
  const tokenHash = hashSigningToken(rawToken, secret);
  const record = await prisma.contractSigningToken.findUnique({
    where: { tokenHash },
    include: {
      request: {
        include: {
          contract: { include: { client: true } },
          events: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });
  if (!record) return null;
  if (record.expiresAt < new Date()) return { expired: true as const, record };
  if (record.usedAt) return { used: true as const, record };
  return { ok: true as const, record };
}

export async function sendContractForSigning(contractId: string, userId: string) {
  const contract = await prisma.contract.findFirst({
    where: { id: contractId, userId },
    include: {
      client: true,
      signingRequest: true,
      project: { select: { name: true, description: true, proposalContent: true } },
    },
  });
  if (!contract) throw new Error("Contrato no encontrado");
  if (!contract.clientId || !contract.client?.email) {
    throw new Error("El contrato necesita un cliente con email para enviar a firma.");
  }
  if (contract.signingRequest && ["PENDING_CLIENT", "PENDING_COMPANY"].includes(contract.signingRequest.status)) {
    throw new Error("Ya hay un proceso de firma en curso.");
  }

  const company = await prisma.companyConfig.findFirst({
    where: { users: { some: { id: userId } } },
  });
  const companyEmail = company?.email ?? (await prisma.empresaUser.findUnique({ where: { id: userId } }))?.email;
  if (!companyEmail) throw new Error("Configura el email de la empresa en Configuración.");

  const pdfBuffer = await renderContractPdfBuffer(contract, contract.client, company, contract.project);
  const expiresAt = new Date(Date.now() + signingLinkTtlDays() * 24 * 60 * 60 * 1000);
  const baseKey = `contracts/signing/${contract.id}/base-${randomUUID()}.pdf`;
  await putR2Object(baseKey, pdfBuffer, "application/pdf");

  const request = await prisma.$transaction(async (tx) => {
    if (contract.signingRequest) {
      await tx.contractSigningToken.deleteMany({ where: { requestId: contract.signingRequest.id } });
      await tx.contractSigningEvent.deleteMany({ where: { requestId: contract.signingRequest.id } });
      await tx.contractSigningRequest.delete({ where: { id: contract.signingRequest.id } });
    }

    const req = await tx.contractSigningRequest.create({
      data: {
        contractId: contract.id,
        userId,
        status: "PENDING_CLIENT",
        clientEmail: contract.client!.email!,
        companyEmail,
        clientName: contract.client!.name,
        companyName: company?.name ?? "Pime Panamá",
        basePdfR2Key: baseKey,
        expiresAt,
      },
    });

    await tx.contract.update({
      where: { id: contract.id },
      data: { signingStatus: "PENDING_CLIENT" },
    });

    return req;
  });

  const clientToken = await createToken(request.id, "CLIENT", expiresAt);
  await logSigningEvent(request.id, "SENT", { actorEmail: companyEmail, metadata: { to: contract.client.email } });

  const mail = clientSigningEmail({
    contractTitle: contract.title,
    clientName: contract.client.name,
    companyName: company?.name ?? "Pime Panamá",
    token: clientToken,
  });

  await sendSigningEmail({
    userId,
    mailAccountId: company?.signingMailAccountId,
    to: contract.client.email,
    subject: mail.subject,
    body: mail.body,
    companyName: company?.name,
  });

  return { requestId: request.id, status: "PENDING_CLIENT" as SigningStatus };
}

export async function applySignatureFromToken(opts: {
  rawToken: string;
  signatureDataUrl: string;
  accepted: boolean;
  signerName?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  if (!opts.accepted) {
    throw new Error("Debes aceptar los términos para firmar.");
  }

  const resolved = await resolveSigningToken(opts.rawToken);
  if (!resolved) throw new Error("Enlace de firma inválido o expirado.");
  if ("expired" in resolved) throw new Error("Este enlace de firma expiró.");
  if ("used" in resolved) throw new Error("Este enlace ya fue utilizado.");

  const { record } = resolved;
  const request = record.request;
  const role = record.role as SigningRole;

  if (request.status === "DECLINED" || request.status === "COMPLETED") {
    throw new Error("Este proceso de firma ya finalizó.");
  }

  if (role === "CLIENT" && request.status !== "PENDING_CLIENT") {
    throw new Error("No es el turno del cliente para firmar.");
  }
  if (role === "COMPANY" && request.status !== "PENDING_COMPANY") {
    throw new Error("No es el turno de la empresa para firmar.");
  }

  const sigKey = await storeSignaturePng(request.id, role, opts.signatureDataUrl);

  const updateData =
    role === "CLIENT"
      ? { clientSignatureR2Key: sigKey, status: "PENDING_COMPANY" as SigningStatus }
      : { companySignatureR2Key: sigKey };

  await prisma.contractSigningToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  await prisma.contractSigningRequest.update({
    where: { id: request.id },
    data: updateData,
  });

  await prisma.contract.update({
    where: { id: request.contractId },
    data: { signingStatus: role === "CLIENT" ? "PENDING_COMPANY" : request.status },
  });

  await logSigningEvent(request.id, "SIGNED", {
    actorEmail: role === "CLIENT" ? request.clientEmail : request.companyEmail,
    ipAddress: opts.ipAddress,
    userAgent: opts.userAgent,
    metadata: {
      role,
      signerName:
        opts.signerName?.trim() ||
        (role === "CLIENT" ? request.clientName : request.companyName) ||
        "Firmante",
    },
  });

  if (role === "CLIENT") {
    const companyToken = await createToken(request.id, "COMPANY", request.expiresAt);
    const mail = companySigningEmail({
      contractTitle: request.contract.title,
      companyName: request.companyName ?? "Empresa",
      clientName: request.clientName ?? "Cliente",
      token: companyToken,
    });
    await sendSigningEmail({
      userId: request.userId,
      to: request.companyEmail,
      subject: mail.subject,
      body: mail.body,
    });
    return { status: "PENDING_COMPANY" as SigningStatus, completed: false };
  }

  return finalizeSigning(request.id);
}

export async function applyCompanySignatureFromPanel(opts: {
  contractId: string;
  userId: string;
  signatureDataUrl: string;
  accepted: boolean;
  signerName?: string;
}) {
  const request = await prisma.contractSigningRequest.findFirst({
    where: { contractId: opts.contractId, userId: opts.userId },
    include: { contract: true },
  });
  if (!request) throw new Error("No hay solicitud de firma activa.");
  if (request.status !== "PENDING_COMPANY") throw new Error("No es el turno de la empresa para firmar.");
  if (!opts.accepted) throw new Error("Debes aceptar los términos para firmar.");

  const sigKey = await storeSignaturePng(request.id, "COMPANY", opts.signatureDataUrl);

  await prisma.contractSigningRequest.update({
    where: { id: request.id },
    data: { companySignatureR2Key: sigKey },
  });

  await logSigningEvent(request.id, "SIGNED", {
    actorEmail: request.companyEmail,
    metadata: {
      role: "COMPANY",
      source: "panel",
      signerName: opts.signerName?.trim() || request.companyName || "Empresa",
    },
  });

  return finalizeSigning(request.id);
}

async function finalizeSigning(requestId: string) {
  const request = await prisma.contractSigningRequest.findUnique({
    where: { id: requestId },
    include: { contract: { include: { client: true } } },
  });
  if (!request?.basePdfR2Key) throw new Error("PDF base no encontrado.");

  const baseObj = await getR2Object(request.basePdfR2Key);
  const baseBytes = await baseObj.Body?.transformToByteArray();
  if (!baseBytes) throw new Error("No se pudo leer el PDF base.");

  const clientSig = await loadSignaturePng(request.clientSignatureR2Key);
  const companySig = await loadSignaturePng(request.companySignatureR2Key);
  if (!clientSig || !companySig) throw new Error("Faltan firmas para completar el documento.");

  const signedPdf = await buildSignedPdf(Buffer.from(baseBytes), {
    clientSignature: { dataUrl: clientSig, name: request.clientName ?? "Cliente" },
    companySignature: { dataUrl: companySig, name: request.companyName ?? "Empresa" },
  });

  const signedKey = `contracts/signing/${request.contractId}/signed-${randomUUID()}.pdf`;
  await putR2Object(signedKey, signedPdf, "application/pdf");

  const now = new Date();
  await prisma.$transaction([
    prisma.contractSigningRequest.update({
      where: { id: requestId },
      data: { status: "COMPLETED", signedPdfR2Key: signedKey },
    }),
    prisma.contract.update({
      where: { id: request.contractId },
      data: {
        status: "ACTIVE",
        signedAt: now,
        signingStatus: "COMPLETED",
        signingCompletedAt: now,
      },
    }),
  ]);

  await logSigningEvent(requestId, "COMPLETED", { metadata: { signedPdfR2Key: signedKey } });

  const done = signingCompletedEmail({
    contractTitle: request.contract.title,
    recipientName: request.clientName ?? "Cliente",
  });
  await sendSigningEmail({
    userId: request.userId,
    to: request.clientEmail,
    subject: done.subject,
    body: done.body,
  }).catch(() => {});

  return { status: "COMPLETED" as SigningStatus, completed: true, signedPdfR2Key: signedKey };
}

export async function declineSigning(opts: {
  rawToken: string;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const resolved = await resolveSigningToken(opts.rawToken);
  if (!resolved || !("ok" in resolved)) throw new Error("Enlace inválido.");

  const { record } = resolved;
  await prisma.$transaction([
    prisma.contractSigningRequest.update({
      where: { id: record.requestId },
      data: { status: "DECLINED" },
    }),
    prisma.contract.update({
      where: { id: record.request.contractId },
      data: { signingStatus: "DECLINED" },
    }),
    prisma.contractSigningToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  await logSigningEvent(record.requestId, "DECLINED", {
    actorEmail: record.role === "CLIENT" ? record.request.clientEmail : record.request.companyEmail,
    ipAddress: opts.ipAddress,
    userAgent: opts.userAgent,
    metadata: { reason: opts.reason },
  });
}

export async function getSigningStatusForContract(contractId: string, userId: string) {
  const request = await prisma.contractSigningRequest.findFirst({
    where: { contractId, userId },
    include: { events: { orderBy: { createdAt: "asc" } } },
  });
  return request;
}
