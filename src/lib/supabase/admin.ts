import { createClient } from "@supabase/supabase-js";

/** Cliente con la llave de servicio: solo en el servidor (crear cuentas, enlaces de un solo uso). */
export function supabaseAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
