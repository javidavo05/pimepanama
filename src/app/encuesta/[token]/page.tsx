import { encuestaDeToken } from "@/lib/crm/encuesta";
import { errorBox } from "@/components/auth/auth-shell";
import { MarcoEncuesta } from "../marco";
import { EncuestaForm, Gracias } from "./encuesta-form";

export const metadata = { title: "¿Nos recomendarías?" };
export const dynamic = "force-dynamic";

/** /encuesta/<token>: encuesta pública de satisfacción al terminar un proyecto. No pide cuenta ni contraseña. */
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let e: Awaited<ReturnType<typeof encuestaDeToken>> = null;
  let falla = false;
  try {
    e = await encuestaDeToken(token);
  } catch (err) {
    console.error("[encuesta] no se pudo leer", err);
    falla = true;
  }

  if (falla) {
    return (
      <MarcoEncuesta title="No pudimos abrir la encuesta" subtitle="Es un problema de nuestro lado, no de tu enlace.">
        <p className={errorBox} role="alert">Vuelve a abrir el enlace del correo en unos minutos. Tu respuesta no se ha perdido.</p>
      </MarcoEncuesta>
    );
  }
  if (!e) {
    return (
      <MarcoEncuesta title="Este enlace no es válido" subtitle="Puede que se haya copiado incompleto.">
        <p className={errorBox} role="alert">Abre el botón «Responder la encuesta» directamente desde el correo. Si sigue sin funcionar, escríbenos a info@pimepanama.com.</p>
      </MarcoEncuesta>
    );
  }
  const quien = e.client.company || e.client.name;
  if (e.respondidaAt) {
    return (
      <MarcoEncuesta eyebrow={e.project.name} title="Gracias por responder" subtitle={`Ya recibimos la respuesta de ${quien}.`}>
        <Gracias ya />
      </MarcoEncuesta>
    );
  }
  return (
    <MarcoEncuesta eyebrow={e.project.name} title="¿Qué tan probable es que nos recomiendes?" subtitle={`Terminamos «${e.project.name}». Cuéntanos qué tan probable es que recomiendes a Pime a un colega o a otra empresa.`}>
      <EncuestaForm token={token} />
    </MarcoEncuesta>
  );
}
