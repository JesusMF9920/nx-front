"use client";

import { useState, type FormEvent } from "react";
import { Modal } from "@/components/modal";
import { ApiError } from "@/lib/api/errors";
import { inventoryApi } from "@/lib/api/inventory";
import type { ApiMaterial } from "@/lib/api/types";
import { fmtInt } from "@/lib/format";

/** Delta con signo y hasta 3 decimales (el backend rechaza más). */
const DELTA_RE = /^-?\d+(\.\d{1,3})?$/;

export function InventoryStockAdjustModal({
  material,
  onClose,
  onDone,
}: {
  material: ApiMaterial;
  onClose: () => void;
  onDone: () => void | Promise<void>;
}) {
  const hasVariants = material.variants.length > 0;
  const [variantId, setVariantId] = useState("");
  const [delta, setDelta] = useState("");
  const [ref, setRef] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const variant = hasVariants
    ? material.variants.find((v) => v.id === variantId)
    : undefined;
  const baseStock = hasVariants ? (variant?.stock ?? null) : material.stock;
  const deltaNum = DELTA_RE.test(delta.trim()) ? Number(delta.trim()) : null;
  const resulting =
    baseStock !== null && deltaNum !== null
      ? Math.round((baseStock + deltaNum) * 1000) / 1000
      : null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    if (hasVariants && !variantId) {
      setError("Selecciona la talla del ajuste.");
      return;
    }
    const raw = delta.trim();
    if (!DELTA_RE.test(raw)) {
      setError("El delta debe ser un número con hasta 3 decimales.");
      return;
    }
    const qtyNum = Number(raw);
    if (qtyNum === 0) {
      setError("Para ajuste la cantidad no puede ser cero.");
      return;
    }
    setSubmitting(true);
    try {
      await inventoryApi.recordStockMove(material.id, {
        type: "adjust",
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
          : "No se pudo registrar el ajuste.",
      );
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Ajustar stock"
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
            form="stock-adjust-form"
            disabled={submitting}
          >
            {submitting ? "Guardando…" : "Registrar"}
          </button>
        </>
      }
    >
      <form
        id="stock-adjust-form"
        onSubmit={submit}
        className="grid"
        style={{ gap: 14 }}
      >
        <div className="text-sm text-muted">
          Material:{" "}
          <span className="font-medium text-ink-2">{material.name}</span>
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

        <div className="grid grid-cols-2 gap-3.5">
          <div className="bg-surface-2 border border-line rounded-md p-3">
            <div className="label">Stock actual</div>
            <div className="num font-semibold" style={{ fontSize: 24 }}>
              {baseStock === null ? "—" : fmtInt(baseStock)}{" "}
              <span className="text-xs text-muted font-normal">
                {material.unit}
              </span>
            </div>
          </div>
          <div className="bg-accent-soft border border-line rounded-md p-3">
            <div className="label">Stock resultante</div>
            <div
              className="num font-semibold text-accent-ink"
              style={{ fontSize: 24 }}
            >
              {resulting === null ? "—" : fmtInt(resulting)}{" "}
              <span className="text-xs text-muted font-normal">
                {material.unit}
              </span>
            </div>
          </div>
        </div>

        <div className="field">
          <span className="label">Delta (positivo o negativo)</span>
          <input
            className="input"
            type="number"
            step={0.001}
            value={delta}
            onChange={(e) => setDelta(e.target.value)}
            required
            autoFocus
          />
          <small className="help mt-1">
            Usa positivo para aumentar, negativo para reducir. Hasta 3 decimales.
          </small>
        </div>
        <div className="field">
          <span className="label">Referencia (opcional)</span>
          <input
            className="input"
            placeholder="Conteo físico, merma…"
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
