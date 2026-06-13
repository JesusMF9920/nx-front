"use client";

import { useEffect, useMemo, useState } from "react";
import { I } from "@/components/icons";
import { Modal } from "@/components/modal";
import { PosClientPicker } from "@/components/pos-client-picker";
import {
  PosSizeBreakdownPicker,
  type SizeBreakdownLineData,
} from "@/components/pos-size-breakdown-picker";
import {
  PosVariantPicker,
  type VariantLineData,
} from "@/components/pos-variant-picker";
import { SummaryRow } from "@/components/summary-row";
import { catalogApi } from "@/lib/api/catalog";
import { ApiError } from "@/lib/api/errors";
import { inventoryApi } from "@/lib/api/inventory";
import { quotesApi, type QuoteLineInput } from "@/lib/api/quotes";
import type {
  ApiClient,
  ApiMaterial,
  ApiProduct,
  ApiProductDetail,
  ApiProductSource,
  ApiQuoteDetail,
  ApiQuotePreview,
} from "@/lib/api/types";
import { fmtMXN } from "@/lib/format";
import { effectiveQty, lineSubtotal } from "@/lib/pos-cart";
import type { CartLine, ProductSource, SizeBreakdownEntry } from "@/lib/types";

type BuilderLine = CartLine & { unitPriceOverride?: number };

type PickerState = {
  detail: ApiProductDetail;
  material?: ApiMaterial;
  editLineId?: string;
  editBreakdown?: SizeBreakdownEntry[];
};

type Props = {
  onClose: () => void;
  onSaved: (result: { quoteId: string; folio: string }) => void;
  /** Si viene, el modal edita ese borrador (PATCH) en vez de crear. */
  editQuote?: ApiQuoteDetail;
};

const PAGE_SIZE = 12;

function sourceLabel(s: ApiProductSource): ProductSource {
  return s === "internal" ? "Interno" : "Proveedor";
}

/** Reconstruye las líneas del builder desde un borrador para editar. */
function linesFromQuote(quote: ApiQuoteDetail): BuilderLine[] {
  return quote.items.map((it, idx) => ({
    lineId: `E${idx}-${it.id}`,
    id: it.productId ?? "",
    isAdHoc: it.productId === null,
    adHocCost: undefined,
    lineNote: it.lineNote ?? undefined,
    name: it.productName,
    sku: it.sku,
    source: sourceLabel(it.source),
    supplier: it.supplierName ?? undefined,
    needsApproval: it.needsApproval,
    // Cada item por dimensión es UNA pieza (qty del backend = computedQty área/
    // lineal, no piezas): qty=1 para no re-expandir en N líneas al guardar, y
    // price=lineTotal para que el subtotal mostrado de la pieza sea correcto.
    qty: it.dimensionData ? 1 : it.qty,
    price: it.dimensionData ? it.lineTotal : it.unitPrice,
    variantCode: it.variantCode ?? undefined,
    variantLabel: it.variantLabel ?? undefined,
    dimension: it.dimensionData
      ? { width: it.dimensionData.width, height: it.dimensionData.height }
      : undefined,
    sizeBreakdown: it.sizeBreakdown
      ? it.sizeBreakdown.map((b) => ({
          sizeId: b.sizeId,
          qty: b.qty,
          surcharge: b.surcharge,
        }))
      : undefined,
    unitPriceOverride: it.priceOverridden ? it.unitPrice : undefined,
  }));
}

