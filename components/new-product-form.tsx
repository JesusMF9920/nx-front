"use client";

import { useState, type FormEvent } from "react";
import { I } from "@/components/icons";
import { Modal } from "@/components/modal";
import {
  MaterialSearchPicker,
  RecipeEditor,
  recipeRowsToInput,
  validateRecipeRows,
  type RecipeRow,
} from "@/components/recipe-editor";
import { catalogApi, type CreateProductInput } from "@/lib/api/catalog";
import { ApiError } from "@/lib/api/errors";
import { CLAVE_UNIDAD, OBJETO_IMPUESTO } from "@/lib/sat-catalogs";
import type {
  ApiMaterial,
  ApiProductSource,
  ApiVariantType,
} from "@/lib/api/types";

type SurchargeDraft = { code: string; label: string; amount: string };

// Un producto es simple o hereda sus tallas de un insumo. Las variantes
// (tallas + stock) viven SOLO en el inventario, no en el producto.
const VARIANT_OPTIONS: { id: ApiVariantType; label: string; sub: string }[] = [
  { id: "none", label: "Sin variantes", sub: "Producto único" },
  {
    id: "sized_from_material",
    label: "Por talla (desde insumo)",
    sub: "Tallas y stock del insumo",
  },
];

export function NewProductForm({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: (createdId: string) => void | Promise<void>;
}) {
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [method, setMethod] = useState("");
  const [source, setSource] = useState<ApiProductSource>("internal");
  const [supplierName, setSupplierName] = useState("");
  const [leadDays, setLeadDays] = useState("0");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [stock, setStock] = useState("0");
  const [unit, setUnit] = useState("pieza");
  const [needsApproval, setNeedsApproval] = useState(false);
  // CFDI — códigos SAT del concepto (vacío = hereda el default del negocio).
  const [claveProdServ, setClaveProdServ] = useState("");
  const [claveUnidad, setClaveUnidad] = useState("");
  const [objetoImpuesto, setObjetoImpuesto] = useState("");

  const [variantType, setVariantType] = useState<ApiVariantType>("none");
  const [sizedMaterial, setSizedMaterial] = useState<ApiMaterial | null>(null);
  const [surcharges, setSurcharges] = useState<SurchargeDraft[]>([]);

  const [showRecipe, setShowRecipe] = useState(false);
  const [recipeRows, setRecipeRows] = useState<RecipeRow[]>([]);

  // Para reintentos tras un fallo parcial (producto creado, receta pendiente).
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [recipeSaved, setRecipeSaved] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stockDisabled = source === "supplier" || variantType !== "none";

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

    // Tallas desde material.
    let sizeSurcharges: Record<string, number> | null = null;
    let sizedFromMaterialId: string | null = null;
    if (variantType === "sized_from_material") {
      if (!sizedMaterial) {
        setError("Elige el insumo del que vienen las tallas.");
        return;
      }
      sizedFromMaterialId = sizedMaterial.id;
      const rec: Record<string, number> = {};
      for (const s of surcharges) {
        const amount = s.amount.trim() === "" ? 0 : Number(s.amount);
        if (!Number.isFinite(amount) || amount < 0) {
          setError(`Sobreprecio inválido para la talla ${s.label}.`);
          return;
        }
        if (amount > 0) rec[s.code] = amount;
      }
      sizeSurcharges = Object.keys(rec).length > 0 ? rec : null;
    }

    // Receta opcional.
    if (recipeRows.length > 0) {
      const invalid = validateRecipeRows(recipeRows);
      if (invalid) {
        setError(invalid);
        return;
      }
    }

    const payload: CreateProductInput = {
      sku: sku.trim(),
      name: name.trim(),
      category: category.trim(),
      method: method.trim() || null,
      source,
      supplierName: supplierName.trim() || null,
      leadDays: leadNum,
      price: priceNum,
      cost: costNum,
      stock: stockDisabled ? 0 : stockNum,
      unit: unit.trim() || "pieza",
      needsApproval,
      claveProdServ: claveProdServ.trim() || null,
      claveUnidad: claveUnidad.trim() || null,
      objetoImpuesto: objetoImpuesto.trim() || null,
      variantType,
      sizeSurcharges,
      sizedFromMaterialId,
    };

    setSubmitting(true);
    let step: "create" | "recipe" = "create";
    try {
      let id = createdId;
      if (!id) {
        const res = await catalogApi.create(payload);
        id = res.id;
        setCreatedId(id);
      }
      if (recipeRows.length > 0 && !recipeSaved) {
        step = "recipe";
        await catalogApi.setRecipe(id, recipeRowsToInput(recipeRows));
        setRecipeSaved(true);
      }
      await onDone(id);
    } catch (err) {
      const detail =
        err instanceof ApiError
          ? step === "create" && err.status === 409
            ? "Ya existe un producto con ese SKU."
            : err.message
          : null;
      if (step === "create") {
        setError(detail ?? "No se pudo crear el producto.");
      } else {
        setError(
          `El producto se creó, pero no se pudo guardar la receta: ${
            detail ?? "error desconocido"
          }. Corrige e intenta de nuevo — no se creará un producto duplicado.`,
        );
      }
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Nuevo producto"
      onClose={onClose}
      width={760}
      footer={
        <>
          <button className="btn btn--ghost" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn btn--accent"
            type="submit"
            form="new-product-form"
            disabled={submitting}
          >
            {submitting
              ? "Guardando…"
              : createdId
                ? "Reintentar guardado"
                : "Crear producto"}
          </button>
        </>
      }
    >
      <form
        id="new-product-form"
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
            disabled={stockDisabled}
          />
          {variantType === "sized_from_material" && source === "internal" && (
            <small className="help mt-1">
              Con tallas desde insumo, el stock vive en el insumo.
            </small>
          )}
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

        <div className="field col-span-full mt-1">
          <span className="label">Códigos SAT (CFDI) — opcional</span>
          <small className="help mb-1.5 block">
            Déjalos vacíos para heredar el default del negocio (Configuración →
            Datos fiscales).
          </small>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 8,
            }}
          >
            <input
              className="input"
              value={claveProdServ}
              onChange={(e) => setClaveProdServ(e.target.value)}
              placeholder="ClaveProdServ"
              maxLength={8}
            />
            <select
              className="input"
              value={claveUnidad}
              onChange={(e) => setClaveUnidad(e.target.value)}
            >
              <option value="">ClaveUnidad…</option>
              {CLAVE_UNIDAD.map((u) => (
                <option key={u.code} value={u.code}>
                  {u.label}
                </option>
              ))}
            </select>
            <select
              className="input"
              value={objetoImpuesto}
              onChange={(e) => setObjetoImpuesto(e.target.value)}
            >
              <option value="">Objeto imp…</option>
              {OBJETO_IMPUESTO.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field col-span-full mt-1">
          <span className="label">Tipo de variantes</span>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 6,
            }}
          >
            {VARIANT_OPTIONS.map((o) => (
              <button
                type="button"
                key={o.id}
                onClick={() => setVariantType(o.id)}
                className="text-left rounded-md py-2 px-2.5 cursor-pointer"
                style={{
                  border:
                    variantType === o.id
                      ? "1.5px solid var(--accent)"
                      : "1px solid var(--line)",
                  background:
                    variantType === o.id
                      ? "var(--accent-soft)"
                      : "var(--surface)",
                  color:
                    variantType === o.id ? "var(--accent-ink)" : "var(--ink)",
                }}
              >
                <div className="text-[13px] font-medium">{o.label}</div>
                <div
                  className="text-[11px]"
                  style={{
                    color:
                      variantType === o.id
                        ? "var(--accent-ink)"
                        : "var(--muted)",
                  }}
                >
                  {o.sub}
                </div>
              </button>
            ))}
          </div>
        </div>

        {variantType === "sized_from_material" && (
          <div className="field col-span-full">
            <span className="label">Insumo con tallas</span>
            {sizedMaterial ? (
              <div
                className="flex items-center gap-2"
                style={{
                  padding: "8px 10px",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-md)",
                  background: "var(--surface-2)",
                }}
              >
                <span className="text-[13px] font-medium">
                  {sizedMaterial.name}
                </span>
                <span className="text-muted text-[11px] font-mono">
                  {sizedMaterial.sku}
                </span>
                <span className="tag">
                  {sizedMaterial.variants.length} tallas
                </span>
                <div className="spacer" />
                <button
                  type="button"
                  className="btn btn--sm btn--ghost"
                  onClick={() => {
                    setSizedMaterial(null);
                    setSurcharges([]);
                  }}
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <MaterialSearchPicker
                onlyWithVariants
                placeholder="Buscar insumo con variantes (tallas)…"
                onSelect={(m) => {
                  setSizedMaterial(m);
                  setSurcharges(
                    m.variants.map((mv) => ({
                      code: mv.code,
                      label: mv.label,
                      amount: "0",
                    })),
                  );
                }}
              />
            )}
            <div className="help">
              Las tallas y su stock viven en el insumo; aquí sólo se define el
              sobreprecio por talla.
            </div>
          </div>
        )}

        {variantType === "sized_from_material" &&
          sizedMaterial &&
          surcharges.length > 0 && (
            <div className="field col-span-full">
              <span className="label">Sobreprecio por talla (MXN)</span>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
                  gap: 8,
                }}
              >
                {surcharges.map((s, i) => (
                  <div key={s.code} className="field">
                    <span className="label">{s.label}</span>
                    <input
                      className="input num"
                      type="number"
                      min={0}
                      step="0.01"
                      value={s.amount}
                      onChange={(e) =>
                        setSurcharges(
                          surcharges.map((x, j) =>
                            j === i ? { ...x, amount: e.target.value } : x,
                          ),
                        )
                      }
                    />
                  </div>
                ))}
              </div>
              <div className="help">
                Deja 0 si la talla no tiene cargo extra.
              </div>
            </div>
          )}

        <div className="field col-span-full">
          <div className="flex items-center gap-2">
            <span className="label" style={{ marginBottom: 0 }}>
              Receta de insumos (opcional)
            </span>
            {recipeRows.length > 0 && (
              <span className="tag">{recipeRows.length}</span>
            )}
            <div className="spacer" />
            <button
              type="button"
              className="btn btn--sm btn--ghost"
              onClick={() => setShowRecipe((v) => !v)}
            >
              {showRecipe ? "Ocultar" : <>{I.plus} Añadir insumos</>}
            </button>
          </div>
          {showRecipe && (
            <RecipeEditor rows={recipeRows} onChange={setRecipeRows} />
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
