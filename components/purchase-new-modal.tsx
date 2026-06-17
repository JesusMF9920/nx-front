"use client";

import { useEffect, useMemo, useState } from "react";
import { I } from "@/components/icons";
import { Modal } from "@/components/modal";
import { ApiError } from "@/lib/api/errors";
import { inventoryApi } from "@/lib/api/inventory";
import { purchasesApi, type PurchaseLineInput } from "@/lib/api/purchases";
import { suppliersApi } from "@/lib/api/suppliers";
import type {
  ApiMaterial,
  ApiPurchaseOrderDetail,
  ApiSupplier,
} from "@/lib/api/types";
import { fmtMXN } from "@/lib/format";
import { useToast } from "@/lib/toast/toast-context";

type DraftLine = {
  /** "" = línea libre. */
  materialId: string;
  /** "" = sin variante. */
  materialVariantId: string;
  description: string;
  qty: number;
  unitCost: number;
};

const emptyLine = (): DraftLine => ({
  materialId: "",
  materialVariantId: "",
  description: "",
  qty: 1,
  unitCost: 0,
});

function linesFromOrder(order: ApiPurchaseOrderDetail): DraftLine[] {
  return order.items.map((it) => ({
    materialId: it.materialId ?? "",
    materialVariantId: it.materialVariantId ?? "",
    description: it.kind === "free" ? it.materialName : "",
    qty: it.qty,
    unitCost: it.unitCost,
  }));
}

