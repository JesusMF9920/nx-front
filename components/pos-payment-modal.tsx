"use client";

import { useMemo, useState, type ReactNode } from "react";
import { I } from "@/components/icons";
import { Modal } from "@/components/modal";
import { SummaryRow } from "@/components/summary-row";
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
      <div className="grid grid-cols-2 gap-[18px]">
        <div>
          <div className="label mb-2">Método de pago</div>
          <div className="grid grid-cols-2 gap-1.5">
            {METHOD_OPTIONS.map((m) => (
              <button
                type="button"
                key={m.id}
                onClick={() => setMethod(m.id)}
                className="text-left rounded-md p-2.5 cursor-pointer flex flex-col gap-1"
                style={{
                  border: method === m.id ? "1.5px solid var(--accent)" : "1px solid var(--line)",
                  background: method === m.id ? "var(--accent-soft)" : "var(--surface)",
                  color: method === m.id ? "var(--accent-ink)" : "var(--ink)",
                }}
              >
                <span>{m.icon}</span>
                <div className="font-medium text-[13px]">{m.id}</div>
                <div className="text-[11px] text-muted">{m.sub}</div>
              </button>
            ))}
          </div>

          {method === "Efectivo" && (
            <>
              <div className="field mt-3.5">
                <span className="label">Recibido</span>
                <input
                  className="input num text-lg"
                  style={{ height: 40 }}
                  value={cash}
                  onChange={(e) => setCash(parseFloat(e.target.value || "0"))}
                />
              </div>
              <div className="grid grid-cols-4 gap-1.5 mt-2">
                {quickCash.map((x, i) => (
                  <button type="button" key={i} className="btn btn--sm" onClick={() => setCash(x)}>
                    {fmtMXN(x)}
                  </button>
                ))}
              </div>
            </>
          )}

          {method === "Terminal" && (
            <div className="mt-3.5 p-3.5 border border-line rounded-md bg-surface-2">
              <div className="flex gap-2.5 items-center mb-2">
                <span className="text-accent">{I.card}</span>
                <strong className="text-[13px]">Terminal Mercado Libre</strong>
              </div>
              <div className="text-xs text-muted mb-2.5">
                Conectada · Point Mini W · estado <span className="pill pill--ok">Listo</span>
              </div>
              <button className="btn btn--primary w-full justify-center">
                {I.send} Enviar {fmtMXN(total)} a la terminal
              </button>
            </div>
          )}
        </div>

        <div>
          <div className="label mb-2">Resumen</div>
          <div className="bg-surface-2 border border-line rounded-md p-3.5">
            <SummaryRow label="Total a cobrar" value={fmtMXN(total)} big />
            {method === "Efectivo" && (
              <>
                <SummaryRow label="Recibido" value={fmtMXN(cash)} />
                <SummaryRow label="Cambio" value={fmtMXN(change)} />
              </>
            )}
          </div>

          <div className="divider" />

          <div className="label mb-2">Comprobante</div>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-[13px]">
              <input
                type="checkbox"
                checked={printTicket}
                onChange={(e) => setPrintTicket(e.target.checked)}
              />
              {I.printer} Imprimir ticket térmico (80 mm)
            </label>
            <label className="flex items-center gap-2 text-[13px]">
              <input type="checkbox" />
              {I.printer} Imprimir ticket carta con logo
            </label>
            <label className="flex items-center gap-2 text-[13px]">
              <input
                type="checkbox"
                checked={emailTicket}
                onChange={(e) => setEmailTicket(e.target.checked)}
              />
              {I.mail} Enviar por correo a{" "}
              <strong className="text-accent-ink">{customerEmail ?? "cliente@nexum.mx"}</strong>
            </label>
            <label className="flex items-center gap-2 text-[13px]">
              <input type="checkbox" />
              {I.whatsapp} Enviar link de portal por WhatsApp
            </label>
          </div>

          {consumption.length > 0 && (
            <>
              <div className="divider" />
              <div className="label mb-2 flex items-center gap-1.5">
                {I.layers} Inventario que se descontará
              </div>
              <div className="bg-surface-2 border border-line rounded-md p-2.5">
                {consumption.map((c) => {
                  const stockNow = c.variant ? c.variant.stock : c.mat.stock;
                  const after = stockNow - c.qty;
                  const willCritical = after <= c.mat.reorder * 0.5;
                  const willLow = after <= c.mat.reorder;
                  return (
                    <div
                      key={c.materialId + (c.variantId ?? "")}
                      className="flex items-center gap-2 text-xs py-1"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">
                          {c.mat.name}
                          {c.variant ? ` · ${c.variant.label}` : ""}
                        </div>
                        <div className="text-muted text-[10px]">
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
                      <span className="num font-semibold text-danger">
                        −{c.qty.toFixed(2)}
                      </span>
                      {willCritical && (
                        <span className="pill pill--danger text-[9px]">{I.alert}</span>
                      )}
                      {!willCritical && willLow && (
                        <span className="pill pill--warn text-[9px]">!</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="text-[10px] text-muted mt-1.5">
                Solo productos internos descuentan inventario. Productos con proveedor generan OC.
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

