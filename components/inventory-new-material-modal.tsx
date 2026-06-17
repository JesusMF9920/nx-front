"use client";

import { useEffect, useState, type FormEvent } from "react";
import { I } from "@/components/icons";
import { Modal } from "@/components/modal";
import { ApiError } from "@/lib/api/errors";
import { inventoryApi, type MaterialVariantInput } from "@/lib/api/inventory";
import { suppliersApi } from "@/lib/api/suppliers";
import type { ApiSupplier } from "@/lib/api/types";
import { useToast } from "@/lib/toast/toast-context";

type VariantRow = { code: string; label: string };

export function InventoryNewMaterialModal({
  categories,
  onClose,
  onDone,
}: {
  /** Sugerencias de categoría derivadas de los materiales existentes. */
  categories: string[];
  onClose: () => void;
  onDone: (createdId?: string) => void | Promise<void>;
}) {
  const toast = useToast();
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState("pieza");
  const [initialStock, setInitialStock] = useState("0");
  const [reorderPoint, setReorderPoint] = useState("0");
  const [cost, setCost] = useState("");
  const [location, setLocation] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [buyToOrder, setBuyToOrder] = useState(false);
  const [suppliers, setSuppliers] = useState<ApiSupplier[]>([]);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await suppliersApi.list({
          take: 100,
          isActive: true,
          orderBy: "name",
          order: "asc",
        });
        if (!cancelled) setSuppliers(res.items);
      } catch {
        // sin proveedores: el campo queda como texto libre
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateVariant = (i: number, patch: Partial<VariantRow>) =>
    setVariants((vs) => vs.map((v, j) => (i === j ? { ...v, ...patch } : v)));
  const addVariant = () =>
    setVariants((vs) => [...vs, { code: "", label: "" }]);
  const removeVariant = (i: number) =>
    setVariants((vs) => vs.filter((_, j) => j !== i));

  const stockNum = Number(initialStock);
  const stockVariantConflict =
    !buyToOrder && variants.length > 0 && Number.isFinite(stockNum) && stockNum > 0;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting || createdId) return;
    setError(null);
    const costNum = Number(cost);
    const reorderNum = Number(reorderPoint);
    if (!Number.isFinite(costNum) || costNum < 0) {
      setError("El costo debe ser un número >= 0.");
      return;
    }
    if (!Number.isInteger(stockNum) || stockNum < 0) {
      setError("Stock inicial debe ser un entero >= 0.");
      return;
    }
    if (!Number.isInteger(reorderNum) || reorderNum < 0) {
      setError("Punto de reorden debe ser un entero >= 0.");
      return;
    }
    if (stockVariantConflict) {
      setError(
        "Con tallas el stock inicial debe ser 0: captura las existencias después con movimientos por talla.",
      );
      return;
    }
    const cleanVariants: MaterialVariantInput[] = variants.map((v, i) => ({
      code: v.code.trim().toUpperCase(),
      label: v.label.trim(),
      sortOrder: i,
    }));
    if (cleanVariants.some((v) => !v.code || !v.label)) {
      setError("Cada talla necesita código y etiqueta.");
      return;
    }
    if (new Set(cleanVariants.map((v) => v.code)).size !== cleanVariants.length) {
      setError("Hay códigos de talla repetidos.");
      return;
    }
    setSubmitting(true);
    let id: string | null = null;
    try {
      const res = await inventoryApi.create({
        sku: sku.trim(),
        name: name.trim(),
        category: category.trim(),
        unit: unit.trim() || "pieza",
        initialStock: buyToOrder ? 0 : stockNum,
        reorderPoint: reorderNum,
        cost: costNum,
        location: location.trim() || null,
        supplierName: supplierName.trim() || null,
        buyToOrder,
      });
      id = res.id;
      if (cleanVariants.length > 0) {
        await inventoryApi.setVariants(id, cleanVariants);
      }
      toast.success("Material dado de alta");
      await onDone(id);
    } catch (err) {
      if (id) {
        // El material ya existe; sólo falló el guardado de tallas.
        setCreatedId(id);
        setError(
          `El material se creó, pero no se pudieron guardar las tallas${
            err instanceof ApiError ? `: ${err.message}` : "."
          } Puedes gestionarlas desde el detalle.`,
        );
      } else {
        setError(
          err instanceof ApiError
            ? err.status === 409
              ? "Ya existe un material con ese SKU."
              : err.message
            : "No se pudo crear el material.",
        );
      }
      setSubmitting(false);
    }
  };

  const close = () => {
    if (createdId) {
      void onDone(createdId);
    } else {
      onClose();
    }
  };

  return (
    <Modal
      title="Nuevo material"
      onClose={close}
      width={640}
      footer={
        <>
          <button className="btn btn--ghost" type="button" onClick={close}>
            {createdId ? "Cerrar" : "Cancelar"}
          </button>
          <button
            className="btn btn--accent"
            type="submit"
            form="new-material-form"
            disabled={submitting || stockVariantConflict || createdId !== null}
          >
            {submitting ? "Guardando…" : "Crear material"}
          </button>
        </>
      }
    >
      <form
        id="new-material-form"
        onSubmit={submit}
        className="grid grid-cols-2 gap-3.5"
      >
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
            list="material-categories"
            required
            maxLength={80}
          />
          <datalist id="material-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
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
          <span className="label">Stock inicial</span>
          <input
            className="input"
            type="number"
            min={0}
            step={1}
            value={buyToOrder ? "0" : initialStock}
            onChange={(e) => setInitialStock(e.target.value)}
            disabled={buyToOrder}
          />
          {buyToOrder && (
            <small className="help mt-1">Bajo demanda: no se almacena.</small>
          )}
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
          {suppliers.length > 0 ? (
            <select
              className="input"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
            >
              <option value="">Sin proveedor</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              className="input"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              maxLength={120}
            />
          )}
        </div>

        <div className="field col-span-full">
          <span className="label">Tipo de insumo</span>
          <label className="flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={buyToOrder}
              onChange={(e) => setBuyToOrder(e.target.checked)}
            />
            Bajo demanda — no se almacena, se compra cuando un pedido lo necesita
          </label>
        </div>

        <div className="col-span-full">
          <div className="divider" style={{ margin: "4px 0 10px" }} />
          <div className="flex items-center gap-2 mb-2">
            <span className="label m-0">Tallas (opcional)</span>
            <div className="spacer" />
            <button
              className="btn btn--sm btn--ghost"
              type="button"
              onClick={addVariant}
            >
              {I.plus} Agregar talla
            </button>
          </div>
          {variants.length === 0 ? (
            <div className="text-muted text-xs">
              Sin tallas: el stock se lleva sobre el material completo.
            </div>
          ) : (
            <div className="grid gap-2">
              {variants.map((v, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    className="input"
                    style={{ width: 110 }}
                    placeholder="Código (CH)"
                    value={v.code}
                    onChange={(e) =>
                      updateVariant(i, { code: e.target.value.toUpperCase() })
                    }
                    maxLength={20}
                  />
                  <input
                    className="input flex-1"
                    placeholder="Etiqueta (Chica)"
                    value={v.label}
                    onChange={(e) => updateVariant(i, { label: e.target.value })}
                    maxLength={60}
                  />
                  <button
                    className="icon-btn"
                    type="button"
                    onClick={() => removeVariant(i)}
                    aria-label="Quitar talla"
                  >
                    {I.x}
                  </button>
                </div>
              ))}
            </div>
          )}
          {stockVariantConflict && (
            <div
              className="rounded-md text-xs mt-2"
              style={{
                padding: "10px 12px",
                border: "1px solid var(--warn)",
                color: "var(--warn)",
                background: "var(--warn-soft)",
              }}
              role="alert"
            >
              Con tallas el stock inicial debe ser 0. Deja el stock inicial en 0
              y registra las existencias con movimientos de entrada por talla.
            </div>
          )}
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
