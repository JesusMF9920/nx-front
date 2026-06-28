"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { clientCollectionsApi } from "@/lib/api/client-portal/collections";
import type {
  ClientDebtSummary,
  ClientReceivableOrder,
} from "@/lib/api/client-portal/types";
import { useClientAuth } from "@/lib/auth/client-auth-context";
import { fmtDate, fmtMXN } from "@/lib/format";
import { PortalNav } from "../portal-nav";

export default function PortalAdeudosPage() {
  const router = useRouter();
  const { status } = useClientAuth();

  const [summary, setSummary] = useState<ClientDebtSummary | null>(null);
  const [orders, setOrders] = useState<ClientReceivableOrder[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/portal/entrar");
  }, [status, router]);

  const load = useCallback(async () => {
    try {
      const [s, list] = await Promise.all([
        clientCollectionsApi.summary(),
        clientCollectionsApi.list({ take: 50 }),
      ]);
      setSummary(s);
      setOrders(list.items);
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
      <h1 className="text-xl font-semibold">Mis adeudos</h1>
      <PortalNav active="adeudos" />

      {error && (
        <p className="text-sm text-[var(--danger,#c0392b)]">
          No pudimos cargar tus adeudos. Recarga la página.
        </p>
      )}

      {summary && (
        <section className="mb-6 rounded-xl border border-[var(--border)] p-4">
          <p className="text-sm opacity-70">Saldo total</p>
          <p className="text-2xl font-semibold">
            {fmtMXN(summary.totalBalance)}
          </p>
          {summary.overdueBalance > 0 && (
            <p className="mt-1 text-sm text-[var(--danger,#c0392b)]">
              {fmtMXN(summary.overdueBalance)} vencido
            </p>
          )}
        </section>
      )}

      {orders && orders.length === 0 && (
        <p className="text-sm opacity-70">No tienes adeudos pendientes. 🎉</p>
      )}

      <ul className="space-y-3">
        {orders?.map((o) => (
          <li
            key={o.folio}
            className="rounded-xl border border-[var(--border)] p-4"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{o.folio}</span>
              <span className="font-medium text-[var(--danger,#c0392b)]">
                {fmtMXN(o.balance)}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-sm opacity-70">
              <span>Vence {fmtDate(o.dueDate)}</span>
              <span>
                {o.ageDays > 0
                  ? `${o.ageDays} día${o.ageDays === 1 ? "" : "s"} vencido`
                  : "Al corriente"}
              </span>
            </div>
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
