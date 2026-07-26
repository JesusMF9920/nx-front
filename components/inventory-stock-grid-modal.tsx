"use client";

import { Fragment, useMemo, useState, type FormEvent } from "react";
import { Modal } from "@/components/modal";
import { ApiError } from "@/lib/api/errors";
import { inventoryApi } from "@/lib/api/inventory";
import type { ApiMaterial, ApiMaterialVariant } from "@/lib/api/types";
import { parseCompositeCode, swatchForColorCode } from "@/lib/product-colors";
import { useToast } from "@/lib/toast/toast-context";

/**
 * Captura de stock EN REJILLA: el usuario escribe el stock NUEVO por celda y se
 * aplican los ajustes de las que cambió en UNA sola operación atómica (endpoint
 * bulk). Renderiza una matriz 2D talla×color si las variantes son compuestas
 * ("{talla}|{color}"), o una lista 1D si no.
 */
export function StockGridModal({
  material,
  onClose,
  onSaved,
}: {
  material: ApiMaterial;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const toast = useToast();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(material.variants.map((v) => [v.id, String(v.stock)])),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ejes de la matriz talla×color, si las variantes son compuestas.
  const grid = useMemo(() => {
    const sizes: string[] = [];
    const colors: string[] = [];
    const byCell = new Map<string, ApiMaterialVariant>();
    let composite = false;
    for (const v of material.variants) {
      const parsed = parseCompositeCode(v.code);
      if (!parsed) continue;
      composite = true;
      if (!sizes.includes(parsed.size)) sizes.push(parsed.size);
      if (!colors.includes(parsed.color)) colors.push(parsed.color);
      byCell.set(`${parsed.size}|${parsed.color}`, v);
    }
    return { composite, sizes, colors, byCell };
  }, [material.variants]);

  const changed = material.variants.filter(
    (v) => Number(values[v.id] ?? v.stock) !== v.stock,
  );

  const setVal = (id: string, v: string) =>
    setValues((p) => ({ ...p, [id]: v }));

  // Función (no componente) para no remontar el input y perder el foco al teclear.
  const cellInput = (variantId: string) => (
    <input
      className="input num text-center"
      style={{ height: 34, padding: "0 6px" }}
      type="number"
      min={0}
      step="1"
      value={values[variantId] ?? ""}
      onChange={(e) => setVal(variantId, e.target.value)}
      aria-label="Nuevo stock"
    />
  );

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (changed.some((v) => Number(values[v.id]) < 0)) {
      setError("El stock no puede quedar negativo.");
      return;
    }
    const moves = changed
      .map((v) => ({
        materialVariantId: v.id,
        type: "adjust" as const,
        qty: Math.round((Number(values[v.id]) - v.stock) * 1000) / 1000,
      }))
      .filter((m) => Number.isFinite(m.qty) && m.qty !== 0);
    if (moves.length === 0) {
      onClose();
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await inventoryApi.recordStockMovesBulk(
        material.id,
        moves,
        "Carga en rejilla",
      );
      toast.success("Stock actualizado");
      await onSaved();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "No se pudo guardar el stock.",
      );
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={`Cargar stock — ${material.name}`}
      onClose={onClose}
      width={grid.composite ? 640 : 420}
      footer={
        <>
          <button className="btn btn--ghost" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn btn--accent"
            type="submit"
            form="stock-grid-form"
            disabled={submitting || changed.length === 0}
          >
            {submitting
              ? "Guardando…"
              : changed.length > 0
                ? `Guardar ${changed.length}`
                : "Guardar"}
          </button>
        </>
      }
    >
      <form id="stock-grid-form" onSubmit={save} className="grid gap-3">
        <div className="text-xs text-muted">
          Escribe el stock NUEVO por celda; al guardar se aplican los ajustes de
          las que cambiaste, todas en una sola operación.
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

        {grid.composite ? (
          <div style={{ overflowX: "auto" }}>
            <div
              className="inline-grid gap-1 items-center"
              style={{
                gridTemplateColumns: `auto repeat(${grid.colors.length}, minmax(64px, 1fr))`,
              }}
            >
              <div />
              {grid.colors.map((c) => (
                <div
                  key={c}
                  className="text-[11px] text-muted inline-flex items-center justify-center gap-1"
                  title={c}
                >
                  <span
                    aria-hidden
                    style={{
                      display: "inline-block",
                      width: 9,
                      height: 9,
                      borderRadius: "50%",
                      background: swatchForColorCode(c),
                      border: "1px solid var(--line)",
                    }}
                  />
                  {c}
                </div>
              ))}
              {grid.sizes.map((s) => (
                <Fragment key={s}>
                  <div className="text-[13px] font-semibold font-mono">{s}</div>
                  {grid.colors.map((c) => {
                    const v = grid.byCell.get(`${s}|${c}`);
                    return (
                      <div key={c}>
                        {v ? (
                          cellInput(v.id)
                        ) : (
                          <div
                            className="text-center text-muted-2"
                            style={{ lineHeight: "34px" }}
                            title="Sin combinación en el insumo"
                          >
                            —
                          </div>
                        )}
                      </div>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid gap-1.5">
            {material.variants.map((v) => (
              <label
                key={v.id}
                className="flex items-center gap-2 text-[13px]"
              >
                <span className="flex-1">{v.label}</span>
                <div style={{ width: 90 }}>{cellInput(v.id)}</div>
              </label>
            ))}
          </div>
        )}
      </form>
    </Modal>
  );
}
