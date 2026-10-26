/** Estado real de cada conexión que dibuja Jarvis en la pantalla de inicio. Lecturas baratas: conteos y fechas, nada de llamadas externas. */
import { prisma } from "@/lib/prisma";
import { AREA_LABEL, areaValida } from "@/lib/auth/permisos";
import { cerebroDeLaPlataforma, NOMBRE_CEREBRO } from "@/lib/ai/cerebro";

export type EstadoConexion = "ok" | "aviso" | "apagado";
export type Conexion = {
  id: string;
  nombre: string;
  /** fuente: de dónde salen los datos. motor: lo que oye, piensa y habla. persona: alguien del equipo. */
  tipo: "fuente" | "motor" | "persona";
  /** Solo para personas: su área, para ligarla con los sistemas que usa. */
  area?: string;
  estado: EstadoConexion;
  /** Una línea corta bajo el nodo: «3 cuentas», «sin conectar». */
  resumen: string;
  /** Lo que se lee al tocar el nodo. */
  detalle: string;
  href: string | null;
};

const hace = (d: Date | null | undefined) => {
  if (!d) return null;
  const min = Math.max(0, Math.round((Date.now() - d.getTime()) / 60_000));
  if (min < 60) return min <= 1 ? "recién" : `hace ${min} min`;
  const h = Math.round(min / 60);
  return h < 24 ? `hace ${h} h` : `hace ${Math.round(h / 24)} días`;
};

