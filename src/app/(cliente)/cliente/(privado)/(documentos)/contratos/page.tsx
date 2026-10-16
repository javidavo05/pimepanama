import { getPortalUser } from "@/lib/portal/sesion";
import { contratosDelCliente, dinero } from "@/lib/portal/datos";
import { contratoVisible, esperaMiFirma, estadoContrato } from "@/lib/portal/documentos";
import { Encabezado, Etiqueta, Tarjeta, TituloSeccion, Vacio, btnPrincipal, btnSecundario, fechaCorta } from "@/components/portal/ui";
import { IconDescargar } from "@/components/portal/iconos";
import { errorBox } from "@/components/auth/auth-shell";

export const metadata = { title: "Contratos" };

const AVISOS: Record<string, string> = {
  "firma-no-pendiente": "Ese contrato ya no espera tu firma. Si crees que es un error, escríbenos.",
  "firma-de-otra-persona": "Ese contrato se envió a firmar a otra persona de tu equipo: la firma la hace ella desde su cuenta o desde el correo que recibió.",
  "firma-vencida": "El plazo para firmar ese contrato venció. Escríbenos y te lo enviamos de nuevo.",
};

export default async function ContratosCliente({ searchParams }: { searchParams: Promise<{ aviso?: string }> }) {
  const p = await getPortalUser();
  const [{ aviso }, todos] = await Promise.all([searchParams, contratosDelCliente(p.clientId)]);
  const contratos = todos.filter((c) => contratoVisible(c));
  return (
    <>
      <Encabezado eyebrow="Documentos" titulo="Contratos" detalle="Tus contratos con Pime y en qué va su firma. Cuando ambas partes firman, aquí queda el PDF firmado." />
      {aviso && AVISOS[aviso] && <p className={errorBox} role="alert">{AVISOS[aviso]}</p>}
      <Tarjeta i={1}>
        <TituloSeccion>Tus contratos</TituloSeccion>
        {contratos.length === 0 ? (
          <Vacio titulo="Todavía no hay contratos" texto="Cuando Pime prepare un contrato para tu proyecto, aparece aquí para que lo leas y lo firmes desde el teléfono, sin imprimir nada." />
        ) : (
          <ul className="p-lista divide-y divide-line">
            {contratos.map((c, i) => {
              const e = estadoContrato(c);
              const req = c.signingRequest;
              const mia = esperaMiFirma({ ...c, clientEmail: req?.clientEmail }, p.email);
              const firmado = !!req?.signedPdfR2Key;
              const pdf = firmado || !!req?.basePdfR2Key;
              const fechas = [
                c.signingCompletedAt ? `firmado el ${fechaCorta(c.signingCompletedAt)}` : null,
                c.startsAt ? `desde el ${fechaCorta(c.startsAt)}` : null,
                c.endsAt ? `hasta el ${fechaCorta(c.endsAt)}` : null,
              ].filter(Boolean).join(" · ");
              return (
                <li key={c.id} data-tono={e.tono} style={{ "--i": i } as React.CSSProperties} className="p-codigo flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-fg font-semibold [overflow-wrap:anywhere]">{c.title}</p>
                    <p className="text-fg-dim text-sm [overflow-wrap:anywhere]">{[c.project?.name, Number(c.value) > 0 ? dinero(c.value) : null, fechas].filter(Boolean).join(" · ") || `Creado el ${fechaCorta(c.createdAt)}`}</p>
                    {c.signingStatus === "PENDING_CLIENT" && !mia && req?.clientEmail && <p className="text-fg-faint text-xs [overflow-wrap:anywhere]">Espera la firma de {req.clientEmail}.</p>}
                    {mia && req?.expiresAt && <p className="text-fg-faint text-xs">Puedes firmarlo hasta el {fechaCorta(req.expiresAt)}.</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                    <Etiqueta tono={e.tono}>{e.texto}</Etiqueta>
                    {mia && <a href={`/api/cliente/contratos/${c.id}/firmar`} className={`${btnPrincipal} min-h-11 px-4`}>Leer y firmar</a>}
                    {pdf && <a href={`/api/cliente/contratos/${c.id}/pdf`} className={`${btnSecundario} min-h-11 px-4`}><IconDescargar width={18} height={18} />{firmado ? "PDF firmado" : "PDF"}</a>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Tarjeta>
    </>
  );
}
