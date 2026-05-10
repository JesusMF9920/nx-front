"use client";

import { useState } from "react";
import { I } from "@/components/icons";
import { Modal } from "@/components/modal";
import { NEXUM_MATERIALS } from "@/lib/mock-materials";

const REASONS = [
  "Merma / desperdicio",
  "Conteo físico",
  "Producto dañado",
  "Devolución a proveedor",
  "Otro",
];

export function InventoryStockAdjustModal({ onClose }: { onClose: () => void }) {
  const [materialId, setMaterialId] = useState(NEXUM_MATERIALS[0].id);
  const [delta, setDelta] = useState(-1);
  const [reason, setReason] = useState(REASONS[0]);
  const m = NEXUM_MATERIALS.find((x) => x.id === materialId)!;

  return (
    <Modal
      title="Ajuste de inventario"
      onClose={onClose}
      width={520}
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn--accent" onClick={onClose}>
            {I.check} Aplicar ajuste
          </button>
        </>
      }
    >
      <label className="field">
        <span className="label">Insumo</span>
        <select className="input" value={materialId} onChange={(e) => setMaterialId(e.target.value)}>
          {NEXUM_MATERIALS.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3.5 mt-3">
        <div className="bg-surface-2 border border-line rounded-md p-3">
          <div className="label">Stock actual</div>
          <div className="num font-semibold" style={{ fontSize: 24 }}>
            {m.stock}{" "}
            <span className="text-xs text-muted font-normal">{m.unit}</span>
          </div>
        </div>
        <div className="bg-accent-soft border border-line rounded-md p-3">
          <div className="label">Stock resultante</div>
          <div className="num font-semibold text-accent-ink" style={{ fontSize: 24 }}>
            {m.stock + delta}{" "}
            <span className="text-xs text-muted font-normal">{m.unit}</span>
          </div>
        </div>
      </div>

      <label className="field mt-3">
        <span className="label">Diferencia (+/−)</span>
        <input
          type="number"
          className="input num"
          value={delta}
          onChange={(e) => setDelta(parseFloat(e.target.value || "0"))}
        />
      </label>

      <label className="field mt-3">
        <span className="label">Motivo</span>
        <select className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
          {REASONS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </label>

      <label className="field mt-3">
        <span className="label">Nota</span>
        <input className="input" placeholder="Detalles del ajuste" />
      </label>
    </Modal>
  );
}
