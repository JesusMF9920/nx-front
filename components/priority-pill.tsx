import type { ApiOrderPriority } from "@/lib/api/types";

/**
 * Marca de prioridad. Sólo "Urgente" se muestra (pill roja): lo normal no
 * necesita ruido visual en listas/tablero. Para `normal` no renderiza nada.
 */
export function PriorityPill({ priority }: { priority: ApiOrderPriority }) {
  if (priority !== "urgent") return null;
  return (
    <span
      className="pill pill--danger"
      style={{ display: "inline-flex", gap: 3, alignItems: "center" }}
      title="Pedido urgente"
    >
      <span aria-hidden>⚡</span>
      Urgente
    </span>
  );
}
