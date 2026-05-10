"use client";

import { useState } from "react";
import { I } from "@/components/icons";
import { Modal } from "@/components/modal";
import { fmtMXN } from "@/lib/format";
import { NEXUM_CLIENTS } from "@/lib/mock-clients";
import { NEXUM_PRODUCTS } from "@/lib/mock-products";
import { NEXUM_USERS } from "@/lib/mock-users";

type DraftLine = {
  productId: string;
  qty: number;
  price: number;
  note: string;
};

export function QuoteNewModal({ onClose }: { onClose: () => void }) {
  const [lines, setLines] = useState<DraftLine[]>([
    { productId: NEXUM_PRODUCTS[0].id, qty: 100, price: NEXUM_PRODUCTS[0].price, note: "" },
  ]);

  const subtotal = lines.reduce((s, l) => s + l.qty * l.price, 0);
  const tax = subtotal * 0.16;
  const grand = subtotal + tax;

  const update = (i: number, p: Partial<DraftLine>) =>
    setLines((ls) => ls.map((l, j) => (i === j ? { ...l, ...p } : l)));

  const add = () =>
    setLines((ls) => [
      ...ls,
      { productId: NEXUM_PRODUCTS[0].id, qty: 1, price: NEXUM_PRODUCTS[0].price, note: "" },
    ]);

  const remove = (i: number) => setLines((ls) => ls.filter((_, j) => j !== i));

  return (
    <Modal
      title="Nueva cotización"
      onClose={onClose}
      width={860}
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button className="btn" onClick={onClose}>{I.copy} Guardar borrador</button>
          <button className="btn btn--accent" onClick={onClose}>
            {I.whatsapp} Enviar al cliente
          </button>
        </>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
        <label className="field">
          <span className="label">Cliente</span>
          <select className="input">
            {NEXUM_CLIENTS.map((c) => (
              <option key={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="label">Vigencia</span>
          <input className="input" type="date" defaultValue="2026-05-25" />
        </label>
        <label className="field">
          <span className="label">Vendedor</span>
          <select className="input">
            {NEXUM_USERS.map((u) => (
              <option key={u.id}>{u.name}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="card" style={{ boxShadow: "none", border: "1px solid var(--line)" }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Producto</th>
              <th style={{ width: 80, textAlign: "right" }}>Cant.</th>
              <th style={{ width: 110, textAlign: "right" }}>Precio</th>
              <th style={{ width: 120, textAlign: "right" }}>Subtotal</th>
              <th style={{ width: 40 }} />
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i}>
                <td>
                  <select
                    className="input"
                    style={{ width: "100%" }}
                    value={l.productId}
                    onChange={(e) => {
                      const p = NEXUM_PRODUCTS.find((x) => x.id === e.target.value);
                      update(i, { productId: e.target.value, price: p?.price ?? 0 });
                    }}
                  >
                    {NEXUM_PRODUCTS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="number"
                    className="input num"
                    style={{ textAlign: "right" }}
                    value={l.qty}
                    onChange={(e) => update(i, { qty: parseInt(e.target.value || "0", 10) })}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    className="input num"
                    style={{ textAlign: "right" }}
                    value={l.price}
                    onChange={(e) => update(i, { price: parseFloat(e.target.value || "0") })}
                  />
                </td>
                <td className="num" style={{ textAlign: "right", fontWeight: 600 }}>
                  {fmtMXN(l.qty * l.price)}
                </td>
                <td>
                  <button className="icon-btn" onClick={() => remove(i)} aria-label="Quitar línea">
                    {I.x}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="btn btn--sm btn--ghost" onClick={add} style={{ marginTop: 10 }}>
        {I.plus} Agregar línea
      </button>

      <div className="divider" />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 30, fontSize: 13 }}>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "var(--muted)" }}>Subtotal</div>
          <div style={{ color: "var(--muted)", marginTop: 4 }}>IVA 16%</div>
          <div
            style={{
              marginTop: 6,
              fontSize: 11,
              color: "var(--muted)",
              textTransform: "uppercase",
              letterSpacing: ".06em",
            }}
          >
            Total
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="num">{fmtMXN(subtotal)}</div>
          <div className="num" style={{ marginTop: 4 }}>{fmtMXN(tax)}</div>
          <div className="num" style={{ fontSize: 20, fontWeight: 600, marginTop: 4 }}>
            {fmtMXN(grand)}
          </div>
        </div>
      </div>
    </Modal>
  );
}
