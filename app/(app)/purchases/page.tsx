"use client";

import { useState } from "react";
import { I } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { PurchaseDetail } from "@/components/purchase-detail";
import { PurchaseNewModal } from "@/components/purchase-new-modal";
import { PurchaseStatusPill } from "@/components/purchase-status-pill";
import { PurchaseSuggestedModal } from "@/components/purchase-suggested-modal";
import { fmtMXN } from "@/lib/format";
import { NEXUM_MATERIALS } from "@/lib/mock-materials";
import { NEXUM_PURCHASES } from "@/lib/mock-purchases";
import type { Purchase } from "@/lib/types";

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

      {showNew && <PurchaseNewModal onClose={() => setShowNew(false)} />}
      {showSuggested && (
        <PurchaseSuggestedModal materials={lowMaterials} onClose={() => setShowSuggested(false)} />
      )}
    </>
  );
}
