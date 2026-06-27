"use client";

import { useState } from "react";
import { I } from "@/components/icons";
import { Modal } from "@/components/modal";
import { SummaryRow } from "@/components/summary-row";
import { usePermission } from "@/lib/auth/auth-context";
import { ApiError } from "@/lib/api/errors";
import { ordersApi, type CheckoutLineInput } from "@/lib/api/orders";
import { useToast } from "@/lib/toast/toast-context";
import type { ApiOrderDetail, ApiOrderItem } from "@/lib/api/types";
import { fmtMXN } from "@/lib/format";
import { cartTotals, lineSubtotal } from "@/lib/pos-cart";
import type { CartLine } from "@/lib/types";

type Props = {
  order: ApiOrderDetail;
  onClose: () => void;
  /** Se llama tras editar (antes de cerrar) — el padre recarga el detalle. */
  onDone: () => void | Promise<void>;
};

/** ApiOrderItem → CartLine para el editor (conserva variante/talla/dimensión). */
function lineFromItem(it: ApiOrderItem): CartLine {
  return {
    lineId: `O-${it.id}`,
    id: it.productId ?? "",
    isAdHoc: it.productId === null,
    lineNote: it.lineNote ?? undefined,
    name: it.adHocName ?? it.productName,
    sku: it.sku,
    source: it.source === "internal" ? "Interno" : "Proveedor",
    supplier: it.supplierName ?? undefined,
    needsApproval: it.needsApproval,
    qty: it.qty,
    price: it.unitPrice,
    variantCode: it.variantCode ?? undefined,
    variantLabel: it.variantLabel ?? undefined,
    dimension: it.dimensionData
      ? { width: it.dimensionData.width, height: it.dimensionData.height }
      : undefined,
    sizeBreakdown: it.sizeBreakdown
      ? it.sizeBreakdown.map((b) => ({
          sizeId: b.sizeId,
          qty: b.qty,
          surcharge: b.surcharge,
          sizeLabel: b.sizeLabel,
        }))
      : undefined,
  };
}

/** CartLine → CheckoutLineInput (mismo shape que el POS). */
function toInput(line: CartLine): CheckoutLineInput {
  const note = line.lineNote?.trim() ? { lineNote: line.lineNote.trim() } : {};
  // Decisión de diseño por línea: se manda siempre (re-rutea a in_design al editar).
  const design = { needsApproval: line.needsApproval };
  if (line.isAdHoc) {
    return {
      adHocName: line.name,
      adHocPrice: line.price,
      qty: line.qty,
      ...design,
      ...note,
    };
  }
  if (line.sizeBreakdown) {
    return {
      productId: line.id,
      sizeBreakdown: line.sizeBreakdown
        .filter((b) => b.qty > 0)
        .map((b) => ({ sizeId: b.sizeId, qty: b.qty })),
      ...design,
      ...note,
    };
  }
  if (line.dimension) {
    return {
      productId: line.id,
      dimension: { ...line.dimension },
      ...design,
      ...note,
    };
  }
  if (line.variantCode) {
    return {
      productId: line.id,
      qty: line.qty,
      variantCode: line.variantCode,
      ...design,
      ...note,
    };
  }
  return { productId: line.id, qty: line.qty, ...design, ...note };
}

