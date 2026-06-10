"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { authApi } from "@/lib/api/auth";

/**
 * Página PÚBLICA: pedir el enlace de restablecimiento. SIEMPRE muestra el
 * mismo mensaje exista o no la cuenta (anti-enumeración, espejo del backend).
 */
export default function PasswordResetRequestPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      await authApi.requestPasswordReset(email.trim());
    } catch {
      // Mismo mensaje aunque falle: no filtrar nada al exterior.
    }
    setSent(true);
    setLoading(false);
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
            Recuperar contraseña
          </h1>
          <div className="page-sub mt-1">
            Escribe el correo de tu cuenta y te enviaremos un enlace para
            restablecerla.
          </div>
        </div>

        {sent ? (
          <div
            className="rounded-md text-sm"
            style={{
              padding: "12px 14px",
              border: "1px solid var(--line)",
              background: "var(--surface-2)",
            }}
            role="status"
          >
            Si existe una cuenta con ese correo, te enviamos un enlace para
            restablecer la contraseña. Revisa tu bandeja (y el spam).
          </div>
        ) : (
          <>
            <div className="field">
              <label className="label" htmlFor="email">
                Correo electrónico
              </label>
              <input
                id="email"
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <button className="btn btn--accent w-full" disabled={loading}>
              {loading ? "Enviando…" : "Enviar enlace"}
            </button>
          </>
        )}

        <Link href="/login" className="help text-accent-ink no-underline">
          ← Volver a iniciar sesión
        </Link>
      </form>
    </div>
  );
}
