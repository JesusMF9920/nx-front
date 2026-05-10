"use client";

import { useState } from "react";
import { I } from "@/components/icons";
import { Modal } from "@/components/modal";
import { fmtMXN } from "@/lib/format";
import { NEXUM_MATERIALS } from "@/lib/mock-materials";
import { NEXUM_SUPPLIERS } from "@/lib/mock-suppliers";

type Line = {
  materialId: string;
  qty: number;
  cost: number;
};

export function InventoryStockEntryModal({ onClose }: { onClose: () => void }) {
  const [supplier, setSupplier] = useState(NEXUM_SUPPLIERS[1]?.name ?? "Insumos GR");
  const [lines, setLines] = useState<Line[]>([{ materialId: "m02", qty: 50, cost: 95 }]);

  const total = lines.reduce((s, l) => s + l.qty * l.cost, 0);

  const updateLine = (i: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l, j) => (i === j ? { ...l, ...patch } : l)));

  const addLine = () =>
    setLines((ls) => [
      ...ls,
      { materialId: NEXUM_MATERIALS[0].id, qty: 1, cost: NEXUM_MATERIALS[0].cost },
    ]);

  const removeLine = (i: number) => setLines((ls) => ls.filter((_, j) => j !== i));

  return (
    <Modal
      title="Entrada de mercancía"
      onClose={onClose}
      width={760}
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn--accent" onClick={onClose}>
            {I.check} Confirmar entrada
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3.5 mb-3.5">
        <label className="field">
          <span className="label">Proveedor</span>
          <select className="input" value={supplier} onChange={(e) => setSupplier(e.target.value)}>
            {NEXUM_SUPPLIERS.map((s) => (
              <option key={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="label">Folio / Orden de compra</span>
          <input className="input" defaultValue="OC-0422" />
        </label>
      </div>

      <div className="card border border-line" style={{ boxShadow: "none" }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Insumo</th>
              <th className="text-right" style={{ width: 100 }}>Cantidad</th>
              <th className="text-right" style={{ width: 120 }}>Costo unit.</th>
              <th className="text-right" style={{ width: 120 }}>Subtotal</th>
              <th style={{ width: 40 }} />
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i}>
                <td>
                  <select
                    className="input w-full"
                    value={l.materialId}
                    onChange={(e) => {
                      const next = NEXUM_MATERIALS.find((x) => x.id === e.target.value);
                      updateLine(i, { materialId: e.target.value, cost: next?.cost ?? 0 });
                    }}
                  >
                    {NEXUM_MATERIALS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.unit})
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="number"
                    className="input num text-right"
                    value={l.qty}
                    onChange={(e) => updateLine(i, { qty: parseFloat(e.target.value || "0") })}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    className="input num text-right"
                    value={l.cost}
                    onChange={(e) => updateLine(i, { cost: parseFloat(e.target.value || "0") })}
                  />
                </td>
                <td className="num text-right font-semibold">{fmtMXN(l.qty * l.cost)}</td>
                <td>
                  <button
                    className="icon-btn"
                    onClick={() => removeLine(i)}
                    aria-label="Quitar línea"
                  >
                    {I.x}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button className="btn btn--ghost btn--sm mt-2.5" onClick={addLine}>
        {I.plus} Agregar línea
      </button>

      <div className="divider" />

      <div className="flex justify-end items-baseline gap-3.5">
        <span className="text-muted">Total entrada:</span>
        <span className="num font-semibold" style={{ fontSize: 22 }}>{fmtMXN(total)}</span>
      </div>
    </Modal>
  );
}
