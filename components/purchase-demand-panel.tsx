"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { I } from "@/components/icons";
import { ApiError } from "@/lib/api/errors";
import { purchasesApi } from "@/lib/api/purchases";
import { suppliersApi } from "@/lib/api/suppliers";
import type { ApiMaterialDemand, ApiSupplier } from "@/lib/api/types";
import { fmtMXN } from "@/lib/format";

type Group = { supplier: ApiSupplier; demands: ApiMaterialDemand[] };

/**
 * "Por comprar": junta la demanda pendiente de insumos bajo demanda de los
 * pedidos, agrupada por proveedor, y crea una OC por proveedor (ligada al
 * pedido). Espejo del modal de sugeridos pero con fuente = demanda de pedidos.
 */
export function PurchaseDemandPanel({
  canCreate,
  onCreated,
}: {
  canCreate: boolean;
  /** Navega a la OC creada cuando se generó exactamente una. */
  onCreated: (folio: string) => void;
}) {
  const [demands, setDemands] = useState<ApiMaterialDemand[]>([]);
  const [suppliers, setSuppliers] = useState<ApiSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dem, sup] = await Promise.all([
        purchasesApi.listDemand(),
        suppliersApi.list({ take: 100, isActive: true, orderBy: "name" }),
      ]);
      setDemands(dem.items);
      setSuppliers(sup.items);
      setChecked(new Set(dem.items.map((d) => d.id)));
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudo cargar la demanda de compra.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const supplierByName = useMemo(() => {
    const map = new Map<string, ApiSupplier>();
    for (const s of suppliers) map.set(s.name.trim().toLowerCase(), s);
    return map;
  }, [suppliers]);

  // Agrupa por proveedor (resuelto desde el snapshot supplierName). La demanda
  // sin proveedor coincidente se reporta aparte (se compra a mano).
  const groups = useMemo<Group[]>(() => {
    const bySupplier = new Map<string, Group>();
    for (const d of demands) {
      if (!d.supplierName) continue;
      const supplier = supplierByName.get(d.supplierName.trim().toLowerCase());
      if (!supplier) continue;
      const g = bySupplier.get(supplier.id) ?? { supplier, demands: [] };
      g.demands.push(d);
      bySupplier.set(supplier.id, g);
    }
    return [...bySupplier.values()].sort((a, b) =>
      a.supplier.name.localeCompare(b.supplier.name),
    );
  }, [demands, supplierByName]);

  const excludedCount = useMemo(() => {
    const grouped = new Set(groups.flatMap((g) => g.demands.map((d) => d.id)));
    return demands.filter((d) => !grouped.has(d.id)).length;
  }, [demands, groups]);

  const toggle = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const supplierOrders = groups.filter((g) =>
    g.demands.some((d) => checked.has(d.id)),
  ).length;
  const selectedCount = groups.reduce(
    (acc, g) => acc + g.demands.filter((d) => checked.has(d.id)).length,
    0,
  );

  const generate = async () => {
    setGenerating(true);
    setError(null);
    setInfo(null);
    let created = 0;
    let failed = 0;
    let lastFolio = "";
    for (const g of groups) {
      const chosen = g.demands.filter((d) => checked.has(d.id));
      if (chosen.length === 0) continue;
      try {
        const res = await purchasesApi.createOrdersFromDemand({
          supplierId: g.supplier.id,
          demandIds: chosen.map((d) => d.id),
        });
        created += 1;
        lastFolio = res.folio;
      } catch {
        failed += 1;
      }
    }
    if (created === 1 && failed === 0) {
      onCreated(lastFolio);
      return;
    }
    if (created > 0) setInfo(`Se generaron ${created} OC.`);
    if (failed > 0) setError(`${failed} OC fallaron. Reintenta las restantes.`);
    await load();
    setGenerating(false);
  };

  const lineQtyCost = (d: ApiMaterialDemand) => d.qty * d.unitCost;

  return (
    <div className="p-4">
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
      {info && (
        <div className="mb-3 text-[13px] text-accent-ink" role="status">
          {info}
        </div>
      )}

      <div className="flex items-center gap-2.5 mb-3">
        <div className="text-xs text-muted flex-1">
          Insumos bajo demanda que falta comprar para los pedidos. Se genera una
          OC borrador por proveedor, ligada al pedido.
          {excludedCount > 0 && (
            <span style={{ color: "var(--warn)" }}>
              {" "}
              {excludedCount} sin proveedor coincidente — cómpralos a mano.
            </span>
          )}
        </div>
        {canCreate && groups.length > 0 && (
          <button
            className="btn btn--accent btn--sm"
            type="button"
            onClick={() => void generate()}
            disabled={selectedCount === 0 || generating}
          >
            {I.check} Generar {supplierOrders} OC
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-muted text-sm">Cargando demanda…</div>
      ) : groups.length === 0 ? (
        <div className="text-muted text-sm">
          No hay insumos pendientes por comprar.
        </div>
      ) : (
        groups.map((g) => {
          const total = g.demands
            .filter((d) => checked.has(d.id))
            .reduce((s, d) => s + lineQtyCost(d), 0);
          return (
            <div
              key={g.supplier.id}
              className="border border-line rounded-md mb-2.5 overflow-hidden"
            >
              <div className="px-3.5 py-2.5 bg-surface-2 flex items-center gap-2.5">
                <strong>{g.supplier.name}</strong>
                <span className="tag text-[10px]">
                  {g.demands.length} insumo{g.demands.length === 1 ? "" : "s"}
                </span>
                <div className="spacer" />
                <span className="num font-semibold">{fmtMXN(total)}</span>
              </div>
              {g.demands.map((d) => (
                <label
                  key={d.id}
                  className="flex px-3.5 py-2 text-xs items-center gap-2.5 cursor-pointer"
                  style={{ borderTop: "1px solid var(--line)" }}
                >
                  <input
                    type="checkbox"
                    checked={checked.has(d.id)}
                    onChange={() => toggle(d.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">
                      {d.materialName}
                      {d.materialVariantCode ? ` · ${d.materialVariantCode}` : ""}
                    </div>
                    <div className="text-muted text-[10px]">
                      Pedido <span className="font-mono">{d.orderFolio}</span> ·{" "}
                      {d.clientName}
                    </div>
                  </div>
                  <div className="num">
                    {d.qty} {d.unit}
                  </div>
                  <div
                    className="num text-right font-semibold"
                    style={{ width: 80 }}
                  >
                    {fmtMXN(lineQtyCost(d))}
                  </div>
                </label>
              ))}
            </div>
          );
        })
      )}
    </div>
  );
}