export function PurchaseNewModal({
  onClose,
  onSaved,
  editOrder,
}: {
  onClose: () => void;
  onSaved: (res: { folio?: string }) => void;
  editOrder?: ApiPurchaseOrderDetail;
}) {
  const isEdit = !!editOrder;
  const toast = useToast();
  const [suppliers, setSuppliers] = useState<ApiSupplier[]>([]);
  const [materials, setMaterials] = useState<ApiMaterial[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [supplierId, setSupplierId] = useState(editOrder?.supplierId ?? "");
  const [expectedDate, setExpectedDate] = useState(
    editOrder?.expectedDate ? editOrder.expectedDate.slice(0, 10) : "",
  );
  const [discount, setDiscount] = useState(editOrder?.discount ?? 0);
  const [tax, setTax] = useState(editOrder?.tax ?? 0);
  const [notes, setNotes] = useState(editOrder?.notes ?? "");
  const [lines, setLines] = useState<DraftLine[]>(
    editOrder ? linesFromOrder(editOrder) : [emptyLine()],
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [sup, mat] = await Promise.all([
          suppliersApi.list({ take: 100, isActive: true, orderBy: "name" }),
          inventoryApi.list({ take: 100, isActive: true, orderBy: "name" }),
        ]);
        if (cancelled) return;
        setSuppliers(sup.items);
        setMaterials(mat.items);
        if (!editOrder && sup.items.length > 0 && supplierId === "") {
          setSupplierId(sup.items[0].id);
        }
      } catch {
        // los selects quedan vacíos; el guardado revalida en backend
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const materialsById = useMemo(
    () => new Map(materials.map((m) => [m.id, m])),
    [materials],
  );

  const update = (i: number, patch: Partial<DraftLine>) =>
    setLines((ls) => ls.map((l, j) => (i === j ? { ...l, ...patch } : l)));

  const selectMaterial = (i: number, materialId: string) => {
    if (materialId === "") {
      update(i, { materialId: "", materialVariantId: "", description: "" });
      return;
    }
    const m = materialsById.get(materialId);
    update(i, {
      materialId,
      materialVariantId: "",
      description: "",
      unitCost: m?.cost ?? 0,
    });
  };

  const add = () => setLines((ls) => [...ls, emptyLine()]);
  const remove = (i: number) =>
    setLines((ls) => (ls.length > 1 ? ls.filter((_, j) => j !== i) : ls));

  const subtotal = lines.reduce((s, l) => s + l.qty * l.unitCost, 0);
  const total = subtotal - discount + tax;

  const lineValid = (l: DraftLine): boolean => {
    if (!Number.isFinite(l.qty) || l.qty <= 0) return false;
    if (!Number.isFinite(l.unitCost) || l.unitCost < 0) return false;
    if (l.materialId === "") return l.description.trim().length > 0; // libre
    const m = materialsById.get(l.materialId);
    if (m && m.variants.length > 0 && l.materialVariantId === "") return false;
    return true;
  };

  const canSave =
    !!supplierId &&
    lines.length > 0 &&
    lines.every(lineValid) &&
    discount >= 0 &&
    tax >= 0 &&
    discount <= subtotal &&
    !saving;

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    const payloadLines: PurchaseLineInput[] = lines.map((l) =>
      l.materialId === ""
        ? { description: l.description.trim(), qty: l.qty, unitCost: l.unitCost }
        : {
            materialId: l.materialId,
            materialVariantId: l.materialVariantId || undefined,
            qty: l.qty,
            unitCost: l.unitCost,
          },
    );
    const input = {
      supplierId,
      lines: payloadLines,
      discount: discount || undefined,
      tax: tax || undefined,
      expectedDate: expectedDate || undefined,
      notes: notes.trim() || undefined,
    };
    try {
      if (editOrder) {
        await purchasesApi.update(editOrder.id, input);
        toast.success("Orden de compra actualizada");
        onSaved({ folio: editOrder.folio });
      } else {
        const res = await purchasesApi.create(input);
        toast.success("Orden de compra creada");
        onSaved({ folio: res.folio });
      }
    } catch (err) {
      setSaveError(
        err instanceof ApiError
          ? err.message
          : "No se pudo guardar la orden de compra.",
      );
      setSaving(false);
    }
  };

  return (
    <Modal
      title={isEdit ? `Editar ${editOrder.folio}` : "Nueva orden de compra"}
      onClose={onClose}
      width={820}
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button
            className="btn btn--accent"
            onClick={() => void save()}
            disabled={!canSave}
          >
            {I.copy} {isEdit ? "Guardar cambios" : "Guardar borrador"}
          </button>
        </>
      }
    >
      {saveError && (
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
          {saveError}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mb-3.5">
        <label className="field">
          <span className="label">Proveedor</span>
          <select
            className="input"
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
          >
            <option value="" disabled>
              {loadingData ? "Cargando…" : "Selecciona…"}
            </option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="label">Fecha esperada</span>
          <input
            className="input"
            type="date"
            value={expectedDate}
            onChange={(e) => setExpectedDate(e.target.value)}
          />
        </label>
        <label className="field">
          <span className="label">Notas (opcional)</span>
          <input
            className="input"
            value={notes}
            maxLength={2000}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Referencia, condiciones…"
          />
        </label>
      </div>

      <div className="card border border-line" style={{ boxShadow: "none" }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Insumo / línea libre</th>
              <th style={{ width: 150 }}>Variante / descripción</th>
              <th className="text-right" style={{ width: 90 }}>
                Cantidad
              </th>
              <th className="text-right" style={{ width: 110 }}>
                Costo unit.
              </th>
              <th className="text-right" style={{ width: 110 }}>
                Subtotal
              </th>
              <th style={{ width: 40 }} />
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => {
              const mat = l.materialId
                ? materialsById.get(l.materialId)
                : undefined;
              const hasVariants = !!mat && mat.variants.length > 0;
              return (
                <tr key={i}>
                  <td>
                    <select
                      className="input w-full"
                      value={l.materialId}
                      onChange={(e) => selectMaterial(i, e.target.value)}
                    >
                      <option value="">— Línea libre —</option>
                      {materials.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.unit})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {l.materialId === "" ? (
                      <input
                        className="input w-full"
                        value={l.description}
                        maxLength={200}
                        placeholder="Descripción…"
                        onChange={(e) =>
                          update(i, { description: e.target.value })
                        }
                      />
                    ) : hasVariants ? (
                      <select
                        className="input w-full"
                        value={l.materialVariantId}
                        onChange={(e) =>
                          update(i, { materialVariantId: e.target.value })
                        }
                      >
                        <option value="" disabled>
                          Talla…
                        </option>
                        {mat!.variants.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-muted text-xs">—</span>
                    )}
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      step="0.001"
                      className="input num text-right"
                      value={l.qty}
                      onChange={(e) =>
                        update(i, { qty: parseFloat(e.target.value || "0") })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className="input num text-right"
                      value={l.unitCost}
                      onChange={(e) =>
                        update(i, {
                          unitCost: parseFloat(e.target.value || "0"),
                        })
                      }
                    />
                  </td>
                  <td className="num text-right font-semibold">
                    {fmtMXN(l.qty * l.unitCost)}
                  </td>
                  <td>
                    <button
                      className="icon-btn"
                      onClick={() => remove(i)}
                      aria-label="Quitar línea"
                      disabled={lines.length <= 1}
                    >
                      {I.x}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button className="btn btn--sm btn--ghost mt-2.5" onClick={add}>
        {I.plus} Agregar línea
      </button>

      <div className="divider" />

      <div className="grid grid-cols-3 gap-3 items-end">
        <label className="field">
          <span className="label">Descuento</span>
          <input
            type="number"
            min={0}
            step="0.01"
            className="input num text-right"
            value={discount}
            onChange={(e) => setDiscount(parseFloat(e.target.value || "0"))}
          />
        </label>
        <label className="field">
          <span className="label">IVA / impuestos</span>
          <input
            type="number"
            min={0}
            step="0.01"
            className="input num text-right"
            value={tax}
            onChange={(e) => setTax(parseFloat(e.target.value || "0"))}
          />
        </label>
        <div className="text-right">
          <div className="text-muted text-xs">Total OC</div>
          <div className="num font-semibold" style={{ fontSize: 22 }}>
            {fmtMXN(total)}
          </div>
        </div>
      </div>
    </Modal>
  );
}
