import { I } from "@/components/icons";
import { Modal } from "@/components/modal";
import { fmtMXN } from "@/lib/format";
import type { Material } from "@/lib/types";

export function PurchaseSuggestedModal({
  materials,
  onClose,
}: {
  materials: Material[];
  onClose: () => void;
}) {
  const bySupplier: Record<string, Array<Material & { suggested: number }>> = {};
  materials.forEach((m) => {
    const sup = m.supplierName || "Sin proveedor";
    if (!bySupplier[sup]) bySupplier[sup] = [];
    const suggested = Math.max(m.reorder * 2 - m.stock, m.reorder);
    bySupplier[sup].push({ ...m, suggested });
  });

  return (
    <Modal
      title="Órdenes de compra sugeridas"
      onClose={onClose}
      width={720}
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose}>Cerrar</button>
          <button className="btn btn--accent" onClick={onClose}>
            {I.check} Generar {Object.keys(bySupplier).length} OC
          </button>
        </>
      }
    >
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>
        {materials.length} insumos por debajo del punto de reorden. Se generará una OC borrador por proveedor.
      </div>
      {Object.entries(bySupplier).map(([sup, mats]) => {
        const total = mats.reduce((s, m) => s + m.suggested * m.cost, 0);
        return (
          <div
            key={sup}
            style={{
              border: "1px solid var(--line)",
              borderRadius: "var(--r-md)",
              marginBottom: 10,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "10px 14px",
                background: "var(--surface-2)",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <strong>{sup}</strong>
              <span className="tag" style={{ fontSize: 10 }}>{mats.length} insumos</span>
              <div className="spacer" />
              <span className="num" style={{ fontWeight: 600 }}>{fmtMXN(total)}</span>
            </div>
            {mats.map((m) => (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  padding: "8px 14px",
                  borderTop: "1px solid var(--line)",
                  fontSize: 12,
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <input type="checkbox" defaultChecked />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{m.name}</div>
                  <div style={{ color: "var(--muted)", fontSize: 10 }}>
                    Stock <span className="num">{m.stock}</span> · Reorden{" "}
                    <span className="num">{m.reorder}</span> {m.unit}
                  </div>
                </div>
                <div className="num">
                  {m.suggested} {m.unit}
                </div>
                <div className="num" style={{ width: 80, textAlign: "right", fontWeight: 600 }}>
                  {fmtMXN(m.suggested * m.cost)}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </Modal>
  );
}
