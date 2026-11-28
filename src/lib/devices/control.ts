import { createHmac } from "node:crypto";

/**
 * Control de slides: el celular (Pime Suite instalada como app) manda teclas y
 * clics a una Mac con PIME Guard.
 *
 * Por qué no va directo por el Wi-Fi: la suite se sirve por HTTPS y ni Safari
 * ni Chrome dejan que una página HTTPS hable con una dirección http de la red
 * local (contenido mixto). Los dos lados se encuentran en un canal de Supabase
 * Realtime (broadcast, sin tocar la base ni las funciones de Vercel): llega en
 * ~100 ms y funciona igual en el mismo Wi-Fi o con datos.
 *
 * El nombre del canal es el secreto: se deriva de la llave de la Mac con el
 * service role, solo lo reciben su dueño (en la página) y la propia Mac (por la
 * API con su Bearer). La Mac acepta solo una lista fija de órdenes: flechas,
 * inicio/fin, pantalla negra, mover el puntero y clic. Nunca texto libre.
 */
export function canalDeControl(deviceId: string): string {
  const secreto = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secreto) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY para el control de slides");
  const firma = createHmac("sha256", secreto).update(`pime-control-v1:${deviceId}`).digest("hex");
  return `control-${firma.slice(0, 40)}`;
}

export function realtimeConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL / ANON_KEY");
  return { url, anonKey };
}
