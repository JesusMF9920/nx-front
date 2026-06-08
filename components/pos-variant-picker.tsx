"use client";

import { useState } from "react";
import { I } from "@/components/icons";
import { Modal } from "@/components/modal";
import { fmtMXN } from "@/lib/format";
import type { ApiProductDetail, ApiProductVariant } from "@/lib/api/types";

export type VariantLineData = {
  qty: number;
  /** Orientativo — el precio autoritativo lo calcula el backend en preview/checkout. */
  price: number;
  variantLabel: string;
  /** Code real de la variante (preset/size) — requerido por el checkout. */
  variantCode?: string;
  /** Medidas crudas (dimension) — el backend deriva qty/precio. */
  dimension?: { width: number; height: number };
};

type Props = {
  product: ApiProductDetail;
  onClose: () => void;
  onAdd: (product: ApiProductDetail, line: VariantLineData) => void;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function PosVariantPicker({ product, onClose, onAdd }: Props) {
  const [selected, setSelected] = useState<ApiProductVariant | null>(null);
  const [qty, setQty] = useState(1);
  const [w, setW] = useState(2);
  const [h, setH] = useState(1);

  const isDim = product.variantType === "dimension";
  const cfg = product.dimensionConfig;
  const variants = [...product.variants].sort((a, b) => a.sortOrder - b.sortOrder);

  let lineData: VariantLineData | null = null;
  if (isDim && cfg) {
    const dimValid =
      w >= cfg.min && w <= cfg.max && h >= cfg.min && h <= cfg.max;
    if (dimValid) {
      // Espeja el cálculo del backend (orientativo): area = w*h en la unidad cruda.
      const computedQty =
        cfg.priceMode === "area"
          ? round2(w * h)
          : cfg.priceMode === "linear"
            ? round2(Math.max(w, h))
            : 1;
      let label = `${w} × ${h} ${cfg.unit}`;
      if (cfg.priceMode === "area") label += ` (${computedQty} ${cfg.unit}²)`;
      lineData = {
        qty,
        price: round2(computedQty * product.price),
        variantLabel: label,
        dimension: { width: w, height: h },
      };
    }
  } else if (selected) {
    lineData = {
      qty,
      price: round2(product.price + (selected.priceMod || 0)),
      variantLabel: selected.label,
      variantCode: selected.code,
    };
  }

  return (
    <Modal
      title={`Configurar · ${product.name}`}
      onClose={onClose}
      width={520}
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn--accent"
            disabled={!lineData}
            onClick={() => lineData && onAdd(product, lineData)}
          >
            {I.plus} Añadir al carrito
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {!isDim && (
          <div>
            <div className="label mb-2">
              {product.variantType === "size" ? "Talla" : "Variante"}
            </div>
            <div
              className="grid gap-1.5"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))" }}
            >
              {variants.map((v) => (
                <button
                  type="button"
                  key={v.code}
                  onClick={() => setSelected(v)}
                  className="py-2.5 px-2 rounded-md cursor-pointer flex flex-col gap-0.5 text-left"
                  style={{
                    border: selected?.code === v.code ? "1.5px solid var(--accent)" : "1px solid var(--line)",
                    background: selected?.code === v.code ? "var(--accent-soft)" : "var(--surface)",
                    color: selected?.code === v.code ? "var(--accent-ink)" : "var(--ink)",
                  }}
                >
                  <div className="font-medium text-[13px]">{v.label}</div>
                  <div className="num text-[11px] text-muted">
                    {v.priceMod > 0
                      ? `+${fmtMXN(v.priceMod)}`
                      : v.priceMod < 0
                        ? fmtMXN(v.priceMod)
                        : "Precio base"}
                  </div>
                  {v.stock > 0 && (
                    <div className="text-[10px] text-muted">{v.stock} en stock</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {isDim && cfg && (
          <div>
            <div className="label mb-2">Medidas ({cfg.unit})</div>
            <div className="grid grid-cols-2 gap-2.5">
              <label className="field">
                <span className="label">Ancho</span>
                <input
                  className="input num"
                  type="number"
                  value={w}
                  step={cfg.step}
                  min={cfg.min}
                  max={cfg.max}
                  onChange={(e) => setW(parseFloat(e.target.value || "0"))}
                />
              </label>
              <label className="field">
                <span className="label">Alto</span>
                <input
                  className="input num"
                  type="number"
                  value={h}
                  step={cfg.step}
                  min={cfg.min}
                  max={cfg.max}
                  onChange={(e) => setH(parseFloat(e.target.value || "0"))}
                />
              </label>
            </div>
            <div className="mt-2 text-[11px] text-muted">
              {cfg.priceMode === "area"
                ? `Precio por ${cfg.unit}²`
                : cfg.priceMode === "linear"
                  ? `Precio por ${cfg.unit} lineal`
                  : "Tarifa fija"}
              : <span className="num">{fmtMXN(product.price)}</span> · Mínimo {cfg.min}{" "}
              {cfg.unit}, máximo {cfg.max} {cfg.unit}. El precio final lo confirma el sistema al cobrar.
            </div>
          </div>
        )}

        <div className="divider" />

        <div className="flex items-center gap-3.5">
          <div>
            <div className="label mb-1">Cantidad</div>
            <div className="flex items-center border border-line rounded-md">
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                style={{ borderRadius: 0 }}
                onClick={() => setQty(Math.max(1, qty - 1))}
              >
                −
              </button>
              <input
                className="num text-center bg-transparent"
                value={qty}
                onChange={(e) => setQty(Math.max(1, parseInt(e.target.value || "1", 10)))}
                style={{ width: 60, border: 0, outline: "none", height: 28 }}
              />
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                style={{ borderRadius: 0 }}
                onClick={() => setQty(qty + 1)}
              >
                +
              </button>
            </div>
          </div>
          <div className="spacer" />
          {lineData && (
            <div className="text-right">
              <div className="text-[11px] text-muted">Subtotal de la línea</div>
              <div className="num text-lg font-semibold">
                {fmtMXN(lineData.qty * lineData.price)}
              </div>
            </div>
          )}
        </div>

        <div className="bg-surface-2 border border-line rounded-md p-2.5 text-[11px] text-muted flex gap-2 items-start">
          <span className="text-accent">{I.layers}</span>
          <div>
            Cada línea es un <strong>job independiente</strong> con su propia ficha de diseño y aprobación.
            Para añadir otra talla o variante del mismo producto, vuelve a presionar el producto en el catálogo.
          </div>
        </div>
      </div>
    </Modal>
  );
}
