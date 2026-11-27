// Enviar un contrato a firma: arma el PDF base con Chromium (./pdf). Va aparte de workflow.ts para que solo
// la ruta de envío cargue Chromium en su función de Vercel.
import { randomUUID } from "crypto";
import type { SigningStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { putR2Object } from "@/lib/r2";
import { lineaDeProyecto } from "@/lib/pdf/datos-linea";
import { signingLinkTtlDays } from "./config";
import { renderContractPdfBuffer } from "./pdf";
import { clientSigningEmail, sendSigningEmail } from "./notify";
import { createToken, logSigningEvent } from "./workflow";

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

  const linea = await lineaDeProyecto(contract.projectId, contract.client ? [contract.client] : []);
  const pdfBuffer = await renderContractPdfBuffer(contract, contract.client, company, contract.project, linea);
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
