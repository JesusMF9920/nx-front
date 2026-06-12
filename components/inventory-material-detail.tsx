"use client";

import { useState, type FormEvent } from "react";
import { I } from "@/components/icons";
import { Modal } from "@/components/modal";
import { ApiError } from "@/lib/api/errors";
import { inventoryApi, type MaterialVariantInput } from "@/lib/api/inventory";
import type {
  ApiMaterial,
  ApiStockMove,
  ApiStockMoveType,
} from "@/lib/api/types";
import { fmtInt, fmtMXN } from "@/lib/format";

const dateTimeFmt = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "short",
  timeStyle: "short",
});
function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return dateTimeFmt.format(d);
}

function moveLabel(t: ApiStockMoveType): string {
  return t === "entry" ? "Entrada" : t === "exit" ? "Salida" : "Ajuste";
}
function moveTone(t: ApiStockMoveType): string {
  return t === "entry"
    ? "var(--ok)"
    : t === "exit"
      ? "var(--danger)"
      : "var(--info)";
}

export function InventoryMaterialDetail({
  material,
  moves,
  onEdit,
  onMove,
  onDeactivate,
  onActivate,
  onVariantsChanged,
}: {
  material: ApiMaterial;
  moves: ApiStockMove[];
  onEdit: () => void;
  onMove: (type: ApiStockMoveType) => void;
  onDeactivate: () => void;
  onActivate: () => void;
  onVariantsChanged: () => void | Promise<void>;
}) {
  const [showVariants, setShowVariants] = useState(false);
  const lowStock =
    material.reorderPoint > 0 && material.stock <= material.reorderPoint;
  const hasVariants = material.variants.length > 0;

  return (
    <div className="card self-start">
      <div className="card__body pb-0">
        <div className="text-lg font-semibold" style={{ letterSpacing: "-.01em" }}>
          {material.name}
        </div>
        <div className="text-muted text-xs">
          <span className="font-mono">{material.sku}</span> ·{" "}
          <span className="tag">{material.category}</span>
          {material.buyToOrder && (
            <>
              {" · "}
              <span className="pill pill--neutral">Bajo demanda</span>
            </>
          )}
          {!material.isActive && (
            <>
              {" · "}
              <span style={{ color: "var(--danger)" }}>Inactivo</span>
            </>
          )}
        </div>

        <div className="divider" style={{ margin: "12px 0" }} />

        <div className="grid grid-cols-2 gap-3 text-[13px]">
          <Kv
            label={hasVariants ? "Stock total" : "Stock"}
            v={
              material.buyToOrder ? (
                "Bajo demanda"
              ) : (
                <span style={{ color: lowStock ? "var(--warn)" : "var(--ink)" }}>
                  {fmtInt(material.stock)} {material.unit}
                </span>
              )
            }
          />
          <Kv
            label="Reorden"
            v={
              material.reorderPoint > 0
                ? `${fmtInt(material.reorderPoint)} ${material.unit}`
                : "—"
            }
          />
          <Kv label="Costo" v={`${fmtMXN(material.cost)} / ${material.unit}`} />
          <Kv label="Valor" v={fmtMXN(material.stock * material.cost)} />
          <Kv label="Ubicación" v={material.location ?? "—"} />
          <Kv label="Proveedor" v={material.supplierName ?? "—"} />
        </div>
      </div>

      <div className="divider m-0 mt-3" />

      <div className="card__head" style={{ borderTop: 0 }}>
        <div className="card__title">Tallas</div>
        <div className="spacer" />
        {material.isActive && (
          <button
            className="btn btn--sm btn--ghost"
            type="button"
            onClick={() => setShowVariants(true)}
          >
            {I.edit} Gestionar
          </button>
        )}
      </div>
      {!hasVariants ? (
        <div className="card__body text-muted text-sm pt-0 pb-3">
          Sin tallas: el stock se lleva sobre el material completo.
        </div>
      ) : (
        <div className="px-4 pb-3">
          <div
            className="grid gap-1.5"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))" }}
          >
            {material.variants.map((v) => (
              <div
                key={v.id}
                className="border border-line rounded-md py-1.5 px-2 text-center"
                style={{ background: "var(--surface-2)" }}
                title={v.label}
              >
                <div className="text-[10px] text-muted">{v.label}</div>
                <div className="num font-semibold text-sm">{fmtInt(v.stock)}</div>
              </div>
            ))}
          </div>
          <div className="text-muted text-[11px] mt-1.5">
            Total: <span className="num">{fmtInt(material.stock)} {material.unit}</span>
          </div>
        </div>
      )}

      <div className="divider m-0" />

      {material.isActive && (
        <div className="px-4 py-3 flex gap-2 flex-wrap">
          <button
            className="btn btn--sm btn--accent"
            onClick={() => onMove("entry")}
          >
            {I.plus} Entrada
          </button>
          <button className="btn btn--sm" onClick={() => onMove("exit")}>
            {I.x} Salida
          </button>
          <button className="btn btn--sm" onClick={() => onMove("adjust")}>
            {I.edit} Ajustar
          </button>
        </div>
      )}

      <div className="divider m-0" />

      <div className="card__head" style={{ borderTop: 0 }}>
        <div className="card__title">Movimientos recientes</div>
        <div className="spacer" />
        <span className="text-muted text-xs">
          {moves.length === 0 ? "—" : `últimos ${moves.length}`}
        </span>
      </div>
      {moves.length === 0 ? (
        <div className="card__body text-muted text-sm py-2">Sin movimientos.</div>
      ) : (
        <div>
          {moves.map((mv) => (
            <div
              key={mv.id}
              className="px-4 py-2 text-[12px] flex items-baseline gap-2 flex-wrap"
              style={{ borderTop: "1px solid var(--line)" }}
            >
              <span className="text-muted-2 num text-[11px]" style={{ minWidth: 92 }}>
                {formatDateTime(mv.createdAt)}
              </span>
              <span className="tag" style={{ color: moveTone(mv.type) }}>
                {moveLabel(mv.type)}
              </span>
              {mv.materialVariantCode && (
                <span className="tag" title={mv.materialVariantLabel ?? undefined}>
                  {mv.materialVariantCode}
                </span>
              )}
              <span
                className="num font-medium"
                style={{ color: moveTone(mv.type) }}
              >
                {mv.type === "exit" || (mv.type === "adjust" && mv.qty < 0)
                  ? "-"
                  : "+"}
                {fmtInt(Math.abs(mv.qty))}
              </span>
              <span className="text-muted text-[11px]">
                → {fmtInt(mv.resultingStock)} {material.unit}
              </span>
              {mv.ref && (
                <span className="text-muted-2 text-[11px] font-mono ml-auto">
                  {mv.ref}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="divider m-0" />

      <div className="px-4 py-3 flex gap-2 flex-wrap">
        <button className="btn btn--sm" onClick={onEdit}>
          {I.edit} Editar
        </button>
        {material.isActive ? (
          <button className="btn btn--sm btn--danger" onClick={onDeactivate}>
            {I.x} Desactivar
          </button>
        ) : (
          <button className="btn btn--sm btn--accent" onClick={onActivate}>
            {I.check} Activar
          </button>
        )}
      </div>

      {showVariants && (
        <VariantsManagerModal
          material={material}
          onClose={() => setShowVariants(false)}
          onDone={async () => {
            setShowVariants(false);
            await onVariantsChanged();
          }}
        />
      )}
    </div>
  );
}

function Kv({ label, v }: { label: string; v: React.ReactNode }) {
  return (
    <div>
      <div className="text-muted text-[11px]">{label}</div>
      <div>{v}</div>
    </div>
  );
}

type VariantRow = { code: string; label: string; stock: number | null };

function VariantsManagerModal({
  material,
  onClose,
  onDone,
}: {
  material: ApiMaterial;
  onClose: () => void;
  onDone: () => void | Promise<void>;
}) {
  const [rows, setRows] = useState<VariantRow[]>(
    material.variants.map((v) => ({ code: v.code, label: v.label, stock: v.stock })),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const firstTransitionBlocked =
    material.variants.length === 0 && rows.length > 0 && material.stock !== 0;

  const updateRow = (i: number, patch: Partial<VariantRow>) =>
    setRows((rs) => rs.map((r, j) => (i === j ? { ...r, ...patch } : r)));
  const addRow = () =>
    setRows((rs) => [...rs, { code: "", label: "", stock: null }]);
  const removeRow = (i: number) => setRows((rs) => rs.filter((_, j) => j !== i));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting || firstTransitionBlocked) return;
    setError(null);
    const clean: MaterialVariantInput[] = rows.map((r, i) => ({
      code: r.code.trim().toUpperCase(),
      label: r.label.trim(),
      sortOrder: i,
    }));
    if (clean.some((v) => !v.code || !v.label)) {
      setError("Cada talla necesita código y etiqueta.");
      return;
    }
    if (new Set(clean.map((v) => v.code)).size !== clean.length) {
      setError("Hay códigos de talla repetidos.");
      return;
    }
    setSubmitting(true);
    try {
      await inventoryApi.setVariants(material.id, clean);
      await onDone();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.status === 400
            ? "El material debe tener stock 0 para activar tallas: ajusta el stock a 0 primero."
            : err.status === 409
              ? "No se puede quitar una talla con stock distinto de 0. Ajusta su stock a 0 primero."
              : err.message
          : "No se pudieron guardar las tallas.",
      );
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Gestionar tallas"
      onClose={onClose}
      width={520}
      footer={
        <>
          <button className="btn btn--ghost" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn btn--accent"
            type="submit"
            form="variants-form"
            disabled={submitting || firstTransitionBlocked}
          >
            {submitting ? "Guardando…" : "Guardar tallas"}
          </button>
        </>
      }
    >
      <form id="variants-form" onSubmit={submit} className="grid" style={{ gap: 12 }}>
        <div className="text-sm text-muted">
          Material:{" "}
          <span className="font-medium text-ink-2">{material.name}</span>
        </div>

        {rows.length === 0 ? (
          <div className="text-muted text-xs">
            Sin tallas. Guardar así desactiva el manejo por talla (requiere que
            todas las tallas tengan stock 0).
          </div>
        ) : (
          <div className="grid gap-2">
            {rows.map((r, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  className="input"
                  style={{ width: 110 }}
                  placeholder="Código (CH)"
                  value={r.code}
                  onChange={(e) =>
                    updateRow(i, { code: e.target.value.toUpperCase() })
                  }
                  maxLength={20}
                />
                <input
                  className="input flex-1"
                  placeholder="Etiqueta (Chica)"
                  value={r.label}
                  onChange={(e) => updateRow(i, { label: e.target.value })}
                  maxLength={60}
                />
                <span
                  className="num text-xs text-muted text-right"
                  style={{ minWidth: 54 }}
                >
                  {r.stock === null ? "nueva" : `${fmtInt(r.stock)} ${material.unit}`}
                </span>
                <button
                  className="icon-btn"
                  type="button"
                  onClick={() => removeRow(i)}
                  aria-label="Quitar talla"
                >
                  {I.x}
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          className="btn btn--sm btn--ghost justify-self-start"
          type="button"
          onClick={addRow}
        >
          {I.plus} Agregar talla
        </button>

        {firstTransitionBlocked && (
          <div
            className="rounded-md text-xs"
            style={{
              padding: "10px 12px",
              border: "1px solid var(--warn)",
              color: "var(--warn)",
              background: "var(--warn-soft)",
            }}
            role="alert"
          >
            Este material tiene stock {fmtInt(material.stock)} {material.unit}.
            Para activar tallas, ajusta el stock a 0 primero; después registra
            las existencias con entradas por talla.
          </div>
        )}

        {rows.length > 0 && !firstTransitionBlocked && (
          <small className="help">
            El stock por talla no se edita aquí: usa entradas, salidas o ajustes
            por talla. Quitar una talla requiere que su stock sea 0.
          </small>
        )}

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
