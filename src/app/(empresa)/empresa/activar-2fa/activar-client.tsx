"use client";

import { ActivarTotp, cerrarSesion } from "@/components/auth/totp";
import { botonSecundario } from "@/components/auth/auth-shell";

export function ActivarEquipo() {
  return (
    <div className="space-y-4">
      <ActivarTotp nombre="Pime Suite" onListo={() => { window.location.href = "/empresa"; }} />
      <button type="button" className={botonSecundario} onClick={() => void cerrarSesion("/empresa/login")}>Cerrar sesión</button>
    </div>
  );
}
