"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ApprovalDetail } from "@/components/approval-detail";
import { ApprovalNewModal } from "@/components/approval-new-modal";
import { ApprovalPill } from "@/components/approval-pill";
import { I } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { designApi } from "@/lib/api/design";
import { APPROVAL_CHANNEL_ES } from "@/lib/api/design-mappers";
import type {
  ApiDesignProofListItem,
  ApiDesignProofStatus,
} from "@/lib/api/types";
import { usePermission } from "@/lib/auth/auth-context";

type Tab = "Pendientes" | "Cambios" | "Aprobados" | "Todos";

const TABS: Tab[] = ["Pendientes", "Cambios", "Aprobados", "Todos"];

const TAB_TO_STATUS: Record<Tab, ApiDesignProofStatus | null> = {
  Pendientes: "awaiting_client",
  Cambios: "changes_requested",
  Aprobados: "approved",
  Todos: null,
};

export default function ApprovalsPage() {
  const canRead = usePermission("design.proofs.read");
  const canCreate = usePermission("design.proofs.create");

  const [tab, setTab] = useState<Tab>("Pendientes");
  const [items, setItems] = useState<ApiDesignProofListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const reload = useCallback(async () => {
    try {
      const res = await designApi.list();
      setItems(res.items);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo salió mal.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canRead) return;
    void (async () => {
      await reload();
    })();
  }, [canRead, reload]);

  const filtered = useMemo(() => {
    const status = TAB_TO_STATUS[tab];
    return status ? items.filter((a) => a.status === status) : items;
  }, [tab, items]);

  const counts = useMemo(
    () => ({
      Pendientes: items.filter((a) => a.status === "awaiting_client").length,
      Cambios: items.filter((a) => a.status === "changes_requested").length,
      Aprobados: items.filter((a) => a.status === "approved").length,
      Todos: items.length,
    }),
    [items],
  );

  const selected =
    filtered.find((a) => a.id === selectedId) ?? filtered[0] ?? null;

  if (!canRead) {
    return (
      <>
        <PageHeader
          title="Aprobación de diseños"
          sub="Cada producto en una venta lleva su propia ficha de diseño y versiones."
        />
        <div className="empty m-4 p-6">
          No tienes permiso para ver las fichas de diseño.
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Aprobación de diseños"
        sub="Cada producto en una venta lleva su propia ficha de diseño y versiones."
        actions={
          canCreate ? (
            <button
              className="btn btn--accent"
              onClick={() => setShowNew(true)}
            >
              {I.plus} Nueva ficha
            </button>
          ) : undefined
        }
      />

      <div className="grid gap-5 grid-cols-1 xl:grid-cols-[1fr_1.4fr]">
        <div className="card">
          <div className="card__head gap-1 overflow-x-auto">{/* tabs scrollables en móvil */}
            {TABS.map((t) => (
              <button
                key={t}
                className={`btn btn--sm shrink-0 ${tab === t ? "btn--primary" : "btn--ghost"}`}
                onClick={() => setTab(t)}
              >
                {t} <span className="ml-1 opacity-60">{counts[t]}</span>
              </button>
            ))}
          </div>

          <div style={{ borderTop: "1px solid var(--line)" }}>
            {loading && (
              <div className="empty m-4 p-6">Cargando fichas…</div>
            )}
            {!loading && error && (
              <div
                className="m-4 p-4 rounded-md text-xs"
                style={{
                  border: "1px solid var(--danger)",
                  color: "var(--danger)",
                  background: "var(--danger-soft)",
                }}
                role="alert"
              >
                {error}
              </div>
            )}
            {!loading && !error && filtered.length === 0 && (
              <div className="empty m-4 p-6">
                Sin fichas en esta categoría.
              </div>
            )}
            {filtered.map((a) => {
              const active = selected?.id === a.id;
              return (
                <div
                  key={a.id}
                  onClick={() => setSelectedId(a.id)}
                  className="flex gap-3 px-4 py-3.5 cursor-pointer"
                  style={{
                    borderBottom: "1px solid var(--line)",
                    background: active ? "var(--surface-2)" : "transparent",
                    borderLeft: active
                      ? "2px solid var(--accent)"
                      : "2px solid transparent",
                  }}
                >
                  <div
                    className="skeleton-img text-[10px] shrink-0"
                    style={{ width: 64, height: 64 }}
                  >
                    v{a.currentVersion}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="num text-[11px] text-muted">{a.folio}</span>
                      <span className="text-muted">·</span>
                      <span className="num text-[11px] text-muted">
                        {a.orderFolio}
                      </span>
                    </div>
                    <div className="font-medium text-[13px] mt-0.5">
                      {a.productName}
                    </div>
                    <div className="text-muted text-xs">{a.clientName}</div>
                    <div className="flex gap-1.5 mt-1.5 items-center flex-wrap">
                      <ApprovalPill s={a.status} />
                      {a.lastChannel && (
                        <span className="tag inline-flex items-center gap-1">
                          {a.lastChannel === "whatsapp" ? I.whatsapp : I.link}
                          {APPROVAL_CHANNEL_ES[a.lastChannel]}
                        </span>
                      )}
                      <span className="tag">v{a.currentVersion}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {selected ? (
          <ApprovalDetail
            key={selected.id}
            proofId={selected.id}
            onMutated={() => void reload()}
          />
        ) : (
          <div className="card self-start p-6 text-muted text-sm">
            {loading
              ? "Cargando…"
              : "Crea una ficha de diseño para empezar (botón “Nueva ficha”)."}
          </div>
        )}
      </div>

      {showNew && (
        <ApprovalNewModal
          onClose={() => setShowNew(false)}
          onCreated={(id) => {
            setShowNew(false);
            setSelectedId(id);
            setTab("Todos");
            void reload();
          }}
        />
      )}
    </>
  );
}