export async function conexionesDeJarvis(userId: string, calendario: { estado: "sin" | "ok" | "error"; error: string | null }): Promise<Conexion[]> {
  const [correos, github, sistemas, caidos, portal, gente, invitados] = await Promise.all([
    prisma.mailAccount.findMany({ where: { userId, active: true }, select: { lastSyncAt: true } }),
    prisma.githubAccount.findMany({ where: { userId }, select: { lastError: true, lastCheckedAt: true } }),
    prisma.monitoredSystem.count({ where: { userId, active: true } }),
    prisma.monitoredSystem.count({ where: { userId, active: true, status: { in: ["caido", "degradado"] } } }),
    prisma.clientUser.count({ where: { userId, status: "activo" } }),
    prisma.empresaUser.findMany({ where: { OR: [{ id: userId }, { ownerId: userId }] }, orderBy: { createdAt: "asc" }, select: { id: true, email: true, fullName: true, area: true, activo: true } }),
    prisma.empresaInvite.findMany({ where: { ownerId: userId, acceptedAt: null, revokedAt: null }, orderBy: { createdAt: "asc" }, select: { id: true, email: true, fullName: true, area: true } }),
  ]);
  const ultimoCorreo = correos.map((c) => c.lastSyncAt).filter((d): d is Date => !!d).sort((a, b) => b.getTime() - a.getTime())[0];
  const githubConError = github.filter((g) => g.lastError).length;
  const cerebro = await cerebroDeLaPlataforma();
  const ia = !!cerebro;
  // La voz a texto es Whisper: necesita la llave de OpenAI aunque el cerebro sea Claude.
  const oido = !!process.env.OPENAI_API_KEY;

  // El equipo: cada persona es un nodo ligado a los sistemas de su área. Las invitadas salen apagadas.
  const nombreCorto = (n: string | null, email: string) => (n?.trim() ? n.trim().split(/\s+/)[0] : email.split("@")[0]);
  const area = (a: string | null) => (areaValida(a) ? a : "dueno");
  const personas: Conexion[] = [
    ...gente.map((g): Conexion => ({
      id: `p:${g.id}`, nombre: nombreCorto(g.fullName, g.email), tipo: "persona", area: g.id === userId ? "dueno" : area(g.area),
      estado: g.activo || g.id === userId ? "ok" : "apagado",
      resumen: g.id === userId ? "Dueño" : AREA_LABEL[area(g.area)],
      detalle: `${g.fullName || g.email} · ${g.id === userId ? "dueño de la cuenta" : `área ${AREA_LABEL[area(g.area)].toLowerCase()}`}${g.activo || g.id === userId ? "" : " · desactivado"}. Ve lo que su área permite y trabaja con los sistemas a los que está ligado.`,
      href: "/empresa/configuracion",
    })),
    ...invitados.map((i): Conexion => ({
      id: `p:i-${i.id}`, nombre: nombreCorto(i.fullName, i.email), tipo: "persona", area: area(i.area), estado: "apagado",
      resumen: "Invitado", detalle: `${i.fullName || i.email} · invitado al área ${AREA_LABEL[area(i.area)].toLowerCase()}, todavía no entra.`, href: "/empresa/configuracion",
    })),
  ];

  return [
    ...personas,
    { id: "pime", nombre: "Pime", tipo: "fuente", estado: "ok", resumen: "base de datos", detalle: "Clientes, proyectos, facturas, cobros, leads y tareas del panel. Es la fuente de casi todo lo que ves aquí.", href: "/empresa/clientes" },
    correos.length
      ? { id: "correo", nombre: "Correo", tipo: "fuente", estado: "ok", resumen: `${correos.length} ${correos.length === 1 ? "cuenta" : "cuentas"} · ${hace(ultimoCorreo) ?? "sin leer"}`, detalle: `Lee los correos de clientes y leads, los resume y los liga a su ficha. Última lectura: ${hace(ultimoCorreo) ?? "todavía ninguna"}.`, href: "/empresa/correos/hub" }
      : { id: "correo", nombre: "Correo", tipo: "fuente", estado: "apagado", resumen: "sin conectar", detalle: "No hay cuentas de correo conectadas. Conecta una en Correos para que Jarvis vea quién espera respuesta.", href: "/empresa/correos" },
    calendario.estado === "ok"
      ? { id: "agenda", nombre: "Agenda", tipo: "fuente", estado: "ok", resumen: "Google Calendar", detalle: "Tus eventos de Google Calendar entran en «Tu día» junto con tareas, citas, reuniones y cobros.", href: "/empresa/tareas" }
      : calendario.estado === "error"
        ? { id: "agenda", nombre: "Agenda", tipo: "fuente", estado: "aviso", resumen: "no se pudo leer", detalle: `No pude leer tu Google Calendar: ${calendario.error ?? "error desconocido"}. Revísalo en Configuración.`, href: "/empresa/configuracion" }
        : { id: "agenda", nombre: "Agenda", tipo: "fuente", estado: "apagado", resumen: "sin conectar", detalle: "Tu Google Calendar no está conectado. Mientras tanto, «Tu día» muestra tareas, citas, reuniones y cobros de Pime.", href: "/empresa/configuracion" },
    github.length
      ? { id: "github", nombre: "GitHub", tipo: "fuente", estado: githubConError ? "aviso" : "ok", resumen: githubConError ? `${githubConError} con error` : `${github.length} ${github.length === 1 ? "cuenta" : "cuentas"}`, detalle: githubConError ? `${githubConError} de ${github.length} cuentas de GitHub dieron error en la última revisión. Revísalas en Plataformas.` : "Mide el avance de cada proyecto por su actividad en GitHub.", href: "/empresa/platforms" }
      : { id: "github", nombre: "GitHub", tipo: "fuente", estado: "apagado", resumen: "sin conectar", detalle: "Sin cuentas de GitHub: el avance de los proyectos no se verifica con el código.", href: "/empresa/platforms" },
    { id: "sistemas", nombre: "Sistemas", tipo: "fuente", estado: caidos ? "aviso" : sistemas ? "ok" : "apagado", resumen: caidos ? `${caidos} con problemas` : sistemas ? `${sistemas} en vigilancia` : "ninguno", detalle: caidos ? `${caidos} de ${sistemas} sistemas de clientes no responden o fallan. Están en «Atiende primero».` : sistemas ? `Vigila ${sistemas} sistemas de clientes; todos responden.` : "Todavía no vigilas ningún sistema de cliente.", href: "/empresa/sistemas" },
    { id: "portal", nombre: "Portal", tipo: "fuente", estado: portal ? "ok" : "apagado", resumen: portal ? `${portal} ${portal === 1 ? "cliente activo" : "clientes activos"}` : "sin clientes", detalle: portal ? `${portal} personas de tus clientes entran a su cuenta: pagos, aprobaciones y tickets llegan de ahí.` : "Ningún cliente entra todavía a su cuenta. Se invitan desde la ficha del cliente.", href: "/empresa/clientes" },
    { id: "oido", nombre: "Oído", tipo: "motor", estado: oido ? "ok" : "apagado", resumen: oido ? "transcripción" : "sin llave", detalle: oido ? "Pasa tu voz a texto cuando tocas el micrófono o el núcleo. El micrófono solo abre cuando lo pides." : "Falta la llave de IA en el servidor: no puedo transcribir tu voz.", href: null },
    { id: "asistente", nombre: "Asistente", tipo: "motor", estado: ia ? "ok" : "apagado", resumen: cerebro ? NOMBRE_CEREBRO[cerebro] : "sin llave", detalle: ia ? "Entiende el pedido y lo hace con las herramientas de Pime: pagos, facturas, fases, tareas. Lo grande queda por confirmar. Aquí eliges el cerebro de toda la IA de Pime." : "Falta la llave de IA en el servidor: el asistente no puede responder.", href: null },
    { id: "voz", nombre: "Voz", tipo: "motor", estado: "ok", resumen: "del navegador", detalle: "Te responde en voz alta con la voz en español de tu navegador. Puedes apagarla con el botón de voz.", href: null },
  ];
}
