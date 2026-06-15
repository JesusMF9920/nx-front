"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { meApi } from "@/lib/api/me";
import { ApiError } from "@/lib/api/errors";
import { useAuth } from "@/lib/auth/auth-context";

export default function ChangePasswordPage() {
  const router = useRouter();
  const { status, user, mustChangePassword, logout } = useAuth();

  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    if (newPwd.length < 8) {
      setError("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (newPwd !== confirmPwd) {
      setError("La nueva contraseña y su confirmación no coinciden.");
      return;
    }
    setLoading(true);
    try {
      await meApi.changePassword({
        currentPassword: currentPwd,
        newPassword: newPwd,
      });
      // Cambiar la contraseña revoca la sesión (refresh tokens) y el access
      // token actual trae el flag stale; re-loguear emite uno fresco que el
      // guard ya deja pasar. Salir y volver a /login.
      await logout();
      router.replace("/login?passwordChanged=1");
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.status === 401
            ? "La contraseña actual no es correcta."
            : err.message
          : "No se pudo cambiar la contraseña. Intenta de nuevo.";
      setError(message);
      setLoading(false);
    }
  };

  if (status === "loading" || status === "unauthenticated") {
    return null;
  }

  return (
    <div className="min-h-screen grid place-items-center bg-bg" style={{ padding: 24 }}>
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
          <h1 className="font-semibold m-0" style={{ fontSize: 22, letterSpacing: "-.02em" }}>
            {mustChangePassword ? "Cambia tu contraseña" : "Actualizar contraseña"}
          </h1>
          <div className="page-sub mt-1">
            {mustChangePassword
              ? "Tu administrador estableció una contraseña temporal. Ingrésala como contraseña actual y elige una nueva para continuar."
              : "Elige una nueva contraseña para tu cuenta."}
          </div>
          {user && (
            <div className="text-xs text-muted mt-1">
              Sesión: <span className="font-medium text-ink-2">{user.email}</span>
            </div>
          )}
        </div>

        <div className="field">
          <label className="label" htmlFor="current">
            Contraseña actual
          </label>
          <input
            id="current"
            className="input"
            type="password"
            value={currentPwd}
            onChange={(e) => setCurrentPwd(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

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
            Confirmar nueva contraseña
          </label>
          <input
            id="confirm"
            className="input"
            type="password"
            value={confirmPwd}
            onChange={(e) => setConfirmPwd(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>

        {error && (
          <div
            className="rounded-md text-xs"
            style={{
              padding: "10px 12px",
              border: "1px solid var(--danger)",
              color: "var(--danger)",
              background: "var(--danger-soft)",
            }}
            role="alert"
          >
            {error}
          </div>
        )}

        <button className="btn btn--primary btn--lg" type="submit" disabled={loading}>
          {loading ? "Guardando…" : "Guardar contraseña"}
        </button>

        {!mustChangePassword && (
          <button
            type="button"
            className="text-xs text-muted text-center"
            style={{ background: "none", border: 0, cursor: "pointer" }}
            onClick={() => router.back()}
          >
            Cancelar y volver
          </button>
        )}
      </form>
    </div>
  );
}
