"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/avatar";
import { I } from "@/components/icons";
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
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 420px",
        gap: 0,
        height: "calc(100vh - 48px)",
        margin: "-24px -28px -80px",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", borderRight: "1px solid var(--line)", overflow: "hidden" }}>
        <div
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "var(--surface)",
          }}
        >
          <div className="topbar__search" style={{ flex: 1, margin: 0, width: "auto", maxWidth: 460 }}>
            {I.search}
            <input
              placeholder="Buscar producto, SKU o escanear código de barras…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            <span className="kbd">F3</span>
          </div>
          <div className="row" style={{ gap: 4 }}>
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

        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          <div className="grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {filteredProducts.map((p) => (
              <button
                type="button"
                key={p.id}
                onClick={() => addToCart(p)}
                style={{
                  textAlign: "left",
                  border: "1px solid var(--line)",
                  background: "var(--surface)",
                  borderRadius: "var(--r-lg)",
                  padding: 0,
                  cursor: "pointer",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div className="skeleton-img" style={{ height: 90, borderRadius: 0, fontSize: 10 }}>
                  {p.method}
                </div>
                <div style={{ padding: 10, flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.3 }}>{p.name}</div>
                  <div style={{ color: "var(--muted)", fontSize: 10, fontFamily: "var(--font-mono)" }}>{p.sku}</div>
                </div>
                <div
                  style={{
                    padding: "8px 10px",
                    borderTop: "1px solid var(--line)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span className="num" style={{ fontWeight: 600, fontSize: 13 }}>
                    {fmtMXN(p.price)}
                  </span>
                  <div className="spacer" />
                  {p.variantType !== "none" && (
                    <span className="tag" title="Requiere variante">{I.layers}</span>
                  )}
                  {p.source === "Proveedor" ? (
                    <span className="tag" style={{ color: "var(--supplier)" }}>Prov.</span>
                  ) : (
                    <span className="tag">{p.leadDays}d</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", background: "var(--surface)", height: "calc(100vh - 48px)" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)" }}>
          <div
            style={{
              fontSize: 11,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: ".06em",
              marginBottom: 6,
            }}
          >
            Cliente
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar name={client.name} size={32} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 500, fontSize: 13 }}>{client.name}</div>
              <div style={{ color: "var(--muted)", fontSize: 11 }}>{client.phone} · {client.rfc}</div>
            </div>
            <button className="btn btn--sm">Cambiar</button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ padding: "10px 18px 6px", display: "flex", alignItems: "center" }}>
            <div
              style={{
                fontSize: 11,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: ".06em",
              }}
            >
              {cart.length} productos
            </div>
            <div className="spacer" />
            <button className="btn btn--ghost btn--sm" onClick={() => setCart([])}>
              {I.trash} Vaciar
            </button>
          </div>

          {cart.length === 0 && <div className="empty" style={{ margin: 20 }}>El carrito está vacío.</div>}

          {cart.map((line, idx) => (
            <div key={line.lineId} style={{ padding: "12px 18px", borderTop: "1px solid var(--line)" }}>
              <div style={{ display: "flex", gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    flexShrink: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <div className="skeleton-img" style={{ width: 36, height: 36, fontSize: 9 }}>•</div>
                  <span className="tag" style={{ fontSize: 9, padding: "1px 4px" }}>JOB-{idx + 1}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{line.name}</div>
                  <div style={{ color: "var(--muted)", fontSize: 11, fontFamily: "var(--font-mono)" }}>
                    {line.sku}
                    {line.variantLabel ? ` · ${line.variantLabel}` : ""}
                  </div>
                  {line.sizeBreakdown && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                      {line.sizeBreakdown
                        .filter((b) => b.qty > 0)
                        .map((b) => (
                          <span key={b.sizeId} className="tag" style={{ fontSize: 10 }}>
                            {b.sizeId}×{b.qty}
                            {b.surcharge > 0 && (
                              <span style={{ color: "var(--muted)" }}> +${b.surcharge}</span>
                            )}
                          </span>
                        ))}
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>Diseño independiente</div>
                </div>
                <div className="num" style={{ fontWeight: 600, fontSize: 13 }}>
                  {fmtMXN(lineSubtotal(line))}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                {line.sizeBreakdown ? (
                  <button className="btn btn--ghost btn--sm" onClick={() => editBreakdown(line)}>
                    {I.layers} {line.sizeBreakdown.reduce((s, b) => s + b.qty, 0)} pzas · editar
                  </button>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      border: "1px solid var(--line)",
                      borderRadius: "var(--r-md)",
                    }}
                  >
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      style={{ borderRadius: 0 }}
                      onClick={() => updateQty(line.lineId, line.qty - 1)}
                    >
                      −
                    </button>
                    <input
                      className="num"
                      value={line.qty}
                      onChange={(e) => updateQty(line.lineId, parseInt(e.target.value || "0", 10))}
                      style={{
                        width: 50,
                        textAlign: "center",
                        border: 0,
                        outline: "none",
                        height: 24,
                        background: "transparent",
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
                {!line.sizeBreakdown && (
                  <span className="num" style={{ color: "var(--muted)", fontSize: 11 }}>
                    × {fmtMXN(line.price)}
                  </span>
                )}
                <div className="spacer" />
                {line.source === "Proveedor" && line.supplier && (
                  <span className="pill pill--supplier" style={{ fontSize: 10 }}>{line.supplier}</span>
                )}
                {line.needsApproval && (
                  <span className="pill pill--warn" style={{ fontSize: 10 }}>{I.paint} Diseño</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1px solid var(--line)", padding: "14px 18px", background: "var(--surface-2)" }}>
          <Row k="Subtotal" v={fmtMXN(subtotal)} />
          <Row k="Descuento" v={fmtMXN(discount)} muted />
          <Row k="IVA 16%" v={fmtMXN(tax)} />
          <div style={{ height: 1, background: "var(--line)", margin: "10px 0" }} />
          <Row k="Total" v={fmtMXN(total)} big />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
            <button className="btn">{I.tag} Descuento</button>
            <button className="btn">{I.calendar} Fecha entrega</button>
          </div>
          <button
            className="btn btn--accent btn--lg"
            style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
            onClick={() => setShowPay(true)}
            disabled={cart.length === 0}
          >
            {I.cash} Cobrar {fmtMXN(total)}
            <span
              className="kbd"
              style={{ marginLeft: "auto", background: "rgba(255,255,255,.18)", color: "white", border: 0 }}
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

function Row({ k, v, muted, big }: { k: string; v: string; muted?: boolean; big?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        margin: "4px 0",
        fontSize: big ? 16 : 13,
        fontWeight: big ? 600 : 400,
        color: muted ? "var(--muted)" : "var(--ink)",
      }}
    >
      <span>{k}</span>
      <div className="spacer" />
      <span className="num">{v}</span>
    </div>
  );
}
