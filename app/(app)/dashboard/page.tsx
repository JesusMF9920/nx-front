"use client";

import Link from "next/link";
import { ApprovalPill } from "@/components/approval-pill";
import { I } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { SalesChart } from "@/components/sales-chart";
import { StatusPill } from "@/components/status-pill";
import { fmtDate, fmtMXN } from "@/lib/format";
import { useAuth } from "@/lib/auth/auth-context";
import { NEXUM_APPROVALS, NEXUM_DELIVERIES_BY_DAY, NEXUM_ORDERS } from "@/lib/mock-orders";

const TODAY_KEY = "2026-05-08";
const TODAY_DISPLAY = "Viernes 8 de mayo";
const HEADER_DATE = "Miércoles 6 de mayo · Mostrador 01 · Imprenta Centro";

type Stat = {
  label: string;
  value: string;
  delta: string;
  up: boolean | null;
  sub?: string;
};

const STATS: Stat[] = [
  { label: "Ventas hoy",            value: fmtMXN(18420), delta: "+12.4%",            up: true,  sub: "vs. ayer" },
  { label: "Pedidos abiertos",      value: "23",          delta: "8 con proveedor",   up: null },
  { label: "Entregas próximas",     value: "8",           delta: "Esta semana",       up: null },
  { label: "Por aprobar (cliente)", value: "5",           delta: "2 con > 24 h",      up: false },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const firstName = (user?.name ?? "").split(" ")[0] || "tú";
  const recent = NEXUM_ORDERS.slice(0, 6);
  const todayDeliveries = NEXUM_DELIVERIES_BY_DAY[TODAY_KEY] ?? [];
  const pendingApprovals = NEXUM_APPROVALS.filter((a) => a.status !== "Aprobado").slice(0, 4);

  return (
    <>
      <PageHeader
        title={`Buen día, ${firstName}`}
        sub={HEADER_DATE}
        actions={
          <>
            <button className="btn">
              <span>{I.printer}</span>Cierre del día
            </button>
            <Link className="btn btn--accent" href="/pos">
              <span>{I.plus}</span>Nueva venta
              <span
                className="kbd ml-1"
                style={{ background: "rgba(255,255,255,.15)", color: "white", border: 0 }}
              >
                F2
              </span>
            </Link>
          </>
        }
      />

      <div className="grid mb-5" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        {STATS.map((s) => (
          <div className="stat" key={s.label}>
            <div className="stat__label">{s.label}</div>
            <div className="stat__value">{s.value}</div>
            <div
              className="stat__delta"
              style={{
                color:
                  s.up === true ? "var(--ok)" : s.up === false ? "var(--danger)" : "var(--muted)",
              }}
            >
              {s.delta}
              {s.sub && <span className="text-muted"> · {s.sub}</span>}
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
            <button className="btn btn--sm">Esta semana</button>
            <button className="btn btn--sm">Este mes</button>
          </div>
          <div className="card__body">
            <SalesChart />
          </div>
        </div>

        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__title">Entregas próximas</div>
              <div className="card__sub">{TODAY_DISPLAY}</div>
            </div>
            <div className="spacer" />
            <Link className="btn btn--ghost btn--sm" href="/calendar">
              Ver calendario {I.chevronRight}
            </Link>
          </div>
          <div className="card__body p-0">
            {todayDeliveries.length === 0 && (
              <div className="empty m-3.5">Sin entregas programadas.</div>
            )}
            {todayDeliveries.map((d, i) => (
              <div
                key={d.id}
                className="flex items-center gap-2.5 px-4 py-3"
                style={{
                  borderBottom: i < todayDeliveries.length - 1 ? "1px solid var(--line)" : "none",
                }}
              >
                <div className="w-11 text-center font-mono text-[13px] text-ink-2">
                  {d.time}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[13px]">{d.client}</div>
                  <div className="text-muted text-xs whitespace-nowrap overflow-hidden text-ellipsis">
                    {d.id} · {d.items}
                  </div>
                </div>
                <StatusPill s={d.status} supplier={d.supplier} />
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
              {recent.map((o) => (
                <tr key={o.id}>
                  <td className="num">{o.id}</td>
                  <td>{o.client}</td>
                  <td className="num text-right">{fmtMXN(o.total)}</td>
                  <td>
                    <StatusPill s={o.status} />
                  </td>
                  <td className="num">{fmtDate(o.deliver)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="card__head">
            <div className="card__title">Aprobaciones pendientes</div>
            <div className="spacer" />
            <Link className="btn btn--ghost btn--sm" href="/approvals">
              Ver todas {I.chevronRight}
            </Link>
          </div>
          <div className="card__body p-0">
            {pendingApprovals.map((a, i, arr) => (
              <Link
                key={a.id}
                href="/approvals"
                className="flex gap-3 px-4 py-3 no-underline text-inherit"
                style={{
                  borderBottom: i < arr.length - 1 ? "1px solid var(--line)" : "none",
                }}
              >
                <div className="skeleton-img w-11 h-11 text-[9px]">
                  v{a.version}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[13px]">{a.product}</div>
                  <div className="text-muted text-xs">
                    {a.client} · {a.order}
                  </div>
                  <div className="mt-1 flex gap-1.5">
                    <span className="tag">{a.channel}</span>
                    <span className="tag">v{a.version}</span>
                  </div>
                </div>
                <div className="self-start">
                  <ApprovalPill s={a.status} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
