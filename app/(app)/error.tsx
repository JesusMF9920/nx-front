"use client";

import { useEffect } from "react";

/**
 * Error boundary del shell autenticado: el sidebar/topbar sobreviven — sólo
 * el contenido de la página cae y se puede reintentar en su lugar.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Error no capturado en la página:", error, error.digest ?? "");
  }, [error]);

  return (
    <div className="card p-6 m-4 text-center">
      <div className="text-lg font-semibold mb-1">
        Esta pantalla tuvo un problema
      </div>
      <p className="text-muted text-sm mb-4">
        El resto del sistema sigue funcionando. Reintenta, o navega a otra
        sección desde el menú.
      </p>
      <button className="btn btn--accent" onClick={() => reset()}>
        Reintentar
      </button>
    </div>
  );
}
