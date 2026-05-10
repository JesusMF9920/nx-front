"use client";

import { useState } from "react";
import { I } from "@/components/icons";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { PurchaseStatusPill } from "@/components/purchase-status-pill";
import { fmtMXN } from "@/lib/format";
import { NEXUM_MATERIALS } from "@/lib/mock-materials";
import { NEXUM_PURCHASES } from "@/lib/mock-purchases";
import { NEXUM_SUPPLIERS } from "@/lib/mock-suppliers";
import type { Material, Purchase, PurchaseLine, PurchaseStatus } from "@/lib/types";

type Tab = "Todas" | "Borrador" | "Enviada" | "Recibida parcial" | "Recibida";

const TABS: Tab[] = ["Todas", "Borrador", "Enviada", "Recibida parcial", "Recibida"];

export default function PurchasesPage() {
  const [tab, setTab] = useState<Tab>("Todas");
  const [selectedId, setSelectedId] = useState<string>(NEXUM_PURCHASES[0].id);
  const [showNew, setShowNew] = useState(false);
  const [showSuggested, setShowSuggested] = useState(false);

  const filtered =
    tab === "Todas" ? NEXUM_PURCHASES : NEXUM_PURCHASES.filter((p) => p.status === tab);

  const selected: Purchase =
    NEXUM_PURCHASES.find((p) => p.id === selectedId) ?? NEXUM_PURCHASES[0];

  const lowMaterials = NEXUM_MATERIALS.filter((m) => m.stock <= m.reorder);
  const openOrders = NEXUM_PURCHASES.filter(
    (p) => p.status === "Enviada" || p.status === "Recibida parcial",
  );
  const openValue = openOrders.reduce((s, p) => s + p.total, 0);

  return (
    <>
      <PageHeader
        title="Compras"
        sub={`${openOrders.length} OC abiertas · ${fmtMXN(openValue)} en tránsito · ${lowMaterials.length} insumos por reordenar`}
        actions={
          <>
            {lowMaterials.length > 0 && (
              <button className="btn" onClick={() => setShowSuggested(true)}>
                {I.alert} Sugerencias ({lowMaterials.length})
              </button>
            )}
            <button className="btn btn--accent" onClick={() => setShowNew(true)}>
              {I.plus} Nueva OC
            </button>
          </>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 18, alignItems: "start" }}>
        <div className="card">
          <div className="card__head" style={{ gap: 8 }}>
            <div className="row" style={{ gap: 4 }}>
              {TABS.map((t) => (
                <button
                  key={t}
                  className={`btn btn--sm ${tab === t ? "btn--primary" : "btn--ghost"}`}
                  onClick={() => setTab(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Folio</th>
                <th>Proveedor</th>
                <th>Fecha</th>
                <th>Esperada</th>
                <th style={{ textAlign: "right" }}>Líneas</th>
                <th style={{ textAlign: "right" }}>Total</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  style={{ background: selected.id === p.id ? "var(--accent-soft)" : "" }}
                >
                  <td className="num" style={{ fontWeight: 500 }}>
                    {p.id}
                    {p.forOrder && (
                      <div style={{ fontSize: 10, color: "var(--accent-ink)" }}>
                        para {p.forOrder}
                      </div>
                    )}
                  </td>
                  <td>{p.supplier}</td>
                  <td className="num" style={{ fontSize: 12, color: "var(--muted)" }}>{p.date}</td>
                  <td className="num" style={{ fontSize: 12 }}>{p.expected}</td>
                  <td className="num" style={{ textAlign: "right" }}>{p.items}</td>
                  <td className="num" style={{ textAlign: "right", fontWeight: 600 }}>
                    {fmtMXN(p.total)}
                  </td>
                  <td><PurchaseStatusPill s={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <PurchaseDetail po={selected} />
      </div>

      {showNew && <NewPurchaseModal onClose={() => setShowNew(false)} />}
      {showSuggested && (
        <SuggestedPOModal materials={lowMaterials} onClose={() => setShowSuggested(false)} />
      )}
    </>
  );
}

function PurchaseDetail({ po }: { po: Purchase }) {
  return (
    <div className="card" style={{ position: "sticky", top: 16 }}>
      <div className="card__head">
        <div>
          <div className="card__title num">{po.id}</div>
          <div style={{ color: "var(--muted)", fontSize: 12 }}>{po.supplier}</div>
        </div>
        <div className="spacer" />
        <button className="icon-btn" aria-label="Descargar OC">{I.download}</button>
      </div>

      <div
        style={{
          padding: 14,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          fontSize: 12,
          borderBottom: "1px solid var(--line)",
        }}
      >
        <Kv k="Fecha" v={<span className="num">{po.date}</span>} />
        <Kv k="Esperada" v={<span className="num">{po.expected}</span>} />
        <Kv k="Comprador" v={po.buyer} />
        <Kv k="Total" v={<span className="num" style={{ fontWeight: 600 }}>{fmtMXN(po.total)}</span>} />
      </div>

      <div style={{ padding: 14 }}>
        <div className="label" style={{ marginBottom: 8 }}>Líneas</div>
        {po.lines.map((l, i) => (
          <PurchaseLineRow key={i} line={l} status={po.status} first={i === 0} />
        ))}
      </div>

      <div style={{ padding: 12, borderTop: "1px solid var(--line)", display: "flex", gap: 8 }}>
        {po.status === "Borrador" && (
          <button className="btn btn--primary" style={{ flex: 1, justifyContent: "center" }}>
            {I.whatsapp} Enviar al proveedor
          </button>
        )}
        {(po.status === "Enviada" || po.status === "Recibida parcial") && (
          <button className="btn btn--accent" style={{ flex: 1, justifyContent: "center" }}>
            {I.download} Recibir mercancía
          </button>
        )}
        {po.status === "Recibida" && (
          <button className="btn btn--ghost" style={{ flex: 1, justifyContent: "center" }}>
            {I.check} Cerrada
          </button>
        )}
      </div>
    </div>
  );
}

function PurchaseLineRow({
  line,
  status,
  first,
}: {
  line: PurchaseLine;
  status: PurchaseStatus;
  first: boolean;
}) {
  const mat = line.materialId ? NEXUM_MATERIALS.find((m) => m.id === line.materialId) : undefined;
  const name = mat?.name ?? line.name ?? "—";
  const unit = mat?.unit ?? "u";
  const received = line.received ?? (status === "Recibida" ? line.qty : 0);
  const pct = Math.round((received / line.qty) * 100);
  const barColor = pct === 100 ? "var(--ok)" : "var(--warn)";
  const receivedColor = pct === 100 ? "var(--ok)" : pct > 0 ? "var(--warn)" : "var(--muted)";

  return (
    <div style={{ padding: "10px 0", borderTop: first ? "none" : "1px solid var(--line)" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
        <div style={{ flex: 1, fontSize: 13 }}>{name}</div>
        <div className="num" style={{ fontSize: 12, fontWeight: 600 }}>
          {fmtMXN(line.qty * line.cost)}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
        <span className="num">{line.qty} {unit}</span>
        <span>·</span>
        <span className="num">{fmtMXN(line.cost)} c/u</span>
        <div className="spacer" />
        <span className="num" style={{ color: receivedColor }}>
          {received}/{line.qty} recibido
        </span>
      </div>
      <div
        style={{
          height: 4,
          background: "var(--surface-3)",
          borderRadius: 2,
          marginTop: 4,
          overflow: "hidden",
        }}
      >
        <div style={{ width: `${pct}%`, height: "100%", background: barColor }} />
      </div>
    </div>
  );
}

function Kv({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <div
        style={{
          color: "var(--muted)",
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: ".06em",
        }}
      >
        {k}
      </div>
      <div>{v}</div>
    </div>
  );
}

type DraftLine = { materialId: string; qty: number; cost: number };

function NewPurchaseModal({ onClose }: { onClose: () => void }) {
  const [supplier, setSupplier] = useState(NEXUM_SUPPLIERS[0].name);
  const [lines, setLines] = useState<DraftLine[]>([
    { materialId: NEXUM_MATERIALS[0].id, qty: 50, cost: NEXUM_MATERIALS[0].cost },
  ]);

  const update = (i: number, p: Partial<DraftLine>) =>
    setLines((ls) => ls.map((l, j) => (i === j ? { ...l, ...p } : l)));

  const add = () =>
    setLines((ls) => [
      ...ls,
      { materialId: NEXUM_MATERIALS[0].id, qty: 1, cost: NEXUM_MATERIALS[0].cost },
    ]);

  const remove = (i: number) => setLines((ls) => ls.filter((_, j) => j !== i));
  const total = lines.reduce((s, l) => s + l.qty * l.cost, 0);

  return (
    <Modal
      title="Nueva orden de compra"
      onClose={onClose}
      width={780}
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose}>Cancelar</button>
          <button className="btn" onClick={onClose}>{I.copy} Guardar borrador</button>
          <button className="btn btn--accent" onClick={onClose}>{I.whatsapp} Enviar OC</button>
        </>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
        <label className="field">
          <span className="label">Proveedor</span>
          <select className="input" value={supplier} onChange={(e) => setSupplier(e.target.value)}>
            {NEXUM_SUPPLIERS.map((s) => (
              <option key={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="label">Fecha esperada</span>
          <input className="input" type="date" defaultValue="2026-05-15" />
        </label>
        <label className="field">
          <span className="label">Para pedido (opcional)</span>
          <input className="input" placeholder="ORD-…" />
        </label>
      </div>

      <div className="card" style={{ boxShadow: "none", border: "1px solid var(--line)" }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Insumo</th>
              <th style={{ width: 90, textAlign: "right" }}>Cantidad</th>
              <th style={{ width: 110, textAlign: "right" }}>Costo unit.</th>
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
                    value={l.materialId}
                    onChange={(e) => {
                      const m = NEXUM_MATERIALS.find((x) => x.id === e.target.value);
                      update(i, { materialId: e.target.value, cost: m?.cost ?? 0 });
                    }}
                  >
                    {NEXUM_MATERIALS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.unit})
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
                    onChange={(e) => update(i, { qty: parseFloat(e.target.value || "0") })}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    className="input num"
                    style={{ textAlign: "right" }}
                    value={l.cost}
                    onChange={(e) => update(i, { cost: parseFloat(e.target.value || "0") })}
                  />
                </td>
                <td className="num" style={{ textAlign: "right", fontWeight: 600 }}>
                  {fmtMXN(l.qty * l.cost)}
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
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "baseline", gap: 14 }}>
        <span style={{ color: "var(--muted)" }}>Total OC:</span>
        <span className="num" style={{ fontSize: 22, fontWeight: 600 }}>{fmtMXN(total)}</span>
      </div>
    </Modal>
  );
}

function SuggestedPOModal({
  materials,
  onClose,
}: {
  materials: Material[];
  onClose: () => void;
}) {
  const bySupplier: Record<string, Array<Material & { suggested: number }>> = {};
  materials.forEach((m) => {
    const sup = m.supplierName || "Sin proveedor";
    if (!bySupplier[sup]) bySupplier[sup] = [];
    const suggested = Math.max(m.reorder * 2 - m.stock, m.reorder);
    bySupplier[sup].push({ ...m, suggested });
  });

  return (
    <Modal
      title="Órdenes de compra sugeridas"
      onClose={onClose}
      width={720}
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose}>Cerrar</button>
          <button className="btn btn--accent" onClick={onClose}>
            {I.check} Generar {Object.keys(bySupplier).length} OC
          </button>
        </>
      }
    >
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>
        {materials.length} insumos por debajo del punto de reorden. Se generará una OC borrador por proveedor.
      </div>
      {Object.entries(bySupplier).map(([sup, mats]) => {
        const total = mats.reduce((s, m) => s + m.suggested * m.cost, 0);
        return (
          <div
            key={sup}
            style={{
              border: "1px solid var(--line)",
              borderRadius: "var(--r-md)",
              marginBottom: 10,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "10px 14px",
                background: "var(--surface-2)",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <strong>{sup}</strong>
              <span className="tag" style={{ fontSize: 10 }}>{mats.length} insumos</span>
              <div className="spacer" />
              <span className="num" style={{ fontWeight: 600 }}>{fmtMXN(total)}</span>
            </div>
            {mats.map((m) => (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  padding: "8px 14px",
                  borderTop: "1px solid var(--line)",
                  fontSize: 12,
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <input type="checkbox" defaultChecked />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{m.name}</div>
                  <div style={{ color: "var(--muted)", fontSize: 10 }}>
                    Stock <span className="num">{m.stock}</span> · Reorden{" "}
                    <span className="num">{m.reorder}</span> {m.unit}
                  </div>
                </div>
                <div className="num">
                  {m.suggested} {m.unit}
                </div>
                <div className="num" style={{ width: 80, textAlign: "right", fontWeight: 600 }}>
                  {fmtMXN(m.suggested * m.cost)}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </Modal>
  );
}
