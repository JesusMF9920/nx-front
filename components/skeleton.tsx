import type { CSSProperties } from "react";

type SkeletonProps = {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  className?: string;
  style?: CSSProperties;
};

/**
 * Bloque base de carga (shimmer). Es `aria-hidden`: la semántica de "cargando"
 * la pone el contenedor (`SkeletonTable`/`SkeletonText`) con `role="status"`.
 */
export function Skeleton({
  width = "100%",
  height = 14,
  radius = "var(--r-md)",
  className = "",
  style,
}: SkeletonProps) {
  return (
    <span
      className={`skeleton ${className}`.trim()}
      style={{ width, height, borderRadius: radius, ...style }}
      aria-hidden="true"
    />
  );
}

/** Esqueleto de tabla: `rows`×`cols` celdas. Anuncia "Cargando…" a lectores. */
export function SkeletonTable({
  rows = 6,
  cols = 4,
  className = "",
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) {
  return (
    <div
      className={`skeleton-table ${className}`.trim()}
      role="status"
      aria-busy="true"
    >
      <span className="sr-only">Cargando…</span>
      {Array.from({ length: rows }).map((_, r) => (
        <div className="skeleton-table__row" key={r} aria-hidden="true">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton
              key={c}
              height={12}
              // La primera columna un poco más ancha (suele ser el nombre).
              width={c === 0 ? "40%" : "70%"}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Varias líneas de texto de distinto ancho (para cards / detalles). */
export function SkeletonText({
  lines = 3,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  const widths = ["90%", "75%", "82%", "60%", "70%"];
  return (
    <div
      className={`skeleton-text ${className}`.trim()}
      role="status"
      aria-busy="true"
    >
      <span className="sr-only">Cargando…</span>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height={12} width={widths[i % widths.length]} />
      ))}
    </div>
  );
}
