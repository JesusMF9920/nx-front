"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { clientOrdersApi } from "@/lib/api/client-portal/orders";
import type { ClientOrderDetail } from "@/lib/api/client-portal/types";
import { ORDER_STATUS_ES } from "@/lib/api/sales-mappers";
import { useClientAuth } from "@/lib/auth/client-auth-context";
import { fmtDate, fmtMXN } from "@/lib/format";
import { StatusBadge } from "../../status-badge";

export default function PortalOrderDetailPage() {
  const router = useRouter();
  const { idOrFolio } = useParams<{ idOrFolio: string }>();
  const { status } = useClientAuth();

  const [order, setOrder] = useState<ClientOrderDetail | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/portal/entrar");
  }, [status, router]);

  const load = useCallback(async () => {
    try {
      setOrder(await clientOrdersApi.get(idOrFolio));
    } catch {
      setNotFound(true);
    }
  }, [idOrFolio]);

  useEffect(() => {
    if (status !== "authenticated") return;
    void (async () => {
      await load();
    })();
  }, [status, load]);

  if (status !== "authenticated") {
    return <Centered>Cargando…</Centered>;
  }

  if (notFound) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <BackLink />
        <p className="mt-6 text-sm opacity-70">
          No encontramos ese pedido.
        </p>
      </main>
    );
  }

  if (!order) return <Centered>Cargando…</Centered>;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <BackLink />
      <header className="mt-4 mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">{order.folio}</h1>
        <StatusBadge status={order.status} />
      </header>

      <section className="rounded-xl border border-[var(--border)] divide-y divide-[var(--border)]">
        {order.items.map((it, i) => (
          <div key={i} className="flex items-start justify-between p-4">
            <div>
              <p className="font-medium">{it.productName}</p>
              <p className="text-sm opacity-70">
                {it.qty} ×{it.variantLabel ? ` ${it.variantLabel}` : ""}
              </p>
            </div>
            <span className="text-sm">{fmtMXN(it.lineTotal)}</span>
          </div>
        ))}
      </section>

      <section className="mt-4 space-y-1 text-sm">
        <Row label="Subtotal" value={fmtMXN(order.subtotal)} />
        {order.discount > 0 && (
          <Row label="Descuento" value={`− ${fmtMXN(order.discount)}`} />
        )}
        <Row label="Impuestos" value={fmtMXN(order.tax)} />
        <Row label="Total" value={fmtMXN(order.total)} strong />
        <Row label="Pagado" value={fmtMXN(order.paid)} />
        <Row
          label="Saldo"
          value={fmtMXN(order.balance)}
          strong
          danger={order.balance > 0}
        />
      </section>

      {order.payments.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-medium opacity-80">Pagos</h2>
          <ul className="space-y-1 text-sm opacity-80">
            {order.payments.map((p, i) => (
              <li key={i} className="flex justify-between">
                <span>{fmtDate(p.createdAt)}</span>
                <span>{fmtMXN(p.amount)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {order.deliverAt && (
        <p className="mt-6 text-sm opacity-70">
          Entrega estimada: {fmtDate(order.deliverAt)}
        </p>
      )}
      <p className="mt-1 text-xs opacity-50">
        Estado: {ORDER_STATUS_ES[order.status]}
      </p>
    </main>
  );
}

function Row({
  label,
  value,
  strong,
  danger,
}: {
  label: string;
  value: string;
  strong?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className="opacity-70">{label}</span>
      <span
        className={[
          strong ? "font-semibold" : "",
          danger ? "text-[var(--danger,#c0392b)]" : "",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/portal" className="text-sm opacity-70 hover:underline">
      ← Mis pedidos
    </Link>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center text-sm opacity-70">
      {children}
    </main>
  );
}
