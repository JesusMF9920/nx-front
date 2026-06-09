"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { I } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { SalesChart } from "@/components/sales-chart";
import { StatusPill } from "@/components/status-pill";
import { ApiError } from "@/lib/api/errors";
import { reportsApi } from "@/lib/api/reports";
import { ORDER_STATUS_ES } from "@/lib/api/sales-mappers";
import type { ApiDashboard } from "@/lib/api/types";
import { useAuth, usePermission } from "@/lib/auth/auth-context";
import { fmtDate, fmtMXN } from "@/lib/format";

type Stat = {
  label: string;
  value: string;
  delta: string;
  up: boolean | null;
};

export default function DashboardPage() {
  const { user } = useAuth();
  const canRead = usePermission("reports.read");
  const firstName = (user?.name ?? "").split(" ")[0] || "tú";

  const [data, setData] = useState<ApiDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canRead) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await reportsApi.dashboard();
        if (!cancelled) setData(res);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : "No se pudo cargar el dashboard.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canRead]);

  const header = (
    <PageHeader
      title={`Buen día, ${firstName}`}
      sub="Resumen de operación · Imprenta Centro"
      actions={
        <Link className="btn btn--accent" href="/pos">
          <span>{I.plus}</span>Nueva venta
          <span
            className="kbd ml-1"
            style={{ background: "rgba(255,255,255,.15)", color: "white", border: 0 }}
          >
            F2
          </span>
        </Link>
      }
    />
  );

  if (!canRead) {
    return (
      <>
        {header}
        <div className="empty m-3.5">
          No tienes acceso a las métricas. Ve al{" "}
          <Link href="/pos" className="text-accent">
            punto de venta
          </Link>{" "}
          o a{" "}
          <Link href="/orders" className="text-accent">
            pedidos
          </Link>
          .
        </div>
      </>
    );
  }

  const stats: Stat[] = data
    ? [
        { label: "Ventas hoy", value: fmtMXN(data.salesToday), delta: "del día", up: true },
        { label: "Pedidos abiertos", value: `${data.openOrders}`, delta: "en proceso", up: null },
        { label: "Entregas próximas", value: `${data.upcomingDeliveries}`, delta: "Esta semana", up: null },
        {
          label: "Por aprobar (cliente)",
          value: `${data.pendingApprovals}`,
          delta: "esperando visto bueno",
          up: data.pendingApprovals > 0 ? false : null,
        },
      ]
    : [];

  return (
    <>
      {header}

      {error && (
        <div
          className="mb-3 text-[13px]"
          style={{
            padding: 10,
            border: "1px solid var(--danger)",
            color: "var(--danger)",
            background: "var(--danger-soft)",
            borderRadius: 8,
          }}
          role="alert"
        >
          {error}
        </div>
      )}

      {loading || !data ? (
        <div className="text-muted text-sm">Cargando dashboard…</div>
      ) : (
        <>
          <div className="grid mb-5" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
            {stats.map((s) => (
              <div className="stat" key={s.label}>
                <div className="stat__label">{s.label}</div>
                <div className="stat__value">{s.value}</div>
                <div
                  className="stat__delta"
                  style={{
                    color: s.up === true ? "var(--ok)" : s.up === false ? "var(--danger)" : "var(--muted)",
                  }}
                >
                  {s.delta}
                </div>
              </div>
            ))}
          </div>

          <div className="grid mb-5" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
            <div className="card">
              <div className="card__head">
                <div>
                  <div className="card__title">Ventas por día</div>
                  <div className="card__sub">Últimos 14 días</div>
                </div>
                <div className="spacer" />
                <Link className="btn btn--ghost btn--sm" href="/reports">
                  Ver reportes {I.chevronRight}
                </Link>
              </div>
              <div className="card__body">
                <SalesChart data={data.salesSeries} />
              </div>
            </div>

            <div className="card">
              <div className="card__head">
                <div>
                  <div className="card__title">Entregas próximas</div>
                  <div className="card__sub">Hoy</div>
                </div>
                <div className="spacer" />
                <Link className="btn btn--ghost btn--sm" href="/calendar">
                  Ver calendario {I.chevronRight}
                </Link>
              </div>
              <div className="card__body p-0">
                {data.todayDeliveries.length === 0 && (
                  <div className="empty m-3.5">Sin entregas programadas hoy.</div>
                )}
                {data.todayDeliveries.map((d, i) => (
                  <div
                    key={d.orderId}
                    className="flex items-center gap-2.5 px-4 py-3"
                    style={{
                      borderBottom:
                        i < data.todayDeliveries.length - 1 ? "1px solid var(--line)" : "none",
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-[13px]">{d.clientName}</div>
                      <div className="text-muted text-xs whitespace-nowrap overflow-hidden text-ellipsis">
                        {d.folio} · {d.itemsCount} art.
                      </div>
                    </div>
                    <StatusPill s={ORDER_STATUS_ES[d.status]} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
            <div className="card">
              <div className="card__head">
                <div className="card__title">Pedidos recientes</div>
                <div className="spacer" />
                <Link className="btn btn--ghost btn--sm" href="/orders">
                  Ver todos {I.chevronRight}
                </Link>
              </div>
              {data.recentOrders.length === 0 ? (
                <div className="empty m-3.5">Sin pedidos aún.</div>
              ) : (
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Pedido</th>
                      <th>Cliente</th>
                      <th className="text-right">Total</th>
                      <th>Estatus</th>
                      <th>Entrega</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentOrders.map((o) => (
                      <tr key={o.orderId}>
                        <td className="num">{o.folio}</td>
                        <td>{o.clientName}</td>
                        <td className="num text-right">{fmtMXN(o.total)}</td>
                        <td>
                          <StatusPill s={ORDER_STATUS_ES[o.status]} />
                        </td>
                        <td className="num">{o.deliverAt ? fmtDate(o.deliverAt) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="card">
              <div className="card__head">
                <div className="card__title">Aprobaciones pendientes</div>
                <div className="spacer" />
                <Link className="btn btn--ghost btn--sm" href="/approvals">
                  Ver todas {I.chevronRight}
                </Link>
              </div>
              <div className="card__body">
                {data.pendingApprovals === 0 ? (
                  <div className="empty">Sin aprobaciones pendientes.</div>
                ) : (
                  <Link href="/approvals" className="no-underline text-inherit">
                    <div className="flex items-center gap-3">
                      <div className="skeleton-img w-11 h-11 text-[9px]">!</div>
                      <div>
                        <div className="font-medium text-[13px]">
                          {data.pendingApprovals} pedido
                          {data.pendingApprovals === 1 ? "" : "s"} esperando aprobación del cliente
                        </div>
                        <div className="text-muted text-xs">Revisar y dar seguimiento</div>
                      </div>
                    </div>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
