"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { I } from "@/components/icons";
import { SkeletonTable } from "@/components/skeleton";
import { PageHeader } from "@/components/page-header";
import { OrderPaymentModal } from "@/components/order-payment-modal";
import {
  CollectionReminderModal,
  type ReminderTarget,
} from "@/components/collection-reminder-modal";
import { useFeature, usePermission } from "@/lib/auth/auth-context";
import { ordersApi } from "@/lib/api/orders";
import {
  collectionsApi,
  type ApiReceivableClient,
  type ApiReceivableOrder,
  type CollectionsSummary,
  type ReceivableBucket,
} from "@/lib/api/collections";
import type { ApiOrderDetail } from "@/lib/api/types";
import { fmtDate, fmtInt, fmtMXN } from "@/lib/format";
import { useApiList } from "@/lib/hooks/use-api-list";

const PAGE_SIZE = 25;

type View = "client" | "order";

const BUCKET_ES: Record<ReceivableBucket, string> = {
  "0-30": "Corriente",
  "31-60": "31–60 días",
  "61-90": "61–90 días",
  "90+": "+90 días",
};

const BUCKET_COLOR: Record<ReceivableBucket, string> = {
  "0-30": "var(--muted)",
  "31-60": "var(--warn, #b45309)",
  "61-90": "var(--warn, #b45309)",
  "90+": "var(--danger)",
};

function BucketBadge({ bucket, days }: { bucket: ReceivableBucket; days: number }) {
  return (
    <span style={{ color: BUCKET_COLOR[bucket], fontWeight: 500, fontSize: 12 }}>
      {BUCKET_ES[bucket]}
      <span className="text-muted text-[11px]"> · {fmtInt(days)} d</span>
    </span>
  );
}

type ClientFilter = { clientId: string; clientName: string };

