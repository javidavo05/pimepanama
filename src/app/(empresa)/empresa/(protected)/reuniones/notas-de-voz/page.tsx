import Link from "next/link";
import { getEmpresaUser } from "@/lib/supabase/get-empresa-user";
import { VoiceNotes } from "./voice-notes";

export const metadata = { title: "Notas de voz — Pime Suite" };
export const dynamic = "force-dynamic";

export default async function NotasDeVozPage() {
  await getEmpresaUser();

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/empresa/reuniones" className="text-fg-faint hover:text-fg-dim text-sm transition-colors">
        ← Reuniones
      </Link>
      <div className="mt-2 mb-6">
        <h1 className="text-fg text-2xl font-semibold tracking-tight">Notas de voz</h1>
        <p className="text-fg-dim text-sm mt-1 leading-relaxed">
          Pasa las notas de voz de WhatsApp y te devuelve el texto, lo que piden y lo que quedó dudoso.
        </p>
      </div>
      <VoiceNotes />
    </div>
  );
}
