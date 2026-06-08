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
import {
  catalogApi,
  type CreateProductInput,
  type ProductVariantInput,
} from "@/lib/api/catalog";
import { ApiError } from "@/lib/api/errors";
import type {
  ApiDimensionConfig,
  ApiMaterial,
  ApiProductSource,
  ApiVariantType,
} from "@/lib/api/types";
import { fmtMXN } from "@/lib/format";

type VariantDraft = { code: string; label: string; priceMod: string };
type SurchargeDraft = { code: string; label: string; amount: string };

const VARIANT_OPTIONS: { id: ApiVariantType; label: string; sub: string }[] = [
  { id: "none", label: "Sin variantes", sub: "Producto único" },
  { id: "size", label: "Tallas", sub: "CH / M / G / EG" },
  { id: "preset", label: "Medidas fijas", sub: "Lista predefinida" },
  { id: "dimension", label: "Por dimensión", sub: "Alto × ancho" },
  {
    id: "sized_from_material",
    label: "Tallas desde material",
    sub: "Stock en el insumo",
  },
];

const ADULT_SIZES: VariantDraft[] = [
  { code: "CH", label: "CH", priceMod: "0" },
  { code: "M", label: "M", priceMod: "0" },
  { code: "G", label: "G", priceMod: "0" },
  { code: "EG", label: "EG", priceMod: "15" },
];

