"use client";

import { I } from "@/components/icons";
import type { ApiPriceTier } from "@/lib/api/types";
import { fmtMXN } from "@/lib/format";
import { tierRanges } from "@/lib/pricing";

/** Fila editable de un escalón de mayoreo (texto de inputs). */
export type PriceTierRow = { minQty: string; unitPrice: string };

const INT_RE = /^\d+$/;
const PRICE_RE = /^\d+(\.\d{1,2})?$/;

/** Tiers persistidos → filas editables (ordenadas asc). */
export function buildTierRows(
  tiers: ApiPriceTier[] | null | undefined,
): PriceTierRow[] {
  if (!tiers) return [];
  return [...tiers]
    .sort((a, b) => a.minQty - b.minQty)
    .map((t) => ({ minQty: String(t.minQty), unitPrice: String(t.unitPrice) }));
}

/**
 * Valida las filas. Devuelve un mensaje de error (es-MX) o null si todo va
 * bien. Reglas: minQty entero ≥ 2 sin duplicados, unitPrice > 0 con ≤ 2
 * decimales, ≤ 10 escalones. NO exige que el precio baje (sólo se advierte
 * visualmente) — espejo de la política del backend.
 */
export function validateTierRows(rows: PriceTierRow[]): string | null {
  if (rows.length > 10) return "Máximo 10 escalones de mayoreo.";
  const seen = new Set<number>();
  for (const r of rows) {
    const minQ = r.minQty.trim();
    const price = r.unitPrice.trim();
    if (!INT_RE.test(minQ) || Number(minQ) < 2) {
      return `Cantidad inválida: cada escalón empieza en un entero ≥ 2 (revisa "${minQ || "—"}").`;
    }
    const n = Number(minQ);
    if (seen.has(n)) {
      return `Hay dos escalones que empiezan en ${n}; usa cantidades distintas.`;
    }
    seen.add(n);
    if (!PRICE_RE.test(price) || Number(price) <= 0) {
      return `Precio inválido en "desde ${n}": usa un número mayor a 0 con hasta 2 decimales.`;
    }
  }
  return null;
}

/** Filas válidas → payload del API (ordenado asc por minQty). */
export function tierRowsToInput(rows: PriceTierRow[]): ApiPriceTier[] {
  return rows
    .map((r) => ({
      minQty: Number(r.minQty.trim()),
      unitPrice: Number(r.unitPrice.trim()),
    }))
    .sort((a, b) => a.minQty - b.minQty);
}

/** Filas individualmente completas y bien formadas (para preview en vivo). */
function parseValidTiers(rows: PriceTierRow[]): ApiPriceTier[] {
  return rows
    .filter(
      (r) =>
        INT_RE.test(r.minQty.trim()) &&
        Number(r.minQty.trim()) >= 2 &&
        PRICE_RE.test(r.unitPrice.trim()) &&
        Number(r.unitPrice.trim()) > 0,
    )
    .map((r) => ({
      minQty: Number(r.minQty.trim()),
      unitPrice: Number(r.unitPrice.trim()),
    }))
    .sort((a, b) => a.minQty - b.minQty);
}

const gridCols = "1fr 1fr 32px";

/**
 * Editor inline reutilizable de escalones de mayoreo. Se monta tanto en el alta
 * como en la ficha del producto. Muestra un preview de rangos en vivo
 * ("1–9 · 10–49 · 50+") con la unidad del producto y advierte (sin bloquear)
 * cuando un precio no baja al subir la cantidad.
 */
export function PriceTiersEditor({
  basePrice,
  unit,
  rows,
  onChange,
}: {
  basePrice: number;
  unit: string;
  rows: PriceTierRow[];
  onChange: (rows: PriceTierRow[]) => void;
}) {
  const update = (index: number, patch: Partial<PriceTierRow>) =>
    onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  const remove = (index: number) =>
    onChange(rows.filter((_, i) => i !== index));
  const add = () => onChange([...rows, { minQty: "", unitPrice: "" }]);

  const unitLabel = unit?.trim() || "uds";
  const valid = parseValidTiers(rows);
  const ranges = tierRanges(basePrice > 0 ? basePrice : 0, valid);

  // Aviso no bloqueante: ¿algún escalón no baja respecto al anterior/base?
  let pricesGoUp = false;
  let prev = basePrice > 0 ? basePrice : Infinity;
  for (const t of valid) {
    if (t.unitPrice >= prev) pricesGoUp = true;
    prev = t.unitPrice;
  }

  return (
    <div className="grid gap-2">
      {rows.length === 0 ? (
        <div className="help">
          Sin escalones. El producto se vende a su precio base en cualquier
          cantidad. Añade un escalón para cobrar más barato por volumen.
        </div>
      ) : (
        <div
          style={{
            border: "1px solid var(--line)",
            borderRadius: "var(--r-md)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: gridCols,
              padding: "8px 10px",
              background: "var(--surface-2)",
              fontSize: 11,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: ".06em",
              borderBottom: "1px solid var(--line)",
              gap: 8,
            }}
          >
            <span>Desde ({unitLabel})</span>
            <span>Precio unitario (MXN)</span>
            <span />
          </div>
          {rows.map((r, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: gridCols,
                padding: "6px 10px",
                borderBottom: i < rows.length - 1 ? "1px solid var(--line)" : 0,
                alignItems: "center",
                gap: 8,
              }}
            >
              <input
                className="input num"
                inputMode="numeric"
                value={r.minQty}
                onChange={(e) =>
                  update(i, { minQty: e.target.value.replace(/[^\d]/g, "") })
                }
                placeholder="10"
                aria-label={`Cantidad mínima del escalón ${i + 1}`}
              />
              <input
                className="input num"
                inputMode="decimal"
                value={r.unitPrice}
                onChange={(e) => update(i, { unitPrice: e.target.value })}
                placeholder="45.00"
                aria-label={`Precio unitario del escalón ${i + 1}`}
              />
              <button
                type="button"
                className="icon-btn"
                onClick={() => remove(i)}
                style={{ width: 24, height: 24, color: "var(--muted)", border: 0 }}
                aria-label={`Quitar escalón ${i + 1}`}
              >
                {I.x}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="btn btn--sm btn--ghost"
          onClick={add}
          disabled={rows.length >= 10}
        >
          {I.plus} Agregar escalón
        </button>
        {rows.length >= 10 && (
          <span className="text-muted text-[11px]">Máximo 10 escalones.</span>
        )}
      </div>

      {/* Preview de rangos en vivo, como lo verá quien venda. */}
      {(valid.length > 0 || basePrice > 0) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {ranges.map((rng) => (
            <span
              key={rng.label}
              className="tag"
              style={
                rng.isBase
                  ? undefined
                  : {
                      background: "var(--accent-soft)",
                      color: "var(--accent-ink)",
                    }
              }
            >
              {rng.label} {unitLabel} → {fmtMXN(rng.unitPrice)}
            </span>
          ))}
        </div>
      )}

      {pricesGoUp && (
        <div className="help" style={{ color: "var(--warn, var(--muted))" }}>
          Aviso: algún precio no baja al subir la cantidad. Se permite (p. ej.
          promociones), pero revisa que sea intencional.
        </div>
      )}
    </div>
  );
}
