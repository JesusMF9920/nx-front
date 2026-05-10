"use client";

import { I } from "@/components/icons";
import { Modal } from "@/components/modal";
import { NEXUM_MATERIALS } from "@/lib/mock-materials";
import { NEXUM_SUPPLIERS } from "@/lib/mock-suppliers";

const UNITS = ["pza", "m²", "kg", "ml", "hoja", "pliego", "rollo", "lt"];

export function InventoryNewMaterialModal({ onClose }: { onClose: () => void }) {
  const categories = Array.from(new Set(NEXUM_MATERIALS.map((m) => m.category)));

  return (
    <Modal
      title="Nuevo insumo"
      onClose={onClose}
      width={620}
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn--accent" onClick={onClose}>
            {I.check} Crear insumo
          </button>
        </>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <label className="field" style={{ gridColumn: "1 / -1" }}>
          <span className="label">Nombre</span>
          <input className="input" placeholder="Ej. Vinil reflejante 60cm" />
        </label>
        <label className="field">
          <span className="label">SKU</span>
          <input className="input" placeholder="MAT-…" />
        </label>
        <label className="field">
          <span className="label">Categoría</span>
          <select className="input">
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="label">Unidad</span>
          <select className="input">
            {UNITS.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="label">Costo unitario</span>
          <input className="input num" type="number" placeholder="0.00" />
        </label>
        <label className="field">
          <span className="label">Stock inicial</span>
          <input className="input num" type="number" placeholder="0" />
        </label>
        <label className="field">
          <span className="label">Punto de reorden</span>
          <input className="input num" type="number" placeholder="0" />
        </label>
        <label className="field">
          <span className="label">Ubicación</span>
          <input className="input" placeholder="Estante / bodega" />
        </label>
        <label className="field">
          <span className="label">Proveedor preferido</span>
          <select className="input">
            {NEXUM_SUPPLIERS.map((s) => (
              <option key={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
      </div>
    </Modal>
  );
}
