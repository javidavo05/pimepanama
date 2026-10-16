/**
 * Mantenimiento mensual de los proyectos (fase 4). Corre en la tarea diaria (cron payment-reminders): el día
 * del mes que se eligió en el proyecto arma una factura en BORRADOR para su cliente y avisa al dueño. No se
 * envía nada al cliente: el equipo la revisa y la envía. Sigue el patrón de la factura de horas
 * (portal/empresa.ts facturarHoras): número de la empresa, datos del cliente copiados y el proyecto ligado.
 * Una sola por mes: el candado es Project.mantenimientoUltimoAt, que se mueve dentro de la misma transacción.
 */
import { prisma } from "@/lib/prisma";
import { siguienteNumero } from "@/lib/numeracion";
import { registrarEvento } from "@/lib/portal/eventos";
import { notifyUser } from "@/lib/notifications/notify";
import { dinero } from "@/lib/portal/dinero";
import { inicioDeMesPanama, lineaMantenimiento, tocaFacturar } from "./mantenimiento-reglas";
import { diaPanama } from "./seguimientos-reglas";

export async function facturarMantenimientos(hoy = new Date()) {
  const candidatos = await prisma.project.findMany({
    where: { status: "ACTIVE", mantenimientoActivo: true, mantenimientoMonto: { gt: 0 } },
    select: {
      id: true, name: true, userId: true, status: true, clientId: true,
      mantenimientoActivo: true, mantenimientoMonto: true, mantenimientoDia: true, mantenimientoUltimoAt: true,
      clients: { select: { client: { select: { id: true } } }, take: 1 },
      user: { select: { id: true, configId: true, config: { select: { invoicePrefix: true, taxRatePercent: true, paymentTermsDays: true } } } },
    },
  });
  const toca = candidatos.filter((p) => tocaFacturar({ ...p, mantenimientoMonto: Number(p.mantenimientoMonto) }, hoy));
  if (!toca.length) return { facturas: 0 };

  // El cliente del proyecto: el principal de ProjectClient o, si no hay, el espejo legacy.
  const clienteIds = [...new Set(toca.map((p) => p.clients[0]?.client.id ?? p.clientId).filter(Boolean) as string[])];
  const clientes = new Map((await prisma.client.findMany({
    where: { id: { in: clienteIds } },
    select: { id: true, userId: true, name: true, email: true, company: true, address: true, ruc: true },
  })).map((c) => [c.id, c]));

  const linea = lineaMantenimiento(hoy);
  const mes = inicioDeMesPanama(hoy);
  const porDueno = new Map<string, { numero: string | null; total: number; proyecto: string }[]>();
  const sinCliente: { userId: string; proyecto: string }[] = [];

  for (const p of toca) {
    const cliente = clientes.get(p.clients[0]?.client.id ?? p.clientId ?? "");
    if (!cliente || cliente.userId !== p.userId) {
      // Se avisa solo el día elegido, no cada día hasta que alguien lo arregle.
      if (Number(diaPanama(hoy).slice(8, 10)) === p.mantenimientoDia) sinCliente.push({ userId: p.userId, proyecto: p.name });
      continue;
    }
    const monto = Math.round(Number(p.mantenimientoMonto) * 100) / 100;
    const impuesto = Number(p.user.config?.taxRatePercent ?? 0) || 0;
    const taxAmount = Math.round(monto * impuesto) / 100;
    try {
      const doc = await prisma.$transaction(async (tx) => {
        // Candado: si otra corrida ya lo facturó este mes, no hace nada.
        const marcado = await tx.project.updateMany({
          where: { id: p.id, OR: [{ mantenimientoUltimoAt: null }, { mantenimientoUltimoAt: { lt: mes } }] },
          data: { mantenimientoUltimoAt: hoy },
        });
        if (marcado.count === 0) return null;
        const number = await siguienteNumero(p.userId, "FACTURA", p.user.config?.invoicePrefix ?? "FAC", tx);
        return tx.document.create({
          data: {
            type: "FACTURA", status: "DRAFT", userId: p.userId, companyId: p.user.configId ?? undefined, clientId: cliente.id, projectId: p.id, number,
            title: `${linea} · ${p.name}`,
            clientName: cliente.name, clientEmail: cliente.email, clientCompany: cliente.company, clientAddress: cliente.address, clientRuc: cliente.ruc,
            content: { currency: "USD", lineItems: [{ description: linea, quantity: 1, unitPrice: monto, taxPercent: impuesto, discount: 0 }], notes: `Mantenimiento mensual del proyecto ${p.name}.` },
            subtotal: monto, taxAmount, total: monto + taxAmount, currency: "USD",
            issueDate: hoy, dueDate: new Date(hoy.getTime() + (p.user.config?.paymentTermsDays ?? 15) * 86_400_000),
          },
        });
      });
      if (!doc) continue;
      await registrarEvento({ userId: p.userId, clientId: cliente.id, projectId: p.id, entityType: "factura", entityId: doc.id, kind: "factura_mantenimiento", title: `Factura de mantenimiento ${doc.number} en borrador`, detail: `${linea} · ${dinero(doc.total)}`, visibility: "interno", actorType: "sistema" });
      const lista = porDueno.get(p.userId) ?? [];
      lista.push({ numero: doc.number, total: Number(doc.total ?? 0), proyecto: p.name });
      porDueno.set(p.userId, lista);
    } catch (e) {
      console.error("[mantenimiento]", p.id, e);
    }
  }

  // Un aviso por dueño, solo a su teléfono (las facturas son cosa del dueño).
  await Promise.all([...porDueno].map(([userId, docs]) => {
    const total = docs.reduce((a, d) => a + d.total, 0);
    return notifyUser({
      userId, soloMiembroId: userId, link: "/empresa/facturas", tag: "mantenimiento",
      title: docs.length === 1 ? "Factura de mantenimiento lista para revisar" : `${docs.length} facturas de mantenimiento listas para revisar`,
      body: `Borradores por ${dinero(total)}: ${docs.map((d) => `${d.numero} (${d.proyecto})`).join(", ")}. Revísalos y envíalos.`,
    });
  }));
  await Promise.all(sinCliente.map((s) => notifyUser({
    userId: s.userId, soloMiembroId: s.userId, link: "/empresa/proyectos", tag: "mantenimiento",
    title: "Mantenimiento sin facturar", body: `El proyecto ${s.proyecto} tiene mantenimiento mensual pero no tiene cliente. Asígnale uno para que se arme la factura.`,
  })));

  return { facturas: [...porDueno.values()].reduce((a, d) => a + d.length, 0), sinCliente: sinCliente.length };
}
