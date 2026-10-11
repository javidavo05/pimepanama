"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { loginAction, type LoginActionState } from "../../actions";
import { botonPrincipal, campo, errorBox, etiqueta } from "@/components/auth/auth-shell";

const initialState: LoginActionState = { error: undefined };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={botonPrincipal}
      disabled={pending}
    >
      {pending ? "Entrando…" : "Entrar"}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="grid gap-4">
      <div>
        <label htmlFor="email" className={etiqueta}>
          Correo
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className={campo}
        />
      </div>
      <div>
        <label htmlFor="password" className={etiqueta}>
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className={campo}
        />
      </div>
      {state.error ? (
        <p className={errorBox} role="alert">
          {state.error}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}

