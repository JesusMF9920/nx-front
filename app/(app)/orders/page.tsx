"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { I } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { PaymentPill } from "@/components/payment-pill";
import { StatusPill } from "@/components/status-pill";
import { fmtDate, fmtMXN } from "@/lib/format";
import { NEXUM_ORDERS } from "@/lib/mock-orders";
import type { Order, OrderStatus } from "@/lib/types";

type Tab = "Todos" | "Diseño" | "Aprobación" | "Producción" | "Listos" | "Entregados";

const TABS: Tab[] = ["Todos", "Diseño", "Aprobación", "Producción", "Listos", "Entregados"];

const TAB_TO_STATUS: Record<Tab, OrderStatus | null> = {
  Todos: null,
  Diseño: "En diseño",
  Aprobación: "Aprobación cliente",
  Producción: "Producción",
  Listos: "Listo para entrega",
  Entregados: "Entregado",
};

export default function OrdersPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("Todos");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const status = TAB_TO_STATUS[tab];
    return NEXUM_ORDERS.filter((o: Order) => {
      if (status && o.status !== status) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return o.id.toLowerCase().includes(q) || o.client.toLowerCase().includes(q);
    });
  }, [tab, query]);

  const openCount = NEXUM_ORDERS.filter((o) => o.status !== "Entregado").length;

  return (
    <>
      <PageHeader
        title="Pedidos"
        sub={`${NEXUM_ORDERS.length} pedidos · ${openCount} abiertos`}
        actions={
          <>
            <button className="btn">{I.download} Exportar</button>
            <Link className="btn btn--accent" href="/pos">
              {I.plus} Nueva venta
            </Link>
          </>
        }
      />

      <div className="card">
        <div className="card__head" style={{ gap: 4 }}>
          {TABS.map((t) => (
            <button
              key={t}
              className={`btn btn--sm ${tab === t ? "btn--primary" : "btn--ghost"}`}
              onClick={() => setTab(t)}
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
            {filtered.map((o) => (
              <tr key={o.id} onClick={() => router.push(`/orders/${o.id}`)}>
                <td className="num">{o.id}</td>
                <td>{o.client}</td>
                <td className="num" style={{ textAlign: "right" }}>{o.items}</td>
                <td><PaymentPill method={o.payment} /></td>
                <td className="num" style={{ textAlign: "right" }}>{fmtMXN(o.total)}</td>
                <td><StatusPill s={o.status} /></td>
                <td className="num">{fmtDate(o.deliver)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
