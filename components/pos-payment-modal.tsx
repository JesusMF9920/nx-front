"use client";

import { useMemo, useState, type ReactNode } from "react";
import { I } from "@/components/icons";
import { Modal } from "@/components/modal";
import { fmtMXN } from "@/lib/format";
import { NEXUM_MATERIALS, NEXUM_RECIPES } from "@/lib/mock-materials";
import type { CartLine, Material, MaterialVariant, PaymentMethod } from "@/lib/types";

type Props = {
  total: number;
  cart: CartLine[];
  customerEmail?: string;
  onClose: () => void;
  onPaid: () => void;
};

type Consumption = {
  materialId: string;
  variantId?: string;
  qty: number;
  mat: Material;
  variant?: MaterialVariant;
};

const METHOD_OPTIONS: { id: PaymentMethod; icon: ReactNode; sub: string }[] = [
  { id: "Efectivo", icon: I.cash,   sub: "Calcular cambio" },
  { id: "Terminal", icon: I.card,   sub: "Mercado Libre" },
  { id: "Mixto",    icon: I.layers, sub: "Efectivo + tarjeta" },
  { id: "Crédito",  icon: I.clock,  sub: "30 días" },
];

export function PosPaymentModal({ total, cart, customerEmail, onClose, onPaid }: Props) {
  const [method, setMethod] = useState<PaymentMethod>("Efectivo");
  const [cash, setCash] = useState(total);
  const [printTicket, setPrintTicket] = useState(true);
  const [emailTicket, setEmailTicket] = useState(true);

  const change = Math.max(0, cash - total);

  const consumption = useMemo<Consumption[]>(() => {
    const map: Record<string, { qty: number; materialId: string; variantId?: string }> = {};
    cart.forEach((line) => {
      if (line.source !== "Interno") return;
      const recipe = NEXUM_RECIPES[line.id];
      if (!recipe) return;
      const totalQty = line.sizeBreakdown
        ? line.sizeBreakdown.reduce((s, b) => s + b.qty, 0)
        : line.qty;
      recipe.forEach((r) => {
        if (r.byVariant && line.sizeBreakdown) {
          line.sizeBreakdown.forEach((b) => {
            if (b.qty <= 0) return;
            const key = `${r.materialId}::${b.sizeId}`;
            if (!map[key]) map[key] = { qty: 0, materialId: r.materialId, variantId: b.sizeId };
            map[key].qty += r.qty * b.qty;
          });
        } else {
          const key = r.materialId;
          if (!map[key]) map[key] = { qty: 0, materialId: key };
          map[key].qty += r.qty * totalQty;
        }
      });
    });

    return Object.values(map).flatMap<Consumption>((c) => {
      const mat = NEXUM_MATERIALS.find((m) => m.id === c.materialId);
      if (!mat) return [];
      const variant = c.variantId ? mat.variants?.find((v) => v.id === c.variantId) : undefined;
      return [{ qty: c.qty, materialId: c.materialId, variantId: c.variantId, mat, variant }];
    });
  }, [cart]);

  const quickCash = [total, Math.ceil(total / 100) * 100, Math.ceil(total / 500) * 500, Math.ceil(total / 1000) * 1000];

  return (
    <Modal
      title="Cobrar"
      onClose={onClose}
      width={640}
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn--accent btn--lg" onClick={onPaid}>
            {I.check} Confirmar pago
          </button>
        </>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div>
          <div className="label" style={{ marginBottom: 8 }}>Método de pago</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {METHOD_OPTIONS.map((m) => (
              <button
                type="button"
                key={m.id}
                onClick={() => setMethod(m.id)}
                style={{
                  textAlign: "left",
                  border: method === m.id ? "1.5px solid var(--accent)" : "1px solid var(--line)",
                  borderRadius: "var(--r-md)",
                  background: method === m.id ? "var(--accent-soft)" : "var(--surface)",
                  padding: 10,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  color: method === m.id ? "var(--accent-ink)" : "var(--ink)",
                }}
              >
                <span>{m.icon}</span>
                <div style={{ fontWeight: 500, fontSize: 13 }}>{m.id}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>{m.sub}</div>
              </button>
            ))}
          </div>

          {method === "Efectivo" && (
            <>
              <div className="field" style={{ marginTop: 14 }}>
                <span className="label">Recibido</span>
                <input
                  className="input num"
                  style={{ fontSize: 18, height: 40 }}
                  value={cash}
                  onChange={(e) => setCash(parseFloat(e.target.value || "0"))}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginTop: 8 }}>
                {quickCash.map((x, i) => (
                  <button type="button" key={i} className="btn btn--sm" onClick={() => setCash(x)}>
                    {fmtMXN(x)}
                  </button>
                ))}
              </div>
            </>
          )}

          {method === "Terminal" && (
            <div
              style={{
                marginTop: 14,
                padding: 14,
                border: "1px solid var(--line)",
                borderRadius: "var(--r-md)",
                background: "var(--surface-2)",
              }}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                <span style={{ color: "var(--accent)" }}>{I.card}</span>
                <strong style={{ fontSize: 13 }}>Terminal Mercado Libre</strong>
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
                Conectada · Point Mini W · estado <span className="pill pill--ok">Listo</span>
              </div>
              <button className="btn btn--primary" style={{ width: "100%", justifyContent: "center" }}>
                {I.send} Enviar {fmtMXN(total)} a la terminal
              </button>
            </div>
          )}
        </div>

        <div>
          <div className="label" style={{ marginBottom: 8 }}>Resumen</div>
          <div
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-md)",
              padding: 14,
            }}
          >
            <Row k="Total a cobrar" v={fmtMXN(total)} big />
            {method === "Efectivo" && (
              <>
                <Row k="Recibido" v={fmtMXN(cash)} />
                <Row k="Cambio" v={fmtMXN(change)} />
              </>
            )}
          </div>

          <div className="divider" />

          <div className="label" style={{ marginBottom: 8 }}>Comprobante</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <input
                type="checkbox"
                checked={printTicket}
                onChange={(e) => setPrintTicket(e.target.checked)}
              />
              {I.printer} Imprimir ticket térmico (80 mm)
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <input type="checkbox" />
              {I.printer} Imprimir ticket carta con logo
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <input
                type="checkbox"
                checked={emailTicket}
                onChange={(e) => setEmailTicket(e.target.checked)}
              />
              {I.mail} Enviar por correo a{" "}
              <strong style={{ color: "var(--accent-ink)" }}>{customerEmail ?? "cliente@nexum.mx"}</strong>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <input type="checkbox" />
              {I.whatsapp} Enviar link de portal por WhatsApp
            </label>
          </div>

          {consumption.length > 0 && (
            <>
              <div className="divider" />
              <div
                className="label"
                style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}
              >
                {I.layers} Inventario que se descontará
              </div>
              <div
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-md)",
                  padding: 10,
                }}
              >
                {consumption.map((c) => {
                  const stockNow = c.variant ? c.variant.stock : c.mat.stock;
                  const after = stockNow - c.qty;
                  const willCritical = after <= c.mat.reorder * 0.5;
                  const willLow = after <= c.mat.reorder;
                  return (
                    <div
                      key={c.materialId + (c.variantId ?? "")}
                      style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, padding: "4px 0" }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500 }}>
                          {c.mat.name}
                          {c.variant ? ` · ${c.variant.label}` : ""}
                        </div>
                        <div style={{ color: "var(--muted)", fontSize: 10 }}>
                          {stockNow} →{" "}
                          <strong
                            style={{
                              color: willCritical
                                ? "var(--danger)"
                                : willLow
                                  ? "var(--warn)"
                                  : "var(--ink)",
                            }}
                          >
                            {after.toFixed(2)}
                          </strong>{" "}
                          {c.mat.unit}
                        </div>
                      </div>
                      <span className="num" style={{ fontWeight: 600, color: "var(--danger)" }}>
                        −{c.qty.toFixed(2)}
                      </span>
                      {willCritical && (
                        <span className="pill pill--danger" style={{ fontSize: 9 }}>{I.alert}</span>
                      )}
                      {!willCritical && willLow && (
                        <span className="pill pill--warn" style={{ fontSize: 9 }}>!</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 6 }}>
                Solo productos internos descuentan inventario. Productos con proveedor generan OC.
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

function Row({ k, v, big }: { k: string; v: string; big?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        margin: "4px 0",
        fontSize: big ? 16 : 13,
        fontWeight: big ? 600 : 400,
      }}
    >
      <span>{k}</span>
      <div className="spacer" />
      <span className="num">{v}</span>
    </div>
  );
}
