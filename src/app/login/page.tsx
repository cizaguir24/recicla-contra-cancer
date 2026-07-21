"use client";

import { useActionState } from "react";
import { authenticate } from "./actions";

export default function LoginPage() {
  const [errorMessage, formAction, pending] = useActionState(
    authenticate,
    undefined,
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <form
        action={formAction}
        className="w-full max-w-sm space-y-4 rounded-lg border border-border p-6"
      >
        <div className="text-center">
          <h1 className="text-lg font-semibold text-accent">
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
            className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
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
            className="w-full rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        {errorMessage && (
          <p className="text-sm text-red-500">{errorMessage}</p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground transition-opacity disabled:opacity-60"
        >
          {pending ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
