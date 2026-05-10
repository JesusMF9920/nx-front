"use client";

import { useState } from "react";
import { I } from "@/components/icons";
import { Modal } from "@/components/modal";
import { fmtMXN } from "@/lib/format";
import type { Product, Variant } from "@/lib/types";

export type VariantLineData = {
  qty: number;
  price: number;
  variantLabel: string;
};

type Props = {
  product: Product;
  onClose: () => void;
  onAdd: (product: Product, line: VariantLineData) => void;
};

export function PosVariantPicker({ product, onClose, onAdd }: Props) {
  const [selected, setSelected] = useState<Variant | null>(null);
  const [qty, setQty] = useState(1);
  const [w, setW] = useState(2);
  const [h, setH] = useState(1);

  const isDim = product.variantType === "dimension";
  const cfg = product.dimensionConfig;

  let lineData: VariantLineData | null = null;
  if (isDim && cfg) {
    const area = w * h * (cfg.unit === "cm" ? 0.0001 : 1);
    const price = Math.max(product.price, product.price * area);
    lineData = {
      qty,
      price: Math.round(price),
      variantLabel: `${w} × ${h} ${cfg.unit} (${area.toFixed(2)} m²)`,
    };
  } else if (selected) {
    lineData = {
      qty,
      price: product.price + (selected.priceMod || 0),
      variantLabel: selected.label,
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
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {!isDim && (
          <div>
            <div className="label" style={{ marginBottom: 8 }}>
              {product.variantType === "size" ? "Talla" : "Variante"}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))",
                gap: 6,
              }}
            >
              {(product.variants ?? []).map((v) => (
                <button
                  type="button"
                  key={v.id}
                  onClick={() => setSelected(v)}
                  style={{
                    border: selected?.id === v.id ? "1.5px solid var(--accent)" : "1px solid var(--line)",
                    background: selected?.id === v.id ? "var(--accent-soft)" : "var(--surface)",
                    padding: "10px 8px",
                    borderRadius: "var(--r-md)",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    textAlign: "left",
                    color: selected?.id === v.id ? "var(--accent-ink)" : "var(--ink)",
                  }}
                >
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{v.label}</div>
                  <div className="num" style={{ fontSize: 11, color: "var(--muted)" }}>
                    {v.priceMod > 0
                      ? `+${fmtMXN(v.priceMod)}`
                      : v.priceMod < 0
                        ? fmtMXN(v.priceMod)
                        : "Precio base"}
                  </div>
                  {v.stock > 0 && (
                    <div style={{ fontSize: 10, color: "var(--muted)" }}>{v.stock} en stock</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {isDim && cfg && (
          <div>
            <div className="label" style={{ marginBottom: 8 }}>Medidas ({cfg.unit})</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
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
            <div style={{ marginTop: 8, fontSize: 11, color: "var(--muted)" }}>
              Precio por m²: <span className="num">{fmtMXN(product.price)}</span> · Mínimo {cfg.min}{" "}
              {cfg.unit}, máximo {cfg.max} {cfg.unit}.
            </div>
          </div>
        )}

        <div className="divider" />

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div>
            <div className="label" style={{ marginBottom: 4 }}>Cantidad</div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                border: "1px solid var(--line)",
                borderRadius: "var(--r-md)",
              }}
            >
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                style={{ borderRadius: 0 }}
                onClick={() => setQty(Math.max(1, qty - 1))}
              >
                −
              </button>
              <input
                className="num"
                value={qty}
                onChange={(e) => setQty(Math.max(1, parseInt(e.target.value || "1", 10)))}
                style={{
                  width: 60,
                  textAlign: "center",
                  border: 0,
                  outline: "none",
                  height: 28,
                  background: "transparent",
                }}
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
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>Subtotal de la línea</div>
              <div className="num" style={{ fontSize: 18, fontWeight: 600 }}>
                {fmtMXN(lineData.qty * lineData.price)}
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-md)",
            padding: 10,
            fontSize: 11,
            color: "var(--muted)",
            display: "flex",
            gap: 8,
            alignItems: "flex-start",
          }}
        >
          <span style={{ color: "var(--accent)" }}>{I.layers}</span>
          <div>
            Cada línea es un <strong>job independiente</strong> con su propia ficha de diseño y aprobación.
            Para añadir otra talla o variante del mismo producto, vuelve a presionar el producto en el catálogo.
          </div>
        </div>
      </div>
    </Modal>
  );
}
