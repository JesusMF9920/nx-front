"use client";

import { useEffect, useMemo, useState } from "react";
import { I } from "@/components/icons";
import { Modal } from "@/components/modal";
import { SkeletonText } from "@/components/skeleton";
import { ApiError } from "@/lib/api/errors";
import { inventoryApi } from "@/lib/api/inventory";
import { purchasesApi } from "@/lib/api/purchases";
import { suppliersApi } from "@/lib/api/suppliers";
import type {
  ApiMaterial,
  ApiMaterialVariant,
  ApiSupplier,
} from "@/lib/api/types";
import { fmtMXN } from "@/lib/format";
import { useToast } from "@/lib/toast/toast-context";

/** Cantidad sugerida: lleva el stock a ~2× el punto de reorden. */
function suggestedQty(x: { stock: number; reorderPoint: number }): number {
  return Math.max(Math.round(x.reorderPoint * 2 - x.stock), x.reorderPoint);
}

/** Línea sugerida: un material sin variantes o una variante concreta. */
export type SuggestedLine = {
  /** Clave estable para el Set de selección: `${materialId}:${variantId ?? ""}`. */
  key: string;
  material: ApiMaterial;
  /** Presente ⇒ la línea es de una variante (talla|color) del material. */
  variant: ApiMaterialVariant | null;
  stock: number;
  reorderPoint: number;
  /** Cantidad sugerida a comprar. */
  qty: number;
  /** Costo total de la línea (qty × costo del material). */
  lineCost: number;
};

/**
 * Líneas bajo punto de reorden de un material. Si tiene variantes, el gatillo
 * es por variante (el material raíz suele tener reorden 0 y stock = Σ variantes);
 * si no, se evalúa el material como un todo.
 */
export function suggestedLinesFor(m: ApiMaterial): SuggestedLine[] {
  if (m.variants.length > 0) {
    return m.variants
      .filter((v) => v.reorderPoint > 0 && v.stock <= v.reorderPoint)
      .map((v) => {
        const qty = suggestedQty(v);
        return {
          key: `${m.id}:${v.id}`,
          material: m,
          variant: v,
          stock: v.stock,
          reorderPoint: v.reorderPoint,
          qty,
          lineCost: qty * m.cost,
        };
      });
  }
  if (m.reorderPoint > 0 && m.stock <= m.reorderPoint) {
    const qty = suggestedQty(m);
    return [
      {
        key: `${m.id}:`,
        material: m,
        variant: null,
        stock: m.stock,
        reorderPoint: m.reorderPoint,
        qty,
        lineCost: qty * m.cost,
      },
    ];
  }
  return [];
}

type Group = { supplier: ApiSupplier; lines: SuggestedLine[] };

