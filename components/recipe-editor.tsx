"use client";

import { useEffect, useState } from "react";
import { I } from "@/components/icons";
import type { RecipeItemInput } from "@/lib/api/catalog";
import { ApiError } from "@/lib/api/errors";
import { inventoryApi } from "@/lib/api/inventory";
import type { ApiMaterial } from "@/lib/api/types";

export type RecipeRow = {
  materialId: string;
  materialName: string;
  materialSku: string;
  materialUnit: string;
  /** Texto del input; decimal > 0 con hasta 3 decimales. */
  qty: string;
  byVariant: boolean;
  note: string;
};

const QTY_RE = /^\d+(\.\d{1,3})?$/;

export function validateRecipeRows(rows: RecipeRow[]): string | null {
  for (const r of rows) {
    const qty = r.qty.trim();
    if (!QTY_RE.test(qty) || Number(qty) <= 0) {
      return `Cantidad inválida para "${r.materialName}": usa un número mayor a 0 con hasta 3 decimales.`;
    }
  }
  return null;
}

export function recipeRowsToInput(rows: RecipeRow[]): RecipeItemInput[] {
  return rows.map((r) => ({
    materialId: r.materialId,
    qty: Number(r.qty.trim()),
    byVariant: r.byVariant,
    note: r.note.trim() || null,
  }));
}

export function MaterialSearchPicker({
  onSelect,
  placeholder = "Buscar material por nombre o SKU…",
  onlyWithVariants = false,
  excludeIds,
}: {
  onSelect: (material: ApiMaterial) => void;
  placeholder?: string;
  /** Sólo ofrecer materiales que ya tienen variantes (p. ej. tallas). */
  onlyWithVariants?: boolean;
  excludeIds?: string[];
}) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [results, setResults] = useState<ApiMaterial[]>([]);
  const [loadedFor, setLoadedFor] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(id);
  }, [query]);

  useEffect(() => {
    if (!debounced) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await inventoryApi.list({
          search: debounced,
          isActive: true,
          take: 8,
        });
        if (cancelled) return;
        setResults(res.items);
        setSearchError(null);
      } catch (err) {
        if (cancelled) return;
        setResults([]);
        setSearchError(
          err instanceof ApiError
            ? err.message
            : "No se pudieron buscar materiales.",
        );
      } finally {
        if (!cancelled) setLoadedFor(debounced);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const searching = debounced !== "" && loadedFor !== debounced;
  const visible = results.filter(
    (m) =>
      !(excludeIds ?? []).includes(m.id) &&
      (!onlyWithVariants || m.variants.length > 0),
  );

  return (
    <div className="grid gap-1.5">
      <div className="topbar__search m-0 relative" style={{ width: "100%" }}>
        {I.search}
        <input
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.preventDefault();
          }}
        />
        {query.length > 0 && (
          <button
            type="button"
            className="icon-btn"
            onClick={() => setQuery("")}
            aria-label="Limpiar búsqueda"
            style={{
              position: "absolute",
              right: 4,
              top: "50%",
              transform: "translateY(-50%)",
            }}
          >
            {I.x}
          </button>
        )}
      </div>
      {debounced && (
        <div
          style={{
            border: "1px solid var(--line)",
            borderRadius: "var(--r-md)",
            overflow: "hidden",
          }}
        >
          {searching ? (
            <div className="text-muted text-xs" style={{ padding: "8px 10px" }}>
              Buscando…
            </div>
          ) : searchError ? (
            <div
              className="text-xs"
              style={{ padding: "8px 10px", color: "var(--danger)" }}
              role="alert"
            >
              {searchError}
            </div>
          ) : visible.length === 0 ? (
            <div className="text-muted text-xs" style={{ padding: "8px 10px" }}>
              {onlyWithVariants
                ? "Sin materiales con variantes que coincidan."
                : "Sin coincidencias."}
            </div>
          ) : (
            visible.map((m, i) => (
              <button
                key={m.id}
                type="button"
                className="w-full text-left flex items-center gap-2 cursor-pointer"
                style={{
                  padding: "8px 10px",
                  background: "var(--surface)",
                  border: 0,
                  borderTop: i > 0 ? "1px solid var(--line)" : 0,
                  font: "inherit",
                  color: "var(--ink)",
                }}
                onClick={() => {
                  onSelect(m);
                  setQuery("");
                }}
              >
                <span className="text-[13px] font-medium">{m.name}</span>
                <span className="text-muted text-[11px] font-mono">{m.sku}</span>
                <span className="spacer" />
                {m.variants.length > 0 && (
                  <span className="tag">{m.variants.length} variantes</span>
                )}
                <span className="text-muted text-[11px]">{m.unit}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function RecipeEditor({
  rows,
  onChange,
}: {
  rows: RecipeRow[];
  onChange: (rows: RecipeRow[]) => void;
}) {
  const update = (index: number, patch: Partial<RecipeRow>) =>
    onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  const remove = (index: number) =>
    onChange(rows.filter((_, i) => i !== index));

  const gridCols = "1.3fr 100px 90px 1fr 32px";

  return (
    <div className="grid gap-2">
      <MaterialSearchPicker
        excludeIds={rows.map((r) => r.materialId)}
        onSelect={(m) =>
          onChange([
            ...rows,
            {
              materialId: m.id,
              materialName: m.name,
              materialSku: m.sku,
              materialUnit: m.unit,
              qty: "1",
              byVariant: m.variants.length > 0,
              note: "",
            },
          ])
        }
      />
      {rows.length === 0 ? (
        <div className="help">
          Sin insumos. Busca un material arriba para añadirlo a la receta.
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
            <span>Material</span>
            <span style={{ textAlign: "right" }}>Cantidad</span>
            <span style={{ textAlign: "center" }}>Por variante</span>
            <span>Nota</span>
            <span />
          </div>
          {rows.map((r, i) => (
            <div
              key={r.materialId}
              style={{
                display: "grid",
                gridTemplateColumns: gridCols,
                padding: "6px 10px",
                borderBottom: i < rows.length - 1 ? "1px solid var(--line)" : 0,
                alignItems: "center",
                gap: 8,
              }}
            >
              <div className="min-w-0">
                <div className="text-[13px] font-medium truncate">
                  {r.materialName}
                </div>
                <div className="text-muted text-[11px] font-mono">
                  {r.materialSku}
                  {r.materialUnit ? ` · ${r.materialUnit}` : ""}
                </div>
              </div>
              <input
                className="input num"
                inputMode="decimal"
                value={r.qty}
                onChange={(e) => update(i, { qty: e.target.value })}
                style={{ textAlign: "right" }}
                placeholder="1"
                aria-label={`Cantidad de ${r.materialName}`}
              />
              <label className="flex items-center justify-center">
                <input
                  type="checkbox"
                  checked={r.byVariant}
                  onChange={(e) => update(i, { byVariant: e.target.checked })}
                  aria-label={`Descontar ${r.materialName} por variante`}
                />
              </label>
              <input
                className="input"
                value={r.note}
                onChange={(e) => update(i, { note: e.target.value })}
                placeholder="Opcional"
                maxLength={200}
                aria-label={`Nota para ${r.materialName}`}
              />
              <button
                type="button"
                className="icon-btn"
                onClick={() => remove(i)}
                style={{ width: 24, height: 24, color: "var(--muted)", border: 0 }}
                aria-label={`Quitar ${r.materialName}`}
              >
                {I.x}
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="help">
        Cantidad por unidad vendida (hasta 3 decimales). “Por variante”
        descuenta el insumo de la variante elegida en la venta (p. ej. la
        talla).
      </div>
    </div>
  );
}
