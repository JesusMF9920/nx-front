"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { I } from "@/components/icons";
import { InventoryMaterialDetail } from "@/components/inventory-material-detail";
import { InventoryNewMaterialModal } from "@/components/inventory-new-material-modal";
import { InventoryStockAdjustModal } from "@/components/inventory-stock-adjust-modal";
import { InventoryStockEntryModal } from "@/components/inventory-stock-entry-modal";
import { MenuButton, type MenuItem } from "@/components/menu-button";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { ApiError } from "@/lib/api/errors";
import { inventoryApi } from "@/lib/api/inventory";
import type {
  ApiMaterial,
  ApiStockMove,
  ApiStockMoveType,
} from "@/lib/api/types";
import { fmtInt, fmtMXN } from "@/lib/format";

const PAGE_SIZE = 25;

type OrderByKey = "name" | "sku" | "stock" | "createdAt" | "updatedAt";

const ORDER_OPTIONS: { key: OrderByKey; label: string }[] = [
  { key: "name", label: "Nombre (A-Z)" },
  { key: "sku", label: "SKU (A-Z)" },
  { key: "stock", label: "Stock (menor primero)" },
  { key: "createdAt", label: "Más recientes" },
];

export default function InventoryPage() {
  const [materials, setMaterials] = useState<ApiMaterial[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [orderBy, setOrderBy] = useState<OrderByKey>("name");
  const [showInactive, setShowInactive] = useState(false);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<ApiMaterial | null>(null);
  const [selectedMoves, setSelectedMoves] = useState<ApiStockMove[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [editTarget, setEditTarget] = useState<ApiMaterial | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<ApiMaterial | null>(
    null,
  );
  const [moveTarget, setMoveTarget] = useState<
    { material: ApiMaterial; type: ApiStockMoveType } | null
  >(null);

  useEffect(() => {
    const id = setTimeout(() => {
      setDebounced(query.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(id);
  }, [query]);

  const reload = async (targetPage = page) => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await inventoryApi.list({
        skip: (targetPage - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        search: debounced || undefined,
        isActive: showInactive ? undefined : true,
        orderBy,
        order: orderBy === "stock" || orderBy === "createdAt" ? "asc" : "asc",
      });
      setMaterials(res.items);
      setTotal(res.total);
      if (!selectedId && res.items.length > 0) {
        setSelectedId(res.items[0].id);
      }
    } catch (err) {
      setLoadError(
        err instanceof ApiError
          ? err.message
          : "No se pudieron cargar los materiales.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, orderBy, debounced, showInactive]);

  useEffect(() => {
    if (!selectedId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedDetail(null);
      setSelectedMoves([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const [detail, moves] = await Promise.all([
          inventoryApi.get(selectedId),
          inventoryApi.listStockMoves(selectedId, { take: 20 }),
        ]);
        if (cancelled) return;
        setSelectedDetail(detail);
        setSelectedMoves(moves.items);
      } catch {
        if (!cancelled) {
          setSelectedDetail(null);
          setSelectedMoves([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const selected = selectedDetail;

  const refreshSelected = async () => {
    if (!selected) return;
    try {
      const [detail, moves] = await Promise.all([
        inventoryApi.get(selected.id),
        inventoryApi.listStockMoves(selected.id, { take: 20 }),
      ]);
      setSelectedDetail(detail);
      setSelectedMoves(moves.items);
      setMaterials((ms) => ms.map((m) => (m.id === detail.id ? detail : m)));
    } catch {
      // ignore
    }
  };

  const lowStockCount = materials.filter(
    (m) => m.stock <= m.reorderPoint && m.isActive,
  ).length;
  const totalValue = materials.reduce((s, m) => s + m.stock * m.cost, 0);

  const buildRowMenu = (m: ApiMaterial): MenuItem[] => {
    const items: MenuItem[] = [
      { label: "Editar", icon: I.edit, onClick: () => setEditTarget(m) },
    ];
    if (m.isActive) {
      items.push({
        label: "Registrar entrada",
        icon: I.plus,
        onClick: () => setMoveTarget({ material: m, type: "entry" }),
      });
      items.push({
        label: "Registrar salida",
        icon: I.x,
        onClick: () => setMoveTarget({ material: m, type: "exit" }),
      });
      items.push({
        label: "Ajustar stock",
        icon: I.edit,
        onClick: () => setMoveTarget({ material: m, type: "adjust" }),
      });
      items.push({
        label: "Desactivar",
        icon: I.x,
        kind: "danger",
        onClick: () => setDeactivateTarget(m),
      });
    } else {
      items.push({
        label: "Activar",
        icon: I.check,
        onClick: async () => {
          setActionError(null);
          try {
            await inventoryApi.activate(m.id);
            await reload(page);
          } catch (err) {
            setActionError(
              err instanceof ApiError
                ? err.message
                : "No se pudo activar el material.",
            );
          }
        },
      });
    }
    return items;
  };

  return (
    <>
      <PageHeader
        title="Inventario"
        sub={`${total} insumos · ${lowStockCount} bajo stock (en página actual) · ${fmtMXN(totalValue)} valor en página`}
        actions={
          <button className="btn btn--accent" onClick={() => setShowNew(true)}>
            <span>{I.plus}</span>Nuevo material
          </button>
        }
      />

      {(loadError || actionError) && (
        <div
          className="card mb-3 flex items-start gap-2"
          style={{
            padding: 12,
            border: "1px solid var(--danger)",
            color: "var(--danger)",
            background: "var(--danger-soft)",
          }}
          role="alert"
        >
          <span className="flex-1">{loadError ?? actionError}</span>
          {actionError && !loadError && (
            <button
              className="icon-btn"
              type="button"
              onClick={() => setActionError(null)}
              aria-label="Cerrar"
            >
              {I.x}
            </button>
          )}
        </div>
      )}

      <div className="grid gap-5" style={{ gridTemplateColumns: "1.6fr 1fr" }}>
        <div className="card">
          <div className="card__head gap-2 flex-wrap">
            <div className="topbar__search m-0 relative" style={{ width: 240 }}>
              {I.search}
              <input
                placeholder="Buscar por nombre, SKU, ubicación…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query.length > 0 && (
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setQuery("")}
                  aria-label="Limpiar"
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
            <button
              className={`btn btn--sm ${showInactive ? "btn--primary" : "btn--ghost"}`}
              onClick={() => {
                setShowInactive((v) => !v);
                setPage(1);
              }}
            >
              + Inactivos
            </button>
            <div className="spacer" />
            <select
              className="input"
              style={{ width: 200, height: 32, fontSize: 12 }}
              value={orderBy}
              onChange={(e) => {
                setOrderBy(e.target.value as OrderByKey);
                setPage(1);
              }}
              aria-label="Ordenar por"
            >
              {ORDER_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  Orden: {o.label}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="card__body text-muted text-sm">Cargando…</div>
          ) : materials.length === 0 ? (
            <div className="card__body text-muted text-sm">
              {debounced
                ? "Sin coincidencias."
                : "Sin materiales. Crea uno con el botón de arriba."}
            </div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Categoría</th>
                  <th className="text-right">Stock</th>
                  <th className="text-right">Reorden</th>
                  <th>Ubicación</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {materials.map((m) => {
                  const low = m.stock <= m.reorderPoint;
                  return (
                    <tr
                      key={m.id}
                      onClick={() => setSelectedId(m.id)}
                      style={{
                        background: selectedId === m.id ? "var(--surface-2)" : "",
                        opacity: m.isActive ? 1 : 0.6,
                      }}
                    >
                      <td>
                        <div className="font-medium">{m.name}</div>
                        <div className="text-muted text-[11px] font-mono">
                          {m.sku}
                          {!m.isActive && " · Inactivo"}
                        </div>
                      </td>
                      <td>
                        <span className="tag">{m.category}</span>
                      </td>
                      <td
                        className="num text-right"
                        style={{ color: low ? "var(--warn)" : "var(--ink)" }}
                      >
                        {fmtInt(m.stock)} {m.unit}
                      </td>
                      <td className="num text-right text-muted">
                        {m.reorderPoint > 0 ? fmtInt(m.reorderPoint) : "—"}
                      </td>
                      <td className="text-xs text-muted">{m.location ?? "—"}</td>
                      <td>
                        <MenuButton trigger={I.more} items={buildRowMenu(m)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          <div
            className="flex items-center gap-3 text-xs text-muted"
            style={{
              padding: "10px 14px",
              borderTop: "1px solid var(--line)",
            }}
          >
            <span>
              {total === 0
                ? "Sin materiales"
                : `Mostrando ${(page - 1) * PAGE_SIZE + 1}–${Math.min(
                    page * PAGE_SIZE,
                    total,
                  )} de ${total}`}
            </span>
            <div className="spacer" />
            <span className="num">
              Página {page} de {totalPages}
            </span>
            <button
              className="btn btn--sm btn--ghost"
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={loading || page <= 1}
              aria-label="Página anterior"
            >
              {I.chevronLeft}
            </button>
            <button
              className="btn btn--sm btn--ghost"
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={loading || page >= totalPages}
              aria-label="Página siguiente"
            >
              {I.chevronRight}
            </button>
          </div>
        </div>

        {selected ? (
          <InventoryMaterialDetail
            material={selected}
            moves={selectedMoves}
            onEdit={() => setEditTarget(selected)}
            onMove={(type) => setMoveTarget({ material: selected, type })}
            onDeactivate={() => setDeactivateTarget(selected)}
            onVariantsChanged={async () => {
              await refreshSelected();
            }}
            onActivate={async () => {
              setActionError(null);
              try {
                await inventoryApi.activate(selected.id);
                await reload(page);
                await refreshSelected();
              } catch (err) {
                setActionError(
                  err instanceof ApiError
                    ? err.message
                    : "No se pudo activar el material.",
                );
              }
            }}
          />
        ) : (
          <div className="card self-start">
            <div className="card__body text-muted text-sm">
              Selecciona un material para ver detalles.
            </div>
          </div>
        )}
      </div>

      {showNew && (
        <InventoryNewMaterialModal
          categories={Array.from(new Set(materials.map((m) => m.category))).sort(
            (a, b) => a.localeCompare(b, "es"),
          )}
          onClose={() => setShowNew(false)}
          onDone={async (id) => {
            setShowNew(false);
            if (id) setSelectedId(id);
            await reload(page);
          }}
        />
      )}

      {editTarget && (
        <MaterialEditModal
          material={editTarget}
          onClose={() => setEditTarget(null)}
          onDone={async () => {
            setEditTarget(null);
            await refreshSelected();
            await reload(page);
          }}
        />
      )}

      {moveTarget && moveTarget.type !== "adjust" && (
        <InventoryStockEntryModal
          material={moveTarget.material}
          type={moveTarget.type}
          onClose={() => setMoveTarget(null)}
          onDone={async () => {
            setMoveTarget(null);
            await refreshSelected();
            await reload(page);
          }}
        />
      )}

      {moveTarget && moveTarget.type === "adjust" && (
        <InventoryStockAdjustModal
          material={moveTarget.material}
          onClose={() => setMoveTarget(null)}
          onDone={async () => {
            setMoveTarget(null);
            await refreshSelected();
            await reload(page);
          }}
        />
      )}

      {deactivateTarget && (
        <ConfirmDialog
          title="Desactivar material"
          kind="danger"
          confirmLabel="Desactivar"
          message={
            <>
              ¿Desactivar{" "}
              <span className="font-medium text-ink-2">
                {deactivateTarget.name}
              </span>
              ? Su histórico de movimientos se conserva pero dejará de
              aparecer en la lista activa.
            </>
          }
          onClose={() => setDeactivateTarget(null)}
          onConfirm={async () => {
            try {
              await inventoryApi.deactivate(deactivateTarget.id);
              setDeactivateTarget(null);
              await reload(page);
              await refreshSelected();
            } catch (err) {
              throw new Error(
                err instanceof ApiError
                  ? err.message
                  : "No se pudo desactivar el material.",
              );
            }
          }}
        />
      )}
    </>
  );
}

function MaterialEditModal({
  material,
  onClose,
  onDone,
}: {
  material: ApiMaterial;
  onClose: () => void;
  onDone: () => void | Promise<void>;
}) {
  const [sku, setSku] = useState(material.sku);
  const [name, setName] = useState(material.name);
  const [category, setCategory] = useState(material.category);
  const [unit, setUnit] = useState(material.unit);
  const [reorderPoint, setReorderPoint] = useState(
    String(material.reorderPoint),
  );
  const [cost, setCost] = useState(String(material.cost));
  const [location, setLocation] = useState(material.location ?? "");
  const [supplierName, setSupplierName] = useState(material.supplierName ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    const costNum = Number(cost);
    const reorderNum = Number(reorderPoint);
    if (!Number.isFinite(costNum) || costNum < 0) {
      setError("El costo debe ser un número >= 0.");
      return;
    }
    if (!Number.isInteger(reorderNum) || reorderNum < 0) {
      setError("Punto de reorden debe ser un entero >= 0.");
      return;
    }
    setSubmitting(true);
    try {
      await inventoryApi.update(material.id, {
        sku: sku.trim(),
        name: name.trim(),
        category: category.trim(),
        unit: unit.trim() || "pieza",
        reorderPoint: reorderNum,
        cost: costNum,
        location: location.trim() || null,
        supplierName: supplierName.trim() || null,
      });
      await onDone();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.status === 409
            ? "Ya existe un material con ese SKU."
            : err.message
          : "No se pudo guardar.",
      );
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Editar material"
      onClose={onClose}
      width={640}
      footer={
        <>
          <button className="btn btn--ghost" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn btn--accent"
            type="submit"
            form="material-form"
            disabled={submitting}
          >
            {submitting ? "Guardando…" : "Guardar cambios"}
          </button>
        </>
      }
    >
      <form id="material-form" onSubmit={submit} className="grid grid-cols-2 gap-3.5">
        <div className="field">
          <span className="label">SKU</span>
          <input
            className="input"
            value={sku}
            onChange={(e) => setSku(e.target.value.toUpperCase())}
            required
            maxLength={60}
          />
        </div>
        <div className="field">
          <span className="label">Categoría</span>
          <input
            className="input"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            maxLength={80}
          />
        </div>
        <div className="field col-span-full">
          <span className="label">Nombre</span>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={180}
          />
        </div>
        <div className="field">
          <span className="label">Unidad</span>
          <input
            className="input"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="hoja, m², kg…"
            maxLength={20}
          />
        </div>
        <div className="field">
          <span className="label">Costo / unidad (MXN)</span>
          <input
            className="input"
            type="number"
            step="0.01"
            min={0}
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <span className="label">Punto de reorden</span>
          <input
            className="input"
            type="number"
            min={0}
            step={1}
            value={reorderPoint}
            onChange={(e) => setReorderPoint(e.target.value)}
          />
        </div>
        <div className="field">
          <span className="label">Ubicación</span>
          <input
            className="input"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Bodega A · Rack 3"
            maxLength={120}
          />
        </div>
        <div className="field">
          <span className="label">Proveedor</span>
          <input
            className="input"
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
            maxLength={120}
          />
        </div>
        {error && (
          <div
            className="col-span-full rounded-md text-xs"
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
