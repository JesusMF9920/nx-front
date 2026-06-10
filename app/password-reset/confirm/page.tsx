"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";

import { authApi } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/errors";

/**
 * Página PÚBLICA donde aterriza el link del correo de reset
 * (/password-reset/confirm?token=...). useSearchParams exige un boundary de
 * Suspense en Next 16 — por eso el wrapper.
 */
export default function PasswordResetConfirmPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmForm />
    </Suspense>
  );
}

function ConfirmForm() {
  const token = useSearchParams().get("token") ?? "";
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    if (newPwd.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (newPwd !== confirmPwd) {
      setError("La contraseña y su confirmación no coinciden.");
      return;
    }
    setLoading(true);
    try {
      await authApi.confirmPasswordReset(token, newPwd);
      setDone(true);
    } catch (err) {
      setError(
        err instanceof ApiError && err.status !== 500
          ? "El enlace ya no es válido (venció o ya se usó). Solicita uno nuevo."
          : "No se pudo restablecer la contraseña. Intenta de nuevo.",
      );
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen grid place-items-center bg-bg"
      style={{ padding: 24 }}
    >
      <form
        onSubmit={submit}
        className="flex flex-col gap-[18px] bg-surface"
        style={{
          width: 380,
          padding: 32,
          borderRadius: 14,
          border: "1px solid var(--line)",
          boxShadow: "var(--sh-md)",
        }}
      >
        <div className="flex items-center gap-2">
          <div className="brand-mark">N</div>
          <div className="brand-name">
            Nexum <small>POS</small>
          </div>
        </div>

        <div>
          <h1
            className="font-semibold m-0"
            style={{ fontSize: 22, letterSpacing: "-.02em" }}
          >
            Nueva contraseña
          </h1>
          <div className="page-sub mt-1">
            Elige la nueva contraseña de tu cuenta.
          </div>
        </div>

        {done ? (
          <>
            <div
              className="rounded-md text-sm"
              style={{
                padding: "12px 14px",
                border: "1px solid var(--ok)",
                background: "var(--ok-soft)",
              }}
              role="status"
            >
              Tu contraseña fue restablecida. Ya puedes iniciar sesión.
            </div>
            <Link href="/login" className="btn btn--accent w-full text-center">
              Iniciar sesión
            </Link>
          </>
        ) : !token ? (
          <>
            <div
              className="rounded-md text-sm"
              style={{
                padding: "12px 14px",
                border: "1px solid var(--danger)",
                color: "var(--danger)",
                background: "var(--danger-soft)",
              }}
              role="alert"
            >
              Falta el token del enlace. Abre el enlace completo desde tu
              correo o solicita uno nuevo.
            </div>
            <Link
              href="/password-reset"
              className="help text-accent-ink no-underline"
            >
              Solicitar un enlace nuevo
            </Link>
          </>
        ) : (
          <>
            <div className="field">
              <label className="label" htmlFor="new">
                Nueva contraseña
              </label>
              <input
                id="new"
                className="input"
                type="password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
              <small className="help mt-1">Mínimo 8 caracteres.</small>
            </div>
            <div className="field">
              <label className="label" htmlFor="confirm">
                Confirmar contraseña
              </label>
              <input
                id="confirm"
                className="input"
                type="password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            {error && (
              <div
                className="rounded-md text-sm"
                style={{
                  padding: "12px 14px",
                  border: "1px solid var(--danger)",
                  color: "var(--danger)",
                  background: "var(--danger-soft)",
                }}
                role="alert"
              >
                {error}{" "}
                <Link href="/password-reset" className="text-accent-ink">
                  Solicitar otro enlace
                </Link>
              </div>
            )}
            <button className="btn btn--accent w-full" disabled={loading}>
              {loading ? "Guardando…" : "Restablecer contraseña"}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