export function PurchaseSuggestedModal({
  onClose,
  onGenerated,
}: {
  onClose: () => void;
  onGenerated: (created: number) => void;
}) {
  const [materials, setMaterials] = useState<ApiMaterial[]>([]);
  const [suppliers, setSuppliers] = useState<ApiSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [mat, sup] = await Promise.all([
          inventoryApi.list({ take: 100, isActive: true, orderBy: "name" }),
          suppliersApi.list({ take: 100, isActive: true, orderBy: "name" }),
        ]);
        if (cancelled) return;
        setMaterials(mat.items);
        setSuppliers(sup.items);
        // Por defecto, toda línea auto-ordenable (con proveedor coincidente)
        // queda marcada — sea material o variante.
        const sByName = new Map<string, ApiSupplier>();
        for (const s of sup.items) sByName.set(s.name.trim().toLowerCase(), s);
        const keys: string[] = [];
        for (const m of mat.items) {
          if (!m.supplierName) continue;
          if (!sByName.has(m.supplierName.trim().toLowerCase())) continue;
          for (const line of suggestedLinesFor(m)) keys.push(line.key);
        }
        setChecked(new Set(keys));
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "No se pudieron cargar las sugerencias.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const supplierByName = useMemo(() => {
    const map = new Map<string, ApiSupplier>();
    for (const s of suppliers) map.set(s.name.trim().toLowerCase(), s);
    return map;
  }, [suppliers]);

  // Líneas bajo punto de reorden que se pueden auto-ordenar (material o
  // variante) agrupadas por el proveedor del material. Las variantes heredan el
  // proveedor de su material padre.
  const groups = useMemo<Group[]>(() => {
    const bySupplier = new Map<string, Group>();
    for (const m of materials) {
      if (!m.supplierName) continue;
      const supplier = supplierByName.get(m.supplierName.trim().toLowerCase());
      if (!supplier) continue;
      const lines = suggestedLinesFor(m);
      if (lines.length === 0) continue;
      const g = bySupplier.get(supplier.id) ?? { supplier, lines: [] };
      g.lines.push(...lines);
      bySupplier.set(supplier.id, g);
    }
    return [...bySupplier.values()].sort((a, b) =>
      a.supplier.name.localeCompare(b.supplier.name),
    );
  }, [materials, supplierByName]);

  // Líneas bajo reorden que NO entran en ninguna sugerencia (sin proveedor
  // coincidente): se reportan para no perderlas de vista.
  const excludedCount = useMemo(() => {
    const grouped = new Set(groups.flatMap((g) => g.lines.map((l) => l.key)));
    let count = 0;
    for (const m of materials) {
      for (const line of suggestedLinesFor(m)) {
        if (!grouped.has(line.key)) count += 1;
      }
    }
    return count;
  }, [materials, groups]);

  const toggle = (key: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const selectedCount = groups.reduce(
    (acc, g) => acc + g.lines.filter((l) => checked.has(l.key)).length,
    0,
  );
  const supplierOrders = groups.filter((g) =>
    g.lines.some((l) => checked.has(l.key)),
  ).length;

  const generate = async () => {
    setGenerating(true);
    setError(null);
    // Cada proveedor es una OC independiente: si una falla, las demás siguen y
    // se reportan los parciales (no se pierden las ya creadas).
    let created = 0;
    let failed = 0;
    const done = new Set<string>();
    for (const g of groups) {
      const chosen = g.lines.filter((l) => checked.has(l.key));
      if (chosen.length === 0) continue;
      try {
        await purchasesApi.create({
          supplierId: g.supplier.id,
          lines: chosen.map((l) => ({
            materialId: l.material.id,
            ...(l.variant ? { materialVariantId: l.variant.id } : {}),
            qty: l.qty,
            unitCost: l.material.cost,
          })),
        });
        created += 1;
        for (const l of chosen) done.add(l.key);
      } catch {
        failed += 1;
      }
    }
    if (failed === 0) {
      toast.success(
        created === 1
          ? "Orden de compra creada"
          : `${created} órdenes de compra creadas`,
      );
      onGenerated(created);
      return;
    }
    // Fallo parcial: desmarca las ya creadas (un reintento sólo cubre las que
    // fallaron) y deja el modal abierto con el resumen.
    setChecked((prev) => {
      const next = new Set(prev);
      for (const key of done) next.delete(key);
      return next;
    });
    setError(
      `Se generaron ${created} OC; ${failed} fallaron. Reintenta las restantes o cierra.`,
    );
    setGenerating(false);
  };

  return (
    <Modal
      title="Órdenes de compra sugeridas"
      onClose={onClose}
      width={720}
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose} disabled={generating}>
            Cerrar
          </button>
          <button
            className="btn btn--accent"
            onClick={() => void generate()}
            disabled={selectedCount === 0 || generating}
          >
            {I.check} Generar {supplierOrders} OC
          </button>
        </>
      }
    >
      {error && (
        <div
          className="mb-3 text-[13px]"
          style={{
            padding: 10,
            border: "1px solid var(--danger)",
            color: "var(--danger)",
            background: "var(--danger-soft)",
            borderRadius: 8,
          }}
          role="alert"
        >
          {error}
        </div>
      )}

      {loading ? (
        <SkeletonText lines={5} />
      ) : groups.length === 0 ? (
        <div className="text-muted text-sm">
          No hay insumos por debajo del punto de reorden con proveedor
          asignado.
        </div>
      ) : (
        <>
          <div className="text-xs text-muted mb-3">
            Se generará una OC borrador por proveedor con las líneas marcadas.
            {excludedCount > 0 && (
              <>
                {" "}
                <span style={{ color: "var(--warn)" }}>
                  {excludedCount} línea{excludedCount === 1 ? "" : "s"} bajo
                  reorden no se muestra{excludedCount === 1 ? "" : "n"} (sin
                  proveedor coincidente) — ordénala
                  {excludedCount === 1 ? "" : "s"} manualmente.
                </span>
              </>
            )}
          </div>
          {groups.map((g) => {
            const total = g.lines
              .filter((l) => checked.has(l.key))
              .reduce((s, l) => s + l.lineCost, 0);
            return (
              <div
                key={g.supplier.id}
                className="border border-line rounded-md mb-2.5 overflow-hidden"
              >
                <div className="px-3.5 py-2.5 bg-surface-2 flex items-center gap-2.5">
                  <strong>{g.supplier.name}</strong>
                  <span className="tag text-[10px]">
                    {g.lines.length} línea{g.lines.length === 1 ? "" : "s"}
                  </span>
                  <div className="spacer" />
                  <span className="num font-semibold">{fmtMXN(total)}</span>
                </div>
                {g.lines.map((l) => (
                  <label
                    key={l.key}
                    className="flex px-3.5 py-2 text-xs items-center gap-2.5 cursor-pointer"
                    style={{ borderTop: "1px solid var(--line)" }}
                  >
                    <input
                      type="checkbox"
                      checked={checked.has(l.key)}
                      onChange={() => toggle(l.key)}
                    />
                    <div className="flex-1">
                      <div className="font-medium flex items-center gap-1.5">
                        <span>{l.material.name}</span>
                        {l.variant && (
                          <span className="tag text-[10px]">
                            {l.variant.label || l.variant.code}
                          </span>
                        )}
                      </div>
                      <div className="text-muted text-[10px]">
                        Stock <span className="num">{l.stock}</span> · Reorden{" "}
                        <span className="num">{l.reorderPoint}</span>{" "}
                        {l.material.unit}
                      </div>
                    </div>
                    <div className="num">
                      {l.qty} {l.material.unit}
                    </div>
                    <div
                      className="num text-right font-semibold"
                      style={{ width: 80 }}
                    >
                      {fmtMXN(l.lineCost)}
                    </div>
                  </label>
                ))}
              </div>
            );
          })}
        </>
      )}
    </Modal>
  );
}
