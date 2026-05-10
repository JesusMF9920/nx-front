"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { I } from "@/components/icons";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("mariana@nexum.mx");
  const [pwd, setPwd] = useState("••••••••");
  const [loading, setLoading] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      router.push("/dashboard");
    }, 500);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "1fr 1.05fr",
        background: "var(--bg)",
      }}
    >
      {/* Left — form */}
      <div style={{ display: "flex", flexDirection: "column", padding: "32px 48px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="brand-mark">N</div>
          <div className="brand-name">
            Nexum <small>POS</small>
          </div>
        </div>

        <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
          <form onSubmit={submit} style={{ width: 360, display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-.02em", margin: 0 }}>Inicia sesión</h1>
              <div className="page-sub" style={{ marginTop: 4 }}>
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
              />
            </div>

            <div className="field">
              <div style={{ display: "flex", alignItems: "center" }}>
                <label className="label" htmlFor="password">
                  Contraseña
                </label>
                <a href="#" className="help" style={{ marginLeft: "auto", color: "var(--accent-ink)" }}>
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
              />
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ink-2)" }}>
              <input type="checkbox" defaultChecked />
              Mantener sesión iniciada en este equipo
            </label>

            <button className="btn btn--primary btn--lg" type="submit" disabled={loading}>
              {loading ? "Entrando…" : "Entrar"}
              {!loading && <span style={{ marginLeft: "auto" }}>{I.arrowRight}</span>}
            </button>

            <div
              style={{
                marginTop: 8,
                padding: "12px 14px",
                border: "1px dashed var(--line-2)",
                borderRadius: "var(--r-md)",
                fontSize: 12,
                color: "var(--muted)",
                display: "flex",
                gap: 10,
              }}
            >
              <span style={{ color: "var(--accent)" }}>{I.lock}</span>
              <div>
                <div style={{ color: "var(--ink-2)", fontWeight: 500 }}>Acceso por roles</div>
                Cajeros, diseñadores, producción y administradores tienen vistas distintas según permisos asignados.
              </div>
            </div>
          </form>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", color: "var(--muted)", fontSize: 12 }}>
          <span>v1.4.2 · Mostrador 01</span>
          <span>Soporte: soporte@nexum.mx</span>
        </div>
      </div>

      {/* Right — visual panel */}
      <div
        style={{
          background: "var(--ink)",
          color: "white",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          padding: "32px",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `linear-gradient(transparent 95%, rgba(255,255,255,.05) 95%), linear-gradient(90deg, transparent 95%, rgba(255,255,255,.05) 95%)`,
            backgroundSize: "32px 32px",
          }}
        />

        <div style={{ position: "relative", zIndex: 1, marginTop: "auto", maxWidth: 480 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "3px 9px",
              borderRadius: 999,
              background: "rgba(255,255,255,.08)",
              border: "1px solid rgba(255,255,255,.15)",
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              letterSpacing: ".04em",
              textTransform: "uppercase",
            }}
          >
            <span className="dot dot--accent" style={{ background: "#a4a4ff" }} />
            Sistema operativo
          </div>
          <h2 style={{ fontSize: 36, fontWeight: 500, letterSpacing: "-.02em", lineHeight: 1.1, margin: "20px 0 12px" }}>
            Toda la imprenta,
            <br />
            desde un solo mostrador.
          </h2>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,.7)", margin: 0, maxWidth: 380 }}>
            Cotizaciones, aprobación de diseños, producción interna y con proveedor, entregas y reportes — todo en
            Nexum POS.
          </p>

          <div style={{ display: "flex", gap: 24, marginTop: 32, fontFamily: "var(--font-mono)", fontSize: 12 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 500 }}>1,842</div>
              <div style={{ color: "rgba(255,255,255,.5)" }}>pedidos / mes</div>
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 500 }}>98.2%</div>
              <div style={{ color: "rgba(255,255,255,.5)" }}>entregas a tiempo</div>
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 500 }}>3</div>
              <div style={{ color: "rgba(255,255,255,.5)" }}>sucursales</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
