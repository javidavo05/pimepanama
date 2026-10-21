import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireEmpresaUser } from "@/app/api/empresa/_auth";
import { prisma } from "@/lib/prisma";
import { crearLeadDesdeCorreo, ligarAMano } from "@/lib/crm/vinculo-correo-datos";

export const runtime = "nodejs";

/**
 * A quién pertenece un correo, a mano (migración 0062):
 *   - crear-lead: aprueba la sugerencia de la IA (o crea el lead con los datos revisados) y liga el correo;
 *   - ligar: lo liga a un lead o cliente que ya existe;
 *   - quitar: no es de nadie, y el sync no lo vuelve a ligar.
 * Ligar o crear también arrastra el hilo y los correos sin dueño de la misma dirección.
 */
type Opcion = { tipo: "lead" | "cliente"; id: string; nombre: string; detalle: string | null };

/**
 * Leads y clientes para ligar el correo. Con `q`, busca por nombre, empresa o correo; sin `q`, sugiere los del
 * mismo dominio del remitente o con su nombre.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireEmpresaUser(request);
    const { id } = await params;
    const correo = await prisma.inboxEmail.findFirst({ where: { id, userId: user.id }, select: { fromEmail: true, fromName: true, toAddresses: true, folder: true } });
    if (!correo) return NextResponse.json({ error: "No encontré ese correo." }, { status: 404 });
    const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 80);
    const otra = (correo.folder === "SENT" ? correo.toAddresses[0] : correo.fromEmail) ?? "";
    const dominio = otra.split("@")[1]?.toLowerCase() ?? "";
    const gratuito = /^(gmail|googlemail|hotmail|outlook|live|yahoo|icloud|me|aol|proton|protonmail)\./.test(dominio);
    const terminos = q ? [q] : [!gratuito && dominio ? `@${dominio}` : "", correo.folder === "INBOX" ? (correo.fromName ?? "").trim() : ""].filter((t) => t.length >= 3);
    if (!terminos.length) return NextResponse.json({ opciones: [] as Opcion[], sugeridas: !q });
    const ors = (campos: string[]) => terminos.flatMap((t) => campos.map((c) => ({ [c]: { contains: t, mode: "insensitive" as const } })));
    const [leads, clientes] = await Promise.all([
      prisma.lead.findMany({ where: { userId: user.id, OR: ors(["name", "company", "email"]) }, orderBy: { updatedAt: "desc" }, take: 6, select: { id: true, name: true, company: true, status: true, convertedClientId: true } }),
      prisma.client.findMany({ where: { userId: user.id, archivedAt: null, internal: false, OR: [...ors(["name", "company", "email"]), { contactos: { some: { OR: ors(["nombre", "email"]) } } }] }, orderBy: { updatedAt: "desc" }, take: 6, select: { id: true, name: true, company: true } }),
    ]);
    const ESTADO: Record<string, string> = { NUEVO: "Nuevo", CONTACTADO: "Contactado", COTIZANDO: "Cotizando", NEGOCIACION: "Negociación", GANADO: "Ganado", PERDIDO: "Perdido" };
    const opciones: Opcion[] = [
      ...clientes.map((c) => ({ tipo: "cliente" as const, id: c.id, nombre: c.company || c.name, detalle: c.company ? c.name : null })),
      ...leads.filter((l) => !l.convertedClientId || !clientes.some((c) => c.id === l.convertedClientId)).map((l) => ({ tipo: "lead" as const, id: l.id, nombre: l.name, detalle: [l.company, ESTADO[l.status]].filter(Boolean).join(" · ") || null })),
    ];
    return NextResponse.json({ opciones, sugeridas: !q });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("[mail/vinculo] buscar", err);
    return NextResponse.json({ error: "No se pudo buscar. Intenta de nuevo." }, { status: 500 });
  }
}

const txt = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireEmpresaUser(request);
    const { id } = await params;
    const correo = await prisma.inboxEmail.findFirst({ where: { id, userId: user.id } });
    if (!correo) return NextResponse.json({ error: "No encontré ese correo." }, { status: 404 });
    const body = await request.json().catch(() => ({}));
    const accion = txt(body.accion, 20);

    if (accion === "crear-lead") {
      const datos = {
        nombre: txt(body.nombre, 120),
        email: txt(body.email, 160).toLowerCase(),
        empresa: txt(body.empresa, 160) || null,
        telefono: txt(body.telefono, 40) || null,
        necesidad: txt(body.necesidad, 300),
      };
      if (!datos.nombre) return NextResponse.json({ error: "Escribe el nombre de la persona." }, { status: 400 });
      if (!CORREO.test(datos.email)) return NextResponse.json({ error: "Ese correo no parece válido." }, { status: 400 });
      const { lead, existia } = await crearLeadDesdeCorreo(user.id, correo, datos);
      await ligarAMano(user.id, correo, { leadId: lead.id, clientId: lead.convertedClientId });
      revalidatePath("/empresa/leads");
      return NextResponse.json({
        ok: true,
        mensaje: existia ? `Ya existía el lead de ${lead.name}: el correo quedó en su comunicación.` : `Lead creado: ${lead.name}. El correo quedó en su comunicación.`,
        vinculo: { tipo: "lead", id: lead.id, nombre: lead.name, detalle: lead.company },
      });
    }

    if (accion === "ligar") {
      const leadId = txt(body.leadId, 60);
      const clientId = txt(body.clientId, 60);
      if (leadId) {
        const lead = await prisma.lead.findFirst({ where: { id: leadId, userId: user.id }, select: { id: true, name: true, company: true, email: true, convertedClientId: true } });
        if (!lead) return NextResponse.json({ error: "No encontré ese lead." }, { status: 404 });
        const dirs = await ligarAMano(user.id, correo, { leadId: lead.id, clientId: lead.convertedClientId });
        // Un lead sin correo se queda con esta dirección: lo que escriba después cae solo aquí.
        if (!lead.email && dirs[0]) await prisma.lead.update({ where: { id: lead.id }, data: { email: dirs[0] } });
        revalidatePath(`/empresa/leads/${lead.id}`);
        return NextResponse.json({ ok: true, mensaje: `Ligado a ${lead.name}.`, vinculo: { tipo: "lead", id: lead.id, nombre: lead.name, detalle: lead.company } });
      }
      if (clientId) {
        const cliente = await prisma.client.findFirst({ where: { id: clientId, userId: user.id }, select: { id: true, name: true, company: true, email: true, contactos: { select: { email: true } } } });
        if (!cliente) return NextResponse.json({ error: "No encontré ese cliente." }, { status: 404 });
        const dirs = await ligarAMano(user.id, correo, { leadId: null, clientId: cliente.id });
        // Una dirección que el cliente no tenía queda como contacto suyo: sus próximos correos se ligan solos.
        const conocidas = new Set([cliente.email, ...cliente.contactos.map((k) => k.email)].filter(Boolean).map((e) => e!.trim().toLowerCase()));
        const nueva = dirs.find((d) => !conocidas.has(d));
        if (nueva) {
          const nombre = correo.folder === "INBOX" && correo.fromName && !correo.fromName.includes("@") ? correo.fromName.trim() : nueva;
          await prisma.contacto.create({ data: { userId: user.id, clientId: cliente.id, nombre: nombre.slice(0, 160), email: nueva, notas: "Agregado al ligar un correo." } });
        }
        revalidatePath(`/empresa/clientes/${cliente.id}`);
        return NextResponse.json({
          ok: true,
          mensaje: nueva ? `Ligado a ${cliente.company || cliente.name}. ${nueva} quedó como contacto suyo.` : `Ligado a ${cliente.company || cliente.name}.`,
          vinculo: { tipo: "cliente", id: cliente.id, nombre: cliente.company || cliente.name, detalle: cliente.company ? cliente.name : null },
        });
      }
      return NextResponse.json({ error: "Elige un lead o un cliente." }, { status: 400 });
    }

    if (accion === "quitar") {
      await prisma.inboxEmail.update({ where: { id: correo.id }, data: { leadId: null, clientId: null, vinculo: "ignorado" } });
      return NextResponse.json({ ok: true, mensaje: "Listo: este correo no es de ningún lead ni cliente.", vinculo: null });
    }

    return NextResponse.json({ error: "Acción desconocida." }, { status: 400 });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("[mail/vinculo]", err);
    return NextResponse.json({ error: "No se pudo guardar. Intenta de nuevo." }, { status: 500 });
  }
}
