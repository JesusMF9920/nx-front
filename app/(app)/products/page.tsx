"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { I } from "@/components/icons";
import { MenuButton, type MenuItem } from "@/components/menu-button";
import { Modal } from "@/components/modal";
import { NewProductForm } from "@/components/new-product-form";
import { PageHeader } from "@/components/page-header";
import { ProductDetail } from "@/components/product-detail";
import { usePermission } from "@/lib/auth/auth-context";
import { catalogApi } from "@/lib/api/catalog";
import { ApiError } from "@/lib/api/errors";
import type {
  ApiProduct,
  ApiProductDetail,
  ApiProductSource,
} from "@/lib/api/types";
import { fmtInt, fmtMXN } from "@/lib/format";

type SourceFilter = "all" | ApiProductSource;
type OrderByKey =
  | "createdAt"
  | "name"
  | "sku"
  | "price"
  | "stock"
  | "updatedAt";

const PAGE_SIZE = 25;

const SOURCE_FILTERS: { key: SourceFilter; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "internal", label: "Internos" },
  { key: "supplier", label: "Proveedor" },
];

const ORDER_OPTIONS: { key: OrderByKey; label: string }[] = [
  { key: "createdAt", label: "Más recientes" },
  { key: "name", label: "Nombre (A-Z)" },
  { key: "sku", label: "SKU (A-Z)" },
  { key: "price", label: "Precio (menor primero)" },
  { key: "stock", label: "Stock (menor primero)" },
];

function sourceLabel(s: ApiProductSource): string {
  return s === "internal" ? "Interno" : "Proveedor";
}

