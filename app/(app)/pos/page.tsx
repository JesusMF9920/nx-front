"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/avatar";
import { I } from "@/components/icons";
import { SummaryRow } from "@/components/summary-row";
import { PosPaymentModal } from "@/components/pos-payment-modal";
import {
  PosSizeBreakdownPicker,
  type SizeBreakdownLineData,
} from "@/components/pos-size-breakdown-picker";
import {
  PosVariantPicker,
  type VariantLineData,
} from "@/components/pos-variant-picker";
import { fmtMXN } from "@/lib/format";
import { NEXUM_CLIENTS } from "@/lib/mock-clients";
import { NEXUM_PRODUCTS } from "@/lib/mock-products";
import type { CartLine, Product, SizeBreakdownEntry } from "@/lib/types";

type EditableProduct = Product & {
  _editLineId?: string;
  _editBreakdown?: SizeBreakdownEntry[];
};

const CATEGORIES = ["Todos", "Textil", "Promocional", "Papelería", "Gran formato"];

const INITIAL_CART: CartLine[] = [
  {
    lineId: "L1",
    id: "p01",
    qty: 40,
    price: 150,
    name: "Playera blanca DTF",
    sku: "PLY-DTF-001",
    source: "Interno",
    needsApproval: true,
    sizedFromMaterial: "m01",
    sizeBreakdown: [
      { sizeId: "CH",  qty: 5,  surcharge: 0 },
      { sizeId: "M",   qty: 12, surcharge: 0 },
      { sizeId: "G",   qty: 15, surcharge: 0 },
      { sizeId: "EG",  qty: 6,  surcharge: 15 },
      { sizeId: "EEG", qty: 2,  surcharge: 25 },
    ],
  },
  {
    lineId: "L3",
    id: "p03",
    qty: 40,
    price: 85,
    name: "Vaso cerámico sublimado 11oz",
    sku: "VAS-SUB-003",
    source: "Interno",
    needsApproval: true,
  },
  {
    lineId: "L4",
    id: "p05",
    qty: 8,
    price: 95,
    name: "Lona 13oz frontlit",
    sku: "LON-13O-005",
    source: "Proveedor",
    supplier: "Lonas del Bajío",
    needsApproval: true,
    variantLabel: "4.0 × 2.0 m (8 m²)",
  },
];

function lineSubtotal(line: CartLine): number {
  if (line.sizeBreakdown) {
    return line.sizeBreakdown.reduce((s, b) => s + b.qty * (line.price + b.surcharge), 0);
  }
  return line.qty * line.price;
}