const KID_SIZES: VariantDraft[] = [
  { code: "2", label: "2", priceMod: "0" },
  { code: "4", label: "4", priceMod: "0" },
  { code: "6", label: "6", priceMod: "0" },
  { code: "8", label: "8", priceMod: "0" },
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

  const [variantType, setVariantType] = useState<ApiVariantType>("none");
  const [variants, setVariants] = useState<VariantDraft[]>([
    { code: "", label: "", priceMod: "0" },
  ]);
  const [dimUnit, setDimUnit] = useState<ApiDimensionConfig["unit"]>("cm");
  const [dimMin, setDimMin] = useState("1");
  const [dimMax, setDimMax] = useState("100");
  const [dimStep, setDimStep] = useState("1");
  const [dimPriceMode, setDimPriceMode] =
    useState<ApiDimensionConfig["priceMode"]>("area");
  const [sizedMaterial, setSizedMaterial] = useState<ApiMaterial | null>(null);
  const [surcharges, setSurcharges] = useState<SurchargeDraft[]>([]);

  const [showRecipe, setShowRecipe] = useState(false);
  const [recipeRows, setRecipeRows] = useState<RecipeRow[]>([]);

  // Para reintentos tras un fallo parcial (producto creado, pasos pendientes).
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [variantsSaved, setVariantsSaved] = useState(false);
  const [recipeSaved, setRecipeSaved] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPredef = variantType === "size" || variantType === "preset";
  const basePrice = Number(price);
  const stockDisabled = source === "supplier" || variantType !== "none";

  const updateVariant = (index: number, patch: Partial<VariantDraft>) =>
    setVariants(variants.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  const removeVariant = (index: number) =>
    setVariants(variants.filter((_, i) => i !== index));
  const addVariant = () =>
    setVariants([...variants, { code: "", label: "", priceMod: "0" }]);

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

    // Variantes predefinidas (tallas / medidas fijas).
    const variantInputs: ProductVariantInput[] = [];
    if (isPredef) {
      const filled = variants.filter(
        (v) => v.code.trim() !== "" || v.label.trim() !== "",
      );
      if (filled.length === 0) {
        setError(
          "Añade al menos una variante o cambia el tipo a “Sin variantes”.",
        );
        return;
      }
      const seen = new Set<string>();
      for (const v of filled) {
        const code = v.code.trim();
        const label = v.label.trim() || code;
        if (!code) {
          setError("Cada variante necesita un código.");
          return;
        }
        if (seen.has(code.toLowerCase())) {
          setError(`Código de variante duplicado: ${code}.`);
          return;
        }
        seen.add(code.toLowerCase());
        const mod = v.priceMod.trim() === "" ? 0 : Number(v.priceMod);
        if (!Number.isFinite(mod)) {
          setError(`Modificador inválido para la variante ${code}.`);
          return;
        }
        variantInputs.push({
          code,
          label,
          priceMod: mod,
          sortOrder: variantInputs.length,
        });
      }
    }

    // Configuración por dimensión.
    let dimensionConfig: ApiDimensionConfig | null = null;
    if (variantType === "dimension") {
      const min = Number(dimMin);
      const max = Number(dimMax);
      const step = Number(dimStep);
      if (!Number.isFinite(min) || min <= 0) {
        setError("La medida mínima debe ser mayor a 0.");
        return;
      }
      if (!Number.isFinite(max) || max <= min) {
        setError("La medida máxima debe ser mayor que la mínima.");
        return;
      }
      if (!Number.isFinite(step) || step <= 0) {
        setError("El paso debe ser mayor a 0.");
        return;
      }
      dimensionConfig = { unit: dimUnit, min, max, step, priceMode: dimPriceMode };
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
      variantType,
      dimensionConfig,
      sizeSurcharges,
      sizedFromMaterialId,
    };

    setSubmitting(true);
    let step: "create" | "variants" | "recipe" = "create";
    try {
      let id = createdId;
      if (!id) {
        const res = await catalogApi.create(payload);
        id = res.id;
        setCreatedId(id);
      }
      if (variantInputs.length > 0 && !variantsSaved) {
        step = "variants";
        await catalogApi.setVariants(id, variantInputs);
        setVariantsSaved(true);
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
        const what = step === "variants" ? "las variantes" : "la receta";
        setError(
          `El producto se creó, pero no se pudieron guardar ${what}: ${
            detail ?? "error desconocido"
          }. Corrige e intenta de nuevo — no se creará un producto duplicado.`,
        );
      }
      setSubmitting(false);
    }
  };

  const variantGridCols = "110px 1fr 130px 110px 32px";

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
          {variantType !== "none" && source === "internal" && (
            <small className="help mt-1">
              Con variantes, el stock se captura por variante o vive en el
              insumo.
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
          <span className="label">Tipo de variantes</span>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
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

        {isPredef && (
          <div className="field col-span-full">
            <span className="label">
              {variantType === "size"
                ? "Tallas disponibles"
                : "Medidas disponibles"}
            </span>
            {variantType === "size" && (
              <div className="flex gap-1.5 mb-1.5">
                <button
                  type="button"
                  className="btn btn--sm"
                  onClick={() => setVariants(ADULT_SIZES.map((v) => ({ ...v })))}
                >
                  Cargar adulto (CH–EG)
                </button>
                <button
                  type="button"
                  className="btn btn--sm"
                  onClick={() => setVariants(KID_SIZES.map((v) => ({ ...v })))}
                >
                  Cargar infantil (2–8)
                </button>
              </div>
            )}
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
                  gridTemplateColumns: variantGridCols,
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
                <span>Código</span>
                <span>Etiqueta</span>
                <span style={{ textAlign: "right" }}>± Modificador</span>
                <span style={{ textAlign: "right" }}>Precio final</span>
                <span />
              </div>
              {variants.map((v, i) => (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: variantGridCols,
                    padding: "6px 10px",
                    borderBottom:
                      i < variants.length - 1 ? "1px solid var(--line)" : 0,
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <input
                    className="input font-mono"
                    value={v.code}
                    onChange={(e) => updateVariant(i, { code: e.target.value })}
                    placeholder={variantType === "size" ? "M" : "5X8"}
                    maxLength={40}
                    aria-label="Código"
                  />
                  <input
                    className="input"
                    value={v.label}
                    onChange={(e) => updateVariant(i, { label: e.target.value })}
                    placeholder={variantType === "size" ? "Mediana" : "5×8 cm"}
                    maxLength={80}
                    aria-label="Etiqueta"
                  />
                  <input
                    className="input num"
                    type="number"
                    step="0.01"
                    value={v.priceMod}
                    onChange={(e) =>
                      updateVariant(i, { priceMod: e.target.value })
                    }
                    style={{ textAlign: "right" }}
                    aria-label="Modificador de precio"
                  />
                  <span
                    className="num"
                    style={{
                      textAlign: "right",
                      color: "var(--muted)",
                      fontSize: 12,
                    }}
                  >
                    {fmtMXN(
                      (Number.isFinite(basePrice) ? basePrice : 0) +
                        (Number(v.priceMod) || 0),
                    )}
                  </span>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => removeVariant(i)}
                    style={{
                      width: 24,
                      height: 24,
                      color: "var(--muted)",
                      border: 0,
                    }}
                    aria-label="Eliminar variante"
                  >
                    {I.x}
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="btn btn--ghost btn--sm mt-1.5"
              style={{ justifySelf: "start" }}
              onClick={addVariant}
            >
              {I.plus} Añadir {variantType === "size" ? "talla" : "medida"}
            </button>
            <div className="help">
              El modificador se suma al precio base. El stock por variante se
              captura después, desde el detalle del producto.
            </div>
          </div>
        )}

        {variantType === "dimension" && (
          <div className="field col-span-full">
            <span className="label">Configuración por dimensión</span>
            <div
              style={{
                padding: 12,
                border: "1px solid var(--line)",
                borderRadius: "var(--r-md)",
                background: "var(--surface-2)",
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gap: 10,
              }}
            >
              <div className="field">
                <span className="label">Unidad</span>
                <select
                  className="select"
                  value={dimUnit}
                  onChange={(e) =>
                    setDimUnit(e.target.value as ApiDimensionConfig["unit"])
                  }
                >
                  <option value="cm">cm</option>
                  <option value="m">m</option>
                  <option value="in">pulgadas (in)</option>
                </select>
              </div>
              <div className="field">
                <span className="label">Mín.</span>
                <input
                  className="input num"
                  type="number"
                  min={0}
                  step="0.01"
                  value={dimMin}
                  onChange={(e) => setDimMin(e.target.value)}
                />
              </div>
              <div className="field">
                <span className="label">Máx.</span>
                <input
                  className="input num"
                  type="number"
                  min={0}
                  step="0.01"
                  value={dimMax}
                  onChange={(e) => setDimMax(e.target.value)}
                />
              </div>
              <div className="field">
                <span className="label">Paso</span>
                <input
                  className="input num"
                  type="number"
                  min={0}
                  step="0.01"
                  value={dimStep}
                  onChange={(e) => setDimStep(e.target.value)}
                />
              </div>
              <div className="field">
                <span className="label">Cobro</span>
                <select
                  className="select"
                  value={dimPriceMode}
                  onChange={(e) =>
                    setDimPriceMode(
                      e.target.value as ApiDimensionConfig["priceMode"],
                    )
                  }
                >
                  <option value="area">Por área</option>
                  <option value="linear">Lineal</option>
                  <option value="flat">Tarifa fija</option>
                </select>
              </div>
            </div>
            <div className="help">
              En el POS se capturan las medidas dentro del rango y el precio se
              calcula a partir del precio base.
            </div>
          </div>
        )}

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
