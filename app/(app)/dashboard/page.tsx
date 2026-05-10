import Link from "next/link";
import { ApprovalPill } from "@/components/approval-pill";
import { I } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { SalesChart } from "@/components/sales-chart";
import { StatusPill } from "@/components/status-pill";
import { fmtDate, fmtMXN } from "@/lib/format";
import { CURRENT_USER } from "@/lib/mock-users";
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
  const firstName = CURRENT_USER.name.split(" ")[0];
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
                className="kbd"
                style={{ background: "rgba(255,255,255,.15)", color: "white", border: 0, marginLeft: 4 }}
              >
                F2
              </span>
            </Link>
          </>
        }
      />

      <div className="grid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginBottom: 20 }}>
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
              {s.sub && <span style={{ color: "var(--muted)" }}> · {s.sub}</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1.4fr 1fr", marginBottom: 20 }}>
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
          <div className="card__body" style={{ padding: 0 }}>
            {todayDeliveries.length === 0 && (
              <div className="empty" style={{ margin: 14 }}>
                Sin entregas programadas.
              </div>
            )}
            {todayDeliveries.map((d, i) => (
              <div
                key={d.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 16px",
                  borderBottom: i < todayDeliveries.length - 1 ? "1px solid var(--line)" : "none",
                }}
              >
                <div
                  style={{
                    width: 44,
                    textAlign: "center",
                    fontFamily: "var(--font-mono)",
                    fontSize: 13,
                    color: "var(--ink-2)",
                  }}
                >
                  {d.time}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{d.client}</div>
                  <div
                    style={{
                      color: "var(--muted)",
                      fontSize: 12,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
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
                <th style={{ textAlign: "right" }}>Total</th>
                <th>Estatus</th>
                <th>Entrega</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((o) => (
                <tr key={o.id}>
                  <td className="num">{o.id}</td>
                  <td>{o.client}</td>
                  <td className="num" style={{ textAlign: "right" }}>
                    {fmtMXN(o.total)}
                  </td>
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
          <div className="card__body" style={{ padding: 0 }}>
            {pendingApprovals.map((a, i, arr) => (
              <Link
                key={a.id}
                href="/approvals"
                style={{
                  display: "flex",
                  gap: 12,
                  padding: "12px 16px",
                  borderBottom: i < arr.length - 1 ? "1px solid var(--line)" : "none",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div className="skeleton-img" style={{ width: 44, height: 44, fontSize: 9 }}>
                  v{a.version}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{a.product}</div>
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>
                    {a.client} · {a.order}
                  </div>
                  <div style={{ marginTop: 4, display: "flex", gap: 6 }}>
                    <span className="tag">{a.channel}</span>
                    <span className="tag">v{a.version}</span>
                  </div>
                </div>
                <div style={{ alignSelf: "flex-start" }}>
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
