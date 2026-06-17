"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { I } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { QuoteNewModal } from "@/components/quote-new-modal";
import { QuoteStatusPill } from "@/components/quote-status-pill";
import { SkeletonTable } from "@/components/skeleton";
import { ApiError } from "@/lib/api/errors";
import { quotesApi } from "@/lib/api/quotes";
import { downloadFile } from "@/lib/api/download";
import { usePermission } from "@/lib/auth/auth-context";
import type { ApiQuote, ApiQuoteStatus } from "@/lib/api/types";
import { fmtDate, fmtInt, fmtMXN } from "@/lib/format";

const PAGE_SIZE = 25;

type Tab =
  | "Todas"
  | "Borradores"
  | "Enviadas"
  | "Aprobadas"
  | "Convertidas"
  | "Rechazadas";

const TABS: Tab[] = [
  "Todas",
  "Borradores",
  "Enviadas",
  "Aprobadas",
  "Convertidas",
  "Rechazadas",
];

const TAB_TO_STATUS: Record<Tab, ApiQuoteStatus | null> = {
  Todas: null,
  Borradores: "draft",
  Enviadas: "sent",
  Aprobadas: "approved",
  Convertidas: "converted",
  Rechazadas: "rejected",
};

export default function QuotesPage() {
  const router = useRouter();
  const canCreate = usePermission("sales.quotes.create");
  const [tab, setTab] = useState<Tab>("Todas");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [quotes, setQuotes] = useState<ApiQuote[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setActionError(null);
    setExporting(true);
    try {
      await downloadFile(
        quotesApi.exportCsvUrl({
          status: TAB_TO_STATUS[tab] ?? undefined,
          search: debounced || undefined,
        }),
        "cotizaciones.csv",
      );
    } catch {
      setActionError("No se pudo exportar el CSV. Intenta de nuevo.");
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    const id = setTimeout(() => {
      setDebounced(query.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(id);
  }, [query]);

  const reload = async (targetPage = page, isStale?: () => boolean) => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await quotesApi.list({
        skip: (targetPage - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        search: debounced || undefined,
        status: TAB_TO_STATUS[tab] ?? undefined,
      });
      if (isStale?.()) return; // descarta respuestas de un filtro/página ya cambiados
      setQuotes(res.items);
      setTotal(res.total);
    } catch (err) {
      if (isStale?.()) return;
      setLoadError(
        err instanceof ApiError
          ? err.message
          : "No se pudieron cargar las cotizaciones.",
      );
    } finally {
      if (!isStale?.()) setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload(page, () => cancelled);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, tab, debounced]);

  const changeTab = (t: Tab) => {
    setTab(t);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Cotizaciones"
        sub={
          tab === "Todas"
            ? `${fmtInt(total)} cotizaciones`
            : `${fmtInt(total)} cotizaciones · ${tab}`
        }
        actions={
          <>
            <button
              className="btn"
              type="button"
              onClick={() => void handleExport()}
              disabled={exporting}
            >
              {I.download} {exporting ? "Exportando…" : "Exportar"}
            </button>
            {canCreate && (
              <button
                className="btn btn--accent"
                onClick={() => setShowNew(true)}
              >
                {I.plus} Nueva cotización
              </button>
            )}
          </>
        }
      />

      {actionError && (
        <div
          className="card mb-3 flex items-center gap-2"
          style={{
            padding: 12,
            border: "1px solid var(--danger)",
            color: "var(--danger)",
            background: "var(--danger-soft)",
          }}
          role="alert"
        >
          <span className="flex-1">{actionError}</span>
          <button
            className="btn btn--sm"
            type="button"
            onClick={() => setActionError(null)}
          >
            Cerrar
          </button>
        </div>
      )}

      {loadError && (
        <div
          className="card mb-3 flex items-center gap-2"
          style={{
            padding: 12,
            border: "1px solid var(--danger)",
            color: "var(--danger)",
            background: "var(--danger-soft)",
          }}
          role="alert"
        >
          <span className="flex-1">{loadError}</span>
          <button
            className="btn btn--sm"
            type="button"
            onClick={() => void reload()}
          >
            Reintentar
          </button>
        </div>
      )}

      <div className="card">
        <div className="card__head" style={{ gap: 4 }}>
          {TABS.map((t) => (
            <button
              key={t}
              className={`btn btn--sm ${tab === t ? "btn--primary" : "btn--ghost"}`}
              onClick={() => changeTab(t)}
            >
              {t}
            </button>
          ))}
          <div className="spacer" />
          <div className="topbar__search" style={{ margin: 0, width: 240 }}>
            {I.search}
            <input
              placeholder="Buscar folio o cliente"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="tbl min-w-[820px]">
          <thead>
            <tr>
              <th>Folio</th>
              <th>Cliente</th>
              <th>Vendedor</th>
              <th>Vigencia</th>
              <th style={{ textAlign: "right" }}>Items</th>
              <th style={{ textAlign: "right" }}>Total</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7}>
                  <SkeletonTable rows={6} cols={7} />
                </td>
              </tr>
            ) : quotes.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-muted">
                  {debounced
                    ? `Sin cotizaciones para “${debounced}”.`
                    : "Sin cotizaciones."}
                </td>
              </tr>
            ) : (
              quotes.map((q) => (
                <tr
                  key={q.id}
                  onClick={() => router.push(`/quotes/${q.folio}`)}
                >
                  <td className="num">{q.folio}</td>
                  <td>{q.clientName}</td>
                  <td className="text-xs">{q.createdByName}</td>
                  <td
                    className="num text-xs"
                    style={{ color: q.isExpired ? "var(--danger)" : undefined }}
                  >
                    {q.validUntil ? fmtDate(q.validUntil) : "—"}
                  </td>
                  <td className="num" style={{ textAlign: "right" }}>
                    {q.itemsCount}
                  </td>
                  <td className="num" style={{ textAlign: "right" }}>
                    {fmtMXN(q.total)}
                  </td>
                  <td>
                    <QuoteStatusPill status={q.status} isExpired={q.isExpired} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
          </table>
        </div>
        <div
          className="flex items-center gap-3 text-xs text-muted"
          style={{ padding: "10px 14px", borderTop: "1px solid var(--line)" }}
        >
          <span>
            {total === 0
              ? "Sin cotizaciones"
              : `Mostrando ${(page - 1) * PAGE_SIZE + 1}–${Math.min(
                  page * PAGE_SIZE,
                  total,
                )} de ${total}`}
          </span>
          <div className="spacer" />
          <span className="num">
            Página {page} de {totalPages}
          </span>
          <button
            className="btn btn--sm btn--ghost"
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={loading || page <= 1}
            aria-label="Página anterior"
          >
            {I.chevronLeft}
          </button>
          <button
            className="btn btn--sm btn--ghost"
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={loading || page >= totalPages}
            aria-label="Página siguiente"
          >
            {I.chevronRight}
          </button>
        </div>
      </div>

      {showNew && (
        <QuoteNewModal
          onClose={() => setShowNew(false)}
          onSaved={(res) => {
            setShowNew(false);
            router.push(`/quotes/${res.folio}`);
          }}
        />
      )}
    </>
  );
}
