/**
 * Aviso de fase lista: cuando una fase llega al 100 % (sola, desde GitHub) o el equipo la marca en revisión o
 * terminada, el cliente recibe el aviso en su cuenta (campana del equipo + línea de tiempo) y un correo a cada
 * persona activa de la empresa con el enlace a su cuenta. Si la fase se cobra al entregar, el correo dice cuánto
 * y dónde se paga. Una sola vez por fase (readyNotifiedAt). Nunca rompe la acción que lo llama.
 */
import { prisma } from "@/lib/prisma";
import { enviarAlCliente } from "@/lib/motor/envios";
import { getPortalFaseListaEmail } from "@/lib/email-templates";
import { getSiteUrl } from "@/lib/site-url";
import { avanceDeProyecto } from "./avance";
import { avisarAlEquipo } from "./avisos";

const fmt = new Intl.NumberFormat("es-PA", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

export async function avisarFaseLista(faseId: string, terminada = false) {
  try {
    const f = await prisma.projectPhase.findUnique({
      where: { id: faseId },
      select: { id: true, name: true, price: true, billingPoint: true, invoiceId: true, readyNotifiedAt: true,
        project: { select: { id: true, name: true, userId: true, liveUrl: true, portalVisible: true, clientId: true, clients: { select: { clientId: true } },
          phases: { select: { id: true, name: true, status: true, progress: true, price: true } } } } },
    });
    if (!f || f.readyNotifiedAt || !f.project.portalVisible) return;
    // Se marca primero: si dos sincronías llegan juntas, solo una avisa.
    const marcada = await prisma.projectPhase.updateMany({ where: { id: f.id, readyNotifiedAt: null }, data: { readyNotifiedAt: new Date() } });
    if (!marcada.count) return;
    const clientId = f.project.clientId ?? f.project.clients[0]?.clientId;
    if (!clientId) return;
    const personas = await prisma.clientUser.findMany({ where: { clientId, status: "activo" }, select: { email: true, fullName: true } });
    const avance = avanceDeProyecto(f.project.phases);
    const precio = Number(f.price);
    const pago = precio > 0 && f.billingPoint === "al_entregar" ? `${fmt.format(precio)} · se paga al entregar. Lo ves en Facturas de tu cuenta.` : null;
    const link = `${getSiteUrl()}/cliente/proyectos/${f.project.id}`;
    for (const x of personas) {
      const c = getPortalFaseListaEmail({ name: x.fullName, project: f.project.name, phase: f.name, avance, terminada, pago, link, liveUrl: f.project.liveUrl });
      try { await enviarAlCliente({ to: x.email, subject: c.subject, html: c.html, motivo: `fase lista ${f.id}` }); } catch (e) { console.error("[portal] correo de fase lista", e); }
    }
    await avisarAlEquipo(f.project.userId, `Fase lista · ${f.project.name}`, `${f.name}: se avisó al cliente (${personas.length} ${personas.length === 1 ? "persona" : "personas"}).`, `/empresa/proyectos/${f.project.id}`);
  } catch (e) {
    console.error("[portal] aviso de fase lista", e);
  }
}