export default function POSPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartLine[]>(INITIAL_CART);
  const [client] = useState(NEXUM_CLIENTS[0]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [showPay, setShowPay] = useState(false);
  const [variantPicker, setVariantPicker] = useState<EditableProduct | null>(null);

  const subtotal = cart.reduce((s, l) => s + lineSubtotal(l), 0);
  const discount = 0;
  const tax = (subtotal - discount) * 0.16;
  const total = subtotal - discount + tax;

  const filteredProducts = NEXUM_PRODUCTS.filter((p) => {
    if (activeCategory !== "Todos" && p.category !== activeCategory) return false;
    if (!search) return true;
    return `${p.name} ${p.sku}`.toLowerCase().includes(search.toLowerCase());
  });

  const addToCart = (p: Product) => {
    if (p.variantType !== "none") {
      setVariantPicker(p);
      return;
    }
    setCart((cs) => [
      ...cs,
      {
        lineId: `L${cs.length + 1}-${Date.now()}`,
        id: p.id,
        name: p.name,
        sku: p.sku,
        source: p.source,
        supplier: p.supplier,
        needsApproval: p.needsApproval,
        qty: 1,
        price: p.price,
      },
    ]);
  };

  const addVariant = (p: Product, line: VariantLineData) => {
    setCart((cs) => [
      ...cs,
      {
        lineId: `L${Date.now()}`,
        id: p.id,
        name: p.name,
        sku: p.sku,
        source: p.source,
        supplier: p.supplier,
        needsApproval: p.needsApproval,
        ...line,
      },
    ]);
    setVariantPicker(null);
  };

  const addOrUpdateBreakdown = (
    p: Product,
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
          source: p.source,
          supplier: p.supplier,
          needsApproval: p.needsApproval,
          sizedFromMaterial: p.sizedFromMaterial,
          ...line,
        },
      ];
    });
    setVariantPicker(null);
  };

  const updateQty = (lineId: string, q: number) => {
    setCart((cs) =>
      q <= 0 ? cs.filter((c) => c.lineId !== lineId) : cs.map((c) => (c.lineId === lineId ? { ...c, qty: q } : c)),
    );
  };

  const editBreakdown = (line: CartLine) => {
    const product = NEXUM_PRODUCTS.find((p) => p.id === line.id);
    if (!product) return;
    setVariantPicker({
      ...product,
      _editLineId: line.lineId,
      _editBreakdown: line.sizeBreakdown,
    });
  };

  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: "1fr 420px",
        gap: 0,
        height: "calc(100vh - 48px)",
        margin: "-24px -28px -80px",
      }}
    >
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
          <div className="row gap-1">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                className={`btn btn--sm ${c === activeCategory ? "btn--primary" : "btn--ghost"}`}
                onClick={() => setActiveCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
            {filteredProducts.map((p) => (
              <button
                type="button"
                key={p.id}
                onClick={() => addToCart(p)}
                className="text-left border border-line bg-surface p-0 cursor-pointer overflow-hidden flex flex-col rounded-[10px]"
              >
                <div className="skeleton-img text-[10px]" style={{ height: 90, borderRadius: 0 }}>
                  {p.method}
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
                  <div className="spacer" />
                  {p.variantType !== "none" && (
                    <span className="tag" title="Requiere variante">{I.layers}</span>
                  )}
                  {p.source === "Proveedor" ? (
                    <span className="tag text-supplier">Prov.</span>
                  ) : (
                    <span className="tag">{p.leadDays}d</span>
                  )}
                </div>
              </button>
            ))}
          </div>
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
          <div className="flex items-center gap-2.5">
            <Avatar name={client.name} size={32} />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-[13px]">{client.name}</div>
              <div className="text-muted text-[11px]">{client.phone} · {client.rfc}</div>
            </div>
            <button className="btn btn--sm">Cambiar</button>
          </div>
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
                  <div className="font-medium text-[13px]">{line.name}</div>
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
                {!line.sizeBreakdown && (
                  <span className="num text-muted text-[11px]">× {fmtMXN(line.price)}</span>
                )}
                <div className="spacer" />
                {line.source === "Proveedor" && line.supplier && (
                  <span className="pill pill--supplier text-[10px]">{line.supplier}</span>
                )}
                {line.needsApproval && (
                  <span className="pill pill--warn text-[10px]">{I.paint} Diseño</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div
          className="px-[18px] py-3.5 bg-surface-2"
          style={{ borderTop: "1px solid var(--line)" }}
        >
          <SummaryRow label="Subtotal" value={fmtMXN(subtotal)} />
          <SummaryRow label="Descuento" value={fmtMXN(discount)} muted />
          <SummaryRow label="IVA 16%" value={fmtMXN(tax)} />
          <div className="bg-line my-2.5" style={{ height: 1 }} />
          <SummaryRow label="Total" value={fmtMXN(total)} big />

          <div className="grid grid-cols-2 gap-2 mt-3">
            <button className="btn">{I.tag} Descuento</button>
            <button className="btn">{I.calendar} Fecha entrega</button>
          </div>
          <button
            className="btn btn--accent btn--lg w-full justify-center mt-2"
            onClick={() => setShowPay(true)}
            disabled={cart.length === 0}
          >
            {I.cash} Cobrar {fmtMXN(total)}
            <span
              className="kbd ml-auto"
              style={{ background: "rgba(255,255,255,.18)", color: "white", border: 0 }}
            >
              F8
            </span>
          </button>
        </div>
      </div>

      {showPay && (
        <PosPaymentModal
          total={total}
          cart={cart}
          customerEmail={client.email}
          onClose={() => setShowPay(false)}
          onPaid={() => {
            setShowPay(false);
            router.push("/orders/ORD-1842");
          }}
        />
      )}

      {variantPicker &&
        (variantPicker.variantType === "sizedFromMaterial" ? (
          <PosSizeBreakdownPicker
            product={variantPicker}
            editLineId={variantPicker._editLineId}
            editBreakdown={variantPicker._editBreakdown}
            onClose={() => setVariantPicker(null)}
            onAdd={addOrUpdateBreakdown}
          />
        ) : (
          <PosVariantPicker
            product={variantPicker}
            onClose={() => setVariantPicker(null)}
            onAdd={addVariant}
          />
        ))}
    </div>
  );
}

