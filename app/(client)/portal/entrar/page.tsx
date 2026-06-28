"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useClientAuth } from "@/lib/auth/client-auth-context";

type Phase = "form" | "sending" | "sent" | "redeeming" | "redeem-error";

/**
 * Página PÚBLICA de acceso al portal. Dos caminos:
 *  - sin `?token=`: pide el correo y dispara el magic-link.
 *  - con `?token=` (el cliente llegó desde el correo): canjea el token e inicia
 *    sesión, luego va al portal.
 * El token se lee de `window.location` (no useSearchParams) para no requerir un
 * límite de Suspense en el prerender.
 */
export default function EntrarPage() {
  const router = useRouter();
  const { redeem } = useClientAuth();

  // Fase inicial perezosa: si el cliente llegó con ?token=, arrancamos en
  // "redeeming" sin un setState síncrono dentro del efecto.
  const [phase, setPhase] = useState<Phase>(() =>
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("token")
      ? "redeeming"
      : "form",
  );
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) return;
    void (async () => {
      try {
        await redeem(token);
        router.replace("/portal");
      } catch {
        setPhase("redeem-error");
      }
    })();
  }, [redeem, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPhase("sending");
    try {
      const { clientAuthApi } = await import("@/lib/api/client-portal/auth");
      await clientAuthApi.requestLink(email.trim());
      setPhase("sent");
    } catch {
      // El backend responde 200 siempre; un fallo aquí es de red.
      setError("No pudimos enviar el enlace. Revisa tu conexión e intenta de nuevo.");
      setPhase("form");
    }
  }

  if (phase === "redeeming") {
    return (
      <Centered>
        <p className="text-sm opacity-70">Validando tu acceso…</p>
      </Centered>
    );
  }

  if (phase === "redeem-error") {
    return (
      <Centered>
        <h1 className="text-lg font-semibold">Enlace no válido</h1>
        <p className="mt-2 text-sm opacity-70">
          El enlace expiró o ya se usó. Pide uno nuevo con tu correo.
        </p>
        <button
          className="mt-4 rounded-lg border border-[var(--border)] px-4 py-2 text-sm"
          onClick={() => {
            setPhase("form");
            history.replaceState(null, "", "/portal/entrar");
          }}
        >
          Pedir un nuevo enlace
        </button>
      </Centered>
    );
  }

  if (phase === "sent") {
    return (
      <Centered>
        <h1 className="text-lg font-semibold">Revisa tu correo</h1>
        <p className="mt-2 max-w-sm text-sm opacity-70">
          Si <strong>{email}</strong> está registrado, te enviamos un enlace para
          entrar a tu portal. El enlace vence pronto y sólo puede usarse una vez.
        </p>
      </Centered>
    );
  }

  return (
    <Centered>
      <h1 className="text-xl font-semibold">Entrar a mi portal</h1>
      <p className="mt-1 text-sm opacity-70">
        Te enviaremos un enlace de acceso a tu correo.
      </p>
      <form onSubmit={onSubmit} className="mt-6 w-full max-w-sm space-y-3">
        <input
          type="email"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@correo.com"
          className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
        />
        {error && <p className="text-sm text-[var(--danger,#c0392b)]">{error}</p>}
        <button
          type="submit"
          disabled={phase === "sending"}
          className="w-full rounded-lg bg-[var(--accent,#1f6feb)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {phase === "sending" ? "Enviando…" : "Enviar enlace"}
        </button>
      </form>
    </Centered>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      {children}
    </main>
  );
}
