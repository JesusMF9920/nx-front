"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { I } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { PriorityPill } from "@/components/priority-pill";
import { SalesChart } from "@/components/sales-chart";
import { SkeletonText } from "@/components/skeleton";
import { StatusPill } from "@/components/status-pill";
import { ApiError } from "@/lib/api/errors";
import { ordersApi } from "@/lib/api/orders";
import { reportsApi } from "@/lib/api/reports";
import { settingsApi } from "@/lib/api/settings";
import { ORDER_STATUS_ES } from "@/lib/api/sales-mappers";
import type {
  ApiDashboard,
  ApiOrderAlerts,
  ApiTeamWorkloadRow,
} from "@/lib/api/types";
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
  const canOrders = usePermission("sales.orders.read");
  const firstName = (user?.name ?? "").split(" ")[0] || "tú";

  const [data, setData] = useState<ApiDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<ApiOrderAlerts | null>(null);
  const [workload, setWorkload] = useState<ApiTeamWorkloadRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    settingsApi
      .getBusinessCached()
      .then((b) => {
        if (!cancelled) setOrgName(b.name);
      })
      .catch(() => {
        /* sin nombre si falla */
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

  useEffect(() => {
    if (!canOrders) return;
    let cancelled = false;
    void (async () => {
      try {
        const [a, w] = await Promise.all([
          ordersApi.alerts(),
          ordersApi.teamWorkload(),
        ]);
        if (!cancelled) {
          setAlerts(a);
          setWorkload(w.items);
        }
      } catch {
        /* sin bandeja si falla */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canOrders]);

  const alertsSection = canOrders && alerts && (
    <div className="mb-5">
      <div className="kpi-grid mb-3">
        <Link href="/board" className="stat no-underline text-inherit">
          <div className="stat__label">Sin responsable</div>
          <div className="stat__value">{alerts.unassigned}</div>
          <div className="stat__delta" style={{ color: "var(--warn)" }}>
            asignar en el tablero
          </div>
        </Link>
        <Link href="/board" className="stat no-underline text-inherit">
          <div className="stat__label">Vencidos</div>
          <div
            className="stat__value"
            style={{ color: alerts.overdue > 0 ? "var(--danger)" : undefined }}
          >
            {alerts.overdue}
          </div>
          <div className="stat__delta">entrega pasada</div>
        </Link>
        <Link href="/calendar" className="stat no-underline text-inherit">
          <div className="stat__label">Por vencer</div>
          <div className="stat__value">{alerts.dueSoon}</div>
          <div className="stat__delta">próximos 3 días</div>
        </Link>
      </div>

      <div className="card">
        <div className="card__head">
          <div className="card__title">Lo que me toca</div>
          <div className="spacer" />
          <span className="text-muted text-xs">{alerts.myDay.length}</span>
        </div>
        <div className="card__body p-0">
          {alerts.myDay.length === 0 ? (
            <div className="empty m-3.5">
              No tienes pedidos asignados. ¡Todo en orden!
            </div>
          ) : (
            alerts.myDay.map((o, i) => (
              <Link
                key={o.id}
                href={`/orders/${o.folio}`}
                className="flex items-center gap-2.5 px-4 py-3 no-underline text-inherit"
                style={{
                  borderBottom:
                    i < alerts.myDay.length - 1
                      ? "1px solid var(--line)"
                      : "none",
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[13px] flex items-center gap-1.5">
                    {o.clientName}
                    <PriorityPill priority={o.priority} />
                  </div>
                  <div className="text-muted text-xs">
                    {o.folio} · entrega{" "}
                    {o.deliverAt ? fmtDate(o.deliverAt) : "sin fecha"}
                  </div>
                </div>
                <StatusPill s={ORDER_STATUS_ES[o.status]} />
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );

  const workloadSection = canOrders && workload.length > 0 && (
    <div className="card mb-5">
      <div className="card__head">
        <div className="card__title">Carga del equipo</div>
        <div className="spacer" />
        <Link className="btn btn--ghost btn--sm" href="/board">
          Ver tablero {I.chevronRight}
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="tbl min-w-[420px]">
          <thead>
            <tr>
              <th>Responsable</th>
              <th className="text-right">Diseño</th>
              <th className="text-right">Producción</th>
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {workload.map((w) => (
              <tr key={w.personId}>
                <td>{w.personName}</td>
                <td className="num text-right">{w.asDesigner || "—"}</td>
                <td className="num text-right">{w.asProducer || "—"}</td>
                <td className="num text-right font-medium">
                  {w.asDesigner + w.asProducer}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const header = (
    <PageHeader
      title={`Buen día, ${firstName}`}
      sub={orgName ? `Resumen de operación · ${orgName}` : "Resumen de operación"}
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
        {alertsSection}
        {workloadSection}
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

  // Los deltas son etiquetas descriptivas neutras, NO tendencias: no se computa
  // variación vs. periodo anterior, así que no se pinta flecha verde/roja.
  const stats: Stat[] = data
    ? [
        { label: "Ventas hoy", value: fmtMXN(data.salesToday), delta: "del día", up: null },
        { label: "Pedidos abiertos", value: `${data.openOrders}`, delta: "en proceso", up: null },
        { label: "Entregas próximas", value: `${data.upcomingDeliveries}`, delta: "Esta semana", up: null },
        {
          label: "Por aprobar (cliente)",
          value: `${data.pendingApprovals}`,
          delta: "esperando visto bueno",
          up: null,
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

      {alertsSection}
      {workloadSection}

      {loading || !data ? (
        <SkeletonText lines={5} />
      ) : (
        <>
          <div className="kpi-grid mb-5">
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

          <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] mb-5">
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

          <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr]">
            <div className="card min-w-0">
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
                <div className="overflow-x-auto">
                <table className="tbl min-w-[560px]">
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
                </div>
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
