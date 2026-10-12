"use client";

/**
 * Conectar (o reemplazar) el token de una cuenta de Vercel o Supabase, en 3 pasos como el de GitHub:
 *   1. Abrir la página del token en el proveedor.
 *   2. Pegarlo: Pime lo comprueba contra la API real, dice de qué cuenta es y lo guarda cifrado.
 *   3. Listo: cuántos proyectos tiene y en qué plan está (si la API lo dice; si no, se marca aquí).
 */
import { useEffect, useState } from "react";
import { Asistente, btnAsistente } from "@/components/empresa/asistente/asistente";
import { PLAN_CAPACITY, PLAN_LABEL } from "@/lib/platform-slots";
import { inputCls, labelCls, pedirJson } from "./ui";

const PASOS = ["Crear el token", "Pegarlo", "Listo"];

const INFO = {
  vercel: {
    nombre: "Vercel",
    url: "https://vercel.com/account/settings/tokens",
    pasos: [
      ["Toca «Abrir Vercel».", "Entra con la cuenta cuyo correo quieres conectar."],
      ["Crea un token con alcance «Full Account».", "Ponle de nombre «Pime Suite» y elige cuándo vence; un año está bien."],
      ["Copia el token y vuelve aquí.", "Vercel lo muestra una sola vez."],
    ],
    placeholder: "Token de Vercel",
  },
  supabase: {
    nombre: "Supabase",
    url: "https://supabase.com/dashboard/account/tokens",
    pasos: [
      ["Toca «Abrir Supabase».", "Entra con la cuenta cuyo correo quieres conectar."],
      ["Toca «Generate new token».", "Ponle de nombre «Pime Suite»."],
      ["Copia el código que empieza con sbp_ y vuelve aquí.", "Supabase lo muestra una sola vez."],
    ],
    placeholder: "sbp_…",
  },
} as const;

type Resultado = { email: string; plan: "FREE" | "PRO"; planDetectado: boolean; label: string | null; proyectos: number };

