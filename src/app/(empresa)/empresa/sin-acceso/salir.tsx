"use client";

import { cerrarSesion } from "@/components/auth/totp";
import { botonPrincipal, botonSecundario } from "@/components/auth/auth-shell";

export function SalirBoton() {
  return (
    <div className="space-y-3">
      <a href="/cliente" className={botonPrincipal}>Ir a mi cuenta de cliente</a>
      <button type="button" className={botonSecundario} onClick={() => void cerrarSesion("/empresa/login")}>Entrar con otra cuenta</button>
    </div>
  );
}
