"use client";

import { useMemo, useState } from "react";
import { I } from "@/components/icons";
import { Modal } from "@/components/modal";
import { fmtMXN } from "@/lib/format";
import { getPriceForQty, hasPriceTiers } from "@/lib/pricing";
import { COMPOSITE_SEP, parseCompositeCode } from "@/lib/product-colors";
import type { ApiMaterial, ApiProductDetail } from "@/lib/api/types";
import type { SizeBreakdownEntry } from "@/lib/types";
import type { SizeBreakdownLineData } from "@/components/pos-size-breakdown-picker";

type Props = {
  product: ApiProductDetail;
  /** Material origen: sus variantes son las celdas compuestas "{talla}|{color}". */
  material: ApiMaterial;
  editLineId?: string;
  editBreakdown?: SizeBreakdownEntry[];
  onClose: () => void;
  onAdd: (product: ApiProductDetail, line: SizeBreakdownLineData, editLineId?: string) => void;
};

const cellKey = (sizeId: string, colorCode: string) =>
  `${sizeId}${COMPOSITE_SEP}${colorCode}`;

type Cell = { stock: number };

export function PosSizeColorMatrixPicker({
  product,
  material,
  editLineId,
  editBreakdown,
  onClose,
  onAdd,
}: Props) {
  // Ejes derivados de las variantes compuestas del material ("G|VERDE").
  const { sizes, cells } = useMemo(() => {
    const cellMap = new Map<string, Cell>();
    const sizeOrder: string[] = [];
    const seenSize = new Set<string>();
    for (const v of [...material.variants].sort((a, b) => a.sortOrder - b.sortOrder)) {
      const parsed = parseCompositeCode(v.code);
      if (!parsed) continue; // no compuesta: no participa en la matriz color
      const { size: sizeId, color: colorCode } = parsed;
      cellMap.set(cellKey(sizeId, colorCode), { stock: v.stock });
      if (!seenSize.has(sizeId)) {
        seenSize.add(sizeId);
        sizeOrder.push(sizeId);
      }
    }
    return { sizes: sizeOrder, cells: cellMap };
  }, [material.variants]);

  // Columnas = colores declarados por el producto (orden del catálogo).
  const colors = product.colors ?? [];
  const surcharges = product.sizeSurcharges ?? {};

  const initial: Record<string, number> = editBreakdown
    ? Object.fromEntries(
        editBreakdown
          .filter((b) => b.colorCode)
          .map((b) => [cellKey(b.sizeId, b.colorCode!), b.qty]),
      )
    : {};

  const [qtys, setQtys] = useState<Record<string, number>>(initial);

  const totalQty = Object.values(qtys).reduce((a, b) => a + (b || 0), 0);
  // Mayoreo: el escalón se resuelve por el TOTAL de piezas de la matriz; el
  // surcharge por talla se suma sobre la base ya resuelta (orientativo).
  const baseUnit = getPriceForQty(product.price, product.priceTiers, totalQty);
  const tieredApplied = hasPriceTiers(product.priceTiers) && baseUnit < product.price;
  const lineSubtotal = sizes.reduce((acc, sizeId) => {
    const unit = baseUnit + (surcharges[sizeId] ?? 0);
    return (
      acc +
      colors.reduce((s, c) => s + (qtys[cellKey(sizeId, c.code)] ?? 0) * unit, 0)
    );
  }, 0);

  const setQty = (key: string, q: number) =>
    setQtys((prev) => ({ ...prev, [key]: Math.max(0, q) }));

  const submit = () => {
    if (totalQty === 0) return;
    const breakdown: SizeBreakdownEntry[] = [];
    for (const sizeId of sizes) {
      const surcharge = surcharges[sizeId] ?? 0;
      for (const c of colors) {
        const q = qtys[cellKey(sizeId, c.code)] ?? 0;
        if (q > 0) {
          breakdown.push({
            sizeId,
            qty: q,
            surcharge,
            colorCode: c.code,
            colorLabel: c.label,
          });
        }
      }
    }
    onAdd(product, { qty: totalQty, price: baseUnit, sizeBreakdown: breakdown }, editLineId);
  };

  // Rejilla: 1ª col talla + 1 col por color.
  const gridCols = `72px repeat(${colors.length}, minmax(88px, 1fr))`;

  return (
    <Modal
      title={`${editLineId ? "Editar" : "Configurar"} · ${product.name}`}
      onClose={onClose}
      width={Math.min(920, 220 + colors.length * 110)}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2.5 text-xs text-muted">
          <span className="text-accent">{I.layers}</span>
          <div>
            Tallas y colores del insumo <strong className="text-ink">{material.name}</strong>.
            El stock se descuenta por <strong className="text-ink">talla y color</strong>.
          </div>
        </div>

        {sizes.length === 0 || colors.length === 0 ? (
          <div className="bg-surface-2 border border-line rounded-md p-3 text-xs text-muted">
            El insumo no tiene variantes talla×color configuradas para los colores de
            este producto. Da de alta las combinaciones en el material.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="border border-line rounded-md overflow-hidden inline-block min-w-full">
              {/* Encabezado: colores */}
              <div
                className="grid px-3 py-2.5 bg-surface-2 text-[11px] text-muted uppercase font-medium"
                style={{ gridTemplateColumns: gridCols, letterSpacing: ".04em" }}
              >
                <span>Talla</span>
                {colors.map((c) => (
                  <span key={c.code} className="text-center" title={c.label}>
                    {c.label}
                  </span>
                ))}
              </div>
              {sizes.map((sizeId) => {
                const surcharge = surcharges[sizeId] ?? 0;
                return (
                  <div
                    key={sizeId}
                    className="grid px-3 py-2 items-center"
                    style={{ gridTemplateColumns: gridCols, borderTop: "1px solid var(--line)" }}
                  >
                    <div className="font-semibold font-mono text-[13px]">
                      {sizeId}
                      {surcharge > 0 && (
                        <div className="text-[10px] text-muted font-sans">+${surcharge}</div>
                      )}
                    </div>
                    {colors.map((c) => {
                      const key = cellKey(sizeId, c.code);
                      const cell = cells.get(key);
                      const q = qtys[key] ?? 0;
                      if (!cell) {
                        return (
                          <div
                            key={c.code}
                            className="text-center text-[10px] text-muted opacity-40 select-none"
                            title="Sin combinación en el insumo"
                          >
                            —
                          </div>
                        );
                      }
                      const remaining = cell.stock - q;
                      const low = remaining < 5;
                      return (
                        <div key={c.code} className="flex flex-col items-center gap-1">
                          <div className="flex items-center border border-line rounded-md">
                            <button
                              type="button"
                              className="btn btn--ghost btn--sm"
                              style={{ borderRadius: 0, padding: "0 6px" }}
                              onClick={() => setQty(key, q - 1)}
                            >
                              −
                            </button>
                            <input
                              className="num text-center bg-transparent"
                              value={q}
                              onChange={(e) => setQty(key, parseInt(e.target.value || "0", 10))}
                              style={{ width: 34, border: 0, outline: "none", height: 24 }}
                            />
                            <button
                              type="button"
                              className="btn btn--ghost btn--sm"
                              style={{ borderRadius: 0, padding: "0 6px" }}
                              onClick={() => setQty(key, q + 1)}
                            >
                              +
                            </button>
                          </div>
                          <span
                            className="text-[10px]"
                            style={{ color: low ? "var(--warn)" : "var(--muted)" }}
                          >
                            {remaining}/{cell.stock}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3.5">
          <div className="text-xs text-muted">Total piezas</div>
          <div className="num text-lg font-semibold">{totalQty}</div>
          {tieredApplied && (
            <span
              className="tag"
              style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}
              title="Precio de mayoreo por volumen total"
            >
              Mayoreo · {fmtMXN(baseUnit)} base
            </span>
          )}
          <div className="spacer" />
          <div className="text-right">
            <div className="text-[11px] text-muted">Subtotal de la línea</div>
            <div className="num text-xl font-semibold">{fmtMXN(lineSubtotal)}</div>
          </div>
        </div>

        <div className="bg-surface-2 border border-line rounded-md p-2.5 text-[11px] text-muted flex gap-2 items-start">
          <span className="text-accent">{I.paint}</span>
          <div>
            Todas las combinaciones comparten <strong className="text-ink">un solo job de diseño</strong>.
            Si el cliente quiere otro estampado, agrega el producto de nuevo.
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={totalQty === 0}
            onClick={submit}
          >
            {editLineId ? "Guardar cambios" : "Añadir al carrito"} · {fmtMXN(lineSubtotal)}
          </button>
        </div>
      </div>
    </Modal>
  );
}
