"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { I } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { PaymentPill } from "@/components/payment-pill";
import { StatusPill } from "@/components/status-pill";
import { ApiError } from "@/lib/api/errors";
import { ordersApi } from "@/lib/api/orders";
import { ORDER_STATUS_ES, paymentLabel } from "@/lib/api/sales-mappers";
import type { ApiOrder, ApiOrderStatus } from "@/lib/api/types";
import { fmtDate, fmtInt, fmtMXN } from "@/lib/format";

const PAGE_SIZE = 25;

type Tab =
  | "Todos"
  | "Diseño"
  | "Aprobación"
  | "Producción"
  | "Con proveedor"
  | "Listos"
  | "Entregados";

const TABS: Tab[] = [
  "Todos",
  "Diseño",
  "Aprobación",
  "Producción",
  "Con proveedor",
  "Listos",
  "Entregados",
];

/** Las canceladas no tienen tab propia: se ven en "Todos" con su pill. */
const TAB_TO_STATUS: Record<Tab, ApiOrderStatus | null> = {
  Todos: null,
  Diseño: "in_design",
  Aprobación: "client_approval",
  Producción: "production",
  "Con proveedor": "with_supplier",
  Listos: "ready_for_delivery",
  Entregados: "delivered",
};

export default function OrdersPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("Todos");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Debounce de búsqueda (250ms). Resetea page al mismo tiempo para que
  // la siguiente fetch sea atómica con el nuevo término.
  useEffect(() => {
    const id = setTimeout(() => {
      setDebounced(query.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(id);
  }, [query]);

  const reload = async (targetPage = page) => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await ordersApi.list({
        skip: (targetPage - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        search: debounced || undefined,
        status: TAB_TO_STATUS[tab] ?? undefined,
      });
      setOrders(res.items);
      setTotal(res.total);
    } catch (err) {
      setLoadError(
        err instanceof ApiError
          ? err.message
          : "No se pudieron cargar los pedidos.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
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
        title="Pedidos"
        sub={
          tab === "Todos"
            ? `${fmtInt(total)} pedidos`
            : `${fmtInt(total)} pedidos · ${tab}`
        }
        actions={
          <>
            <button className="btn">{I.download} Exportar</button>
            <Link className="btn btn--accent" href="/pos">
              {I.plus} Nueva venta
            </Link>
          </>
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
              placeholder="Buscar pedido o cliente"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button className="icon-btn" aria-label="Filtros">{I.filter}</button>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Cliente</th>
              <th style={{ textAlign: "right" }}>Items</th>
              <th>Pago</th>
              <th style={{ textAlign: "right" }}>Total</th>
              <th>Estatus</th>
              <th>Entrega</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-muted">Cargando pedidos…</td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-muted">
                  {debounced
                    ? `Sin pedidos para “${debounced}”.`
                    : "Sin pedidos."}
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id} onClick={() => router.push(`/orders/${o.folio}`)}>
                  <td className="num">{o.folio}</td>
                  <td>{o.clientName}</td>
                  <td className="num" style={{ textAlign: "right" }}>{o.itemsCount}</td>
                  <td><PaymentPill method={paymentLabel(o)} /></td>
                  <td className="num" style={{ textAlign: "right" }}>{fmtMXN(o.total)}</td>
                  <td><StatusPill s={ORDER_STATUS_ES[o.status]} /></td>
                  <td className="num">{o.deliverAt ? fmtDate(o.deliverAt) : "Sin fecha"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div
          className="flex items-center gap-3 text-xs text-muted"
          style={{
            padding: "10px 14px",
            borderTop: "1px solid var(--line)",
          }}
        >
          <span>
            {total === 0
              ? "Sin pedidos"
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
    </>
  );
}
