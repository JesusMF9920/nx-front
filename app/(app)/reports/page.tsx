"use client";

import { useEffect, useRef, useState } from "react";
import { I } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { ReportsAging } from "@/components/reports-aging";
import { ReportsClients } from "@/components/reports-clients";
import { ReportsProducts } from "@/components/reports-products";
import { ReportsSellers } from "@/components/reports-sellers";
import { ReportsSummary } from "@/components/reports-summary";
import { SkeletonText } from "@/components/skeleton";
import { ApiError } from "@/lib/api/errors";
import {
  reportsApi,
  type ExportableReport,
  type ExportFormat,
  type ReportParams,
  type ReportRange,
} from "@/lib/api/reports";
import type {
  ApiAgingRow,
  ApiSalesSummary,
  ApiSeller,
  ApiTopClient,
  ApiTopProduct,
} from "@/lib/api/types";
import { usePermission } from "@/lib/auth/auth-context";
import { fmtMXN } from "@/lib/format";

const RANGES: ReportRange[] = ["7d", "30d", "90d", "Año"];
type Tab = "Resumen" | "Productos" | "Clientes" | "Vendedores" | "Cobranza";
const TABS: Tab[] = ["Resumen", "Productos", "Clientes", "Vendedores", "Cobranza"];

const TAB_REPORT: Partial<Record<Tab, ExportableReport>> = {
  Productos: "top-products",
  Clientes: "top-clients",
  Vendedores: "sellers",
  Cobranza: "aging",
};

type KpiTone = "ok" | "warn" | "neutral";

