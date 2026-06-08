"use client";

import { useState, type FormEvent } from "react";
import { Modal } from "@/components/modal";
import { ApiError } from "@/lib/api/errors";
import { inventoryApi } from "@/lib/api/inventory";
import type { ApiMaterial } from "@/lib/api/types";
import { fmtInt } from "@/lib/format";

/** Hasta 3 decimales (el backend rechaza más). */
const QTY_RE = /^\d+(\.\d{1,3})?$/;

export function InventoryStockEntryModal({
  material,
  type = "entry",
  onClose,
  onDone,
}: {
  material: ApiMaterial;
  type?: "entry" | "exit";
  onClose: () => void;
  onDone: () => void | Promise<void>;
}) {
  const hasVariants = material.variants.length > 0;
  const [variantId, setVariantId] = useState("");
  const [qty, setQty] = useState("");
  const [ref, setRef] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = type === "entry" ? "Registrar entrada" : "Registrar salida";
  const variant = hasVariants
    ? material.variants.find((v) => v.id === variantId)
    : undefined;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    if (hasVariants && !variantId) {
      setError("Selecciona la talla del movimiento.");
      return;
    }
    const raw = qty.trim();
    if (!QTY_RE.test(raw)) {
      setError("La cantidad debe ser un número positivo con hasta 3 decimales.");
      return;
    }
    const qtyNum = Number(raw);
    if (!(qtyNum > 0)) {
      setError("La cantidad debe ser mayor que cero.");
      return;
    }
    setSubmitting(true);
    try {
      await inventoryApi.recordStockMove(material.id, {
        type,
        qty: qtyNum,
        ...(hasVariants ? { materialVariantId: variantId } : {}),
        ref: ref.trim() || null,
        note: note.trim() || null,
      });
      await onDone();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudo registrar el movimiento.",
      );
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={title}
      onClose={onClose}
      width={480}
      footer={
        <>
          <button className="btn btn--ghost" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn btn--accent"
            type="submit"
            form="stock-entry-form"
            disabled={submitting}
          >
            {submitting ? "Guardando…" : "Registrar"}
          </button>
        </>
      }
    >
      <form id="stock-entry-form" onSubmit={submit} className="grid" style={{ gap: 14 }}>
        <div className="text-sm text-muted">
          Material:{" "}
          <span className="font-medium text-ink-2">{material.name}</span>
          <br />
          {variant ? (
            <>
              Stock de {variant.label}:{" "}
              <span className="font-medium text-ink-2">
                {fmtInt(variant.stock)} {material.unit}
              </span>
            </>
          ) : (
            <>
              Stock actual:{" "}
              <span className="font-medium text-ink-2">
                {fmtInt(material.stock)} {material.unit}
              </span>
            </>
          )}
        </div>
        {hasVariants && (
          <div className="field">
            <span className="label">Talla</span>
            <select
              className="input"
              value={variantId}
              onChange={(e) => setVariantId(e.target.value)}
              required
            >
              <option value="">Selecciona talla…</option>
              {material.variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label} ({v.code}) · {fmtInt(v.stock)} {material.unit}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="field">
          <span className="label">Cantidad</span>
          <input
            className="input"
            type="number"
            step={0.001}
            min={0}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            required
            autoFocus
          />
          <small className="help mt-1">Acepta hasta 3 decimales.</small>
        </div>
        <div className="field">
          <span className="label">Referencia (opcional)</span>
          <input
            className="input"
            placeholder="PO-001, pedido 42, conteo…"
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            maxLength={80}
          />
        </div>
        <div className="field">
          <span className="label">Nota (opcional)</span>
          <textarea
            className="textarea"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
          />
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
      </form>
    </Modal>
  );
}