export function OrderEditLinesModal({ order, onClose, onDone }: Props) {
  const toast = useToast();
  const canDiscount = usePermission("sales.discount.apply");
  const [lines, setLines] = useState<CartLine[]>(() =>
    order.items.map(lineFromItem),
  );
  // Conserva el descuento del pedido (antes se fijaba en 0 y se borraba al
  // guardar); editable solo con sales.discount.apply, igual que el POS.
  const [discount, setDiscount] = useState(order.discount);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { subtotal, discountApplied, tax, total } = cartTotals(lines, discount);
  const hasInvalidAdHoc = lines.some(
    (l) => l.isAdHoc && (l.name.trim() === "" || l.price <= 0),
  );
  const canSave = lines.length > 0 && !hasInvalidAdHoc && !submitting;
  // La línea con talla/dimensión no se edita en cantidad aquí (sólo nota/quitar).
  const editableQty = (l: CartLine) => !l.sizeBreakdown && !l.dimension;

  const patch = (lineId: string, p: Partial<CartLine>) =>
    setLines((ls) => ls.map((l) => (l.lineId === lineId ? { ...l, ...p } : l)));
  const remove = (lineId: string) =>
    setLines((ls) => ls.filter((l) => l.lineId !== lineId));
  const addAdHoc = () =>
    setLines((ls) => [
      ...ls,
      {
        lineId: `A${ls.length}-${order.items.length}`,
        id: "",
        isAdHoc: true,
        name: "",
        sku: "LIBRE",
        source: "Interno",
        needsApproval: false,
        qty: 1,
        price: 0,
      },
    ]);

  const save = async () => {
    if (!canSave) return;
    setSubmitting(true);
    setError(null);
    try {
      await ordersApi.editLines(order.id, {
        lines: lines.map(toInput),
        discount,
      });
      toast.success("Líneas del pedido actualizadas");
      await onDone();
      onClose();
    } catch (err) {
      const code = err instanceof ApiError ? err.body?.error : undefined;
      if (code === "OrderNotEditableError") {
        setError(
          "El pedido ya no se puede editar (en producción/entrega o con diseño en proceso).",
        );
      } else if (code === "OrderTotalBelowPaidError") {
        setError(
          `El nuevo total queda por debajo de lo ya pagado (${fmtMXN(order.paid)}). Registra una devolución primero.`,
        );
      } else if (code === "InsufficientStockForSaleError") {
        setError(
          "Stock insuficiente para las nuevas líneas; ajusta las cantidades y reintenta. El pedido no se modificó.",
        );
      } else {
        setError(
          err instanceof ApiError ? err.message : "No se pudo editar el pedido.",
        );
      }
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={`Editar líneas — ${order.folio}`}
      onClose={onClose}
      width={560}
      footer={
        <>
          <button className="btn btn--ghost" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn btn--primary"
            type="button"
            onClick={save}
            disabled={!canSave}
            title={
              hasInvalidAdHoc
                ? "Completa nombre y precio (> 0) de las líneas libres"
                : undefined
            }
          >
            {submitting ? "Guardando…" : "Guardar cambios"}
          </button>
        </>
      }
    >
      <div className="grid gap-3">
        <p className="text-muted text-xs">
          Corrige cantidades, notas o agrega una línea libre. Para cambiar
          variantes/tallas o agregar productos del catálogo, crea el pedido de
          nuevo. El total se revalida en el servidor (no puede quedar por debajo
          de lo ya pagado).
        </p>

        <div
          className="border border-line rounded-md overflow-y-auto"
          style={{ maxHeight: 320 }}
        >
          {lines.length === 0 ? (
            <div className="empty m-3">Sin líneas — agrega al menos una.</div>
          ) : (
            lines.map((line) => (
              <div
                key={line.lineId}
                className="px-3 py-2"
                style={{ borderBottom: "1px solid var(--line)" }}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    {line.isAdHoc ? (
                      <input
                        className="text-[13px] font-medium bg-transparent border-b border-line w-full outline-none"
                        placeholder="Producto libre…"
                        value={line.name}
                        onChange={(e) =>
                          patch(line.lineId, { name: e.target.value })
                        }
                      />
                    ) : (
                      <div className="text-[13px] font-medium truncate">
                        {line.name}
                        {line.variantLabel ? ` — ${line.variantLabel}` : ""}
                      </div>
                    )}
                    <div className="text-muted text-[10px] font-mono">
                      {line.sku}
                    </div>
                  </div>
                  <div className="num text-[13px] font-semibold">
                    {fmtMXN(lineSubtotal(line))}
                  </div>
                  <button
                    className="icon-btn"
                    type="button"
                    onClick={() => remove(line.lineId)}
                    aria-label="Quitar línea"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex items-center gap-2 mt-1.5">
                  {editableQty(line) ? (
                    <div className="flex items-center border border-line rounded-md">
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        style={{ borderRadius: 0 }}
                        onClick={() =>
                          patch(line.lineId, { qty: Math.max(1, line.qty - 1) })
                        }
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={1}
                        className="num text-center bg-transparent"
                        value={line.qty}
                        onChange={(e) =>
                          patch(line.lineId, {
                            qty: Math.max(1, parseInt(e.target.value || "1", 10)),
                          })
                        }
                        style={{ width: 44, border: 0, outline: "none", height: 22 }}
                      />
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        style={{ borderRadius: 0 }}
                        onClick={() => patch(line.lineId, { qty: line.qty + 1 })}
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <span className="num text-[11px] text-muted">
                      {line.dimension
                        ? `${line.dimension.width}×${line.dimension.height}`
                        : `${line.sizeBreakdown?.reduce((s, b) => s + b.qty, 0) ?? 0} pzas`}
                    </span>
                  )}
                  {line.isAdHoc && (
                    <label className="flex items-center gap-1 text-[10px] text-muted">
                      $
                      <input
                        className="input num"
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="0.00"
                        value={line.price || ""}
                        onChange={(e) =>
                          patch(line.lineId, {
                            price: parseFloat(e.target.value || "0") || 0,
                          })
                        }
                        style={{ width: 78, height: 24, padding: "0 6px" }}
                      />
                    </label>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-1.5">
                  <button
                    type="button"
                    aria-pressed={line.needsApproval}
                    title="¿Requiere diseño?"
                    className={`pill text-[10px] border-0 cursor-pointer shrink-0 ${
                      line.needsApproval
                        ? "pill--warn"
                        : "pill--neutral opacity-60"
                    }`}
                    onClick={() =>
                      patch(line.lineId, {
                        needsApproval: !line.needsApproval,
                      })
                    }
                  >
                    {I.paint} Diseño
                  </button>
                  <input
                    className="flex-1 min-w-0 text-[11px] bg-transparent border border-line rounded px-2 py-1 outline-none"
                    placeholder="Nota para producción (opcional)"
                    value={line.lineNote ?? ""}
                    onChange={(e) =>
                      patch(line.lineId, { lineNote: e.target.value })
                    }
                  />
                </div>
              </div>
            ))
          )}
        </div>

        <button
          type="button"
          className="btn btn--ghost btn--sm self-start"
          onClick={addAdHoc}
        >
          + Línea libre
        </button>

        <div>
          <SummaryRow label="Subtotal" value={fmtMXN(subtotal)} />
          {canDiscount ? (
            <div className="flex items-center justify-between py-1">
              <span className="text-[13px] text-muted">Descuento</span>
              <label className="flex items-center gap-1 text-[13px]">
                $
                <input
                  className="input num"
                  type="number"
                  min={0}
                  step="0.01"
                  value={discount || ""}
                  onChange={(e) =>
                    setDiscount(
                      Math.max(0, parseFloat(e.target.value || "0") || 0),
                    )
                  }
                  style={{ width: 96, height: 28, padding: "0 8px" }}
                />
              </label>
            </div>
          ) : (
            discountApplied > 0 && (
              <SummaryRow
                label="Descuento"
                value={`− ${fmtMXN(discountApplied)}`}
              />
            )
          )}
          <SummaryRow label="IVA 16%" value={fmtMXN(tax)} />
          <SummaryRow label="Total" value={fmtMXN(total)} big />
          <SummaryRow label="Ya pagado" value={fmtMXN(order.paid)} muted />
        </div>

        {error && (
          <div
            className="rounded-md text-xs"
            style={{
              padding: "10px 12px",
              border: "1px solid var(--danger)",
              color: "var(--danger)",
              background: "var(--danger-soft)",
            }}
            role="alert"
          >
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}
