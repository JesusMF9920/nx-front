"use client";

import { useEffect, useMemo, useState } from "react";
import { I } from "@/components/icons";
import { Modal } from "@/components/modal";
import { SkeletonText } from "@/components/skeleton";
import { ApiError } from "@/lib/api/errors";
import { inventoryApi } from "@/lib/api/inventory";
import { purchasesApi } from "@/lib/api/purchases";
import { suppliersApi } from "@/lib/api/suppliers";
import type { ApiMaterial, ApiSupplier } from "@/lib/api/types";
import { fmtMXN } from "@/lib/format";
import { useToast } from "@/lib/toast/toast-context";

/** Cantidad sugerida: lleva el stock a ~2× el punto de reorden. */
function suggestedQty(m: ApiMaterial): number {
  return Math.max(Math.round(m.reorderPoint * 2 - m.stock), m.reorderPoint);
}

type Group = { supplier: ApiSupplier; materials: ApiMaterial[] };

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
        // Por defecto, todo lo auto-ordenable queda marcado.
        const ids = mat.items
          .filter(
            (m) =>
              m.reorderPoint > 0 &&
              m.stock <= m.reorderPoint &&
              m.variants.length === 0 &&
              !!m.supplierName,
          )
          .map((m) => m.id);
        setChecked(new Set(ids));
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

  // Materiales bajo punto de reorden que se pueden auto-ordenar:
  // sin variantes (la talla exige captura manual) y con proveedor conocido.
  const groups = useMemo<Group[]>(() => {
    const bySupplier = new Map<string, Group>();
    for (const m of materials) {
      if (m.reorderPoint <= 0 || m.stock > m.reorderPoint) continue;
      if (m.variants.length > 0 || !m.supplierName) continue;
      const supplier = supplierByName.get(m.supplierName.trim().toLowerCase());
      if (!supplier) continue;
      const g = bySupplier.get(supplier.id) ?? { supplier, materials: [] };
      g.materials.push(m);
      bySupplier.set(supplier.id, g);
    }
    return [...bySupplier.values()].sort((a, b) =>
      a.supplier.name.localeCompare(b.supplier.name),
    );
  }, [materials, supplierByName]);

  // Insumos bajo reorden que NO entran en ninguna sugerencia (con tallas o sin
  // proveedor coincidente): se reportan para no perderlos de vista.
  const excludedCount = useMemo(() => {
    const low = materials.filter(
      (m) => m.reorderPoint > 0 && m.stock <= m.reorderPoint,
    );
    const grouped = new Set(
      groups.flatMap((g) => g.materials.map((m) => m.id)),
    );
    return low.filter((m) => !grouped.has(m.id)).length;
  }, [materials, groups]);

  const toggle = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectedCount = groups.reduce(
    (acc, g) => acc + g.materials.filter((m) => checked.has(m.id)).length,
    0,
  );
  const supplierOrders = groups.filter((g) =>
    g.materials.some((m) => checked.has(m.id)),
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
      const chosen = g.materials.filter((m) => checked.has(m.id));
      if (chosen.length === 0) continue;
      try {
        await purchasesApi.create({
          supplierId: g.supplier.id,
          lines: chosen.map((m) => ({
            materialId: m.id,
            qty: suggestedQty(m),
            unitCost: m.cost,
          })),
        });
        created += 1;
        for (const m of chosen) done.add(m.id);
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
      for (const id of done) next.delete(id);
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
          asignado. (Los materiales con tallas se ordenan manualmente.)
        </div>
      ) : (
        <>
          <div className="text-xs text-muted mb-3">
            Se generará una OC borrador por proveedor con los insumos marcados.
            {excludedCount > 0 && (
              <>
                {" "}
                <span style={{ color: "var(--warn)" }}>
                  {excludedCount} insumo{excludedCount === 1 ? "" : "s"} bajo
                  reorden no se muestra{excludedCount === 1 ? "" : "n"} (con
                  tallas o sin proveedor coincidente) — ordénalo
                  {excludedCount === 1 ? "" : "s"} manualmente.
                </span>
              </>
            )}
          </div>
          {groups.map((g) => {
            const total = g.materials
              .filter((m) => checked.has(m.id))
              .reduce((s, m) => s + suggestedQty(m) * m.cost, 0);
            return (
              <div
                key={g.supplier.id}
                className="border border-line rounded-md mb-2.5 overflow-hidden"
              >
                <div className="px-3.5 py-2.5 bg-surface-2 flex items-center gap-2.5">
                  <strong>{g.supplier.name}</strong>
                  <span className="tag text-[10px]">
                    {g.materials.length} insumos
                  </span>
                  <div className="spacer" />
                  <span className="num font-semibold">{fmtMXN(total)}</span>
                </div>
                {g.materials.map((m) => (
                  <label
                    key={m.id}
                    className="flex px-3.5 py-2 text-xs items-center gap-2.5 cursor-pointer"
                    style={{ borderTop: "1px solid var(--line)" }}
                  >
                    <input
                      type="checkbox"
                      checked={checked.has(m.id)}
                      onChange={() => toggle(m.id)}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{m.name}</div>
                      <div className="text-muted text-[10px]">
                        Stock <span className="num">{m.stock}</span> · Reorden{" "}
                        <span className="num">{m.reorderPoint}</span> {m.unit}
                      </div>
                    </div>
                    <div className="num">
                      {suggestedQty(m)} {m.unit}
                    </div>
                    <div
                      className="num text-right font-semibold"
                      style={{ width: 80 }}
                    >
                      {fmtMXN(suggestedQty(m) * m.cost)}
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
