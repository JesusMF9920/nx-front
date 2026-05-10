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

      <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 1.4fr" }}>
        <div className="card">
          <div className="card__head gap-1">
            {TABS.map((t) => (
              <button
                key={t}
                className={`btn btn--sm ${tab === t ? "btn--primary" : "btn--ghost"}`}
                onClick={() => setTab(t)}
              >
                {t} <span className="ml-1 opacity-60">{counts[t]}</span>
              </button>
            ))}
            <div className="spacer" />
            <button className="icon-btn" aria-label="Filtros">{I.filter}</button>
          </div>

          <div style={{ borderTop: "1px solid var(--line)" }}>
            {filtered.length === 0 && (
              <div className="empty m-4 p-6">
                Sin aprobaciones en esta categoría.
              </div>
            )}
            {filtered.map((a) => {
              const active = selected.id === a.id;
              return (
                <div
                  key={a.id}
                  onClick={() => setSelectedId(a.id)}
                  className="flex gap-3 px-4 py-3.5 cursor-pointer"
                  style={{
                    borderBottom: "1px solid var(--line)",
                    background: active ? "var(--surface-2)" : "transparent",
                    borderLeft: active ? "2px solid var(--accent)" : "2px solid transparent",
                  }}
                >
                  <div
                    className="skeleton-img text-[10px] shrink-0"
                    style={{ width: 64, height: 64 }}
                  >
                    v{a.version}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="num text-[11px] text-muted">{a.id}</span>
                      <span className="text-muted">·</span>
                      <span className="num text-[11px] text-muted">{a.order}</span>
                    </div>
                    <div className="font-medium text-[13px] mt-0.5">{a.product}</div>
                    <div className="text-muted text-xs">{a.client}</div>
                    <div className="flex gap-1.5 mt-1.5 items-center flex-wrap">
                      <ApprovalPill s={a.status} />
                      <span className="tag inline-flex items-center gap-1">
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
