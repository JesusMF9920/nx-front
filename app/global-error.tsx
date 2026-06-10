"use client";

import { useEffect } from "react";

/**
 * Último recurso: errores en el ROOT LAYOUT mismo. Renderiza html/body
 * propios y no asume que globals.css cargó — estilos inline mínimos.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Error fatal:", error, error.digest ?? "");
  }, [error]);

  return (
    <html lang="es-MX">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#faf8f5",
          color: "#1c1917",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 420, padding: 24 }}>
          <h1 style={{ fontSize: 18, marginBottom: 8 }}>Algo salió mal</h1>
          <p style={{ fontSize: 14, color: "#78716c", marginBottom: 16 }}>
            La aplicación tuvo un error fatal. Reintenta o recarga la página.
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid #d6d3d1",
              background: "#1c1917",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
