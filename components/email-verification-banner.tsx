"use client";

import { useState } from "react";
import { I } from "@/components/icons";
import { authApi } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/errors";
import { useAuth } from "@/lib/auth/auth-context";

/**
 * Aviso para el usuario autenticado con el correo aún sin verificar. Permite
 * reenviar el correo de verificación (POST /auth/verify-email/request) sin
 * salir de la app. Se oculta solo si el correo ya está verificado.
 */
export function EmailVerificationBanner() {
  const { user } = useAuth();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  if (!user || user.emailVerifiedAt !== null || dismissed) return null;

  const resend = async () => {
    if (sending) return;
    setSending(true);
    setError(null);
    try {
      await authApi.requestEmailVerification();
      setSent(true);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudo reenviar el correo. Intenta de nuevo.",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="card mb-4 flex items-center gap-3"
      style={{ padding: "10px 14px", border: "1px solid var(--warn)" }}
      role="status"
    >
      <span className="flex-1 text-sm">
        {sent ? (
          <>
            Te enviamos un correo de verificación a{" "}
            <strong>{user.email}</strong>. Revisa tu bandeja.
          </>
        ) : (
          <>
            Verifica tu correo <strong>{user.email}</strong> para asegurar tu
            cuenta.
          </>
        )}
        {error && <span style={{ color: "var(--danger)" }}> · {error}</span>}
      </span>
      {!sent && (
        <button
          className="btn btn--sm"
          type="button"
          onClick={resend}
          disabled={sending}
        >
          {sending ? "Enviando…" : "Reenviar verificación"}
        </button>
      )}
      <button
        className="icon-btn"
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Ocultar"
        title="Ocultar"
      >
        {I.x}
      </button>
    </div>
  );
}