export default function ProductsPage() {
  const canWrite = usePermission("catalog.products.write");
  const canDeactivate = usePermission("catalog.products.deactivate");
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [showInactive, setShowInactive] = useState(false);
  const [orderBy, setOrderBy] = useState<OrderByKey>("createdAt");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] =
    useState<ApiProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [editTarget, setEditTarget] = useState<ApiProduct | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<ApiProduct | null>(
    null,
  );

  useEffect(() => {
    const id = setTimeout(() => {
      setDebounced(query.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(id);
  }, [query]);

  const changeSource = (s: SourceFilter) => {
    setSourceFilter(s);
    setPage(1);
  };
  const changeOrderBy = (o: OrderByKey) => {
    setOrderBy(o);
    setPage(1);
  };
  const toggleInactive = () => {
    setShowInactive((v) => !v);
    setPage(1);
  };

  const reload = async (targetPage = page) => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await catalogApi.list({
        skip: (targetPage - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        search: debounced || undefined,
        source: sourceFilter === "all" ? undefined : sourceFilter,
        isActive: showInactive ? undefined : true,
        orderBy,
        order: orderBy === "name" || orderBy === "sku" ? "asc" : "desc",
      });
      setProducts(res.items);
      setTotal(res.total);
      if (!selectedId && res.items.length > 0) {
        setSelectedId(res.items[0].id);
      }
    } catch (err) {
      setLoadError(
        err instanceof ApiError
          ? err.message
          : "No se pudieron cargar los productos.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sourceFilter, debounced, orderBy, showInactive]);

  useEffect(() => {
    if (!selectedId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedDetail(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const fresh = await catalogApi.get(selectedId);
        if (!cancelled) setSelectedDetail(fresh);
      } catch {
        if (!cancelled) setSelectedDetail(null);
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
      const fresh = await catalogApi.get(selected.id);
      setSelectedDetail(fresh);
      setProducts((ps) => ps.map((p) => (p.id === fresh.id ? fresh : p)));
    } catch {
      // ignore
    }
  };

  const buildRowMenu = (p: ApiProduct): MenuItem[] => {
    const items: MenuItem[] = [];
    if (canWrite) {
      items.push({
        label: "Editar",
        icon: I.edit,
        onClick: () => setEditTarget(p),
      });
    }
    if (canDeactivate) {
      if (p.isActive) {
        items.push({
          label: "Desactivar",
          icon: I.x,
          kind: "danger",
          onClick: () => setDeactivateTarget(p),
        });
      } else {
        items.push({
          label: "Activar",
          icon: I.check,
          onClick: async () => {
            setActionError(null);
            try {
              await catalogApi.activate(p.id);
              await reload(page);
            } catch (err) {
              setActionError(
                err instanceof ApiError
                  ? err.message
                  : "No se pudo activar el producto.",
              );
            }
          },
        });
      }
    }
    return items;
  };

  const subText = `${total} productos${
    sourceFilter !== "all" ? ` · ${sourceLabel(sourceFilter)}` : ""
  }${showInactive ? " · incluyendo inactivos" : ""}`;

  return (
    <>
      <PageHeader
        title="Productos"
        sub={subText}
        actions={
          canWrite ? (
            <button
              className="btn btn--accent"
              onClick={() => setShowNew(true)}
            >
              <span>{I.plus}</span>Nuevo producto
            </button>
          ) : undefined
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

      <div className="grid gap-5 grid-cols-1 lg:grid-cols-[1.6fr_1fr]">
        <div className="card">
          <div className="card__head gap-2 flex-wrap">
            <div className="topbar__search m-0 relative" style={{ width: 240 }}>
              {I.search}
              <input
                placeholder="Buscar por nombre, SKU…"
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
            <div className="row gap-1">
              {SOURCE_FILTERS.map((f) => (
                <button
                  key={f.key}
                  className={`btn btn--sm ${
                    sourceFilter === f.key ? "btn--primary" : "btn--ghost"
                  }`}
                  onClick={() => changeSource(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <button
              className={`btn btn--sm ${showInactive ? "btn--primary" : "btn--ghost"}`}
              onClick={toggleInactive}
              title="Incluir productos inactivos"
            >
              + Inactivos
            </button>
            <div className="spacer" />
            <select
              className="input"
              style={{ width: 200, height: 32, fontSize: 12 }}
              value={orderBy}
              onChange={(e) => changeOrderBy(e.target.value as OrderByKey)}
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
          ) : products.length === 0 ? (
            <div className="card__body text-muted text-sm">
              {debounced || sourceFilter !== "all"
                ? "Sin coincidencias."
                : "Sin productos. Crea uno con el botón de arriba."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="tbl min-w-[820px]">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Origen</th>
                  <th className="text-right">Precio</th>
                  <th className="text-right">Stock</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    style={{
                      background: selectedId === p.id ? "var(--surface-2)" : "",
                      opacity: p.isActive ? 1 : 0.6,
                    }}
                  >
                    <td>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-muted text-[11px] font-mono">
                        {p.sku}
                        {!p.isActive && " · Inactivo"}
                      </div>
                    </td>
                    <td>
                      <span className="tag">{p.category}</span>
                    </td>
                    <td>
                      {p.source === "internal" ? (
                        <span className="pill pill--neutral">Interno</span>
                      ) : (
                        <span className="pill pill--supplier">
                          {p.supplierName ?? "Proveedor"}
                        </span>
                      )}
                    </td>
                    <td className="num text-right">
                      {fmtMXN(p.price)}
                      <span className="text-muted text-[11px]"> /{p.unit}</span>
                    </td>
                    <td
                      className="num text-right"
                      style={{
                        color:
                          p.source === "supplier"
                            ? "var(--muted-2)"
                            : "var(--ink)",
                      }}
                    >
                      {p.source === "supplier" ? "—" : fmtInt(p.stock)}
                    </td>
                    <td>
                      {(canWrite || canDeactivate) && (
                        <MenuButton trigger={I.more} items={buildRowMenu(p)} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
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
                ? "Sin productos"
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
          <ProductDetail
            product={selected}
            compact
            onChanged={refreshSelected}
            onEdit={() => setEditTarget(selected)}
            onDeactivate={() => setDeactivateTarget(selected)}
            onActivate={async () => {
              setActionError(null);
              try {
                await catalogApi.activate(selected.id);
                await reload(page);
                await refreshSelected();
              } catch (err) {
                setActionError(
                  err instanceof ApiError
                    ? err.message
                    : "No se pudo activar el producto.",
                );
              }
            }}
          />
        ) : (
          <div className="card self-start">
            <div className="card__body text-muted text-sm">
              Selecciona un producto para ver detalles.
            </div>
          </div>
        )}
      </div>

      {showNew && (
        <NewProductForm
          onClose={() => setShowNew(false)}
          onDone={async (id) => {
            setShowNew(false);
            setSelectedId(id);
            await reload(page);
          }}
        />
      )}

      {editTarget && (
        <ProductFormModal
          mode="edit"
          product={editTarget}
          onClose={() => setEditTarget(null)}
          onDone={async () => {
            setEditTarget(null);
            await refreshSelected();
            await reload(page);
          }}
        />
      )}

      {deactivateTarget && (
        <ConfirmDialog
          title="Desactivar producto"
          kind="danger"
          confirmLabel="Desactivar"
          message={
            <>
              ¿Desactivar{" "}
              <span className="font-medium text-ink-2">
                {deactivateTarget.name}
              </span>
              ? Dejará de aparecer en la lista de productos activos pero su
              histórico se conserva.
            </>
          }
          onClose={() => setDeactivateTarget(null)}
          onConfirm={async () => {
            try {
              await catalogApi.deactivate(deactivateTarget.id);
              setDeactivateTarget(null);
              await reload(page);
              await refreshSelected();
            } catch (err) {
              throw new Error(
                err instanceof ApiError
                  ? err.message
                  : "No se pudo desactivar el producto.",
              );
            }
          }}
        />
      )}
    </>
  );
}

function ProductFormModal({
  mode,
  product,
  onClose,
  onDone,
}: {
  mode: "create" | "edit";
  product?: ApiProduct;
  onClose: () => void;
  onDone: (createdId?: string) => void | Promise<void>;
}) {
  const [sku, setSku] = useState(product?.sku ?? "");
  const [name, setName] = useState(product?.name ?? "");
  const [category, setCategory] = useState(product?.category ?? "");
  const [method, setMethod] = useState(product?.method ?? "");
  const [source, setSource] = useState<ApiProductSource>(
    product?.source ?? "internal",
  );
  const [supplierName, setSupplierName] = useState(product?.supplierName ?? "");
  const [leadDays, setLeadDays] = useState(String(product?.leadDays ?? 0));
  const [price, setPrice] = useState(String(product?.price ?? ""));
  const [cost, setCost] = useState(String(product?.cost ?? ""));
  const [stock, setStock] = useState(String(product?.stock ?? 0));
  const [unit, setUnit] = useState(product?.unit ?? "pieza");
  const [needsApproval, setNeedsApproval] = useState(
    product?.needsApproval ?? false,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    const priceNum = Number(price);
    const costNum = Number(cost);
    const stockNum = Number(stock);
    const leadNum = Number(leadDays);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      setError("El precio debe ser un número >= 0.");
      return;
    }
    if (!Number.isFinite(costNum) || costNum < 0) {
      setError("El costo debe ser un número >= 0.");
      return;
    }
    if (!Number.isInteger(stockNum) || stockNum < 0) {
      setError("El stock debe ser un entero >= 0.");
      return;
    }
    if (!Number.isInteger(leadNum) || leadNum < 0) {
      setError("Lead days debe ser un entero >= 0.");
      return;
    }

    const payload = {
      sku: sku.trim(),
      name: name.trim(),
      category: category.trim(),
      method: method.trim() || null,
      source,
      supplierName: supplierName.trim() || null,
      leadDays: leadNum,
      price: priceNum,
      cost: costNum,
      stock: stockNum,
      unit: unit.trim() || "pieza",
      needsApproval,
    };

    setSubmitting(true);
    try {
      if (mode === "create") {
        const { id } = await catalogApi.create(payload);
        await onDone(id);
      } else if (product) {
        await catalogApi.update(product.id, payload);
        await onDone();
      }
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.status === 409
            ? "Ya existe un producto con ese SKU."
            : err.message
          : mode === "create"
            ? "No se pudo crear el producto."
            : "No se pudieron guardar los cambios.";
      setError(message);
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={mode === "create" ? "Nuevo producto" : "Editar producto"}
      onClose={onClose}
      width={680}
      footer={
        <>
          <button className="btn btn--ghost" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn btn--accent"
            type="submit"
            form="product-form"
            disabled={submitting}
          >
            {submitting
              ? "Guardando…"
              : mode === "create"
                ? "Crear producto"
                : "Guardar cambios"}
          </button>
        </>
      }
    >
      <form id="product-form" onSubmit={submit} className="grid grid-cols-2 gap-3.5">
        <div className="field">
          <span className="label">SKU</span>
          <input
            className="input"
            value={sku}
            onChange={(e) => setSku(e.target.value.toUpperCase())}
            required
            maxLength={60}
            placeholder="TAR-CLASS-100"
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
          <span className="label">Método</span>
          <input
            className="input"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            placeholder="Offset, Digital, Serigrafía…"
            maxLength={60}
          />
        </div>
        <div className="field">
          <span className="label">Origen</span>
          <div className="flex gap-1.5">
            <button
              type="button"
              className={`btn btn--sm ${source === "internal" ? "btn--primary" : ""}`}
              onClick={() => setSource("internal")}
            >
              Interno
            </button>
            <button
              type="button"
              className={`btn btn--sm ${source === "supplier" ? "btn--primary" : ""}`}
              onClick={() => setSource("supplier")}
            >
              Proveedor
            </button>
          </div>
        </div>
        {source === "supplier" && (
          <div className="field col-span-full">
            <span className="label">Proveedor</span>
            <input
              className="input"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              maxLength={120}
            />
          </div>
        )}
        <div className="field">
          <span className="label">Precio (MXN)</span>
          <input
            className="input"
            type="number"
            step="0.01"
            min={0}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <span className="label">Costo (MXN)</span>
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
          <span className="label">Stock inicial</span>
          <input
            className="input"
            type="number"
            min={0}
            step={1}
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            disabled={source === "supplier"}
          />
        </div>
        <div className="field">
          <span className="label">Unidad</span>
          <input
            className="input"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="pieza, paquete…"
            maxLength={20}
          />
        </div>
        <div className="field">
          <span className="label">Lead (días)</span>
          <input
            className="input"
            type="number"
            min={0}
            step={1}
            value={leadDays}
            onChange={(e) => setLeadDays(e.target.value)}
          />
        </div>
        <div className="field">
          <span className="label">Aprobación</span>
          <label className="flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={needsApproval}
              onChange={(e) => setNeedsApproval(e.target.checked)}
            />
            Requiere aprobación del cliente
          </label>
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