export function QuoteNewModal({ onClose, onSaved, editQuote }: Props) {
  const isEdit = !!editQuote;
  const [client, setClient] = useState<{ id: string; name: string } | null>(
    editQuote ? { id: editQuote.clientId, name: editQuote.clientName } : null,
  );
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [cart, setCart] = useState<BuilderLine[]>(
    editQuote ? linesFromQuote(editQuote) : [],
  );
  const [discount, setDiscount] = useState(editQuote?.discount ?? 0);
  const [validUntil, setValidUntil] = useState(
    editQuote?.validUntil ? editQuote.validUntil.slice(0, 10) : "",
  );
  const [notes, setNotes] = useState(editQuote?.notes ?? "");

  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [productsTotal, setProductsTotal] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [variantPicker, setVariantPicker] = useState<PickerState | null>(null);
  const [detailCache] = useState<Map<string, ApiProductDetail>>(() => new Map());
  const [materialCache] = useState<Map<string, ApiMaterial>>(() => new Map());

  const [preview, setPreview] = useState<ApiQuotePreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const id = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    catalogApi
      .list({
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        search: debounced || undefined,
        isActive: true,
        orderBy: "name",
        order: "asc",
      })
      .then((res) => {
        if (cancelled) return;
        setProducts(res.items);
        setProductsTotal(res.total);
        setLoadError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(
          err instanceof ApiError
            ? err.message
            : "No se pudieron cargar los productos.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [debounced, page]);

  const quoteLines = useMemo<QuoteLineInput[]>(
    () =>
      cart.flatMap<QuoteLineInput>((line) => {
        const ov =
          line.unitPriceOverride !== undefined
            ? { unitPriceOverride: line.unitPriceOverride }
            : {};
        const note = line.lineNote?.trim()
          ? { lineNote: line.lineNote.trim() }
          : {};
        // Decisión de diseño por línea: se manda siempre (default del catálogo
        // o lo que se haya prendido/apagado con el toggle); sobrevive a la conversión.
        const design = { needsApproval: line.needsApproval };
        if (line.isAdHoc) {
          // Línea ad-hoc (producto libre): nombre + precio a mano, sin productId.
          return [
            {
              adHocName: line.name,
              adHocPrice: line.price,
              ...(line.adHocCost !== undefined
                ? { adHocCost: line.adHocCost }
                : {}),
              qty: line.qty,
              ...design,
              ...note,
            },
          ];
        }
        if (line.sizeBreakdown) {
          return [
            {
              productId: line.id,
              sizeBreakdown: line.sizeBreakdown
                .filter((b) => b.qty > 0)
                .map((b) => ({ sizeId: b.sizeId, qty: b.qty })),
              ...ov,
              ...design,
              ...note,
            },
          ];
        }
        if (line.dimension) {
          return Array.from({ length: Math.max(1, line.qty) }, () => ({
            productId: line.id,
            dimension: { ...line.dimension! },
            ...ov,
            ...design,
            ...note,
          }));
        }
        if (line.variantCode) {
          return [
            {
              productId: line.id,
              qty: line.qty,
              variantCode: line.variantCode,
              ...ov,
              ...design,
              ...note,
            },
          ];
        }
        return [
          { productId: line.id, qty: line.qty, ...ov, ...design, ...note },
        ];
      }),
    [cart],
  );

  // Preview autoritativo (debounced) cuando hay cliente y líneas. El setState
  // vive dentro del timeout (no en el cuerpo del effect) a propósito.
  useEffect(() => {
    let cancelled = false;
    const id = setTimeout(() => {
      if (!client || quoteLines.length === 0) {
        setPreview(null);
        setPreviewError(null);
        return;
      }
      quotesApi
        .preview({
          clientId: client.id,
          lines: quoteLines,
          discount: discount > 0 ? discount : undefined,
        })
        .then((res) => {
          if (!cancelled) {
            setPreview(res);
            setPreviewError(null);
          }
        })
        .catch((err) => {
          if (cancelled) return;
          setPreview(null);
          setPreviewError(
            err instanceof ApiError
              ? err.message
              : "No se pudo calcular el total.",
          );
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [client, quoteLines, discount]);

  const ensureDetail = async (productId: string): Promise<ApiProductDetail> => {
    const cached = detailCache.get(productId);
    if (cached) return cached;
    const detail = await catalogApi.get(productId);
    detailCache.set(productId, detail);
    return detail;
  };

  const openPicker = async (
    productId: string,
    edit?: { lineId: string; breakdown: SizeBreakdownEntry[] },
  ) => {
    try {
      const detail = await ensureDetail(productId);
      let material: ApiMaterial | undefined;
      if (detail.variantType === "sized_from_material") {
        if (!detail.sizedFromMaterialId) {
          setLoadError("El producto no tiene material de tallas configurado.");
          return;
        }
        material =
          materialCache.get(detail.sizedFromMaterialId) ??
          (await inventoryApi.get(detail.sizedFromMaterialId));
        materialCache.set(detail.sizedFromMaterialId, material);
      }
      setVariantPicker({
        detail,
        material,
        editLineId: edit?.lineId,
        editBreakdown: edit?.breakdown,
      });
    } catch (err) {
      setLoadError(
        err instanceof ApiError
          ? err.message
          : "No se pudo cargar el detalle del producto.",
      );
    }
  };

  const addToCart = (p: ApiProduct) => {
    if (p.variantType !== "none") {
      void openPicker(p.id);
      return;
    }
    setCart((cs) => [
      ...cs,
      {
        lineId: `L${cs.length}-${Date.now()}`,
        id: p.id,
        name: p.name,
        sku: p.sku,
        source: sourceLabel(p.source),
        supplier: p.supplierName ?? undefined,
        needsApproval: p.needsApproval,
        qty: 1,
        price: p.price,
      },
    ]);
  };

  const addVariant = (p: ApiProductDetail, line: VariantLineData) => {
    setCart((cs) => [
      ...cs,
      {
        lineId: `L${Date.now()}`,
        id: p.id,
        name: p.name,
        sku: p.sku,
        source: sourceLabel(p.source),
        supplier: p.supplierName ?? undefined,
        needsApproval: p.needsApproval,
        ...line,
      },
    ]);
    setVariantPicker(null);
  };

  const addOrUpdateBreakdown = (
    p: ApiProductDetail,
    line: SizeBreakdownLineData,
    editLineId?: string,
  ) => {
    setCart((cs) => {
      if (editLineId) {
        return cs.map((c) => (c.lineId === editLineId ? { ...c, ...line } : c));
      }
      return [
        ...cs,
        {
          lineId: `L${Date.now()}`,
          id: p.id,
          name: p.name,
          sku: p.sku,
          source: sourceLabel(p.source),
          supplier: p.supplierName ?? undefined,
          needsApproval: p.needsApproval,
          sizedFromMaterial: p.sizedFromMaterialId ?? undefined,
          ...line,
        },
      ];
    });
    setVariantPicker(null);
  };

  const updateQty = (lineId: string, q: number) => {
    if (!Number.isFinite(q)) return; // ignora tecleo no numérico (no rompe la línea)
    setCart((cs) =>
      q <= 0
        ? cs.filter((c) => c.lineId !== lineId)
        : cs.map((c) => (c.lineId === lineId ? { ...c, qty: q } : c)),
    );
  };

  const setOverride = (lineId: string, raw: string) => {
    const v = parseFloat(raw);
    setCart((cs) =>
      cs.map((c) =>
        c.lineId === lineId
          ? {
              ...c,
              unitPriceOverride:
                raw.trim() === "" || !Number.isFinite(v) || v <= 0
                  ? undefined
                  : Math.round(v * 100) / 100,
            }
          : c,
      ),
    );
  };

  const removeLine = (lineId: string) =>
    setCart((cs) => cs.filter((c) => c.lineId !== lineId));

  /** Parche puntual de una línea (nombre/precio ad-hoc, nota). */
  const patchLine = (lineId: string, patch: Partial<BuilderLine>) =>
    setCart((cs) =>
      cs.map((c) => (c.lineId === lineId ? { ...c, ...patch } : c)),
    );

  /** Agrega una línea ad-hoc (producto libre) en blanco para capturar a mano. */
  const addAdHocLine = () =>
    setCart((cs) => [
      ...cs,
      {
        lineId: `A${Date.now()}`,
        id: "",
        isAdHoc: true,
        name: "",
        sku: "LIBRE",
        source: "Interno",
        needsApproval: false,
        qty: 1,
        price: 0,
      },
    ]);

  // Una línea ad-hoc exige nombre y precio > 0 (el backend igual lo revalida).
  const hasInvalidAdHoc = cart.some(
    (l) => l.isAdHoc && (l.name.trim() === "" || l.price <= 0),
  );

  const totalPages = Math.max(1, Math.ceil(productsTotal / PAGE_SIZE));
  // Al editar (PATCH requiere sólo 'manage') no exigimos preview: POST
  // /quotes/preview requiere 'create', así que un rol manage-sin-create no debe
  // quedar bloqueado — el backend recalcula totales en el PATCH de todos modos.
  const canSave =
    !!client &&
    cart.length > 0 &&
    !saving &&
    !hasInvalidAdHoc &&
    (isEdit || (!!preview && !previewError));
  // El error de preview no bloquea ni se muestra al editar (es best-effort).
  const shownError = saveError ?? (isEdit ? null : previewError);

  const save = async () => {
    if (!client || cart.length === 0) return;
    setSaving(true);
    setSaveError(null);
    const payload = {
      clientId: client.id,
      lines: quoteLines,
      ...(discount > 0 ? { discount } : {}),
      ...(validUntil
        ? { validUntil: new Date(`${validUntil}T12:00:00`).toISOString() }
        : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };
    try {
      if (isEdit && editQuote) {
        await quotesApi.update(editQuote.id, payload);
        onSaved({ quoteId: editQuote.id, folio: editQuote.folio });
      } else {
        const res = await quotesApi.create(payload);
        onSaved(res);
      }
    } catch (err) {
      setSaveError(
        err instanceof ApiError
          ? err.message
          : "No se pudo guardar la cotización.",
      );
      setSaving(false);
    }
  };

  return (
    <Modal
      title={isEdit ? `Editar ${editQuote.folio}` : "Nueva cotización"}
      onClose={onClose}
      width={980}
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button
            className="btn btn--accent"
            onClick={() => void save()}
            disabled={!canSave}
            title={
              !client
                ? "Selecciona un cliente"
                : cart.length === 0
                  ? "Agrega al menos un producto"
                  : undefined
            }
          >
            {I.check}{" "}
            {saving
              ? "Guardando…"
              : isEdit
                ? "Guardar cambios"
                : "Guardar cotización"}
          </button>
        </>
      }
    >
      {shownError && (
        <div
          className="flex items-start gap-2 rounded-md mb-3"
          style={{
            padding: 12,
            border: "1px solid var(--danger)",
            color: "var(--danger)",
            background: "var(--danger-soft)",
          }}
          role="alert"
        >
          <span className="flex-1">{shownError}</span>
        </div>
      )}

      <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 360px" }}>
        {/* Catálogo */}
        <div className="flex flex-col" style={{ minHeight: 420 }}>
          <div className="topbar__search m-0 mb-2.5" style={{ width: "auto" }}>
            {I.search}
            <input
              placeholder="Buscar producto o SKU…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          {loadError && (
            <div className="text-xs mb-2" style={{ color: "var(--danger)" }}>
              {loadError}
            </div>
          )}
          <div
            className="grid gap-2 overflow-y-auto flex-1"
            style={{ gridTemplateColumns: "repeat(3, 1fr)", maxHeight: 420 }}
          >
            {products.map((p) => (
              <button
                type="button"
                key={p.id}
                onClick={() => addToCart(p)}
                className="text-left border border-line bg-surface p-2.5 cursor-pointer rounded-md flex flex-col gap-1"
              >
                <div className="text-xs font-medium" style={{ lineHeight: 1.3 }}>
                  {p.name}
                </div>
                <div className="text-muted text-[10px] font-mono">{p.sku}</div>
                <div className="flex items-center gap-1.5 mt-auto">
                  <span className="num font-semibold text-[13px]">
                    {fmtMXN(p.price)}
                  </span>
                  <div className="spacer" />
                  {p.variantType !== "none" && (
                    <span className="tag" title="Requiere variante">
                      {I.layers}
                    </span>
                  )}
                </div>
              </button>
            ))}
            {products.length === 0 && !loadError && (
              <div className="empty col-span-3">Sin productos.</div>
            )}
          </div>
          {productsTotal > PAGE_SIZE && (
            <div className="flex items-center gap-2 text-xs text-muted mt-2">
              <span className="num">
                Página {page} de {totalPages}
              </span>
              <div className="spacer" />
              <button
                className="btn btn--sm btn--ghost"
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                aria-label="Anterior"
              >
                {I.chevronLeft}
              </button>
              <button
                className="btn btn--sm btn--ghost"
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                aria-label="Siguiente"
              >
                {I.chevronRight}
              </button>
            </div>
          )}
        </div>

        {/* Carrito + datos */}
        <div className="flex flex-col gap-3">
          <div>
            <div className="label mb-1">Cliente</div>
            {client ? (
              <div className="flex items-center gap-2 text-[13px]">
                <span className="flex-1 font-medium">{client.name}</span>
                <button
                  className="btn btn--sm"
                  onClick={() => setShowClientPicker(true)}
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <button
                className="btn btn--sm w-full justify-center"
                onClick={() => setShowClientPicker(true)}
              >
                Seleccionar cliente
              </button>
            )}
          </div>

          <div
            className="border border-line rounded-md overflow-y-auto"
            style={{ maxHeight: 240 }}
          >
            {cart.length === 0 ? (
              <div className="empty m-3">Agrega productos del catálogo.</div>
            ) : (
              cart.map((line) => (
                <div
                  key={line.lineId}
                  className="px-2.5 py-2"
                  style={{ borderBottom: "1px solid var(--line)" }}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      {line.isAdHoc ? (
                        <input
                          className="text-[13px] font-medium bg-transparent border-b border-line w-full outline-none"
                          placeholder="Producto libre…"
                          value={line.name}
                          onChange={(e) =>
                            patchLine(line.lineId, { name: e.target.value })
                          }
                        />
                      ) : (
                        <div className="text-[13px] font-medium">
                          {line.name}
                        </div>
                      )}
                      <div className="text-muted text-[10px] font-mono">
                        {line.sku}
                        {line.variantLabel ? ` · ${line.variantLabel}` : ""}
                      </div>
                      {line.sizeBreakdown && (
                        <div className="text-muted text-[10px] mt-0.5">
                          {line.sizeBreakdown
                            .filter((b) => b.qty > 0)
                            .map((b) => `${b.sizeId}×${b.qty}`)
                            .join(" · ")}
                        </div>
                      )}
                    </div>
                    <div className="num text-[13px] font-semibold">
                      {fmtMXN(lineSubtotal(line))}
                    </div>
                    <button
                      className="icon-btn"
                      type="button"
                      onClick={() => removeLine(line.lineId)}
                      aria-label="Quitar"
                    >
                      {I.trash}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    {line.sizeBreakdown ? (
                      <button
                        className="btn btn--ghost btn--sm"
                        onClick={() =>
                          void openPicker(line.id, {
                            lineId: line.lineId,
                            breakdown: line.sizeBreakdown ?? [],
                          })
                        }
                      >
                        {I.layers} {effectiveQty(line)} pzas · editar
                      </button>
                    ) : line.dimension ? (
                      <span className="num text-[11px] text-muted">
                        {line.dimension.width}×{line.dimension.height}
                      </span>
                    ) : (
                      <div className="flex items-center border border-line rounded-md">
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          style={{ borderRadius: 0 }}
                          onClick={() => updateQty(line.lineId, line.qty - 1)}
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={1}
                          className="num text-center bg-transparent"
                          value={line.qty}
                          onChange={(e) =>
                            updateQty(
                              line.lineId,
                              parseInt(e.target.value || "0", 10),
                            )
                          }
                          style={{
                            width: 40,
                            border: 0,
                            outline: "none",
                            height: 22,
                          }}
                        />
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          style={{ borderRadius: 0 }}
                          onClick={() => updateQty(line.lineId, line.qty + 1)}
                        >
                          +
                        </button>
                      </div>
                    )}
                    <div className="spacer" />
                    {line.isAdHoc ? (
                      <label className="flex items-center gap-1 text-[10px] text-muted">
                        Precio $
                        <input
                          className="input num"
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="0.00"
                          value={line.price || ""}
                          onChange={(e) =>
                            patchLine(line.lineId, {
                              price: parseFloat(e.target.value || "0") || 0,
                            })
                          }
                          style={{ width: 80, height: 24, padding: "0 6px" }}
                        />
                      </label>
                    ) : (
                      <label className="flex items-center gap-1 text-[10px] text-muted">
                        Precio neg.
                        <input
                          className="input num"
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder={String(line.price)}
                          value={line.unitPriceOverride ?? ""}
                          onChange={(e) =>
                            setOverride(line.lineId, e.target.value)
                          }
                          style={{ width: 80, height: 24, padding: "0 6px" }}
                        />
                      </label>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <button
                      type="button"
                      aria-pressed={line.needsApproval}
                      title="¿Requiere diseño?"
                      className={`pill text-[10px] border-0 cursor-pointer shrink-0 ${
                        line.needsApproval
                          ? "pill--warn"
                          : "pill--neutral opacity-60"
                      }`}
                      onClick={() =>
                        patchLine(line.lineId, {
                          needsApproval: !line.needsApproval,
                        })
                      }
                    >
                      {I.paint} Diseño
                    </button>
                    <input
                      className="flex-1 min-w-0 text-[11px] bg-transparent border border-line rounded px-2 py-1 outline-none"
                      placeholder="Nota para producción (opcional)"
                      value={line.lineNote ?? ""}
                      onChange={(e) =>
                        patchLine(line.lineId, { lineNote: e.target.value })
                      }
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          <button
            type="button"
            className="btn btn--ghost btn--sm self-start"
            onClick={addAdHocLine}
          >
            + Línea libre
          </button>

          <div className="grid grid-cols-2 gap-2">
            <label className="field">
              <span className="label">Descuento (MXN)</span>
              <input
                className="input num"
                type="number"
                min={0}
                step="0.01"
                value={discount || ""}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setDiscount(Number.isFinite(v) && v > 0 ? v : 0);
                }}
              />
            </label>
            <label className="field">
              <span className="label">Vigencia</span>
              <input
                className="input"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </label>
          </div>

          <label className="field">
            <span className="label">Notas</span>
            <textarea
              className="textarea"
              rows={2}
              maxLength={2000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Condiciones, acuerdos con el cliente…"
            />
          </label>

          <div className="bg-surface-2 border border-line rounded-md p-3">
            {preview ? (
              <>
                <SummaryRow label="Subtotal" value={fmtMXN(preview.subtotal)} />
                <SummaryRow
                  label="Descuento"
                  value={fmtMXN(preview.discount)}
                  muted
                />
                <SummaryRow label="IVA 16%" value={fmtMXN(preview.tax)} />
                <div className="bg-line my-2" style={{ height: 1 }} />
                <SummaryRow label="Total" value={fmtMXN(preview.total)} big />
              </>
            ) : (
              <div className="text-xs text-muted">
                {client
                  ? "Agrega productos para ver el total."
                  : "Selecciona un cliente para cotizar."}
              </div>
            )}
          </div>
        </div>
      </div>

      {showClientPicker && (
        <PosClientPicker
          onClose={() => setShowClientPicker(false)}
          onSelect={(c: ApiClient) => {
            setClient({ id: c.id, name: c.name });
            setShowClientPicker(false);
          }}
        />
      )}

      {variantPicker &&
        (variantPicker.detail.variantType === "sized_from_material" &&
        variantPicker.material ? (
          <PosSizeBreakdownPicker
            product={variantPicker.detail}
            material={variantPicker.material}
            editLineId={variantPicker.editLineId}
            editBreakdown={variantPicker.editBreakdown}
            onClose={() => setVariantPicker(null)}
            onAdd={addOrUpdateBreakdown}
          />
        ) : (
          <PosVariantPicker
            product={variantPicker.detail}
            onClose={() => setVariantPicker(null)}
            onAdd={addVariant}
          />
        ))}
    </Modal>
  );
}
