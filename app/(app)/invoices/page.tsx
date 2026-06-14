"use client";

import { useState } from "react";
import { I } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { GlobalInvoiceModal } from "@/components/global-invoice-modal";
import { useFeature, usePermission } from "@/lib/auth/auth-context";
import { invoicingApi } from "@/lib/api/invoicing";
import { downloadFile } from "@/lib/api/download";
import type {
  ApiInvoice,
  ApiInvoiceStatus,
  ApiInvoiceType,
} from "@/lib/api/types";
import { fmtDate, fmtInt, fmtMXN } from "@/lib/format";
import { useApiList } from "@/lib/hooks/use-api-list";

const PAGE_SIZE = 25;

const TYPE_ES: Record<ApiInvoiceType, string> = {
  ingreso: "Ingreso",
  pago: "Compl. pago",
  global: "Global",
};

const STATUS_ES: Record<ApiInvoiceStatus, string> = {
  draft: "Borrador",
  stamped: "Timbrada",
  sent: "Enviada",
  cancelled: "Cancelada",
};

const STATUS_COLOR: Record<ApiInvoiceStatus, string> = {
  draft: "var(--muted)",
  stamped: "var(--accent)",
  sent: "var(--ok, var(--accent))",
  cancelled: "var(--danger)",
};

type Tab = "Todas" | "Ingreso" | "Pago" | "Global";
const TABS: Tab[] = ["Todas", "Ingreso", "Pago", "Global"];
const TAB_TO_TYPE: Record<Tab, ApiInvoiceType | undefined> = {
  Todas: undefined,
  Ingreso: "ingreso",
  Pago: "pago",
  Global: "global",
};

type InvoiceFilters = { from?: string; to?: string };