export function AsistenteTokenPlataforma({
  abierto,
  provider,
  correo,
  onCerrar,
  onListo,
  onPlan,
}: {
  abierto: boolean;
  provider: "vercel" | "supabase";
  /** Correo de la cuenta, si se reemplaza el token de una que ya existe. */
  correo?: string | null;
  onCerrar: () => void;
  onListo: () => void;
  /** Marca el plan a mano cuando la API no lo dijo. */
  onPlan: (email: string, plan: "FREE" | "PRO") => Promise<void>;
}) {
  const info = INFO[provider];
  const [paso, setPaso] = useState(1);
  const [token, setToken] = useState("");
  const [email, setEmail] = useState(correo ?? "");
  const [pideCorreo, setPideCorreo] = useState(provider === "supabase");
  const [estado, setEstado] = useState<{ cargando?: boolean; error?: string }>({});
  const [res, setRes] = useState<Resultado | null>(null);

  useEffect(() => {
    if (abierto) {
      setEmail(correo ?? "");
      setPideCorreo(provider === "supabase");
    }
  }, [abierto, correo, provider]);

  function cerrar() {
    setPaso(1);
    setToken("");
    setEstado({});
    setRes(null);
    onCerrar();
  }

  async function guardar() {
    if (!token.trim()) return;
    setEstado({ cargando: true });
    const r = await pedirJson<Resultado & { ok: true }>("/api/empresa/platforms/accounts/token", {
      method: "POST",
      body: JSON.stringify({ provider, token: token.trim(), email: email.trim() || null }),
    });
    if (r.error !== undefined) {
      if (r.error.includes("Escribe el correo")) setPideCorreo(true);
      setEstado({ error: r.error });
      return;
    }
    setRes(r.data);
    setEstado({});
    setPaso(3);
    onListo();
  }

  async function marcarPlan(plan: "FREE" | "PRO") {
    if (!res) return;
    setRes({ ...res, plan });
    await onPlan(res.email, plan);
  }

  const pie =
    paso === 1 ? (
      <>
        <button type="button" className={btnAsistente.secundario} onClick={() => setPaso(2)}>
          Ya tengo el token
        </button>
        <a href={info.url} target="_blank" rel="noreferrer" className={btnAsistente.principal} onClick={() => setPaso(2)}>
          Abrir {info.nombre}
        </a>
      </>
    ) : paso === 2 ? (
      <>
        <button type="button" className={btnAsistente.secundario} onClick={() => setPaso(1)}>
          Atrás
        </button>
        <button type="button" className={btnAsistente.principal} disabled={!token.trim() || estado.cargando} onClick={() => void guardar()}>
          {estado.cargando ? `Comprobando con ${info.nombre}…` : `Conectar cuenta de ${info.nombre}`}
        </button>
      </>
    ) : (
      <button type="button" className={btnAsistente.principal} onClick={cerrar}>
        Terminar
      </button>
    );

  const cap = PLAN_CAPACITY[provider];

  return (
    <Asistente
      abierto={abierto}
      onCerrar={cerrar}
      titulo={paso === 3 ? "Cuenta conectada" : correo ? `Reemplazar el token de ${info.nombre}` : `Conectar una cuenta de ${info.nombre}`}
      paso={paso}
      pasos={PASOS}
      pie={pie}
    >
      {paso === 1 && (
        <div className="space-y-6">
          <p className="text-fg-mute text-sm leading-relaxed">
            Con el token, Pime lee la lista real de proyectos de la cuenta, su estado y cuántos le quedan. Solo lee: nunca publica ni borra nada.
          </p>
          {correo && (
            <div className="rounded-xl bg-fill px-4 py-3 text-sm">
              <p className="text-fg-dim">Entra a {info.nombre} con la cuenta</p>
              <p className="text-fg font-semibold [overflow-wrap:anywhere]">{correo}</p>
            </div>
          )}
          <ol className="space-y-4 text-sm">
            {info.pasos.map(([t, d], i) => (
              <li key={t} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-brand/10 text-brand-fg text-xs font-bold">{i + 1}</span>
                <span>
                  <span className="block text-fg font-semibold">{t}</span>
                  <span className="block text-fg-dim">{d}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
      {paso === 2 && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void guardar();
          }}
        >
          <div>
            <label htmlFor="pf-token" className="block text-fg text-sm font-semibold mb-2">
              Pega el token
            </label>
            <input
              id="pf-token"
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={token}
              onChange={(e) => {
                setToken(e.target.value);
                setEstado({});
              }}
              placeholder={info.placeholder}
              className="w-full min-h-12 rounded-xl border border-line-mid bg-fill px-4 font-mono text-base text-fg placeholder:text-fg-trace focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
          {pideCorreo && (
            <div>
              <label htmlFor="pf-email" className={labelCls}>
                Correo de la cuenta
              </label>
              <input id="pf-email" type="email" inputMode="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cuenta@gmail.com" className={inputCls} />
              <p className="text-fg-dim text-xs mt-1">
                {provider === "supabase" ? "Algunos tokens de Supabase no dicen de qué correo son. Si el token lo dice, se usa ese." : "Vercel no devolvió el correo de la cuenta."}
              </p>
            </div>
          )}
          <p className="text-fg-dim text-xs">Pime lo comprueba con {info.nombre} y lo guarda cifrado. No vuelve a mostrarse, ni a ti.</p>
          {estado.error && (
            <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
              {estado.error}
            </p>
          )}
        </form>
      )}
      {paso === 3 && res && (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-ok/10 text-ok" aria-hidden>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </span>
            <p className="text-fg text-base font-semibold [overflow-wrap:anywhere]">{res.email}</p>
            <p className="text-fg-dim text-sm">
              {res.proyectos === 1 ? "1 proyecto" : `${res.proyectos} proyectos`} en {info.nombre}
              {res.label ? ` · ${res.label}` : ""}
            </p>
            {correo && res.email !== correo.toLowerCase() && (
              <p className="text-warn text-sm">Ese token es de {res.email}, no de {correo}. Quedó guardado en la cuenta {res.email}.</p>
            )}
          </div>
          <fieldset className="space-y-2">
            <legend className="text-fg text-sm font-semibold mb-2">Plan de la cuenta</legend>
            {res.planDetectado && <p className="text-fg-dim text-xs">{info.nombre} dice que está en {PLAN_LABEL[provider][res.plan]}. Si no es así, cámbialo.</p>}
            {!res.planDetectado && <p className="text-fg-dim text-xs">{info.nombre} no dijo el plan con este token. Márcalo tú: define cuántos proyectos admite.</p>}
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Plan de la cuenta">
              {(["FREE", "PRO"] as const).map((plan) => (
                <button
                  key={plan}
                  type="button"
                  role="radio"
                  aria-checked={res.plan === plan}
                  onClick={() => void marcarPlan(plan)}
                  className={`min-h-12 px-3 rounded-lg border text-left text-sm transition-colors ${
                    res.plan === plan ? "border-brand/50 bg-brand/10 text-fg" : "border-line-mid text-fg-soft hover:bg-fill-2"
                  }`}
                >
                  <span className="block font-semibold">{PLAN_LABEL[provider][plan]}</span>
                  <span className="block text-xs text-fg-dim">{plan === "PRO" ? "Sin límite de proyectos" : `${cap} proyectos`}</span>
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      )}
    </Asistente>
  );
}
