import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { withEmpresaRoute } from "@/app/api/empresa/_route";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { consumeChallenge, verifyPasskeyAssertion } from "@/lib/passkeys";

export const runtime = "nodejs";

/**
 * Entrar con la huella. Verificada la firma, el servidor genera un enlace
 * mágico con el service role y lo canjea ahí mismo: la sesión de Supabase
 * queda en las cookies de siempre y el enlace nunca viaja al navegador.
 */
export const POST = withEmpresaRoute(async (request) => {
  const body = (await request.json()) as { response: AuthenticationResponseJSON };
  const expectedChallenge = await consumeChallenge("login", null);
  if (!expectedChallenge) {
    return NextResponse.json({ error: "La solicitud venció. Inténtalo de nuevo." }, { status: 400 });
  }

  const passkey = await verifyPasskeyAssertion(request, body.response, expectedChallenge);
  if (!passkey) {
    return NextResponse.json(
      { error: "Esta huella no está registrada en la suite. Entra con tu correo y actívala en Configuración." },
      { status: 401 }
    );
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const { data: authUser } = await admin.auth.admin.getUserById(passkey.user.supabaseUid);
  const email = authUser?.user?.email ?? passkey.user.email;
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (linkError || !link?.properties?.hashed_token) {
    console.error("[passkeys/login] generateLink", linkError);
    return NextResponse.json({ error: "No se pudo iniciar la sesión." }, { status: 500 });
  }

  const supabase = await createSupabaseServerClient();
  const { error: otpError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: link.properties.hashed_token,
  });
  if (otpError) {
    console.error("[passkeys/login] verifyOtp", otpError);
    return NextResponse.json({ error: "No se pudo iniciar la sesión." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
});
