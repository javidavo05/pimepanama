import { NextResponse } from "next/server";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import {
  buildRecipientSuggestions,
  filterRecipientSuggestions,
} from "@/lib/mail/recipient-suggestions";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireEmpresaUser(request);
    const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";

    const [clients, leads, documents, emails] = await Promise.all([
      prisma.client.findMany({
        where: { userId: user.id, email: { not: null } },
        select: { name: true, email: true, company: true },
        orderBy: { name: "asc" },
      }),
      prisma.lead.findMany({
        where: { userId: user.id, email: { not: null } },
        select: { name: true, email: true, company: true },
        orderBy: { updatedAt: "desc" },
        take: 200,
      }),
      prisma.document.findMany({
        where: { userId: user.id, clientEmail: { not: null } },
        select: { clientEmail: true, clientName: true, clientCompany: true },
        orderBy: { updatedAt: "desc" },
        take: 300,
      }),
      prisma.inboxEmail.findMany({
        where: { userId: user.id },
        select: {
          fromEmail: true,
          fromName: true,
          toAddresses: true,
          ccAddresses: true,
          folder: true,
          receivedAt: true,
        },
        orderBy: { receivedAt: "desc" },
        take: 400,
      }),
    ]);

    const all = buildRecipientSuggestions({ clients, leads, documents, emails });
    const recipients = filterRecipientSuggestions(all, q, q ? 12 : 15);

    return NextResponse.json({ recipients });
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: "No se pudieron cargar contactos" }, { status: 500 });
  }
}
