import { apiFetch, apiFetchBlob } from "./client";
import type {
  ApiAgingRow,
  ApiDashboard,
  ApiSalesSummary,
  ApiSeller,
  ApiTopClient,
  ApiTopProduct,
} from "./types";

/** Los endpoints de reportes devuelven sólo `{ items }` (sin `total`). */
type Items<T> = { items: T[] };

export type ReportRange = "7d" | "30d" | "90d" | "Año";
export type ExportFormat = "xlsx" | "pdf";
export type ExportableReport =
  | "top-products"
  | "top-clients"
  | "sellers"
  | "aging";

/**
 * Periodo de un reporte: un preset (`range`) o un rango personalizado
 * (`dateFrom`/`dateTo`, formato YYYY-MM-DD). El backend prioriza las fechas
 * sobre el preset cuando ambas vienen.
 */
export type ReportParams = {
  range?: ReportRange;
  dateFrom?: string;
  dateTo?: string;
};

function periodQs(params?: ReportParams): string {
  const qs = new URLSearchParams();
  if (params?.dateFrom && params?.dateTo) {
    qs.set("dateFrom", params.dateFrom);
    qs.set("dateTo", params.dateTo);
  } else if (params?.range) {
    qs.set("range", params.range);
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export const reportsApi = {
  dashboard(): Promise<ApiDashboard> {
    return apiFetch<ApiDashboard>("/reports/dashboard");
  },

  salesSummary(params?: ReportParams): Promise<ApiSalesSummary> {
    return apiFetch<ApiSalesSummary>(
      `/reports/sales-summary${periodQs(params)}`,
    );
  },

  topProducts(params?: ReportParams): Promise<Items<ApiTopProduct>> {
    return apiFetch<Items<ApiTopProduct>>(
      `/reports/top-products${periodQs(params)}`,
    );
  },

  topClients(params?: ReportParams): Promise<Items<ApiTopClient>> {
    return apiFetch<Items<ApiTopClient>>(
      `/reports/top-clients${periodQs(params)}`,
    );
  },

  sellers(params?: ReportParams): Promise<Items<ApiSeller>> {
    return apiFetch<Items<ApiSeller>>(`/reports/sellers${periodQs(params)}`);
  },

  aging(): Promise<Items<ApiAgingRow>> {
    return apiFetch<Items<ApiAgingRow>>("/reports/aging");
  },

  /** Descarga un reporte tabular (dispara la descarga del navegador). */
  async download(
    report: ExportableReport,
    format: ExportFormat,
    params?: ReportParams,
  ): Promise<void> {
    const qs = new URLSearchParams({ format });
    if (params?.dateFrom && params?.dateTo) {
      qs.set("dateFrom", params.dateFrom);
      qs.set("dateTo", params.dateTo);
    } else if (params?.range) {
      qs.set("range", params.range);
    }
    const blob = await apiFetchBlob(`/reports/${report}/export?${qs.toString()}`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report}.${format === "pdf" ? "pdf" : "xlsx"}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Diferir la revocación: revocar síncrono tras click() puede abortar la
    // descarga en algunos navegadores.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  },
};
