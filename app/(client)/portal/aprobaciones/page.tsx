"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { clientApprovalsApi } from "@/lib/api/client-portal/approvals";
import type { ClientApprovalListItem } from "@/lib/api/client-portal/types";
import { useClientAuth } from "@/lib/auth/client-auth-context";
import { fmtDate } from "@/lib/format";
import { PortalNav } from "../portal-nav";

const STATUS_ES: Record<ClientApprovalListItem["status"], string> = {
  draft: "En preparación",
  awaiting_client: "Espera tu aprobación",
  changes_requested: "Cambios solicitados",
  approved: "Aprobado",
};

export default function PortalAprobacionesPage() {
  const router = useRouter();
  const { status } = useClientAuth();

  const [items, setItems] = useState<ClientApprovalListItem[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/portal/entrar");
  }, [status, router]);

  const load = useCallback(async () => {
    try {
      setItems(await clientApprovalsApi.list());
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
      <h1 className="text-xl font-semibold">Aprobaciones de diseño</h1>
      <PortalNav active="aprobaciones" />

      {error && (
        <p className="text-sm text-[var(--danger,#c0392b)]">
          No pudimos cargar tus diseños. Recarga la página.
        </p>
      )}

      {items && items.length === 0 && (
        <p className="text-sm opacity-70">No tienes diseños por revisar.</p>
      )}

      <ul className="space-y-3">
        {items?.map((it) => (
          <li key={it.id}>
            <Link
              href={`/portal/aprobaciones/${it.id}`}
              className={[
                "block rounded-xl border p-4 transition",
                it.needsDecision
                  ? "border-[var(--accent,#1f6feb)]"
                  : "border-[var(--border)] hover:border-[var(--accent,#1f6feb)]",
              ].join(" ")}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{it.productName}</span>
                <span className="text-xs opacity-70">{it.folio}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-sm">
                <span
                  className={
                    it.needsDecision
                      ? "font-medium text-[var(--accent,#1f6feb)]"
                      : "opacity-70"
                  }
                >
                  {STATUS_ES[it.status]}
                </span>
                {it.lastSentAt && (
                  <span className="opacity-60">
                    Enviado {fmtDate(it.lastSentAt)}
                  </span>
                )}
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
