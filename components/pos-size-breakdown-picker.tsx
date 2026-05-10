"use client";

import { useState } from "react";
import { I } from "@/components/icons";
import { Modal } from "@/components/modal";
import { fmtMXN } from "@/lib/format";
import { NEXUM_MATERIALS } from "@/lib/mock-materials";
import type { Product, SizeBreakdownEntry } from "@/lib/types";

export type SizeBreakdownLineData = {
  qty: number;
  price: number;
  sizeBreakdown: SizeBreakdownEntry[];
};

type Props = {
  product: Product;
  editLineId?: string;
  editBreakdown?: SizeBreakdownEntry[];
  onClose: () => void;
  onAdd: (product: Product, line: SizeBreakdownLineData, editLineId?: string) => void;
};

export function PosSizeBreakdownPicker({ product, editLineId, editBreakdown, onClose, onAdd }: Props) {
  const material = NEXUM_MATERIALS.find((m) => m.id === product.sizedFromMaterial);
  const sizes = material?.variants ?? [];
  const surcharges = product.sizeSurcharges ?? {};

  const initial: Record<string, number> = editBreakdown
    ? Object.fromEntries(editBreakdown.map((b) => [b.sizeId, b.qty]))
    : Object.fromEntries(sizes.map((s) => [s.id, 0]));

  const [qtys, setQtys] = useState<Record<string, number>>(initial);

  const totalQty = Object.values(qtys).reduce((a, b) => a + (b || 0), 0);
  const lineSubtotal = sizes.reduce((s, sz) => {
    const q = qtys[sz.id] ?? 0;
    return s + q * (product.price + (surcharges[sz.id] ?? 0));
  }, 0);

  const setQty = (id: string, q: number) =>
    setQtys((prev) => ({ ...prev, [id]: Math.max(0, q) }));

  const submit = () => {
    if (totalQty === 0) return;
    const breakdown: SizeBreakdownEntry[] = sizes
      .map((sz) => ({
        sizeId: sz.id,
        qty: qtys[sz.id] ?? 0,
        surcharge: surcharges[sz.id] ?? 0,
      }))
      .filter((b) => b.qty > 0);
    onAdd(product, { qty: totalQty, price: product.price, sizeBreakdown: breakdown }, editLineId);
  };

  return (
    <Modal title={`${editLineId ? "Editar" : "Configurar"} · ${product.name}`} onClose={onClose} width={680}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "var(--muted)" }}>
          <span style={{ color: "var(--accent)" }}>{I.layers}</span>
          <div>
            Las tallas vienen del insumo <strong style={{ color: "var(--ink)" }}>{material?.name}</strong>.
            Stock se descuenta por talla.
          </div>
        </div>

        <div style={{ border: "1px solid var(--line)", borderRadius: "var(--r-md)", overflow: "hidden" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "80px 1fr 110px 110px 130px",
              padding: "10px 14px",
              background: "var(--surface-2)",
              fontSize: 11,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: ".04em",
              fontWeight: 500,
            }}
          >
            <span>Talla</span>
            <span>Insumo</span>
            <span style={{ textAlign: "right" }}>Precio u.</span>
            <span style={{ textAlign: "center" }}>Cantidad</span>
            <span style={{ textAlign: "right" }}>Subtotal</span>
          </div>
          {sizes.map((sz) => {
            const q = qtys[sz.id] ?? 0;
            const surcharge = surcharges[sz.id] ?? 0;
            const unit = product.price + surcharge;
            const remaining = sz.stock - q;
            const lowStock = remaining < 5;
            return (
              <div
                key={sz.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "80px 1fr 110px 110px 130px",
                  padding: "10px 14px",
                  borderTop: "1px solid var(--line)",
                  alignItems: "center",
                }}
              >
                <div style={{ fontWeight: 600, fontFamily: "var(--font-mono)" }}>{sz.id}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>
                  Stock: <span style={{ color: lowStock ? "var(--warn)" : "var(--ink)" }}>{remaining}</span>{" "}
                  / {sz.stock}
                </div>
                <div className="num" style={{ textAlign: "right", fontSize: 13 }}>
                  {fmtMXN(unit)}
                  {surcharge > 0 && (
                    <div style={{ fontSize: 10, color: "var(--muted)" }}>+${surcharge}</div>
                  )}
                </div>
                <div style={{ display: "flex", justifyContent: "center" }}>
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
                      onClick={() => setQty(sz.id, q - 1)}
                    >
                      −
                    </button>
                    <input
                      className="num"
                      value={q}
                      onChange={(e) => setQty(sz.id, parseInt(e.target.value || "0", 10))}
                      style={{
                        width: 44,
                        textAlign: "center",
                        border: 0,
                        outline: "none",
                        height: 26,
                        background: "transparent",
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      style={{ borderRadius: 0 }}
                      onClick={() => setQty(sz.id, q + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div
                  className="num"
                  style={{
                    textAlign: "right",
                    fontWeight: q > 0 ? 600 : 400,
                    color: q > 0 ? "var(--ink)" : "var(--muted)",
                  }}
                >
                  {fmtMXN(q * unit)}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Total piezas</div>
          <div className="num" style={{ fontSize: 18, fontWeight: 600 }}>{totalQty}</div>
          <div className="spacer" />
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>Subtotal de la línea</div>
            <div className="num" style={{ fontSize: 20, fontWeight: 600 }}>{fmtMXN(lineSubtotal)}</div>
          </div>
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
          <span style={{ color: "var(--accent)" }}>{I.paint}</span>
          <div>
            Todas las tallas comparten <strong style={{ color: "var(--ink)" }}>un solo job de diseño</strong>.
            Si el cliente quiere otro estampado, agrega el producto de nuevo.
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn btn--primary" disabled={totalQty === 0} onClick={submit}>
            {editLineId ? "Guardar cambios" : "Añadir al carrito"} · {fmtMXN(lineSubtotal)}
          </button>
        </div>
      </div>
    </Modal>
  );
}
