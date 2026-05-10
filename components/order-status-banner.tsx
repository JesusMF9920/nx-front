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
      className="card"
      style={{ display: "grid", gridTemplateColumns: `repeat(${STAGES.length}, 1fr)`, padding: 0 }}
    >
      {STAGES.map((name, i) => {
        const done = i < currentIdx;
        const current = i === currentIdx;
        return (
          <div
            key={name}
            style={{
              padding: "14px 16px",
              borderRight: i < STAGES.length - 1 ? "1px solid var(--line)" : "0",
              background: current ? "var(--accent-soft)" : "var(--surface)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "var(--muted)",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: done ? "var(--ok)" : current ? "var(--accent)" : "var(--surface-3)",
                  color: "white",
                  fontSize: 10,
                  fontWeight: 600,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                {done ? "✓" : i + 1}
              </span>
              Etapa {i + 1}
            </div>
            <div
              style={{
                fontWeight: 600,
                marginTop: 4,
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
