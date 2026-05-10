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
      <div className="flex items-center gap-2.5 mb-2 text-[13px]">
        <Link className="btn btn--ghost btn--sm" href="/orders">
          {I.arrowLeft} Pedidos
        </Link>
        <span className="num text-muted">{order.id}</span>
      </div>

      <PageHeader
        title={
          <>
            Pedido{" "}
            <span className="num font-mono">{order.id}</span>
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

      <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 320px" }}>
        <div className="grid gap-5">
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
                  <th className="text-right">Cant.</th>
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
                      <div className="flex items-center gap-2.5">
                        <div className="skeleton-img text-[9px]" style={{ width: 36, height: 36 }}>
                          v{j.version}
                        </div>
                        <div>
                          <div className="font-medium">{j.product}</div>
                          <div className="text-muted text-[11px] font-mono">{j.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="num text-right">{j.qty}</td>
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
              <div className="relative pl-6">
                <div
                  className="absolute bg-line"
                  style={{ left: 9, top: 6, bottom: 6, width: 1 }}
                />
                {timeline.map((t, i) => (
                  <div key={i} className="relative mb-3.5">
                    <div
                      className="absolute rounded-full bg-surface border border-line text-muted grid place-items-center"
                      style={{ left: -19, top: 2, width: 18, height: 18 }}
                    >
                      <span className="block" style={{ width: 12, height: 12 }}>{t.icon}</span>
                    </div>
                    <div className="text-[13px]">
                      <strong>{t.label}</strong>
                      <span className="text-muted ml-2 font-mono text-[11px]">
                        {t.date} · {t.time}
                      </span>
                    </div>
                    <div className="text-muted text-xs">{t.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-5 content-start">
          <div className="card">
            <div className="card__body">
              <div className="text-[11px] text-muted uppercase" style={{ letterSpacing: ".06em" }}>
                Total del pedido
              </div>
              <div
                className="font-semibold"
                style={{
                  fontSize: 28,
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: "-.01em",
                }}
              >
                {fmtMXN(order.total)}
              </div>
              <div className="mt-3">
                <SummaryRow label="Pagado" value={fmtMXN(order.paid)} />
                <SummaryRow label="Por cobrar" value={fmtMXN(pending)} muted={pending === 0} />
                <SummaryRow label="Método" value={order.payment} mono={false} />
              </div>
              {pending > 0 && (
                <button
                  className="btn btn--accent w-full justify-center mt-2.5"
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
            <div className="card__body flex gap-2.5">
              <Avatar name={order.client} size={36} />
              <div className="flex-1 min-w-0">
                <div className="font-medium">{order.client}</div>
                <div className="text-muted text-xs">
                  {client ? `${client.orders} pedidos` : "Cliente"}
                  {client?.tags.includes("Frecuente") && " · cliente frecuente"}
                </div>
              </div>
            </div>
            <div className="divider m-0" />
            <div className="px-3.5 py-2.5 flex gap-1.5 flex-wrap">
              <button className="btn btn--sm">{I.mail} Correo</button>
              <button className="btn btn--sm">{I.whatsapp} WhatsApp</button>
              <button className="btn btn--sm">{I.link} Portal</button>
            </div>
          </div>

          <div className="card">
            <div className="card__head">
              <div className="card__title">Equipo asignado</div>
            </div>
            <div className="card__body p-0">
              {TEAM.map((m, i, a) => (
                <div
                  key={m.name}
                  className="px-3.5 py-2.5 flex items-center gap-2.5"
                  style={{
                    borderBottom: i < a.length - 1 ? "1px solid var(--line)" : 0,
                  }}
                >
                  <Avatar name={m.name} size={24} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium">{m.name}</div>
                    <div className="text-muted text-[11px]">{m.role}</div>
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

