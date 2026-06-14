"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { usePermission } from "@/lib/auth/auth-context";
import { Avatar } from "@/components/avatar";
import { I } from "@/components/icons";
import { Modal } from "@/components/modal";
import { SummaryRow } from "@/components/summary-row";
import { PosCashIndicator } from "@/components/pos-cash-indicator";
import { PosClientPicker } from "@/components/pos-client-picker";
import { PosPaymentModal } from "@/components/pos-payment-modal";
import {
  PosSizeBreakdownPicker,
  type SizeBreakdownLineData,
} from "@/components/pos-size-breakdown-picker";
import {
  PosVariantPicker,
  type VariantLineData,
} from "@/components/pos-variant-picker";
import { catalogApi } from "@/lib/api/catalog";
import { ApiError } from "@/lib/api/errors";
import { inventoryApi } from "@/lib/api/inventory";
import { ordersApi, type CheckoutLineInput } from "@/lib/api/orders";
import { openLetterTicket, printThermalTicket } from "@/lib/print/order-ticket";
import {
  buildOrderReceiptWhatsappMessage,
  buildWaMeUrl,
} from "@/lib/share/whatsapp";
import type {
  ApiClient,
  ApiMaterial,
  ApiProduct,
  ApiProductDetail,
  ApiProductSource,
} from "@/lib/api/types";
import { fmtMXN } from "@/lib/format";
import { cartTotals, lineSubtotal } from "@/lib/pos-cart";
import { getPriceForQty, hasPriceTiers } from "@/lib/pricing";
import type { CartLine, ProductSource, SizeBreakdownEntry } from "@/lib/types";

type PickerState = {
  detail: ApiProductDetail;
  /** Solo para sized_from_material: material origen de tallas. */
  material?: ApiMaterial;
  editLineId?: string;
  editBreakdown?: SizeBreakdownEntry[];
};

function sourceLabel(s: ApiProductSource): ProductSource {
  return s === "internal" ? "Interno" : "Proveedor";
}

