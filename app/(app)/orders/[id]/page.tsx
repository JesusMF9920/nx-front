import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Avatar } from "@/components/avatar";
import { I } from "@/components/icons";
import { OrderStatusBanner } from "@/components/order-status-banner";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { SummaryRow } from "@/components/summary-row";
import { fmtDate, fmtDateLong, fmtMXN } from "@/lib/format";
import { NEXUM_CLIENTS } from "@/lib/mock-clients";
import { NEXUM_ORDERS } from "@/lib/mock-orders";
import type { OrderStatus } from "@/lib/types";

export function generateStaticParams() {
  return NEXUM_ORDERS.map((o) => ({ id: o.id }));
}

type Job = {
  id: string;
  product: string;
  qty: number;
  source: "Interno" | "Proveedor";
  supplier: string | null;
  status: OrderStatus;
  version: number;
};

type TimelineEvent = {
  time: string;
  date: string;
  icon: ReactNode;
  label: string;
  sub: string;
};

const TEAM = [
  { name: "Diego Fuentes", role: "Cajero" },
  { name: "Alma Reyes",    role: "Diseñadora" },
  { name: "Rubén Ortega",  role: "Producción" },
];

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = NEXUM_ORDERS.find((o) => o.id === id);
  if (!order) notFound();

  const client = NEXUM_CLIENTS.find((c) => c.id === order.clientId);

  const jobs: Job[] = [
    { id: "JOB-1", product: "Playera blanca DTF",         qty: 40, source: "Interno",   supplier: null,                status: "En diseño",          version: 2 },
    { id: "JOB-2", product: "Vaso cerámico sublimado",    qty: 40, source: "Interno",   supplier: null,                status: "Aprobación cliente", version: 1 },
    { id: "JOB-3", product: "Lona 13oz frontlit (4×2 m)", qty: 8,  source: "Proveedor", supplier: "Lonas del Bajío",   status: "Con proveedor",      version: 1 },
  ];

  const timeline: TimelineEvent[] = [
    { time: "09:42", date: "06 may", icon: I.cart,    label: "Venta creada por Diego F.",            sub: `${fmtMXN(order.total)} · pago ${order.payment.toLowerCase()}` },
    { time: "09:43", date: "06 may", icon: I.printer, label: "Ticket impreso y enviado por correo", sub: client?.email ?? "—" },
    { time: "10:18", date: "06 may", icon: I.paint,   label: "Diseño v1 subido — Playera",          sub: "Por Alma R." },
    { time: "11:05", date: "06 may", icon: I.send,    label: "Diseño enviado al cliente",            sub: "Vía link del portal" },
  ];

  const pending = Math.max(0, order.total - order.paid);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, fontSize: 13 }}>
        <Link className="btn btn--ghost btn--sm" href="/orders">
          {I.arrowLeft} Pedidos
        </Link>
        <span className="num" style={{ color: "var(--muted)" }}>{order.id}</span>
      </div>

      <PageHeader
        title={
          <>
            Pedido{" "}
            <span className="num" style={{ fontFamily: "var(--font-mono)" }}>
              {order.id}
            </span>
          </>
        }
        sub={
          <>
            {order.client} · creado {fmtDateLong(order.date)}
          </>
        }
        actions={
          <>
            <button className="btn">{I.printer} Reimprimir ticket</button>
            <button className="btn">{I.mail} Enviar comprobante</button>
            <button className="btn btn--accent">{I.send} Notificar al cliente</button>
          </>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>
        <div className="grid" style={{ gap: 20 }}>
          <OrderStatusBanner status={order.status} />

          <div className="card">
            <div className="card__head">
              <div>
                <div className="card__title">Productos del pedido (jobs)</div>
                <div className="card__sub">Cada producto tiene su propio diseño y status.</div>
              </div>
              <div className="spacer" />
              <button className="btn btn--sm">{I.plus} Añadir job</button>
            </div>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Job</th>
                  <th style={{ textAlign: "right" }}>Cant.</th>
                  <th>Origen</th>
                  <th>Diseño</th>
                  <th>Status</th>
                  <th>Entrega</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id}>
                    <td>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <div className="skeleton-img" style={{ width: 36, height: 36, fontSize: 9 }}>
                          v{j.version}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500 }}>{j.product}</div>
                          <div style={{ color: "var(--muted)", fontSize: 11, fontFamily: "var(--font-mono)" }}>
                            {j.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="num" style={{ textAlign: "right" }}>{j.qty}</td>
                    <td>
                      {j.source === "Proveedor" && j.supplier ? (
                        <span className="pill pill--supplier">{j.supplier}</span>
                      ) : (
                        <span className="pill pill--neutral">Interno</span>
                      )}
                    </td>
                    <td>
                      <span className="tag">v{j.version}</span>
                    </td>
                    <td>
                      <StatusPill s={j.status} />
                    </td>
                    <td className="num">{fmtDate(order.deliver)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <div className="card__head">
              <div className="card__title">Actividad</div>
              <div className="spacer" />
              <button className="btn btn--ghost btn--sm">Filtros</button>
            </div>
            <div className="card__body">
              <div style={{ position: "relative", paddingLeft: 24 }}>
                <div
                  style={{
                    position: "absolute",
                    left: 9,
                    top: 6,
                    bottom: 6,
                    width: 1,
                    background: "var(--line)",
                  }}
                />
                {timeline.map((t, i) => (
                  <div key={i} style={{ position: "relative", marginBottom: 14 }}>
                    <div
                      style={{
                        position: "absolute",
                        left: -19,
                        top: 2,
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        background: "var(--surface)",
                        border: "1px solid var(--line)",
                        color: "var(--muted)",
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      <span style={{ width: 12, height: 12, display: "block" }}>{t.icon}</span>
                    </div>
                    <div style={{ fontSize: 13 }}>
                      <strong>{t.label}</strong>
                      <span
                        style={{
                          color: "var(--muted)",
                          marginLeft: 8,
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                        }}
                      >
                        {t.date} · {t.time}
                      </span>
                    </div>
                    <div style={{ color: "var(--muted)", fontSize: 12 }}>{t.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid" style={{ gap: 20, alignContent: "start" }}>
          <div className="card">
            <div className="card__body">
              <div
                style={{
                  fontSize: 11,
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: ".06em",
                }}
              >
                Total del pedido
              </div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 600,
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: "-.01em",
                }}
              >
                {fmtMXN(order.total)}
              </div>
              <div style={{ marginTop: 12 }}>
                <SummaryRow label="Pagado" value={fmtMXN(order.paid)} />
                <SummaryRow label="Por cobrar" value={fmtMXN(pending)} muted={pending === 0} />
                <SummaryRow label="Método" value={order.payment} mono={false} />
              </div>
              {pending > 0 && (
                <button
                  className="btn btn--accent"
                  style={{ width: "100%", justifyContent: "center", marginTop: 10 }}
                >
                  {I.cash} Registrar pago
                </button>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card__head">
              <div className="card__title">Cliente</div>
            </div>
            <div className="card__body" style={{ display: "flex", gap: 10 }}>
              <Avatar name={order.client} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500 }}>{order.client}</div>
                <div style={{ color: "var(--muted)", fontSize: 12 }}>
                  {client ? `${client.orders} pedidos` : "Cliente"}
                  {client?.tags.includes("Frecuente") && " · cliente frecuente"}
                </div>
              </div>
            </div>
            <div className="divider" style={{ margin: 0 }} />
            <div style={{ padding: "10px 14px", display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button className="btn btn--sm">{I.mail} Correo</button>
              <button className="btn btn--sm">{I.whatsapp} WhatsApp</button>
              <button className="btn btn--sm">{I.link} Portal</button>
            </div>
          </div>

          <div className="card">
            <div className="card__head">
              <div className="card__title">Equipo asignado</div>
            </div>
            <div className="card__body" style={{ padding: 0 }}>
              {TEAM.map((m, i, a) => (
                <div
                  key={m.name}
                  style={{
                    padding: "10px 14px",
                    borderBottom: i < a.length - 1 ? "1px solid var(--line)" : 0,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Avatar name={m.name} size={24} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{m.name}</div>
                    <div style={{ color: "var(--muted)", fontSize: 11 }}>{m.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

