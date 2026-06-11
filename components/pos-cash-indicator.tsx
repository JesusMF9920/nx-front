"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cashApi } from "@/lib/api/cash";
import { useFeature, usePermission } from "@/lib/auth/auth-context";
import { fmtMXN } from "@/lib/format";

const timeFmt = new Intl.DateTimeFormat("es-MX", { timeStyle: "short" });

/**
 * Estado de la caja en el header del POS (solo con el feature encendido).
 * Es un link a /cash — abrir, mover y cortar viven allá.
 */
export function PosCashIndicator() {
  const featureOn = useFeature("cash_sessions");
  const canRead = usePermission("sales.cash.read");
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "open"; folio: string; openedAt: string; openingFloat: number }
    | { kind: "closed" }
  >({ kind: "loading" });

  useEffect(() => {
    if (!featureOn || !canRead) return;
    let cancelled = false;
    cashApi
      .active()
      .then((s) => {
        if (cancelled) return;
        setState(
          s
            ? {
                kind: "open",
                folio: s.folio,
                openedAt: s.openedAt,
                openingFloat: s.openingFloat,
              }
            : { kind: "closed" },
        );
      })
      .catch(() => {
        if (!cancelled) setState({ kind: "closed" });
      });
    return () => {
      cancelled = true;
    };
  }, [featureOn, canRead]);

  if (!featureOn || !canRead || state.kind === "loading") return null;

  return (
    <Link
      href="/cash"
      className="flex items-center gap-1.5 text-[12px] rounded-md"
      style={{
        padding: "6px 10px",
        textDecoration: "none",
        border: "1px solid var(--line)",
        color: state.kind === "open" ? "var(--ok)" : "var(--warn)",
        background:
          state.kind === "open" ? "var(--ok-soft)" : "var(--warn-soft)",
        whiteSpace: "nowrap",
      }}
      title={
        state.kind === "open"
          ? `Abierta desde ${timeFmt.format(new Date(state.openedAt))} · fondo ${fmtMXN(state.openingFloat)}`
          : "Abre la caja para cobrar en efectivo"
      }
    >
      {state.kind === "open" ? (
        <>● Caja abierta · {state.folio}</>
      ) : (
        <>○ Caja cerrada — abrir</>
      )}
    </Link>
  );
}
