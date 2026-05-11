"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { I } from "@/components/icons";
import { useAuth } from "@/lib/auth/auth-context";
import { ApiError } from "@/lib/api/errors";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const { mustChangePassword } = await login(email, pwd);
      router.replace(mustChangePassword ? "/change-password" : "/dashboard");
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.status === 401
            ? "Correo o contraseña incorrectos."
            : err.message
          : "No se pudo iniciar sesión. Intenta de nuevo.";
      setError(message);
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen grid bg-bg"
      style={{ gridTemplateColumns: "1fr 1.05fr" }}
    >
      {/* Left — form */}
      <div className="flex flex-col" style={{ padding: "32px 48px" }}>
        <div className="flex items-center gap-2">
          <div className="brand-mark">N</div>
          <div className="brand-name">
            Nexum <small>POS</small>
          </div>
        </div>

        <div className="flex-1 grid place-items-center">
          <form onSubmit={submit} className="flex flex-col gap-[18px]" style={{ width: 360 }}>
            <div>
              <h1 className="font-semibold m-0" style={{ fontSize: 26, letterSpacing: "-.02em" }}>
                Inicia sesión
              </h1>
              <div className="page-sub mt-1">
                Sistema interno de la imprenta. Contacta al administrador si no tienes acceso.
              </div>
            </div>

            <div className="field">
              <label className="label" htmlFor="email">
                Correo electrónico
              </label>
              <input
                id="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                type="email"
                required
              />
            </div>

            <div className="field">
              <div className="flex items-center">
                <label className="label" htmlFor="password">
                  Contraseña
                </label>
                <a href="#" className="help ml-auto text-accent-ink">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
              <input
                id="password"
                className="input"
                type="password"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <div
                className="rounded-md text-xs"
                style={{
                  padding: "10px 12px",
                  border: "1px solid var(--danger, #d33)",
                  color: "var(--danger, #d33)",
                  background: "rgba(211,51,51,.06)",
                }}
                role="alert"
              >
                {error}
              </div>
            )}

            <button className="btn btn--primary btn--lg" type="submit" disabled={loading}>
              {loading ? "Entrando…" : "Entrar"}
              {!loading && <span className="ml-auto">{I.arrowRight}</span>}
            </button>

            <div
              className="mt-2 rounded-md text-xs text-muted flex gap-2.5"
              style={{
                padding: "12px 14px",
                border: "1px dashed var(--line-2)",
              }}
            >
              <span className="text-accent">{I.lock}</span>
              <div>
                <div className="text-ink-2 font-medium">Acceso por roles</div>
                Cajeros, diseñadores, producción y administradores tienen vistas distintas según permisos asignados.
              </div>
            </div>
          </form>
        </div>

        <div className="flex justify-between text-muted text-xs">
          <span>v1.4.2 · Mostrador 01</span>
          <span>Soporte: soporte@nexum.mx</span>
        </div>
      </div>

      {/* Right — visual panel */}
      <div
        className="relative overflow-hidden flex flex-col"
        style={{
          background: "var(--ink)",
          color: "white",
          padding: 32,
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(transparent 95%, rgba(255,255,255,.05) 95%), linear-gradient(90deg, transparent 95%, rgba(255,255,255,.05) 95%)`,
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative mt-auto" style={{ zIndex: 1, maxWidth: 480 }}>
          <div
            className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase"
            style={{
              padding: "3px 9px",
              borderRadius: 999,
              background: "rgba(255,255,255,.08)",
              border: "1px solid rgba(255,255,255,.15)",
              letterSpacing: ".04em",
            }}
          >
            <span className="dot dot--accent" style={{ background: "#a4a4ff" }} />
            Sistema operativo
          </div>
          <h2
            className="font-medium"
            style={{ fontSize: 36, letterSpacing: "-.02em", lineHeight: 1.1, margin: "20px 0 12px" }}
          >
            Toda la imprenta,
            <br />
            desde un solo mostrador.
          </h2>
          <p
            className="text-sm m-0"
            style={{ color: "rgba(255,255,255,.7)", maxWidth: 380 }}
          >
            Cotizaciones, aprobación de diseños, producción interna y con proveedor, entregas y reportes — todo en
            Nexum POS.
          </p>

          <div className="flex gap-6 mt-8 font-mono text-xs">
            <div>
              <div className="font-medium" style={{ fontSize: 22 }}>1,842</div>
              <div style={{ color: "rgba(255,255,255,.5)" }}>pedidos / mes</div>
            </div>
            <div>
              <div className="font-medium" style={{ fontSize: 22 }}>98.2%</div>
              <div style={{ color: "rgba(255,255,255,.5)" }}>entregas a tiempo</div>
            </div>
            <div>
              <div className="font-medium" style={{ fontSize: 22 }}>3</div>
              <div style={{ color: "rgba(255,255,255,.5)" }}>sucursales</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
