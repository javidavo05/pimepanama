"use client";

import { VerificarTotp, cerrarSesion } from "@/components/auth/totp";
import { botonSecundario } from "@/components/auth/auth-shell";

export function VerificarEquipo() {
  return (
    <div className="space-y-4">
      <VerificarTotp onListo={() => { window.location.href = "/empresa"; }} />
      <button type="button" className={botonSecundario} onClick={() => void cerrarSesion("/empresa/login")}>Entrar con otra cuenta</button>
    </div>
  );
}
