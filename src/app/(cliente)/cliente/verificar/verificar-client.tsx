"use client";

import { VerificarTotp, cerrarSesion } from "@/components/auth/totp";
import { botonSecundario } from "@/components/auth/auth-shell";

export function VerificarCliente() {
  return (
    <div className="space-y-4">
      <VerificarTotp onListo={() => { window.location.href = "/cliente"; }} />
      <button type="button" className={botonSecundario} onClick={() => void cerrarSesion("/cliente/acceso")}>Entrar con otra cuenta</button>
    </div>
  );
}