export default function InvoicesPage() {
  const cfdiEnabled = useFeature("cfdi");
  const canRead = usePermission("invoicing.read");
  const canCreate = usePermission("invoicing.create");

  const [tab, setTab] = useState<Tab>("Todas");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<InvoiceFilters>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showGlobal, setShowGlobal] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const {
    items: invoices,
    total,
    totalPages,
    page,
    setPage,
    loading,
    error: loadError,
    debounced,
    reload,
  } = useApiList<ApiInvoice>({
    fetcher: (params) =>
      invoicingApi.list({
        ...params,
        type: TAB_TO_TYPE[tab],
        ...filters,
      }),
    filterKey: `${tab}|${filters.from ?? ""}|${filters.to ?? ""}`,
    search: query,
    pageSize: PAGE_SIZE,
    errorMessage: "No se pudieron cargar las facturas.",
  });

  const changeTab = (t: Tab) => {
    setTab(t);
    setPage(1);
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const setFilter = (key: keyof InvoiceFilters, value: string) => {
    setFilters((f) => ({ ...f, [key]: value || undefined }));
    setPage(1);
  };

  const download = (inv: ApiInvoice, format: "xml" | "pdf") => {
    const name = `factura-${inv.folio ?? inv.uuid ?? inv.id}.${format}`;
    void downloadFile(invoicingApi.fileUrl(inv.id, format), name);
  };

  if (!canRead) {
    return (
      <>
        <PageHeader title="Facturas" />
        <div className="card" style={{ padding: 16 }}>
          <p className="text-muted text-[13px]">
            No tienes permiso para ver las facturas.
          </p>
        </div>
      </>
    );
  }

  if (!cfdiEnabled) {
    return (
      <>
        <PageHeader title="Facturas" />
        <div className="card" style={{ padding: 16 }}>
          <p className="text-muted text-[13px]">
            La facturación electrónica (CFDI) está desactivada. Actívala en{" "}
            <strong>Configuración → Funciones</strong> para emitir y administrar
            facturas.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Facturas"
        sub={`${fmtInt(total)} CFDI${tab === "Todas" ? "" : ` · ${tab}`}`}
        actions={
          canCreate && (
            <button
              className="btn btn--accent"
              type="button"
              onClick={() => setShowGlobal(true)}
            >
              {I.plus} Generar factura global
            </button>
          )
        }
      />

      {notice && (
        <div
          className="card mb-3 flex items-center gap-2"
          style={{
            padding: 12,
            border: "1px solid var(--accent)",
            background: "var(--accent-soft, transparent)",
          }}
          role="status"
        >
          <span className="flex-1">{notice}</span>
          <button
            className="btn btn--sm"
            type="button"
            onClick={() => setNotice(null)}
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
              placeholder="Buscar UUID, folio o receptor"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="relative">
            <button
              className="icon-btn"
              type="button"
              aria-label="Filtros"
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen((o) => !o)}
            >
              {I.filter}
              {activeFilterCount > 0 && (
                <span className="nav-item__badge">{activeFilterCount}</span>
              )}
            </button>
            {filtersOpen && (
              <>
                <div
                  className="fixed inset-0"
                  style={{ zIndex: 19 }}
                  onClick={() => setFiltersOpen(false)}
                />
                <div
                  className="card"
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "calc(100% + 6px)",
                    zIndex: 20,
                    width: 260,
                    padding: 14,
                  }}
                >
                  <div className="flex flex-col gap-3">
                    <div className="text-xs font-medium text-muted">
                      Fecha de emisión
                    </div>
                    <label className="field text-xs">
                      Desde
                      <input
                        type="date"
                        className="input"
                        value={filters.from ?? ""}
                        onChange={(e) => setFilter("from", e.target.value)}
                      />
                    </label>
                    <label className="field text-xs">
                      Hasta
                      <input
                        type="date"
                        className="input"
                        value={filters.to ?? ""}
                        onChange={(e) => setFilter("to", e.target.value)}
                      />
                    </label>
                    {activeFilterCount > 0 && (
                      <button
                        className="btn btn--sm btn--ghost"
                        type="button"
                        onClick={() => {
                          setFilters({});
                          setPage(1);
                        }}
                      >
                        Limpiar filtros
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="tbl min-w-[820px]">
            <thead>
              <tr>
                <th>Folio fiscal</th>
                <th>Tipo</th>
                <th>Receptor</th>
                <th style={{ textAlign: "right" }}>Total</th>
                <th>Estado</th>
                <th>Emitida</th>
                <th style={{ textAlign: "right" }}>Archivos</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-muted">
                    Cargando facturas…
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-muted">
                    {debounced
                      ? `Sin facturas para “${debounced}”.`
                      : "Sin facturas."}
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const downloadable =
                    inv.status === "stamped" || inv.status === "sent";
                  return (
                    <tr key={inv.id}>
                      <td className="num" title={inv.uuid ?? undefined}>
                        {inv.folio ?? (inv.uuid ? inv.uuid.slice(0, 8) : "—")}
                      </td>
                      <td>{TYPE_ES[inv.type]}</td>
                      <td>
                        {inv.receiverName ?? "—"}
                        {inv.receiverRfc && (
                          <span className="text-muted text-[11px]">
                            {" "}
                            · {inv.receiverRfc}
                          </span>
                        )}
                      </td>
                      <td className="num" style={{ textAlign: "right" }}>
                        {fmtMXN(inv.total)}
                      </td>
                      <td>
                        <span
                          style={{
                            color: STATUS_COLOR[inv.status],
                            fontWeight: 500,
                            fontSize: 12,
                          }}
                        >
                          {STATUS_ES[inv.status]}
                        </span>
                      </td>
                      <td className="num">{fmtDate(inv.createdAt)}</td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        {downloadable ? (
                          <>
                            <button
                              className="btn btn--sm btn--ghost"
                              type="button"
                              onClick={() => download(inv, "pdf")}
                            >
                              {I.download} PDF
                            </button>
                            <button
                              className="btn btn--sm btn--ghost"
                              type="button"
                              onClick={() => download(inv, "xml")}
                            >
                              XML
                            </button>
                          </>
                        ) : (
                          <span className="text-muted text-[12px]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
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
              ? "Sin facturas"
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

      {showGlobal && (
        <GlobalInvoiceModal
          onClose={() => setShowGlobal(false)}
          onGenerated={(res) => {
            setShowGlobal(false);
            setNotice(
              `Factura global timbrada (${fmtInt(res.includedCount)} ventas)` +
                (res.folio ? ` · folio ${res.folio}` : "") +
                ` · UUID ${res.uuid}`,
            );
            setTab("Global");
            setPage(1);
            void reload();
          }}
        />
      )}
    </>
  );
}