export default function POSPage() {
  const router = useRouter();
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  // Aviso post-venta cuando una acción de comprobante (imprimir/enviar) falla:
  // la venta YA existe, así que NO bloqueamos ni navegamos en silencio — lo
  // mostramos y dejamos ir al pedido.
  const [saleNotice, setSaleNotice] = useState<{
    folio: string;
    failures: string[];
  } | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [client, setClient] = useState<ApiClient | null>(null);
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [categories, setCategories] = useState<string[]>(["Todos"]);
  const [page, setPage] = useState(1);
  const [productsTotal, setProductsTotal] = useState(0);
  const canSell = usePermission("sales.pos.sell");
  const canDiscount = usePermission("sales.discount.apply");
  const PAGE_SIZE = 24;
  const [discount, setDiscount] = useState(0);
  const [discountDraft, setDiscountDraft] = useState("");
  const [showDiscount, setShowDiscount] = useState(false);
  const [deliverAt, setDeliverAt] = useState("");
  const [deliverDraft, setDeliverDraft] = useState("");
  const [showDeliver, setShowDeliver] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [variantPicker, setVariantPicker] = useState<PickerState | null>(null);
  const [detailCache, setDetailCache] = useState<Map<string, ApiProductDetail>>(
    () => new Map(),
  );
  const [materialCache, setMaterialCache] = useState<Map<string, ApiMaterial>>(
    () => new Map(),
  );

  useEffect(() => {
    const id = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(id);
  }, [search]);

  const reload = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await catalogApi.list({
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        search: debounced || undefined,
        // Filtro de categoría SERVER-SIDE: con paginación, filtrar la página
        // actual en cliente dejaría huecos (total y páginas serían erróneos).
        category: activeCategory === "Todos" ? undefined : activeCategory,
        isActive: true,
        orderBy: "name",
        order: "asc",
      });
      setProducts(res.items);
      setProductsTotal(res.total);
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
  }, [debounced, activeCategory, page]);

  // Categorías estables (todo el catálogo activo), no derivadas de la página.
  useEffect(() => {
    let cancelled = false;
    catalogApi
      .categories()
      .then((cats) => {
        if (!cancelled) setCategories(["Todos", ...cats]);
      })
      .catch(() => {
        // Si falla, el filtro queda solo con "Todos" — no bloquea la venta.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Totales client-side SOLO orientativos — el total autoritativo lo da posApi.preview.
  const { subtotal, discountApplied, tax, total } = cartTotals(cart, discount);

  // Una línea ad-hoc exige nombre y precio > 0 (el backend igual lo revalida).
  const hasInvalidAdHoc = cart.some(
    (l) => l.isAdHoc && (l.name.trim() === "" || l.price <= 0),
  );

  const totalPages = Math.max(1, Math.ceil(productsTotal / PAGE_SIZE));

  const ensureDetail = async (productId: string): Promise<ApiProductDetail> => {
    const cached = detailCache.get(productId);
    if (cached) return cached;
    const detail = await catalogApi.get(productId);
    setDetailCache((prev) => new Map(prev).set(productId, detail));
    return detail;
  };

  const ensureMaterial = async (materialId: string): Promise<ApiMaterial> => {
    const cached = materialCache.get(materialId);
    if (cached) return cached;
    const material = await inventoryApi.get(materialId);
    setMaterialCache((prev) => new Map(prev).set(materialId, material));
    return material;
  };

  const openPicker = async (
    productId: string,
    edit?: { lineId: string; breakdown: SizeBreakdownEntry[] },
  ) => {
    setActionError(null);
    try {
      const detail = await ensureDetail(productId);
      let material: ApiMaterial | undefined;
      if (detail.variantType === "sized_from_material") {
        if (!detail.sizedFromMaterialId) {
          setActionError(
            "El producto no tiene configurado el material de tallas.",
          );
          return;
        }
        material = await ensureMaterial(detail.sizedFromMaterialId);
      }
      setVariantPicker({
        detail,
        material,
        editLineId: edit?.lineId,
        editBreakdown: edit?.breakdown,
      });
    } catch (err) {
      setActionError(
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
        lineId: `L${cs.length + 1}-${Date.now()}`,
        id: p.id,
        name: p.name,
        sku: p.sku,
        source: sourceLabel(p.source),
        supplier: p.supplierName ?? undefined,
        needsApproval: p.needsApproval,
        qty: 1,
        price: getPriceForQty(p.price, p.priceTiers, 1),
        basePrice: p.price,
        priceTiers: p.priceTiers,
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
      if (editLineId) return cs.map((c) => (c.lineId === editLineId ? { ...c, ...line } : c));
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
    setCart((cs) =>
      q <= 0
        ? cs.filter((c) => c.lineId !== lineId)
        : cs.map((c) => {
            if (c.lineId !== lineId) return c;
            // Recalcula el precio por mayoreo según la nueva cantidad
            // (simple/variante). Las líneas dimension tienen precio fijo por
            // área y las ad-hoc no llevan basePrice.
            if (c.basePrice === undefined || c.dimension) return { ...c, qty: q };
            const unit =
              getPriceForQty(c.basePrice, c.priceTiers, q) +
              (c.variantPriceMod ?? 0);
            return { ...c, qty: q, price: Math.round(unit * 100) / 100 };
          }),
    );
  };

  /** Parche puntual de una línea (nombre/precio ad-hoc, nota). */
  const patchLine = (lineId: string, patch: Partial<CartLine>) =>
    setCart((cs) =>
      cs.map((c) => (c.lineId === lineId ? { ...c, ...patch } : c)),
    );

  const removeLine = (lineId: string) =>
    setCart((cs) => cs.filter((c) => c.lineId !== lineId));

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

  const editBreakdown = (line: CartLine) => {
    void openPicker(line.id, {
      lineId: line.lineId,
      breakdown: line.sizeBreakdown ?? [],
    });
  };

  /** Shape EXACTO de CheckoutLineInput según variantType (forbidNonWhitelisted en el backend). */
  const checkoutLines = useMemo<CheckoutLineInput[]>(
    () =>
      cart.flatMap<CheckoutLineInput>((line) => {
        const note = line.lineNote?.trim()
          ? { lineNote: line.lineNote.trim() }
          : {};
        // Decisión de diseño por línea: se manda siempre (default del catálogo
        // o lo que el cajero haya prendido/apagado con el toggle).
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
              ...design,
              ...note,
            },
          ];
        }
        if (line.dimension) {
          // El backend cotiza UNA pieza por línea dimension (qty derivada del área):
          // se expande la cantidad del carrito en N líneas idénticas.
          return Array.from({ length: Math.max(1, line.qty) }, () => ({
            productId: line.id,
            dimension: { ...line.dimension! },
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
              ...design,
              ...note,
            },
          ];
        }
        return [{ productId: line.id, qty: line.qty, ...design, ...note }];
      }),
    [cart],
  );

  return (
    // Responsive tablet (H3): <768 apila catálogo/carrito; 768–1024 angosta el
    // carrito; ≥1024 el layout original. Breakpoints en clases (los estilos
    // inline no admiten media queries).
    <div
      className="grid grid-cols-1 md:grid-cols-[1fr_minmax(300px,340px)] lg:grid-cols-[1fr_420px]"
      style={{
        gap: 0,
        height: "calc(100vh - 48px)",
        margin: "-24px -28px -80px",
      }}
    >
      {saleNotice && (
        <div
          className="card flex items-center gap-2"
          style={{
            position: "fixed",
            top: 12,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 60,
            maxWidth: 560,
            padding: 12,
            border: "1px solid var(--warn)",
            background: "var(--surface)",
            boxShadow: "0 8px 24px rgba(0,0,0,.15)",
          }}
          role="alert"
        >
          <span className="flex-1 text-sm">
            Venta {saleNotice.folio} registrada, pero no se pudo{" "}
            {saleNotice.failures.join(" ni ")}.
          </span>
          <button
            className="btn btn--sm btn--accent"
            type="button"
            onClick={() => {
              const folio = saleNotice.folio;
              setSaleNotice(null);
              router.push(`/orders/${folio}`);
            }}
          >
            Ir al pedido
          </button>
          <button
            className="btn btn--sm btn--ghost"
            type="button"
            onClick={() => setSaleNotice(null)}
          >
            Cerrar
          </button>
        </div>
      )}

      <div
        className="flex flex-col overflow-hidden"
        style={{ borderRight: "1px solid var(--line)" }}
      >
        <div
          className="flex items-center gap-2.5 bg-surface"
          style={{ padding: "14px 20px", borderBottom: "1px solid var(--line)" }}
        >
          <div className="topbar__search flex-1 m-0" style={{ width: "auto", maxWidth: 460 }}>
            {I.search}
            <input
              placeholder="Buscar producto, SKU o escanear código de barras…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            <span className="kbd">F3</span>
          </div>
          <PosCashIndicator />
          <div className="row gap-1">
            {categories.map((c) => (
              <button
                key={c}
                className={`btn btn--sm ${c === activeCategory ? "btn--primary" : "btn--ghost"}`}
                onClick={() => {
                  setActiveCategory(c);
                  setPage(1);
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 @container">
          {(loadError || actionError) && (
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
          {loading ? (
            <div className="empty">Cargando…</div>
          ) : products.length === 0 && !loadError ? (
            <div className="empty">
              {debounced || activeCategory !== "Todos"
                ? "Sin productos para el filtro."
                : "No hay productos activos en el catálogo."}
            </div>
          ) : (
            // Columnas por ancho del CONTENEDOR (no viewport): el espacio
            // real depende del sidebar y del carrito.
            <div className="grid gap-3 grid-cols-2 @md:grid-cols-3 @xl:grid-cols-4">
              {products.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className="text-left border border-line bg-surface p-0 cursor-pointer overflow-hidden flex flex-col rounded-[10px]"
                >
                  <div className="skeleton-img text-[10px]" style={{ height: 90, borderRadius: 0 }}>
                    {p.method ?? p.category}
                  </div>
                  <div className="p-2.5 flex-1">
                    <div className="text-xs font-medium" style={{ lineHeight: 1.3 }}>{p.name}</div>
                    <div className="text-muted text-[10px] font-mono">{p.sku}</div>
                  </div>
                  <div
                    className="px-2.5 py-2 flex items-center gap-1.5"
                    style={{ borderTop: "1px solid var(--line)" }}
                  >
                    <span className="num font-semibold text-[13px]">{fmtMXN(p.price)}</span>
                    {hasPriceTiers(p.priceTiers) && (
                      <span
                        className="tag"
                        style={{ background: "var(--accent-soft)", color: "var(--accent-ink)" }}
                        title="Tiene precios de mayoreo por volumen"
                      >
                        Mayoreo
                      </span>
                    )}
                    <div className="spacer" />
                    {p.variantType !== "none" && (
                      <span className="tag" title="Requiere variante">{I.layers}</span>
                    )}
                    {p.source === "supplier" ? (
                      <span className="tag text-supplier">Prov.</span>
                    ) : (
                      <span className="tag">{p.leadDays}d</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
          {!loading && !loadError && productsTotal > 0 && (
            <div className="flex items-center gap-3 text-xs text-muted mt-4">
              <span>
                Mostrando {(page - 1) * PAGE_SIZE + 1}–
                {Math.min(page * PAGE_SIZE, productsTotal)} de {productsTotal}
                {activeCategory !== "Todos" ? ` · ${activeCategory}` : ""}
              </span>
              <div className="spacer" />
              <span className="num text-[11px]">
                Página {page} de {totalPages}
              </span>
              <button
                className="btn btn--sm btn--ghost"
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                aria-label="Página anterior"
              >
                {I.chevronLeft}
              </button>
              <button
                className="btn btn--sm btn--ghost"
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                aria-label="Página siguiente"
              >
                {I.chevronRight}
              </button>
            </div>
          )}
        </div>
      </div>

      <div
        className="flex flex-col bg-surface"
        style={{ height: "calc(100vh - 48px)" }}
      >
        <div
          className="px-[18px] py-3.5"
          style={{ borderBottom: "1px solid var(--line)" }}
        >
          <div
            className="text-[11px] text-muted uppercase mb-1.5"
            style={{ letterSpacing: ".06em" }}
          >
            Cliente
          </div>
          {client ? (
            <div className="flex items-center gap-2.5">
              <Avatar name={client.name} size={32} />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-[13px]">{client.name}</div>
                <div className="text-muted text-[11px]">
                  {[client.phone, client.rfc].filter(Boolean).join(" · ") || "Sin datos de contacto"}
                </div>
              </div>
              <button className="btn btn--sm" onClick={() => setShowClientPicker(true)}>
                Cambiar
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="flex-1 min-w-0 text-muted text-[12px]">
                Sin cliente seleccionado — requerido para cobrar.
              </div>
              <button className="btn btn--sm" onClick={() => setShowClientPicker(true)}>
                Seleccionar
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center" style={{ padding: "10px 18px 6px" }}>
            <div
              className="text-[11px] text-muted uppercase"
              style={{ letterSpacing: ".06em" }}
            >
              {cart.length} productos
            </div>
            <div className="spacer" />
            <button className="btn btn--ghost btn--sm" onClick={addAdHocLine}>
              + Línea libre
            </button>
            <button className="btn btn--ghost btn--sm" onClick={() => setCart([])}>
              {I.trash} Vaciar
            </button>
          </div>

          {cart.length === 0 && <div className="empty m-5">El carrito está vacío.</div>}

          {cart.map((line, idx) => (
            <div
              key={line.lineId}
              className="px-[18px] py-3"
              style={{ borderTop: "1px solid var(--line)" }}
            >
              <div className="flex gap-2.5">
                <div className="shrink-0 flex flex-col items-center gap-1" style={{ width: 36 }}>
                  <div className="skeleton-img text-[9px]" style={{ width: 36, height: 36 }}>•</div>
                  <span className="tag text-[9px]" style={{ padding: "1px 4px" }}>JOB-{idx + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  {line.isAdHoc ? (
                    <input
                      className="font-medium text-[13px] bg-transparent border-b border-line w-full outline-none"
                      placeholder="Producto libre…"
                      value={line.name}
                      onChange={(e) =>
                        patchLine(line.lineId, { name: e.target.value })
                      }
                    />
                  ) : (
                    <div className="font-medium text-[13px]">{line.name}</div>
                  )}
                  <div className="text-muted text-[11px] font-mono">
                    {line.sku}
                    {line.variantLabel ? ` · ${line.variantLabel}` : ""}
                  </div>
                  {line.sizeBreakdown && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {line.sizeBreakdown
                        .filter((b) => b.qty > 0)
                        .map((b) => (
                          <span key={b.sizeId} className="tag text-[10px]">
                            {b.sizeId}×{b.qty}
                            {b.surcharge > 0 && (
                              <span className="text-muted"> +${b.surcharge}</span>
                            )}
                          </span>
                        ))}
                    </div>
                  )}
                  <div className="text-[10px] text-muted mt-0.5">Diseño independiente</div>
                </div>
                <div className="num font-semibold text-[13px]">
                  {fmtMXN(lineSubtotal(line))}
                </div>
              </div>

              <div className="flex items-center gap-2 mt-2">
                {line.sizeBreakdown ? (
                  <button className="btn btn--ghost btn--sm" onClick={() => editBreakdown(line)}>
                    {I.layers} {line.sizeBreakdown.reduce((s, b) => s + b.qty, 0)} pzas · editar
                  </button>
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
                      className="num text-center bg-transparent"
                      value={line.qty}
                      onChange={(e) => updateQty(line.lineId, parseInt(e.target.value || "0", 10))}
                      style={{ width: 50, border: 0, outline: "none", height: 24 }}
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
                {line.isAdHoc ? (
                  <label className="flex items-center gap-1 num text-muted text-[11px]">
                    × $
                    <input
                      className="num bg-transparent border border-line rounded px-1"
                      style={{ width: 72 }}
                      type="number"
                      min={0}
                      step="0.01"
                      value={line.price || ""}
                      placeholder="0.00"
                      onChange={(e) =>
                        patchLine(line.lineId, {
                          price: parseFloat(e.target.value || "0") || 0,
                        })
                      }
                    />
                  </label>
                ) : (
                  !line.sizeBreakdown && (
                    <span className="num text-muted text-[11px] flex items-center gap-1">
                      × {fmtMXN(line.price)}
                      {line.basePrice !== undefined &&
                        line.price <
                          line.basePrice + (line.variantPriceMod ?? 0) && (
                          <span
                            className="tag"
                            style={{
                              background: "var(--accent-soft)",
                              color: "var(--accent-ink)",
                            }}
                            title="Precio de mayoreo por volumen"
                          >
                            Mayoreo
                          </span>
                        )}
                    </span>
                  )
                )}
                <div className="spacer" />
                {line.source === "Proveedor" && line.supplier && (
                  <span className="pill pill--supplier text-[10px]">{line.supplier}</span>
                )}
                <button
                  type="button"
                  aria-pressed={line.needsApproval}
                  title="¿Requiere diseño?"
                  className={`pill text-[10px] border-0 cursor-pointer ${
                    line.needsApproval ? "pill--warn" : "pill--neutral opacity-60"
                  }`}
                  onClick={() =>
                    patchLine(line.lineId, {
                      needsApproval: !line.needsApproval,
                    })
                  }
                >
                  {I.paint} Diseño
                </button>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <input
                  className="flex-1 min-w-0 text-[11px] bg-transparent border border-line rounded px-2 py-1 outline-none"
                  placeholder="Nota para producción (opcional)"
                  value={line.lineNote ?? ""}
                  onChange={(e) =>
                    patchLine(line.lineId, { lineNote: e.target.value })
                  }
                />
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  title="Quitar línea"
                  onClick={() => removeLine(line.lineId)}
                >
                  {I.trash}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div
          className="px-[18px] py-3.5 bg-surface-2"
          style={{ borderTop: "1px solid var(--line)" }}
        >
          <SummaryRow label="Subtotal" value={fmtMXN(subtotal)} />
          <SummaryRow label="Descuento" value={fmtMXN(discountApplied)} muted />
          <SummaryRow label="IVA 16%" value={fmtMXN(tax)} />
          <div className="bg-line my-2.5" style={{ height: 1 }} />
          <SummaryRow label="Total" value={fmtMXN(total)} big />

          <div
            className={`grid gap-2 mt-3 ${canDiscount ? "grid-cols-2" : "grid-cols-1"}`}
          >
            {/* Descuento gateado: solo con sales.discount.apply (el backend
                igual revalida y rechaza con 403). */}
            {canDiscount && (
              <button
                className="btn"
                onClick={() => {
                  setDiscountDraft(discount > 0 ? String(discount) : "");
                  setShowDiscount(true);
                }}
              >
                {I.tag} {discount > 0 ? `Descuento · ${fmtMXN(discount)}` : "Descuento"}
              </button>
            )}
            <button
              className="btn"
              onClick={() => {
                setDeliverDraft(deliverAt);
                setShowDeliver(true);
              }}
            >
              {I.calendar} {deliverAt || "Fecha entrega"}
            </button>
          </div>
          <button
            className="btn btn--accent btn--lg w-full justify-center mt-2"
            onClick={() => setShowPay(true)}
            disabled={cart.length === 0 || !client || !canSell || hasInvalidAdHoc}
            title={
              !canSell
                ? "No tienes permiso para cobrar (sales.pos.sell)"
                : hasInvalidAdHoc
                  ? "Completa el nombre y precio (> 0) de las líneas libres"
                  : undefined
            }
          >
            {I.cash} Cobrar {fmtMXN(total)}
            <span
              className="kbd ml-auto"
              style={{ background: "rgba(255,255,255,.18)", color: "white", border: 0 }}
            >
              F8
            </span>
          </button>
          {!canSell && (
            <div className="text-[11px] text-muted mt-1.5 text-center">
              No tienes permiso para cobrar en el punto de venta.
            </div>
          )}
        </div>
      </div>

      {showClientPicker && (
        <PosClientPicker
          onClose={() => setShowClientPicker(false)}
          onSelect={(c) => {
            setClient(c);
            setShowClientPicker(false);
          }}
        />
      )}

      {showDiscount && (
        <Modal
          title="Descuento"
          onClose={() => setShowDiscount(false)}
          width={360}
          footer={
            <>
              <button className="btn btn--ghost" onClick={() => setShowDiscount(false)}>
                Cancelar
              </button>
              <button
                className="btn btn--primary"
                onClick={() => {
                  const v = parseFloat(discountDraft);
                  setDiscount(Number.isFinite(v) && v > 0 ? Math.round(v * 100) / 100 : 0);
                  setShowDiscount(false);
                }}
              >
                Aplicar
              </button>
            </>
          }
        >
          <label className="field">
            <span className="label">Monto (MXN)</span>
            <input
              className="input num"
              type="number"
              min={0}
              step="0.01"
              value={discountDraft}
              onChange={(e) => setDiscountDraft(e.target.value)}
              autoFocus
            />
          </label>
          <div className="text-[11px] text-muted mt-2">
            Descuento en pesos sobre el subtotal. Déjalo vacío o en 0 para quitarlo.
          </div>
        </Modal>
      )}

      {showDeliver && (
        <Modal
          title="Fecha de entrega"
          onClose={() => setShowDeliver(false)}
          width={360}
          footer={
            <>
              <button className="btn btn--ghost" onClick={() => setShowDeliver(false)}>
                Cancelar
              </button>
              <button
                className="btn btn--primary"
                onClick={() => {
                  setDeliverAt(deliverDraft);
                  setShowDeliver(false);
                }}
              >
                Aplicar
              </button>
            </>
          }
        >
          <label className="field">
            <span className="label">Fecha</span>
            <input
              className="input"
              type="date"
              value={deliverDraft}
              onChange={(e) => setDeliverDraft(e.target.value)}
              autoFocus
            />
          </label>
          <div className="text-[11px] text-muted mt-2">
            Fecha comprometida de entrega del pedido. Déjala vacía para omitirla.
          </div>
        </Modal>
      )}

      {showPay && client && (
        <PosPaymentModal
          clientId={client.id}
          lines={checkoutLines}
          discount={discount}
          deliverAt={deliverAt || undefined}
          customerEmail={client.email ?? undefined}
          customerPhone={client.phone ?? undefined}
          defaultRequiresInvoice={!!client.rfc}
          onClose={() => setShowPay(false)}
          onPaid={(res, prints) => {
            setShowPay(false);
            setCart([]);
            setDiscount(0);
            setDeliverAt("");
            // WhatsApp: abrir wa.me lo antes posible (mejor chance frente al
            // bloqueo de pop-ups, antes de navegar fuera del POS).
            if (prints.whatsapp && client.phone) {
              const balance = Math.round((res.total - res.paid) * 100) / 100;
              const msg = buildOrderReceiptWhatsappMessage({
                clientName: client.name,
                folio: res.folio,
                total: res.total,
                balance,
              });
              window.open(buildWaMeUrl(client.phone, msg), "_blank", "noopener");
            }
            void (async () => {
              // La venta YA existe: las acciones de comprobante NO bloquean el
              // cobro, pero cada fallo se registra y se le avisa al usuario (no
              // sólo a la consola). Por-acción para saber CUÁL falló.
              const failures: string[] = [];
              if (prints.printThermal) {
                try {
                  const order = await ordersApi.get(res.folio);
                  await printThermalTicket(order);
                } catch {
                  failures.push("imprimir el ticket térmico");
                }
              }
              if (prints.printLetter) {
                try {
                  await openLetterTicket(res.folio);
                } catch {
                  failures.push("abrir el ticket carta");
                }
              }
              if (prints.emailReceipt) {
                try {
                  await ordersApi.sendReceipt(res.orderId);
                } catch {
                  failures.push("enviar el recibo por correo");
                }
              }
              if (failures.length > 0) {
                // Mostrar el aviso en el POS (carrito ya limpio) y dejar ir al
                // pedido manualmente — no navegar en silencio ocultando el fallo.
                setSaleNotice({ folio: res.folio, failures });
              } else {
                router.push(`/orders/${res.folio}`);
              }
            })();
          }}
        />
      )}

      {variantPicker &&
        (variantPicker.detail.variantType === "sized_from_material" && variantPicker.material ? (
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
    </div>
  );
}
