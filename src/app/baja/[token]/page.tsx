/**
 * «Darme de baja» de las campañas (pública, sin sesión). No da de baja al abrir: los antivirus de correo abren
 * los enlaces solos, así que la baja se confirma con un botón. En español o inglés (textos.ts).
 */
import type { Metadata } from "next";
import { headers } from "next/headers";
import { AuthShell, errorBox, okBox } from "@/components/auth/auth-shell";
import { leerTokenBaja } from "@/lib/crm/correo-baja";
import { prisma } from "@/lib/prisma";
import { BajaForm } from "./baja-form";
import { TEXTOS, idiomaDe } from "./textos";

type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ lang?: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const idioma = idiomaDe((await searchParams).lang, (await headers()).get("accept-language"));
  return { title: TEXTOS[idioma].metaTitulo, robots: { index: false, follow: false } };
}

export default async function BajaPage({ params, searchParams }: Props) {
  const [{ token }, { lang }, h] = await Promise.all([params, searchParams, headers()]);
  const idioma = idiomaDe(lang, h.get("accept-language"));
  const t = TEXTOS[idioma];
  const quien = leerTokenBaja(decodeURIComponent(token).slice(0, 600));
  const ya = quien
    ? await prisma.bajaCorreo.findUnique({ where: { userId_email: { userId: quien.userId, email: quien.email } }, select: { id: true } }).catch(() => null)
    : null;

  return (
    <div className="theme-dark empresa-app" lang={idioma}>
      <AuthShell
        eyebrow="Pime Panamá"
        title={t.titulo}
        subtitle={t.subtitulo}
        footer={<>{t.dudas} <a href="mailto:info@pimepanama.com" className="inline-flex items-center min-h-11 font-semibold text-fg-mute underline underline-offset-4 hover:text-fg">info@pimepanama.com</a></>}
      >
        {!quien ? (
          <p className={errorBox} role="alert">{t.invalido}</p>
        ) : ya ? (
          <p className={okBox} role="status">
            <strong className="[overflow-wrap:anywhere]">{t.yaEstaba(quien.email)[0]}</strong>{t.yaEstaba(quien.email)[1]}
          </p>
        ) : (
          <BajaForm token={decodeURIComponent(token)} email={quien.email} idioma={idioma} />
        )}
      </AuthShell>
    </div>
  );
}
