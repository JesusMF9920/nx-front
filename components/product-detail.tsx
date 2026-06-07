"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { I } from "@/components/icons";
import { Kv } from "@/components/kv";
import { Modal } from "@/components/modal";
import {
  RecipeEditor,
  recipeRowsToInput,
  validateRecipeRows,
  type RecipeRow,
} from "@/components/recipe-editor";
import { catalogApi, type ProductVariantInput } from "@/lib/api/catalog";
import { ApiError } from "@/lib/api/errors";
import { inventoryApi } from "@/lib/api/inventory";
import type {
  ApiDimensionConfig,
  ApiMaterial,
  ApiProduct,
  ApiProductDetail,
  ApiProductSource,
  ApiVariantType,
} from "@/lib/api/types";
import { fmtInt, fmtMXN } from "@/lib/format";

const VARIANT_TYPE_LABEL: Record<ApiVariantType, string> = {
  none: "Sin variantes",
  size: "Variantes predefinidas",
  preset: "Variantes predefinidas",
  dimension: "Por dimensión",
  sized_from_material: "Tallas desde material",
};

const DIMENSION_UNIT_LABEL: Record<ApiDimensionConfig["unit"], string> = {
  cm: "cm",
  m: "m",
  in: "pulgadas",
};

const PRICE_MODE_LABEL: Record<ApiDimensionConfig["priceMode"], string> = {
  area: "Por área",
  linear: "Lineal",
  flat: "Tarifa fija",
};

const fmtQty = (n: number): string =>
  n.toLocaleString("es-MX", { maximumFractionDigits: 3 });

function sourceLabel(s: ApiProductSource): string {
  return s === "internal" ? "Interno" : "Proveedor";
}

function isDetail(p: ApiProduct | ApiProductDetail): p is ApiProductDetail {
  return "variants" in p && "recipeItems" in p;
}

type ProductDetailProps = {
  product: ApiProduct | ApiProductDetail;
  /** Diseño compacto para usar como panel lateral (lista de productos). */
  compact?: boolean;
  onEdit?: () => void;
  onDeactivate?: () => void;
  onActivate?: () => void;
  /** Llamado tras guardar variantes o receta para que el caller refresque. */
  onChanged?: () => void | Promise<void>;
};

