"use client";

import { useState } from "react";
import { I } from "@/components/icons";
import { Modal } from "@/components/modal";
import { fmtMXN } from "@/lib/format";
import { NEXUM_MATERIALS } from "@/lib/mock-materials";
import { NEXUM_SUPPLIERS } from "@/lib/mock-suppliers";

type DraftLine = { materialId: string; qty: number; cost: number };

export function PurchaseNewModal({ onClose }: { onClose: () => void }) {
  const [supplier, setSupplier] = useState(NEXUM_SUPPLIERS[0].name);
  const [lines, setLines] = useState<DraftLine[]>([
    { materialId: NEXUM_MATERIALS[0].id, qty: 50, cost: NEXUM_MATERIALS[0].cost },
  ]);

  const update = (i: number, p: Partial<DraftLine>) =>
    setLines((ls) => ls.map((l, j) => (i === j ? { ...l, ...p } : l)));

  const add = () =>
    setLines((ls) => [
      ...ls,
      { materialId: NEXUM_MATERIALS[0].id, qty: 1, cost: NEXUM_MATERIALS[0].cost },
    ]);

  const remove = (i: number) => setLines((ls) => ls.filter((_, j) => j !== i));
  const total = lines.reduce((s, l) => s + l.qty * l.cost, 0);

  return (
    <Modal
      title="Nueva orden de compra"
      onClose={onClose}
      width={780}
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button className="btn" onClick={onClose}>{I.copy} Guardar borrador</button>
          <button className="btn btn--accent" onClick={onClose}>{I.whatsapp} Enviar OC</button>
        </>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
        <label className="field">
          <span className="label">Proveedor</span>
          <select className="input" value={supplier} onChange={(e) => setSupplier(e.target.value)}>
            {NEXUM_SUPPLIERS.map((s) => (
              <option key={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="label">Fecha esperada</span>
          <input className="input" type="date" defaultValue="2026-05-15" />
        </label>
        <label className="field">
          <span className="label">Para pedido (opcional)</span>
          <input className="input" placeholder="ORD-…" />
        </label>
      </div>

      <div className="card" style={{ boxShadow: "none", border: "1px solid var(--line)" }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Insumo</th>
              <th style={{ width: 90, textAlign: "right" }}>Cantidad</th>
              <th style={{ width: 110, textAlign: "right" }}>Costo unit.</th>
              <th style={{ width: 120, textAlign: "right" }}>Subtotal</th>
              <th style={{ width: 40 }} />
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i}>
                <td>
                  <select
                    className="input"
                    style={{ width: "100%" }}
                    value={l.materialId}
                    onChange={(e) => {
                      const m = NEXUM_MATERIALS.find((x) => x.id === e.target.value);
                      update(i, { materialId: e.target.value, cost: m?.cost ?? 0 });
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
                    className="input num"
                    style={{ textAlign: "right" }}
                    value={l.qty}
                    onChange={(e) => update(i, { qty: parseFloat(e.target.value || "0") })}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    className="input num"
                    style={{ textAlign: "right" }}
                    value={l.cost}
                    onChange={(e) => update(i, { cost: parseFloat(e.target.value || "0") })}
                  />
                </td>
                <td className="num" style={{ textAlign: "right", fontWeight: 600 }}>
                  {fmtMXN(l.qty * l.cost)}
                </td>
                <td>
                  <button className="icon-btn" onClick={() => remove(i)} aria-label="Quitar línea">
                    {I.x}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="btn btn--sm btn--ghost" onClick={add} style={{ marginTop: 10 }}>
        {I.plus} Agregar línea
      </button>

      <div className="divider" />
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "baseline", gap: 14 }}>
        <span style={{ color: "var(--muted)" }}>Total OC:</span>
        <span className="num" style={{ fontSize: 22, fontWeight: 600 }}>{fmtMXN(total)}</span>
      </div>
    </Modal>
  );
}
