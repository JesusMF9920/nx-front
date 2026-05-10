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
      <div className="text-xs text-muted mb-3">
        {materials.length} insumos por debajo del punto de reorden. Se generará una OC borrador por proveedor.
      </div>
      {Object.entries(bySupplier).map(([sup, mats]) => {
        const total = mats.reduce((s, m) => s + m.suggested * m.cost, 0);
        return (
          <div
            key={sup}
            className="border border-line rounded-md mb-2.5 overflow-hidden"
          >
            <div className="px-3.5 py-2.5 bg-surface-2 flex items-center gap-2.5">
              <strong>{sup}</strong>
              <span className="tag text-[10px]">{mats.length} insumos</span>
              <div className="spacer" />
              <span className="num font-semibold">{fmtMXN(total)}</span>
            </div>
            {mats.map((m) => (
              <div
                key={m.id}
                className="flex px-3.5 py-2 text-xs items-center gap-2.5"
                style={{ borderTop: "1px solid var(--line)" }}
              >
                <input type="checkbox" defaultChecked />
                <div className="flex-1">
                  <div className="font-medium">{m.name}</div>
                  <div className="text-muted text-[10px]">
                    Stock <span className="num">{m.stock}</span> · Reorden{" "}
                    <span className="num">{m.reorder}</span> {m.unit}
                  </div>
                </div>
                <div className="num">
                  {m.suggested} {m.unit}
                </div>
                <div className="num text-right font-semibold" style={{ width: 80 }}>
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
