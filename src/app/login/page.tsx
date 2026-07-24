"use client";

import { useActionState } from "react";
import { authenticate } from "./actions";

export default function LoginPage() {
  const [errorMessage, formAction, pending] = useActionState(
    authenticate,
    undefined,
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-100 via-white to-purple-100 px-4">
      <form
        action={formAction}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-white/50 bg-white/70 p-8 shadow-2xl backdrop-blur-xl backdrop-saturate-150"
      >
        <div className="text-center">
          <h1 className="text-lg font-semibold text-[var(--brand-blue-dark)]">
            ♻️ Recicla Contra el Cáncer
          </h1>
          <p className="text-sm text-foreground/60">
            Inicia sesión para continuar
          </p>
        </div>
        <div className="space-y-1">
          <label htmlFor="email" className="text-sm font-medium">
            Usuario
          </label>
          <input
            id="email"
            name="email"
            type="text"
            required
            autoComplete="username"
            className="input"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="input"
          />
        </div>
        {errorMessage && (
          <p className="text-sm text-red-500">{errorMessage}</p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-[var(--brand-blue)] py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity disabled:opacity-60"
        >
          {pending ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
