"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { SkeletonText } from "@/components/skeleton";
import { clientsApi } from "@/lib/api/clients";
import { catalogApi } from "@/lib/api/catalog";
import { ordersApi } from "@/lib/api/orders";
import { quotesApi } from "@/lib/api/quotes";
import { suppliersApi } from "@/lib/api/suppliers";
import { usePermission } from "@/lib/auth/auth-context";
import type {
  ApiClient,
  ApiOrder,
  ApiProduct,
  ApiQuote,
  ApiSupplier,
} from "@/lib/api/types";
import { fmtMXN } from "@/lib/format";

const TAKE = 6;

export default function BuscarPage() {
  return (
    <Suspense fallback={<div className="text-muted text-sm">Cargando…</div>}>
      <BuscarResults />
    </Suspense>
  );
}

function BuscarResults() {
  const params = useSearchParams();
  const q = (params.get("q") ?? "").trim();
  const canClients = usePermission("clients.read");
  const canProducts = usePermission("catalog.products.read");
  const canOrders = usePermission("sales.orders.read");
  const canQuotes = usePermission("sales.quotes.read");
  const canSuppliers = usePermission("suppliers.read");

  const [clients, setClients] = useState<ApiClient[]>([]);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [quotes, setQuotes] = useState<ApiQuote[]>([]);
  const [suppliers, setSuppliers] = useState<ApiSupplier[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (q.length === 0) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    void (async () => {
      const [c, p, o, qz, s] = await Promise.all([
        canClients
          ? clientsApi.list({ search: q, take: TAKE }).then((r) => r.items).catch(() => [])
          : Promise.resolve<ApiClient[]>([]),
        canProducts
          ? catalogApi.list({ search: q, take: TAKE }).then((r) => r.items).catch(() => [])
          : Promise.resolve<ApiProduct[]>([]),
        canOrders
          ? ordersApi.list({ search: q, take: TAKE }).then((r) => r.items).catch(() => [])
          : Promise.resolve<ApiOrder[]>([]),
        canQuotes
          ? quotesApi.list({ search: q, take: TAKE }).then((r) => r.items).catch(() => [])
          : Promise.resolve<ApiQuote[]>([]),
        canSuppliers
          ? suppliersApi.list({ search: q, take: TAKE }).then((r) => r.items).catch(() => [])
          : Promise.resolve<ApiSupplier[]>([]),
      ]);
      if (cancelled) return;
      setClients(c);
      setProducts(p);
      setOrders(o);
      setQuotes(qz);
      setSuppliers(s);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [q, canClients, canProducts, canOrders, canQuotes, canSuppliers]);

  const totalResults =
    clients.length +
    products.length +
    orders.length +
    quotes.length +
    suppliers.length;

  return (
    <>
      <PageHeader
        title="Búsqueda"
        sub={q ? `Resultados para “${q}”` : "Escribe en el buscador para empezar"}
      />

      {q.length === 0 ? (
        <div className="empty m-3.5">
          Usa el buscador de arriba (⌘K) para encontrar pedidos, clientes y productos.
        </div>
      ) : loading ? (
        <SkeletonText lines={5} />
      ) : totalResults === 0 ? (
        <div className="empty m-3.5">Sin resultados para “{q}”.</div>
      ) : (
        <div className="flex flex-col gap-5">
          {orders.length > 0 && (
            <section className="card">
              <div className="card__head">
                <div className="card__title">Pedidos</div>
              </div>
              <div className="flex flex-col">
                {orders.map((o) => (
                  <Link
                    key={o.id}
                    href={`/orders/${o.folio}`}
                    className="flex items-center gap-3"
                    style={{
                      padding: "10px 14px",
                      borderTop: "1px solid var(--line)",
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <span className="num">{o.folio}</span>
                    <span className="flex-1">{o.clientName}</span>
                    <span className="num">{fmtMXN(o.total)}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {quotes.length > 0 && (
            <section className="card">
              <div className="card__head">
                <div className="card__title">Cotizaciones</div>
              </div>
              <div className="flex flex-col">
                {quotes.map((qz) => (
                  <Link
                    key={qz.id}
                    href={`/quotes/${qz.folio}`}
                    className="flex items-center gap-3"
                    style={{
                      padding: "10px 14px",
                      borderTop: "1px solid var(--line)",
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <span className="num">{qz.folio}</span>
                    <span className="flex-1">{qz.clientName}</span>
                    <span className="num">{fmtMXN(qz.total)}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {clients.length > 0 && (
            <section className="card">
              <div className="card__head">
                <div className="card__title">Clientes</div>
              </div>
              <div className="flex flex-col">
                {clients.map((c) => (
                  <Link
                    key={c.id}
                    href={`/clients?cliente=${c.id}`}
                    className="flex items-center gap-3"
                    style={{
                      padding: "10px 14px",
                      borderTop: "1px solid var(--line)",
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <span className="flex-1 font-medium">{c.name}</span>
                    <span className="text-muted text-xs">{c.phone ?? "—"}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {products.length > 0 && (
            <section className="card">
              <div className="card__head">
                <div className="card__title">Productos</div>
              </div>
              <div className="flex flex-col">
                {products.map((p) => (
                  <Link
                    key={p.id}
                    href={`/products/${p.id}`}
                    className="flex items-center gap-3"
                    style={{
                      padding: "10px 14px",
                      borderTop: "1px solid var(--line)",
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <span className="num text-xs text-muted">{p.sku}</span>
                    <span className="flex-1">{p.name}</span>
                    <span className="num">{fmtMXN(p.price)}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {suppliers.length > 0 && (
            <section className="card">
              <div className="card__head">
                <div className="card__title">Proveedores</div>
              </div>
              <div className="flex flex-col">
                {suppliers.map((s) => (
                  <Link
                    key={s.id}
                    href={`/suppliers?proveedor=${s.id}`}
                    className="flex items-center gap-3"
                    style={{
                      padding: "10px 14px",
                      borderTop: "1px solid var(--line)",
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <span className="flex-1 font-medium">{s.name}</span>
                    <span className="text-muted text-xs">
                      {s.service ?? s.phone ?? "—"}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}
