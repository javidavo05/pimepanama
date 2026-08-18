import { prisma } from "@/lib/prisma";
import { defaultSignatureTitleForLabel } from "./signature";

/** Seed firmas Javier Vallejo para cuentas sin signatureName. */
export async function ensureMailSignaturesSeeded(userId: string): Promise<void> {
  const accounts = await prisma.mailAccount.findMany({
    where: { userId },
    select: { id: true, label: true, signatureName: true, signatureTitle: true },
  });
  if (accounts.length === 0) return;

  await Promise.all(
    accounts.map((acc) => {
      const title = defaultSignatureTitleForLabel(acc.label);
      const badTitle =
        !acc.signatureTitle ||
        acc.signatureTitle.toLowerCase() === "pime panamá" ||
        acc.signatureTitle.toLowerCase() === "pime panama";

      return prisma.mailAccount.update({
        where: { id: acc.id },
        data: {
          ...(acc.signatureName == null
            ? {
                signatureName: "Javier Vallejo",
                fromName: "Javier Vallejo",
                signatureEnabled: true,
              }
            : {}),
          ...(badTitle ? { signatureTitle: title } : {}),
        },
      });
    })
  );
}
