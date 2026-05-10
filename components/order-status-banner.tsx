import type { OrderStatus } from "@/lib/types";

const STAGES = ["Vendido", "En diseño", "Aprobado", "En producción", "Entregado"] as const;

const STATUS_TO_STEP: Record<OrderStatus, number> = {
  Pendiente: 0,
  "En diseño": 1,
  "Aprobación cliente": 2,
  Producción: 3,
  "Con proveedor": 3,
  "Listo para entrega": 4,
  Entregado: 5,
};

export function OrderStatusBanner({ status }: { status: OrderStatus }) {
  const currentIdx = STATUS_TO_STEP[status];
  return (
    <div
      className="card grid p-0"
      style={{ gridTemplateColumns: `repeat(${STAGES.length}, 1fr)` }}
    >
      {STAGES.map((name, i) => {
        const done = i < currentIdx;
        const current = i === currentIdx;
        return (
          <div
            key={name}
            className="px-4 py-3.5"
            style={{
              borderRight: i < STAGES.length - 1 ? "1px solid var(--line)" : "0",
              background: current ? "var(--accent-soft)" : "var(--surface)",
            }}
          >
            <div className="text-[11px] text-muted flex items-center gap-1.5">
              <span
                className="rounded-full grid place-items-center text-white text-[10px] font-semibold"
                style={{
                  width: 18,
                  height: 18,
                  background: done ? "var(--ok)" : current ? "var(--accent)" : "var(--surface-3)",
                }}
              >
                {done ? "✓" : i + 1}
              </span>
              Etapa {i + 1}
            </div>
            <div
              className="font-semibold mt-1"
              style={{
                color: current ? "var(--accent-ink)" : done ? "var(--ink)" : "var(--muted)",
              }}
            >
              {name}
            </div>
          </div>
        );
      })}
    </div>
  );
}
