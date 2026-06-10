"use client";

import { useEffect } from "react";

/**
 * Error boundary del root: atrapa errores de render fuera del shell (login,
 * /approve, etc.) y ofrece reintentar sin recargar toda la app.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Error no capturado:", error, error.digest ?? "");
  }, [error]);

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="card p-6 text-center" style={{ maxWidth: 420 }}>
        <div className="text-lg font-semibold mb-1">Algo salió mal</div>
        <p className="text-muted text-sm mb-4">
          Ocurrió un error inesperado en la aplicación. Puedes reintentar; si
          el problema persiste, contacta a soporte.
        </p>
        <button className="btn btn--accent" onClick={() => reset()}>
          Reintentar
        </button>
      </div>
    </div>
  );
}
