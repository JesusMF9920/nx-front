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

function rangeQs(range?: ReportRange): string {
  return range ? `?range=${encodeURIComponent(range)}` : "";
}

export const reportsApi = {
  dashboard(): Promise<ApiDashboard> {
    return apiFetch<ApiDashboard>("/reports/dashboard");
  },

  salesSummary(range?: ReportRange): Promise<ApiSalesSummary> {
    return apiFetch<ApiSalesSummary>(`/reports/sales-summary${rangeQs(range)}`);
  },

  topProducts(range?: ReportRange): Promise<Items<ApiTopProduct>> {
    return apiFetch<Items<ApiTopProduct>>(
      `/reports/top-products${rangeQs(range)}`,
    );
  },

  topClients(range?: ReportRange): Promise<Items<ApiTopClient>> {
    return apiFetch<Items<ApiTopClient>>(
      `/reports/top-clients${rangeQs(range)}`,
    );
  },

  sellers(range?: ReportRange): Promise<Items<ApiSeller>> {
    return apiFetch<Items<ApiSeller>>(`/reports/sellers${rangeQs(range)}`);
  },

  aging(): Promise<Items<ApiAgingRow>> {
    return apiFetch<Items<ApiAgingRow>>("/reports/aging");
  },

  /** Descarga un reporte tabular (dispara la descarga del navegador). */
  async download(
    report: ExportableReport,
    format: ExportFormat,
    range?: ReportRange,
  ): Promise<void> {
    const qs = new URLSearchParams({ format });
    if (range) qs.set("range", range);
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
