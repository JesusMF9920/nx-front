"use client";

import { useMemo, useState } from "react";
import { ApprovalDetail } from "@/components/approval-detail";
import { ApprovalPill } from "@/components/approval-pill";
import { I } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { NEXUM_APPROVALS } from "@/lib/mock-orders";
import type { ApprovalStatus } from "@/lib/types";

type Tab = "Pendientes" | "Cambios" | "Aprobados" | "Todos";

const TABS: Tab[] = ["Pendientes", "Cambios", "Aprobados", "Todos"];

const TAB_TO_STATUS: Record<Tab, ApprovalStatus | null> = {
  Pendientes: "Esperando cliente",
  Cambios: "Cambios solicitados",
  Aprobados: "Aprobado",
  Todos: null,
};

export default function ApprovalsPage() {
  const [tab, setTab] = useState<Tab>("Pendientes");
  const [selectedId, setSelectedId] = useState<string>(NEXUM_APPROVALS[0].id);

  const filtered = useMemo(() => {
    const status = TAB_TO_STATUS[tab];
    return status ? NEXUM_APPROVALS.filter((a) => a.status === status) : NEXUM_APPROVALS;
  }, [tab]);

  const counts = useMemo(
    () => ({
      Pendientes: NEXUM_APPROVALS.filter((a) => a.status === "Esperando cliente").length,
      Cambios: NEXUM_APPROVALS.filter((a) => a.status === "Cambios solicitados").length,
      Aprobados: NEXUM_APPROVALS.filter((a) => a.status === "Aprobado").length,
      Todos: NEXUM_APPROVALS.length,
    }),
    [],
  );

  const selected = NEXUM_APPROVALS.find((a) => a.id === selectedId) ?? NEXUM_APPROVALS[0];

  return (
    <>
      <PageHeader
        title="Aprobación de diseños"
        sub="Cada producto en una venta lleva su propia ficha de diseño y versiones."
        actions={
          <>
            <button className="btn">{I.layers} Plantillas</button>
            <button className="btn btn--accent">{I.plus} Subir diseño</button>
          </>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 20 }}>
        <div className="card">
          <div className="card__head" style={{ gap: 4 }}>
            {TABS.map((t) => (
              <button
                key={t}
                className={`btn btn--sm ${tab === t ? "btn--primary" : "btn--ghost"}`}
                onClick={() => setTab(t)}
              >
                {t} <span style={{ opacity: 0.6, marginLeft: 4 }}>{counts[t]}</span>
              </button>
            ))}
            <div className="spacer" />
            <button className="icon-btn" aria-label="Filtros">{I.filter}</button>
          </div>

          <div style={{ borderTop: "1px solid var(--line)" }}>
            {filtered.length === 0 && (
              <div className="empty" style={{ margin: 16, padding: 24 }}>
                Sin aprobaciones en esta categoría.
              </div>
            )}
            {filtered.map((a) => {
              const active = selected.id === a.id;
              return (
                <div
                  key={a.id}
                  onClick={() => setSelectedId(a.id)}
                  style={{
                    display: "flex",
                    gap: 12,
                    padding: "14px 16px",
                    borderBottom: "1px solid var(--line)",
                    cursor: "pointer",
                    background: active ? "var(--surface-2)" : "transparent",
                    borderLeft: active ? "2px solid var(--accent)" : "2px solid transparent",
                  }}
                >
                  <div className="skeleton-img" style={{ width: 64, height: 64, fontSize: 10, flexShrink: 0 }}>
                    v{a.version}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span className="num" style={{ fontSize: 11, color: "var(--muted)" }}>{a.id}</span>
                      <span style={{ color: "var(--muted)" }}>·</span>
                      <span className="num" style={{ fontSize: 11, color: "var(--muted)" }}>{a.order}</span>
                    </div>
                    <div style={{ fontWeight: 500, fontSize: 13, marginTop: 2 }}>{a.product}</div>
                    <div style={{ color: "var(--muted)", fontSize: 12 }}>{a.client}</div>
                    <div style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <ApprovalPill s={a.status} />
                      <span className="tag" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        {a.channel === "WhatsApp" ? I.whatsapp : I.link}
                        {a.channel}
                      </span>
                      <span className="tag">v{a.version}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <ApprovalDetail key={selected.id} item={selected} />
      </div>
    </>
  );
}
