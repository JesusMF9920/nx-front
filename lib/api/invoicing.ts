import { apiFetch } from "./client";
import type { ApiInvoice } from "./types";

export type EmitInvoiceResult = {
  invoiceId: string;
  uuid: string;
  folio: string | null;
};

export type ListInvoicesParams = {
  skip?: number;
  take?: number;
  status?: ApiInvoice["status"];
  type?: ApiInvoice["type"];
  search?: string;
  from?: string;
  to?: string;
};

export const invoicingApi = {
  /** Timbra un CFDI de Ingreso para el pedido (UUID o folio). */
  emit(orderId: string): Promise<EmitInvoiceResult> {
    return apiFetch<EmitInvoiceResult>("/invoices", {
      method: "POST",
      body: JSON.stringify({ orderId }),
    });
  },

  /** Factura del pedido (o null) — para gatear el botón "Facturar". */
  byOrder(orderId: string): Promise<{ invoice: ApiInvoice | null }> {
    return apiFetch<{ invoice: ApiInvoice | null }>(
      `/invoices/by-order/${orderId}`,
    );
  },

  get(id: string): Promise<ApiInvoice> {
    return apiFetch<ApiInvoice>(`/invoices/${id}`);
  },

  list(
    params: ListInvoicesParams = {},
  ): Promise<{ items: ApiInvoice[]; total: number }> {
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && `${v}`.length > 0) {
        search.set(k, `${v}`);
      }
    }
    const qs = search.toString();
    return apiFetch<{ items: ApiInvoice[]; total: number }>(
      `/invoices${qs ? `?${qs}` : ""}`,
    );
  },

  /** URL absoluta del XML/PDF para descargar con downloadFile (usa la cookie). */
  fileUrl(id: string, format: "xml" | "pdf"): string {
    const base = process.env.NEXT_PUBLIC_API_URL ?? "";
    return `${base}/invoices/${id}/${format}`;
  },
};