export function ProductDetail({
  product,
  compact = false,
  onEdit,
  onDeactivate,
  onActivate,
  onChanged,
}: ProductDetailProps) {
  const [fetched, setFetched] = useState<ApiProductDetail | null>(null);
  const [detailError, setDetailError] = useState<
    { id: string; message: string } | null
  >(null);
  const [materials, setMaterials] = useState<Record<string, ApiMaterial>>({});
  const [editingVariants, setEditingVariants] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState(false);

  const detail: ApiProductDetail | null = isDetail(product)
    ? product
    : fetched && fetched.id === product.id
      ? fetched
      : null;
  const base: ApiProduct = detail ?? product;

  useEffect(() => {
    if (isDetail(product)) return;
    let cancelled = false;
    void (async () => {
      try {
        const d = await catalogApi.get(product.id);
        if (cancelled) return;
        setFetched(d);
        setDetailError(null);
      } catch (err) {
        if (cancelled) return;
        setFetched(null);
        setDetailError({
          id: product.id,
          message:
            err instanceof ApiError
              ? err.message
              : "No se pudo cargar el detalle del producto.",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [product]);

  // Resuelve nombres de materiales para receta e insumo de tallas.
  useEffect(() => {
    if (!detail) return;
    const ids = new Set(detail.recipeItems.map((r) => r.materialId));
    if (detail.sizedFromMaterialId) ids.add(detail.sizedFromMaterialId);
    const missing = [...ids].filter((id) => !(id in materials));
    if (missing.length === 0) return;
    let cancelled = false;
    void (async () => {
      const loaded = await Promise.all(
        missing.map(async (id) => {
          try {
            return await inventoryApi.get(id);
          } catch {
            return null;
          }
        }),
      );
      if (cancelled) return;
      setMaterials((prev) => {
        const next = { ...prev };
        for (const m of loaded) if (m) next[m.id] = m;
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
    // `materials` sólo evita refetches; no debe relanzar el efecto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail]);

  const refreshAfterSave = async () => {
    if (!isDetail(product)) {
      try {
        const d = await catalogApi.get(product.id);
        setFetched(d);
      } catch {
        // se conserva el detalle anterior
      }
    }
    await onChanged?.();
  };

  const margin =
    base.price > 0 ? ((base.price - base.cost) / base.price) * 100 : 0;
  const canEditVariants =
    base.variantType === "size" || base.variantType === "preset";

  const sections = detail ? (
    <>
      <VariantsSection
        detail={detail}
        materials={materials}
        onEditVariants={
          canEditVariants ? () => setEditingVariants(true) : undefined
        }
      />
      <div className="divider" />
      <RecipeSection
        detail={detail}
        materials={materials}
        onEdit={() => setEditingRecipe(true)}
      />
    </>
  ) : detailError && detailError.id === base.id ? (
    <div
      className="rounded-md text-xs"
      style={{
        padding: "10px 12px",
        border: "1px solid var(--danger)",
        color: "var(--danger)",
        background: "var(--danger-soft)",
      }}
      role="alert"
    >
      {detailError.message}
    </div>
  ) : (
    <div className="text-muted text-sm">Cargando variantes y receta…</div>
  );

  const modals = (
    <>
      {editingVariants && detail && (
        <VariantsEditorModal
          product={detail}
          onClose={() => setEditingVariants(false)}
          onSaved={async () => {
            setEditingVariants(false);
            await refreshAfterSave();
          }}
        />
      )}
      {editingRecipe && detail && (
        <RecipeEditorModal
          product={detail}
          materials={materials}
          onClose={() => setEditingRecipe(false)}
          onSaved={async () => {
            setEditingRecipe(false);
            await refreshAfterSave();
          }}
        />
      )}
    </>
  );

  if (compact) {
    return (
      <div className="card self-start">
        <div className="card__body pb-0">
          <div
            className="text-lg font-semibold"
            style={{ letterSpacing: "-.01em" }}
          >
            {base.name}
          </div>
          <div className="text-muted text-xs">
            <span className="font-mono">{base.sku}</span> ·{" "}
            <span className="tag">{base.category}</span>
            {!base.isActive && (
              <>
                {" · "}
                <span style={{ color: "var(--danger)" }}>Inactivo</span>
              </>
            )}
          </div>

          <div className="divider" style={{ margin: "12px 0" }} />

          <div className="grid grid-cols-2 gap-3 text-[13px]">
            <Stat label="Origen" v={sourceLabel(base.source)} />
            <Stat label="Proveedor" v={base.supplierName ?? "—"} />
            <Stat label="Método" v={base.method ?? "—"} />
            <Stat label="Lead" v={`${base.leadDays} días`} />
            <Stat label="Precio" v={`${fmtMXN(base.price)} / ${base.unit}`} />
            <Stat label="Costo" v={`${fmtMXN(base.cost)} / ${base.unit}`} />
            <Stat label="Margen" v={`${margin.toFixed(1)}%`} />
            <Stat
              label="Stock"
              v={
                base.source === "supplier"
                  ? "—"
                  : `${fmtInt(base.stock)} ${base.unit}`
              }
            />
            <Stat
              label="Requiere aprobación"
              v={base.needsApproval ? "Sí" : "No"}
            />
            <Stat label="Variantes" v={VARIANT_TYPE_LABEL[base.variantType]} />
          </div>

          <div className="divider" style={{ margin: "12px 0" }} />

          {sections}
        </div>

        <div className="divider m-0 mt-3" />

        <div className="px-4 py-3 flex gap-2 flex-wrap">
          {onEdit && (
            <button className="btn btn--sm" onClick={onEdit}>
              {I.edit} Editar
            </button>
          )}
          {base.isActive
            ? onDeactivate && (
                <button className="btn btn--sm btn--danger" onClick={onDeactivate}>
                  {I.x} Desactivar
                </button>
              )
            : onActivate && (
                <button className="btn btn--sm btn--accent" onClick={onActivate}>
                  {I.check} Activar
                </button>
              )}
        </div>
        {modals}
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card__head">
        <div className="card__title">{base.name}</div>
        <span className="tag">{base.sku}</span>
        <div className="spacer" />
        {base.source === "supplier" ? (
          <span className="pill pill--supplier">
            {base.supplierName ?? "Proveedor"}
          </span>
        ) : (
          <span className="pill pill--neutral">Producción interna</span>
        )}
        {onEdit && (
          <button className="btn btn--sm" onClick={onEdit}>
            {I.edit} Editar
          </button>
        )}
      </div>
      <div className="card__body">
        <div className="grid gap-6" style={{ gridTemplateColumns: "200px 1fr 1fr" }}>
          <div className="skeleton-img" style={{ height: 180 }}>
            {base.method ?? base.category}
          </div>

          <div className="grid gap-2.5">
            <Kv k="Categoría" v={base.category} />
            <Kv k="Método" v={base.method ?? "—"} />
            <Kv k="Unidad de venta" v={base.unit} />
            <Kv
              k="Tiempo de entrega"
              v={`${base.leadDays} día${base.leadDays === 1 ? "" : "s"}`}
            />
            <Kv
              k="Aprobación de diseño"
              v={base.needsApproval ? "Requerida" : "No requiere"}
            />
          </div>

          <div className="grid gap-2.5">
            <Kv
              k={base.variantType === "dimension" ? "Precio base" : "Precio"}
              v={`${fmtMXN(base.price)} / ${base.unit}`}
              mono
            />
            <Kv k="Costo" v={`${fmtMXN(base.cost)} / ${base.unit}`} mono />
            <Kv k="Margen" v={`${margin.toFixed(1)}%`} mono />
            <Kv
              k="Stock disponible"
              v={
                base.source === "supplier"
                  ? "Bajo demanda"
                  : `${fmtInt(base.stock)} ${base.unit}`
              }
              mono
            />
            <Kv
              k="Estatus"
              v={
                base.isActive ? (
                  <span className="pill pill--ok">Activo</span>
                ) : (
                  <span
                    className="pill"
                    style={{
                      background: "var(--danger-soft)",
                      color: "var(--danger)",
                    }}
                  >
                    Inactivo
                  </span>
                )
              }
            />
          </div>
        </div>

        <div className="divider" />

        {sections}

        <div className="divider" />

        <div className="flex gap-1.5 flex-wrap">
          <Link href="/pos" className="btn btn--accent btn--sm">
            {I.cart} Vender ahora
          </Link>
          {base.source === "supplier" && (
            <Link href="/suppliers" className="btn btn--sm">
              {I.factory} Ver proveedor
            </Link>
          )}
        </div>
      </div>
      {modals}
    </div>
  );
}

function Stat({ label, v }: { label: string; v: React.ReactNode }) {
  return (
    <div>
      <div className="text-muted text-[11px]">{label}</div>
      <div>{v}</div>
    </div>
  );
}

function VariantsSection({
  detail,
  materials,
  onEditVariants,
}: {
  detail: ApiProductDetail;
  materials: Record<string, ApiMaterial>;
  onEditVariants?: () => void;
}) {
  const isPredef =
    detail.variantType === "size" || detail.variantType === "preset";
  const count = detail.variants.length;
  const surcharges = detail.sizeSurcharges
    ? Object.entries(detail.sizeSurcharges)
    : [];
  const sizedMaterial = detail.sizedFromMaterialId
    ? materials[detail.sizedFromMaterialId]
    : undefined;

  return (
    <div>
      <div className="flex items-center gap-2.5 mb-2.5">
        <span className="text-accent">{I.layers}</span>
        <div className="font-medium">
          {VARIANT_TYPE_LABEL[detail.variantType]}
        </div>
        {isPredef && count > 0 && <span className="tag">{count} opciones</span>}
        <div className="spacer" />
        {isPredef && onEditVariants && (
          <button className="btn btn--sm" onClick={onEditVariants}>
            {I.edit} Editar variantes
          </button>
        )}
      </div>

      {isPredef ? (
        count === 0 ? (
          <div className="empty p-4">Aún no hay variantes configuradas.</div>
        ) : (
          <table className="tbl border border-line rounded-md overflow-hidden">
            <thead>
              <tr>
                <th>Código</th>
                <th>Etiqueta</th>
                <th className="text-right">Modificador</th>
                <th className="text-right">Precio</th>
                <th className="text-right">Stock</th>
              </tr>
            </thead>
            <tbody>
              {detail.variants.map((v) => (
                <tr key={v.code}>
                  <td className="font-mono text-[12px]">{v.code}</td>
                  <td>
                    <strong>{v.label}</strong>
                  </td>
                  <td
                    className="num text-right"
                    style={{
                      color:
                        v.priceMod === 0
                          ? "var(--muted)"
                          : v.priceMod > 0
                            ? "var(--ok)"
                            : "var(--danger)",
                    }}
                  >
                    {v.priceMod === 0
                      ? "—"
                      : (v.priceMod > 0 ? "+" : "") + fmtMXN(v.priceMod)}
                  </td>
                  <td className="num text-right">
                    {fmtMXN(detail.price + v.priceMod)}
                  </td>
                  <td
                    className="num text-right"
                    style={{
                      color: v.stock < 15 ? "var(--warn)" : "var(--ink)",
                    }}
                  >
                    {detail.source === "supplier" ? "—" : fmtInt(v.stock)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      ) : detail.variantType === "dimension" ? (
        detail.dimensionConfig ? (
          <div className="p-3.5 border border-line rounded-md bg-surface-2">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
                gap: 12,
              }}
            >
              <Stat
                label="Unidad"
                v={DIMENSION_UNIT_LABEL[detail.dimensionConfig.unit]}
              />
              <Stat
                label="Mínimo"
                v={`${fmtQty(detail.dimensionConfig.min)} ${detail.dimensionConfig.unit}`}
              />
              <Stat
                label="Máximo"
                v={`${fmtQty(detail.dimensionConfig.max)} ${detail.dimensionConfig.unit}`}
              />
              <Stat
                label="Paso"
                v={`${fmtQty(detail.dimensionConfig.step)} ${detail.dimensionConfig.unit}`}
              />
              <Stat
                label="Cobro"
                v={PRICE_MODE_LABEL[detail.dimensionConfig.priceMode]}
              />
            </div>
            <div className="help mt-2.5">
              En el POS se capturan las medidas dentro del rango y el precio se
              calcula a partir del precio base (
              <span className="num">
                {fmtMXN(detail.price)}/{detail.unit}
              </span>
              ).
            </div>
          </div>
        ) : (
          <div className="empty p-4">
            Falta la configuración de dimensiones de este producto.
          </div>
        )
      ) : detail.variantType === "sized_from_material" ? (
        <div className="p-3.5 border border-line rounded-md bg-surface-2">
          <div className="help mb-2">
            Las tallas y su stock viven en el insumo{" "}
            <strong>
              {sizedMaterial
                ? sizedMaterial.name
                : detail.sizedFromMaterialId ?? "—"}
            </strong>
            . Aquí sólo se configura el sobreprecio por talla.
          </div>
          {surcharges.length === 0 ? (
            <div className="text-muted text-xs">Sin sobreprecios por talla.</div>
          ) : (
            <div className="flex gap-1.5 flex-wrap">
              {surcharges.map(([size, extra]) => (
                <span key={size} className="tag">
                  {size}: {extra > 0 ? `+${fmtMXN(extra)}` : fmtMXN(extra)}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="empty p-4">
          Este producto se vende sin opciones de talla o medida.
        </div>
      )}
    </div>
  );
}

function RecipeSection({
  detail,
  materials,
  onEdit,
}: {
  detail: ApiProductDetail;
  materials: Record<string, ApiMaterial>;
  onEdit: () => void;
}) {
  const items = detail.recipeItems;
  return (
    <div>
      <div className="flex items-center gap-2.5 mb-2.5">
        <span className="text-accent">{I.box}</span>
        <div className="font-medium">Receta de insumos</div>
        {items.length > 0 && (
          <span className="tag">
            {items.length} {items.length === 1 ? "insumo" : "insumos"}
          </span>
        )}
        <div className="spacer" />
        <button className="btn btn--sm" onClick={onEdit}>
          {I.edit} Editar receta
        </button>
      </div>
      {items.length === 0 ? (
        <div className="empty p-4">
          Sin receta. Los insumos no se descuentan automáticamente al vender.
        </div>
      ) : (
        <table className="tbl border border-line rounded-md overflow-hidden">
          <thead>
            <tr>
              <th>Material</th>
              <th className="text-right">Cantidad</th>
              <th>Por variante</th>
              <th>Nota</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => {
              const m = materials[it.materialId];
              return (
                <tr key={it.materialId}>
                  <td>
                    <div className="font-medium">{m?.name ?? "Material"}</div>
                    <div className="text-muted text-[11px] font-mono">
                      {m?.sku ?? it.materialId}
                    </div>
                  </td>
                  <td className="num text-right">
                    {fmtQty(it.qty)}
                    {m ? ` ${m.unit}` : ""}
                  </td>
                  <td>
                    {it.byVariant ? (
                      <span className="tag">Sí</span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="text-muted text-xs">{it.note ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

type VariantDraft = {
  code: string;
  label: string;
  priceMod: string;
  stock: string;
};

function VariantsEditorModal({
  product,
  onClose,
  onSaved,
}: {
  product: ApiProductDetail;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [rows, setRows] = useState<VariantDraft[]>(
    product.variants.length > 0
      ? product.variants.map((v) => ({
          code: v.code,
          label: v.label,
          priceMod: String(v.priceMod),
          stock: String(v.stock),
        }))
      : [{ code: "", label: "", priceMod: "0", stock: "0" }],
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (index: number, patch: Partial<VariantDraft>) =>
    setRows(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  const remove = (index: number) =>
    setRows(rows.filter((_, i) => i !== index));
  const add = () =>
    setRows([...rows, { code: "", label: "", priceMod: "", stock: "" }]);

  const gridCols = "110px 1fr 120px 100px 32px";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    const inputs: ProductVariantInput[] = [];
    const seen = new Set<string>();
    for (const r of rows) {
      const code = r.code.trim();
      const label = r.label.trim();
      if (!code && !label) continue; // fila vacía: se ignora
      if (!code || !label) {
        setError("Cada variante necesita código y etiqueta.");
        return;
      }
      if (seen.has(code.toLowerCase())) {
        setError(`Código de variante duplicado: ${code}.`);
        return;
      }
      seen.add(code.toLowerCase());
      const input: ProductVariantInput = {
        code,
        label,
        sortOrder: inputs.length,
      };
      if (r.priceMod.trim() !== "") {
        const mod = Number(r.priceMod);
        if (!Number.isFinite(mod)) {
          setError(`Modificador inválido para la variante ${code}.`);
          return;
        }
        input.priceMod = mod;
      }
      if (r.stock.trim() !== "") {
        const stock = Number(r.stock);
        if (!Number.isInteger(stock) || stock < 0) {
          setError(`Stock inválido para la variante ${code}: entero >= 0.`);
          return;
        }
        input.stock = stock;
      }
      inputs.push(input);
    }

    setSubmitting(true);
    try {
      await catalogApi.setVariants(product.id, inputs);
      await onSaved();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.status === 409
            ? `No se pudo guardar: ${err.message}`
            : err.message
          : "No se pudieron guardar las variantes.",
      );
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={`Variantes — ${product.name}`}
      onClose={onClose}
      width={660}
      footer={
        <>
          <button className="btn btn--ghost" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn btn--accent"
            type="submit"
            form="product-variants-form"
            disabled={submitting}
          >
            {submitting ? "Guardando…" : "Guardar variantes"}
          </button>
        </>
      }
    >
      <form
        id="product-variants-form"
        onSubmit={submit}
        className="grid gap-2"
      >
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
            <span>Código</span>
            <span>Etiqueta</span>
            <span style={{ textAlign: "right" }}>± Modificador</span>
            <span style={{ textAlign: "right" }}>Stock</span>
            <span />
          </div>
          {rows.length === 0 ? (
            <div className="text-muted text-xs" style={{ padding: "10px 12px" }}>
              Sin filas: al guardar se eliminarán todas las variantes.
            </div>
          ) : (
            rows.map((r, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: gridCols,
                  padding: "6px 10px",
                  borderBottom:
                    i < rows.length - 1 ? "1px solid var(--line)" : 0,
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <input
                  className="input font-mono"
                  value={r.code}
                  onChange={(e) => update(i, { code: e.target.value })}
                  placeholder="CH"
                  maxLength={40}
                  aria-label="Código"
                />
                <input
                  className="input"
                  value={r.label}
                  onChange={(e) => update(i, { label: e.target.value })}
                  placeholder="Chica"
                  maxLength={80}
                  aria-label="Etiqueta"
                />
                <input
                  className="input num"
                  type="number"
                  step="0.01"
                  value={r.priceMod}
                  onChange={(e) => update(i, { priceMod: e.target.value })}
                  style={{ textAlign: "right" }}
                  aria-label="Modificador de precio"
                />
                <input
                  className="input num"
                  type="number"
                  step={1}
                  min={0}
                  value={r.stock}
                  onChange={(e) => update(i, { stock: e.target.value })}
                  style={{ textAlign: "right" }}
                  aria-label="Stock"
                />
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => remove(i)}
                  style={{ width: 24, height: 24, color: "var(--muted)", border: 0 }}
                  aria-label="Eliminar variante"
                >
                  {I.x}
                </button>
              </div>
            ))
          )}
        </div>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          style={{ justifySelf: "start" }}
          onClick={add}
        >
          {I.plus} Añadir variante
        </button>
        <div className="help">
          El modificador se suma al precio base. Deja modificador o stock
          vacíos para conservar el valor actual de una variante existente.
          Quitar una variante con stock distinto de cero será rechazado por el
          sistema.
        </div>
        {error && (
          <div
            className="rounded-md text-xs"
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

function RecipeEditorModal({
  product,
  materials,
  onClose,
  onSaved,
}: {
  product: ApiProductDetail;
  materials: Record<string, ApiMaterial>;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [rows, setRows] = useState<RecipeRow[]>(() =>
    product.recipeItems.map((it) => {
      const m = materials[it.materialId];
      return {
        materialId: it.materialId,
        materialName: m?.name ?? it.materialId,
        materialSku: m?.sku ?? "",
        materialUnit: m?.unit ?? "",
        qty: String(it.qty),
        byVariant: it.byVariant,
        note: it.note ?? "",
      };
    }),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    const invalid = validateRecipeRows(rows);
    if (invalid) {
      setError(invalid);
      return;
    }
    setSubmitting(true);
    try {
      await catalogApi.setRecipe(product.id, recipeRowsToInput(rows));
      await onSaved();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudo guardar la receta.",
      );
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={`Receta — ${product.name}`}
      onClose={onClose}
      width={720}
      footer={
        <>
          <button className="btn btn--ghost" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn btn--accent"
            type="submit"
            form="product-recipe-form"
            disabled={submitting}
          >
            {submitting ? "Guardando…" : "Guardar receta"}
          </button>
        </>
      }
    >
      <form id="product-recipe-form" onSubmit={submit} className="grid gap-3">
        <RecipeEditor rows={rows} onChange={setRows} />
        {error && (
          <div
            className="rounded-md text-xs"
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
