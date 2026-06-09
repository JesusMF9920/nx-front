"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { I } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { PurchaseNewModal } from "@/components/purchase-new-modal";
import { PurchaseStatusPill } from "@/components/purchase-status-pill";
import { PurchaseSuggestedModal } from "@/components/purchase-suggested-modal";
import { ApiError } from "@/lib/api/errors";
import { purchasesApi } from "@/lib/api/purchases";
import type { ApiPurchaseOrder, ApiPurchaseStatus } from "@/lib/api/types";
import { usePermission } from "@/lib/auth/auth-context";
import { fmtDate, fmtInt, fmtMXN } from "@/lib/format";

const PAGE_SIZE = 25;

type Tab = "Todas" | "Borradores" | "Enviadas" | "Recibidas" | "Canceladas";

const TABS: Tab[] = [
  "Todas",
  "Borradores",
  "Enviadas",
  "Recibidas",
  "Canceladas",
];

const TAB_TO_STATUS: Record<Tab, ApiPurchaseStatus | null> = {
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
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState<ApiPurchaseOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [showSuggested, setShowSuggested] = useState(false);
  // Token incremental: cada carga invalida a las anteriores (incluye Reintentar
  // y onSaved/onGenerated), evitando que una respuesta tardía pise datos nuevos.
  const reqRef = useRef(0);

  useEffect(() => {
    const id = setTimeout(() => {
      setDebounced(query.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(id);
  }, [query]);

  const reload = async (targetPage = page) => {
    const myReq = ++reqRef.current;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await purchasesApi.list({
        skip: (targetPage - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        search: debounced || undefined,
        status: TAB_TO_STATUS[tab] ?? undefined,
      });
      if (reqRef.current !== myReq) return;
      setOrders(res.items);
      setTotal(res.total);
    } catch (err) {
      if (reqRef.current !== myReq) return;
      setLoadError(
        err instanceof ApiError
          ? err.message
          : "No se pudieron cargar las órdenes de compra.",
      );
    } finally {
      if (reqRef.current === myReq) setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, tab, debounced]);

  const changeTab = (t: Tab) => {
    setTab(t);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

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
        <table className="tbl">
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
            void reload(1);
            setPage(1);
          }}
        />
      )}
    </>
  );
}
