"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { clientOrdersApi } from "@/lib/api/client-portal/orders";
import type { ClientOrderListItem } from "@/lib/api/client-portal/types";
import { useClientAuth } from "@/lib/auth/client-auth-context";
import { fmtDate, fmtMXN } from "@/lib/format";
import { PortalNav } from "./portal-nav";
import { StatusBadge } from "./status-badge";

export default function PortalOrdersPage() {
  const router = useRouter();
  const { status, client, logout } = useClientAuth();

  const [orders, setOrders] = useState<ClientOrderListItem[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/portal/entrar");
  }, [status, router]);

  const load = useCallback(async () => {
    try {
      const res = await clientOrdersApi.list({ take: 50 });
      setOrders(res.items);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    void (async () => {
      await load();
    })();
  }, [status, load]);

  if (status !== "authenticated") {
    return <Centered>Cargando…</Centered>;
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">Mis pedidos</h1>
          {client && (
            <p className="text-sm opacity-70">Hola, {client.name}</p>
          )}
        </div>
        <button
          onClick={() => void logout().then(() => router.replace("/portal/entrar"))}
          className="text-sm opacity-70 underline-offset-2 hover:underline"
        >
          Salir
        </button>
      </header>

      <PortalNav active="pedidos" />

      {error && (
        <p className="text-sm text-[var(--danger,#c0392b)]">
          No pudimos cargar tus pedidos. Recarga la página.
        </p>
      )}

      {orders && orders.length === 0 && (
        <p className="text-sm opacity-70">Aún no tienes pedidos registrados.</p>
      )}

      <ul className="space-y-3">
        {orders?.map((o) => (
          <li key={o.id}>
            <Link
              href={`/portal/pedidos/${o.folio}`}
              className="block rounded-xl border border-[var(--border)] p-4 transition hover:border-[var(--accent,#1f6feb)]"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{o.folio}</span>
                <StatusBadge status={o.status} />
              </div>
              <div className="mt-2 flex items-center justify-between text-sm opacity-80">
                <span>
                  {o.itemsCount} artículo{o.itemsCount === 1 ? "" : "s"} ·{" "}
                  {fmtDate(o.createdAt)}
                </span>
                <span>
                  {o.balance > 0 ? (
                    <span className="font-medium text-[var(--danger,#c0392b)]">
                      Debes {fmtMXN(o.balance)}
                    </span>
                  ) : (
                    <span className="opacity-70">Pagado</span>
                  )}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center text-sm opacity-70">
      {children}
    </main>
  );
}
