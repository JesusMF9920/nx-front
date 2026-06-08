import type { ApiOrderStatus } from "@/lib/api/types";
import { fmtDateLong } from "@/lib/format";

const STAGES = ["Vendido", "En diseño", "Aprobado", "En producción", "Entregado"] as const;

const STATUS_TO_STEP: Record<Exclude<ApiOrderStatus, "cancelled">, number> = {
  pending: 0,
  in_design: 1,
  client_approval: 2,
  production: 3,
  with_supplier: 3,
  ready_for_delivery: 4,
  delivered: 5,
};

export function OrderStatusBanner({
  status,
  cancelledAt,
}: {
  status: ApiOrderStatus;
  cancelledAt?: string | null;
}) {
  if (status === "cancelled") {
    return (
      <div
        className="card p-0 overflow-hidden"
        role="status"
        style={{ borderColor: "var(--danger)" }}
      >
        <div
          className="px-4 py-3.5 flex items-center gap-2.5"
          style={{ background: "var(--danger-soft)", color: "var(--danger)" }}
        >
          <span
            className="rounded-full grid place-items-center text-white text-[10px] font-semibold"
            style={{ width: 18, height: 18, background: "var(--danger)" }}
          >
            ✕
          </span>
          <div>
            <div className="text-[11px]" style={{ opacity: 0.8 }}>
              Pedido cancelado
            </div>
            <div className="font-semibold">
              Cancelada
              {cancelledAt ? ` · ${fmtDateLong(cancelledAt)}` : ""}
            </div>
          </div>
        </div>
      </div>
    );
  }

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