export default function CollectionsPage() {
  const canRead = usePermission("sales.collections.read");
  const canPay = usePermission("sales.payments.record");
  const canRemind = usePermission("sales.collections.remind");
  const waOn = useFeature("whatsapp");
  // El botón abre el modal de recordatorio; tiene sentido si hay AL MENOS un
  // canal disponible (WhatsApp por flag, correo por permiso).
  const canSendReminder = canRemind || waOn;

  const [view, setView] = useState<View>("client");
  const [query, setQuery] = useState("");
  const [overdue, setOverdue] = useState(false);
  const [clientFilter, setClientFilter] = useState<ClientFilter | null>(null);
  const [summary, setSummary] = useState<CollectionsSummary | null>(null);
  const [summaryTick, setSummaryTick] = useState(0);
  const [reminderTarget, setReminderTarget] = useState<ReminderTarget | null>(
    null,
  );
  const [payTarget, setPayTarget] = useState<ApiOrderDetail | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const {
    items,
    total,
    totalPages,
    page,
    setPage,
    loading,
    error: loadError,
    debounced,
    reload,
  } = useApiList<ApiReceivableOrder | ApiReceivableClient>({
    fetcher: (params) =>
      view === "client"
        ? collectionsApi.listByClient({
            ...params,
            onlyOverdue: overdue || undefined,
          })
        : collectionsApi.listByOrder({
            ...params,
            clientId: clientFilter?.clientId,
            onlyOverdue: overdue || undefined,
          }),
    filterKey: `${view}|${clientFilter?.clientId ?? ""}|${overdue ? "1" : "0"}`,
    search: query,
    pageSize: PAGE_SIZE,
    errorMessage: "No se pudo cargar la cobranza.",
  });

  // KPIs del set filtrado (independiente de la paginación). Se refresca tras un
  // abono (summaryTick) y cuando cambian los filtros.
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const s = await collectionsApi.summary({
          search: debounced || undefined,
          clientId: clientFilter?.clientId,
          onlyOverdue: overdue || undefined,
        });
        if (!cancelled) setSummary(s);
      } catch {
        if (!cancelled) setSummary(null);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [debounced, overdue, clientFilter, summaryTick]);

  const changeView = (v: View) => {
    setView(v);
    setClientFilter(null);
    setPage(1);
  };

  const drillIntoClient = (c: ApiReceivableClient) => {
    setClientFilter({ clientId: c.clientId, clientName: c.clientName });
    setView("order");
    setPage(1);
  };

  const openPayment = async (orderId: string) => {
    try {
      const detail = await ordersApi.get(orderId);
      setPayTarget(detail);
    } catch {
      setNotice("No se pudo abrir el pedido para registrar el abono.");
    }
  };

  const afterPayment = () => {
    setPayTarget(null);
    setNotice("Abono registrado.");
    setSummaryTick((t) => t + 1);
    void reload();
  };

  if (!canRead) {
    return (
      <>
        <PageHeader title="Cobranza" />
        <div className="card" style={{ padding: 16 }}>
          <p className="text-muted text-[13px]">
            No tienes permiso para ver la cobranza.
          </p>
        </div>
      </>
    );
  }

  const colCount = view === "client" ? 5 : 8;

  // `useApiList` conserva los items previos mientras refetchea al cambiar de
  // vista; como las dos vistas tienen FORMA distinta, filtramos por la forma
  // que toca para no renderizar campos inexistentes (p.ej. order.total sobre
  // una fila de cliente). La ventana de transición (items viejos de la otra
  // forma) se trata como "cargando".
  const orderRows =
    view === "order"
      ? (items.filter((it) => "orderId" in it) as ApiReceivableOrder[])
      : [];
  const clientRows =
    view === "client"
      ? (items.filter((it) => "debt" in it) as ApiReceivableClient[])
      : [];
  const rowCount = view === "order" ? orderRows.length : clientRows.length;
  const transitioning = !loading && items.length > 0 && rowCount === 0;
  const showLoading = loading || transitioning;

  return (
    <>
      <PageHeader
        title="Cobranza"
        sub={
          summary
            ? `${fmtMXN(summary.totalBalance)} por cobrar · ${fmtInt(
                summary.debtorCount,
              )} ${summary.debtorCount === 1 ? "deudor" : "deudores"}`
            : "Cuentas por cobrar"
        }
      />

      {/* KPIs por antigüedad */}
      <div className="grid gap-2 mb-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
        <KpiCard label="Por cobrar" value={summary ? fmtMXN(summary.totalBalance) : "—"} />
        <KpiCard
          label="Vencido (+30 d)"
          value={summary ? fmtMXN(summary.overdueBalance) : "—"}
          tone={summary && summary.overdueBalance > 0 ? "danger" : undefined}
        />
        <KpiCard label="Corriente 0–30" value={summary ? fmtMXN(summary.b030) : "—"} />
        <KpiCard label="31–60" value={summary ? fmtMXN(summary.b3160) : "—"} />
        <KpiCard label="61–90" value={summary ? fmtMXN(summary.b6190) : "—"} />
        <KpiCard label="+90" value={summary ? fmtMXN(summary.b90) : "—"} tone={summary && summary.b90 > 0 ? "danger" : undefined} />
      </div>

      {notice && (
        <div
          className="card mb-3 flex items-center gap-2"
          style={{ padding: 12, border: "1px solid var(--accent)" }}
          role="status"
        >
          <span className="flex-1">{notice}</span>
          <button className="btn btn--sm" type="button" onClick={() => setNotice(null)}>
            Cerrar
          </button>
        </div>
      )}

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
          <button className="btn btn--sm" type="button" onClick={() => void reload()}>
            Reintentar
          </button>
        </div>
      )}

      <div className="card">
        <div className="card__head" style={{ gap: 4 }}>
          <button
            className={`btn btn--sm ${view === "client" ? "btn--primary" : "btn--ghost"}`}
            onClick={() => changeView("client")}
          >
            Por cliente
          </button>
          <button
            className={`btn btn--sm ${view === "order" ? "btn--primary" : "btn--ghost"}`}
            onClick={() => changeView("order")}
          >
            Por pedido
          </button>
          {clientFilter && (
            <button
              className="btn btn--sm btn--ghost"
              type="button"
              onClick={() => {
                setClientFilter(null);
                setPage(1);
              }}
              title="Quitar el filtro de cliente"
            >
              Estado de cuenta: {clientFilter.clientName} {I.x}
            </button>
          )}
          <div className="spacer" />
          <div className="topbar__search" style={{ margin: 0, width: 220 }}>
            {I.search}
            <input
              placeholder={view === "client" ? "Buscar cliente" : "Buscar folio o cliente"}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button
            className={`btn btn--sm ${overdue ? "btn--primary" : "btn--ghost"}`}
            type="button"
            onClick={() => {
              setOverdue((o) => !o);
              setPage(1);
            }}
            title="Solo saldos con más de 30 días"
          >
            {I.clock} Vencidos
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="tbl min-w-[760px]">
            <thead>
              {view === "client" ? (
                <tr>
                  <th>Cliente</th>
                  <th style={{ textAlign: "right" }}>Pedidos</th>
                  <th>Antigüedad</th>
                  <th style={{ textAlign: "right" }}>Saldo</th>
                  <th style={{ textAlign: "right" }}>Acciones</th>
                </tr>
              ) : (
                <tr>
                  <th>Folio</th>
                  <th>Cliente</th>
                  <th>Venta</th>
                  <th>Antigüedad</th>
                  <th style={{ textAlign: "right" }}>Total</th>
                  <th style={{ textAlign: "right" }}>Pagado</th>
                  <th style={{ textAlign: "right" }}>Saldo</th>
                  <th style={{ textAlign: "right" }}>Acciones</th>
                </tr>
              )}
            </thead>
            <tbody>
              {showLoading ? (
                <tr>
                  <td colSpan={colCount}>
                    <SkeletonTable rows={6} cols={colCount} />
                  </td>
                </tr>
              ) : rowCount === 0 ? (
                <tr>
                  <td colSpan={colCount} className="text-muted">
                    {debounced
                      ? `Sin resultados para “${debounced}”.`
                      : overdue
                        ? "Sin saldos vencidos."
                        : "Sin cuentas por cobrar. ¡Todo al corriente!"}
                  </td>
                </tr>
              ) : view === "client" ? (
                clientRows.map((c) => (
                  <tr key={c.clientId}>
                    <td>{c.clientName}</td>
                    <td className="num" style={{ textAlign: "right" }}>
                      {fmtInt(c.orderCount)}
                    </td>
                    <td>
                      <BucketBadge bucket={c.oldestBucket} days={c.oldestAgeDays} />
                    </td>
                    <td className="num" style={{ textAlign: "right", fontWeight: 600 }}>
                      {fmtMXN(c.debt)}
                    </td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <button
                        className="btn btn--sm btn--ghost"
                        type="button"
                        onClick={() => drillIntoClient(c)}
                      >
                        {I.receipt} Ver pedidos
                      </button>
                      {canSendReminder && (
                        <button
                          className="btn btn--sm btn--ghost"
                          type="button"
                          onClick={() =>
                            setReminderTarget({
                              kind: "client",
                              clientId: c.clientId,
                              clientName: c.clientName,
                              debt: c.debt,
                            })
                          }
                        >
                          {I.mail} Recordatorio
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                orderRows.map((o) => (
                  <tr key={o.orderId}>
                    <td className="num">
                      <Link href={`/orders/${o.folio}`} className="text-[13px]">
                        {o.folio}
                      </Link>
                    </td>
                    <td>{o.clientName}</td>
                    <td className="num">{fmtDate(o.createdAt)}</td>
                    <td>
                      <BucketBadge bucket={o.bucket} days={o.ageDays} />
                    </td>
                    <td className="num" style={{ textAlign: "right" }}>
                      {fmtMXN(o.total)}
                    </td>
                    <td className="num" style={{ textAlign: "right" }}>
                      {fmtMXN(o.paid)}
                    </td>
                    <td className="num" style={{ textAlign: "right", fontWeight: 600 }}>
                      {fmtMXN(o.balance)}
                    </td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      {canPay && (
                        <button
                          className="btn btn--sm btn--ghost"
                          type="button"
                          onClick={() => void openPayment(o.orderId)}
                        >
                          {I.cash} Abono
                        </button>
                      )}
                      {canSendReminder && (
                        <button
                          className="btn btn--sm btn--ghost"
                          type="button"
                          onClick={() =>
                            setReminderTarget({
                              kind: "order",
                              orderId: o.orderId,
                              clientId: o.clientId,
                              clientName: o.clientName,
                              folio: o.folio,
                              balance: o.balance,
                            })
                          }
                        >
                          {I.mail} Recordatorio
                        </button>
                      )}
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
              ? "Sin registros"
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

      {payTarget && (
        <OrderPaymentModal
          order={payTarget}
          onClose={() => setPayTarget(null)}
          onDone={afterPayment}
        />
      )}

      {reminderTarget && (
        <CollectionReminderModal
          target={reminderTarget}
          onClose={() => setReminderTarget(null)}
          onSent={(res) => {
            setReminderTarget(null);
            setNotice(`Recordatorio enviado a ${res.sentTo}.`);
          }}
        />
      )}
    </>
  );
}

function KpiCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "danger";
}) {
  return (
    <div className="card" style={{ padding: "10px 14px" }}>
      <div className="text-muted text-[11px]">{label}</div>
      <div
        className="num"
        style={{
          fontSize: 17,
          fontWeight: 600,
          color: tone === "danger" ? "var(--danger)" : undefined,
        }}
      >
        {value}
      </div>
    </div>
  );
}
