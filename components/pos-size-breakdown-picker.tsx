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

const COLS = "80px 1fr 110px 110px 130px";

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
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2.5 text-xs text-muted">
          <span className="text-accent">{I.layers}</span>
          <div>
            Las tallas vienen del insumo <strong className="text-ink">{material?.name}</strong>.
            Stock se descuenta por talla.
          </div>
        </div>

        <div className="border border-line rounded-md overflow-hidden">
          <div
            className="grid px-3.5 py-2.5 bg-surface-2 text-[11px] text-muted uppercase font-medium"
            style={{ gridTemplateColumns: COLS, letterSpacing: ".04em" }}
          >
            <span>Talla</span>
            <span>Insumo</span>
            <span className="text-right">Precio u.</span>
            <span className="text-center">Cantidad</span>
            <span className="text-right">Subtotal</span>
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
                className="grid px-3.5 py-2.5 items-center"
                style={{
                  gridTemplateColumns: COLS,
                  borderTop: "1px solid var(--line)",
                }}
              >
                <div className="font-semibold font-mono">{sz.id}</div>
                <div className="text-[11px] text-muted">
                  Stock:{" "}
                  <span style={{ color: lowStock ? "var(--warn)" : "var(--ink)" }}>{remaining}</span>{" "}
                  / {sz.stock}
                </div>
                <div className="num text-right text-[13px]">
                  {fmtMXN(unit)}
                  {surcharge > 0 && (
                    <div className="text-[10px] text-muted">+${surcharge}</div>
                  )}
                </div>
                <div className="flex justify-center">
                  <div className="flex items-center border border-line rounded-md">
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      style={{ borderRadius: 0 }}
                      onClick={() => setQty(sz.id, q - 1)}
                    >
                      −
                    </button>
                    <input
                      className="num text-center bg-transparent"
                      value={q}
                      onChange={(e) => setQty(sz.id, parseInt(e.target.value || "0", 10))}
                      style={{ width: 44, border: 0, outline: "none", height: 26 }}
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
                  className="num text-right"
                  style={{
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

        <div className="flex items-center gap-3.5">
          <div className="text-xs text-muted">Total piezas</div>
          <div className="num text-lg font-semibold">{totalQty}</div>
          <div className="spacer" />
          <div className="text-right">
            <div className="text-[11px] text-muted">Subtotal de la línea</div>
            <div className="num text-xl font-semibold">{fmtMXN(lineSubtotal)}</div>
          </div>
        </div>

        <div className="bg-surface-2 border border-line rounded-md p-2.5 text-[11px] text-muted flex gap-2 items-start">
          <span className="text-accent">{I.paint}</span>
          <div>
            Todas las tallas comparten <strong className="text-ink">un solo job de diseño</strong>.
            Si el cliente quiere otro estampado, agrega el producto de nuevo.
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn btn--primary" disabled={totalQty === 0} onClick={submit}>
            {editLineId ? "Guardar cambios" : "Añadir al carrito"} · {fmtMXN(lineSubtotal)}
          </button>
        </div>
      </div>
    </Modal>
  );
}
