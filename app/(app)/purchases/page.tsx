"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { I } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { PurchaseDemandPanel } from "@/components/purchase-demand-panel";
import { PurchaseNewModal } from "@/components/purchase-new-modal";
import { PurchaseStatusPill } from "@/components/purchase-status-pill";
import { PurchaseSuggestedModal } from "@/components/purchase-suggested-modal";
import { purchasesApi } from "@/lib/api/purchases";
import type { ApiPurchaseOrder, ApiPurchaseStatus } from "@/lib/api/types";
import { usePermission } from "@/lib/auth/auth-context";
import { fmtDate, fmtInt, fmtMXN } from "@/lib/format";
import { useApiList } from "@/lib/hooks/use-api-list";

const PAGE_SIZE = 25;

type Tab =
  | "Por comprar"
  | "Todas"
  | "Borradores"
  | "Enviadas"
  | "Recibidas"
  | "Canceladas";

const TABS: Tab[] = [
  "Por comprar",
  "Todas",
  "Borradores",
  "Enviadas",
  "Recibidas",
  "Canceladas",
];

const TAB_TO_STATUS: Record<Tab, ApiPurchaseStatus | null> = {
  "Por comprar": null,
  Todas: null,
  Borradores: "draft",
  Enviadas: "sent",
  Recibidas: "received",
  Canceladas: "cancelled",
};

export default function PurchasesPage() {
  const router = useRouter();
  const canCreate = usePermission("inventory.purchases.create");
  const [tab, setTab] = useState<Tab>("Todas");
  const [query, setQuery] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showSuggested, setShowSuggested] = useState(false);

  const {
    items: orders,
    total,
    totalPages,
    page,
    setPage,
    loading,
    error: loadError,
    debounced,
    reload,
  } = useApiList<ApiPurchaseOrder>({
    fetcher: (params) =>
      purchasesApi.list({ ...params, status: TAB_TO_STATUS[tab] ?? undefined }),
    filterKey: tab,
    search: query,
    pageSize: PAGE_SIZE,
    errorMessage: "No se pudieron cargar las órdenes de compra.",
  });

  const changeTab = (t: Tab) => {
    setTab(t);
    setPage(1);
  };

  return (
    <>
      <PageHeader
        title="Compras"
        sub={
          tab === "Todas"
            ? `${fmtInt(total)} órdenes de compra`
            : `${fmtInt(total)} órdenes · ${tab}`
        }
        actions={
          canCreate && (
            <>
              <button className="btn" onClick={() => setShowSuggested(true)}>
                {I.alert} Sugerencias
              </button>
              <button
                className="btn btn--accent"
                onClick={() => setShowNew(true)}
              >
                {I.plus} Nueva OC
              </button>
            </>
          )
        }
      />

      {loadError && (
        <div
          className="card mb-3 flex items-center gap-2"
          style={{
            padding: 12,
            border: "1px solid var(--danger)",
            color: "var(--danger)",
            background: "var(--danger-soft)",
          }}
          role="alert"
        >
          <span className="flex-1">{loadError}</span>
          <button
            className="btn btn--sm"
            type="button"
            onClick={() => void reload()}
          >
            Reintentar
          </button>
        </div>
      )}

      <div className="card">
        <div className="card__head" style={{ gap: 4 }}>
          {TABS.map((t) => (
            <button
              key={t}
              className={`btn btn--sm ${tab === t ? "btn--primary" : "btn--ghost"}`}
              onClick={() => changeTab(t)}
            >
              {t}
            </button>
          ))}
          <div className="spacer" />
          <div className="topbar__search" style={{ margin: 0, width: 240 }}>
            {I.search}
            <input
              placeholder="Buscar folio o proveedor"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        {tab === "Por comprar" ? (
          <PurchaseDemandPanel
            canCreate={canCreate}
            onCreated={(folio) => router.push(`/purchases/${folio}`)}
          />
        ) : (
          <>
        <div className="overflow-x-auto">
        <table className="tbl min-w-[820px]">
          <thead>
            <tr>
              <th>Folio</th>
              <th>Proveedor</th>
              <th>Esperada</th>
              <th style={{ textAlign: "right" }}>Líneas</th>
              <th style={{ textAlign: "right" }}>Total</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-muted">
                  Cargando órdenes de compra…
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-muted">
                  {debounced
                    ? `Sin órdenes para “${debounced}”.`
                    : "Sin órdenes de compra."}
                </td>
              </tr>
            ) : (
              orders.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => router.push(`/purchases/${p.folio}`)}
                >
                  <td className="num">{p.folio}</td>
                  <td>{p.supplierName}</td>
                  <td className="num text-xs">
                    {p.expectedDate ? fmtDate(p.expectedDate) : "—"}
                  </td>
                  <td className="num" style={{ textAlign: "right" }}>
                    {p.itemsCount}
                  </td>
                  <td className="num" style={{ textAlign: "right" }}>
                    {fmtMXN(p.total)}
                  </td>
                  <td>
                    <PurchaseStatusPill status={p.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
        <div
          className="flex items-center gap-3 text-xs text-muted"
          style={{ padding: "10px 14px", borderTop: "1px solid var(--line)" }}
        >
          <span>
            {total === 0
              ? "Sin órdenes"
              : `Mostrando ${(page - 1) * PAGE_SIZE + 1}–${Math.min(
                  page * PAGE_SIZE,
                  total,
                )} de ${total}`}
          </span>
          <div className="spacer" />
          <span className="num">
            Página {page} de {totalPages}
          </span>
          <button
            className="btn btn--sm btn--ghost"
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={loading || page <= 1}
            aria-label="Página anterior"
          >
            {I.chevronLeft}
          </button>
          <button
            className="btn btn--sm btn--ghost"
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={loading || page >= totalPages}
            aria-label="Página siguiente"
          >
            {I.chevronRight}
          </button>
        </div>
          </>
        )}
      </div>

      {showNew && (
        <PurchaseNewModal
          onClose={() => setShowNew(false)}
          onSaved={(res) => {
            setShowNew(false);
            if (res.folio) router.push(`/purchases/${res.folio}`);
            else void reload();
          }}
        />
      )}
      {showSuggested && (
        <PurchaseSuggestedModal
          onClose={() => setShowSuggested(false)}
          onGenerated={() => {
            setShowSuggested(false);
            // setPage(1) dispara el reload del hook; si ya estaba en la 1,
            // el reload explícito refresca igual (stale-guard incluido).
            setPage(1);
            void reload();
          }}
        />
      )}
    </>
  );
}