export default function ReportsPage() {
  const canRead = usePermission("reports.read");
  const canExport = usePermission("reports.export");
  const [range, setRange] = useState<ReportRange>("30d");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [tab, setTab] = useState<Tab>("Resumen");

  const [summary, setSummary] = useState<ApiSalesSummary | null>(null);
  const [products, setProducts] = useState<ApiTopProduct[]>([]);
  const [clients, setClients] = useState<ApiTopClient[]>([]);
  const [sellers, setSellers] = useState<ApiSeller[]>([]);
  const [aging, setAging] = useState<ApiAgingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reqRef = useRef(0);

  useEffect(() => {
    if (!canRead) return;
    const token = ++reqRef.current;
    void (async () => {
      setLoading(true);
      setError(null);
      const params: ReportParams =
        dateFrom && dateTo ? { dateFrom, dateTo } : { range };
      try {
        const [s, p, c, v, a] = await Promise.all([
          reportsApi.salesSummary(params),
          reportsApi.topProducts(params),
          reportsApi.topClients(params),
          reportsApi.sellers(params),
          reportsApi.aging(),
        ]);
        if (token !== reqRef.current) return;
        setSummary(s);
        setProducts(p.items);
        setClients(c.items);
        setSellers(v.items);
        setAging(a.items);
      } catch (err) {
        if (token !== reqRef.current) return;
        setError(
          err instanceof ApiError ? err.message : "No se pudieron cargar los reportes.",
        );
      } finally {
        if (token === reqRef.current) setLoading(false);
      }
    })();
  }, [range, dateFrom, dateTo, canRead]);

  const exportReport = async (format: ExportFormat) => {
    const report = TAB_REPORT[tab];
    if (!report) return;
    const params: ReportParams =
      dateFrom && dateTo ? { dateFrom, dateTo } : { range };
    try {
      await reportsApi.download(
        report,
        format,
        report === "aging" ? undefined : params,
      );
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "No se pudo exportar el reporte.",
      );
    }
  };

  if (!canRead) {
    return (
      <>
        <PageHeader title="Reportes" sub="Ventas, margen, cobranza y desempeño" />
        <div className="empty m-3.5">No tienes permiso para ver los reportes.</div>
      </>
    );
  }

  const totSales = summary?.totals.sales ?? 0;
  const totOrders = summary?.totals.orders ?? 0;
  const totMargin = summary?.totals.margin ?? 0;
  const avgTicket = summary?.totals.avgTicket ?? 0;
  const marginPct = summary?.totals.marginPct ?? 0;
  const totCxC = aging.reduce((s, a) => s + a.total, 0);
  const overdue = aging.reduce((s, a) => s + a.b3160 + a.b6190 + a.b90, 0);
  const exportable = TAB_REPORT[tab] !== undefined;
  const customActive = !!(dateFrom && dateTo);

  return (
    <>
      <PageHeader
        title="Reportes"
        sub="Ventas, margen, cobranza y desempeño · vista de gerencia"
        actions={
          <>
            <div className="row gap-1 border border-line rounded-md p-[3px] bg-surface">
              {RANGES.map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setRange(r);
                    setDateFrom("");
                    setDateTo("");
                  }}
                  className={`btn btn--sm ${range === r && !customActive ? "btn--primary" : "btn--ghost"}`}
                  style={{ border: "none" }}
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="row gap-1 items-center">
              <input
                type="date"
                className="input"
                style={{ height: 32, fontSize: 12, width: 140 }}
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => setDateFrom(e.target.value)}
                aria-label="Desde"
              />
              <span className="text-muted text-xs">a</span>
              <input
                type="date"
                className="input"
                style={{ height: 32, fontSize: 12, width: 140 }}
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => setDateTo(e.target.value)}
                aria-label="Hasta"
              />
              {customActive && (
                <button
                  className="icon-btn"
                  type="button"
                  title="Quitar rango personalizado"
                  onClick={() => {
                    setDateFrom("");
                    setDateTo("");
                  }}
                >
                  {I.x}
                </button>
              )}
            </div>
            {canExport && (
              <>
                <button
                  className="btn"
                  disabled={!exportable || loading}
                  onClick={() => void exportReport("xlsx")}
                  title={exportable ? "" : "Selecciona una pestaña con tabla"}
                >
                  {I.download} Exportar Excel
                </button>
                <button
                  className="btn"
                  disabled={!exportable || loading}
                  onClick={() => void exportReport("pdf")}
                >
                  {I.copy} PDF
                </button>
              </>
            )}
          </>
        }
      />

      {error && (
        <div
          className="mb-3 text-[13px]"
          style={{
            padding: 10,
            border: "1px solid var(--danger)",
            color: "var(--danger)",
            background: "var(--danger-soft)",
            borderRadius: 8,
          }}
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="kpi-grid mb-[18px]">
        <Kpi label="Ventas netas" value={fmtMXN(totSales)} delta={loading ? "…" : "del periodo"} up hint="período seleccionado" />
        <Kpi
          label="Pedidos"
          value={totOrders}
          delta={`Ticket ${fmtMXN(avgTicket)}`}
          up
          hint="promedio"
        />
        <Kpi
          label="Margen bruto"
          value={fmtMXN(totMargin)}
          delta={`${marginPct.toFixed(1)}%`}
          up
          hint="utilidad estimada"
          tone="ok"
        />
        <Kpi
          label="Cuentas por cobrar"
          value={fmtMXN(totCxC)}
          delta={overdue > 0 ? `${fmtMXN(overdue)} vencido` : "al corriente"}
          up={false}
          hint="vencido > 30 días"
          tone={overdue > 0 ? "warn" : "neutral"}
        />
      </div>

      <div className="overflow-x-auto mb-3.5">
        <div className="row gap-1 p-[3px] bg-surface border border-line rounded-md inline-flex">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`btn btn--sm ${tab === t ? "btn--primary" : "btn--ghost"}`}
              style={{ border: "none" }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <SkeletonText lines={5} />
      ) : (
        <>
          {tab === "Resumen" && summary && (
            <ReportsSummary
              daily={summary.daily}
              paymentMix={summary.paymentMix}
              categoryMix={summary.categoryMix}
            />
          )}
          {tab === "Productos" && <ReportsProducts items={products} />}
          {tab === "Clientes" && <ReportsClients items={clients} />}
          {tab === "Vendedores" && <ReportsSellers items={sellers} />}
          {tab === "Cobranza" && <ReportsAging items={aging} />}
        </>
      )}
    </>
  );
}

function Kpi({
  label,
  value,
  delta,
  up,
  hint,
  tone,
}: {
  label: string;
  value: string | number;
  delta: string;
  up: boolean;
  hint: string;
  tone?: KpiTone;
}) {
  const deltaColor =
    tone === "warn" ? "var(--warn)" : tone === "ok" ? "var(--ok)" : up ? "var(--ok)" : "var(--muted)";
  return (
    <div className="kpi">
      <div className="kpi__label">{label}</div>
      <div className="kpi__value num">{value}</div>
      <div className="kpi__foot">
        <span style={{ color: deltaColor, fontWeight: 500 }}>{delta}</span>
        <span style={{ color: "var(--muted)", fontSize: 11 }}>· {hint}</span>
      </div>
    </div>
  );
}
