import { apiFetch } from "./client";
import type { ApiInvoice } from "./types";

export type EmitInvoiceResult = {
  invoiceId: string;
  uuid: string;
  folio: string | null;
};

export type EmitPaymentComplementResult = EmitInvoiceResult & {
  partialityNumber: number;
  amount: number;
};

export type GlobalInvoiceParams = {
  /** Periodo (ISO date, inclusivo). */
  from: string;
  to: string;
  /** c_Periodicidad (01–05). */
  periodicity: string;
  /** c_Meses (01–12 / 13–18). */
  month: string;
  /** Ejercicio. */
  year: number;
};

export type PreviewGlobalOrder = {
  id: string;
  folio: string;
  total: number;
  createdAt: string;
};

export type PreviewGlobalResult = {
  count: number;
  subtotal: number;
  tax: number;
  total: number;
  orders: PreviewGlobalOrder[];
};

export type EmitGlobalInvoiceResult = EmitInvoiceResult & {
  includedCount: number;
  total: number;
};

export type CancelInvoiceResult = {
  invoiceId: string;
  status: string;
  /** Estatus del acuse del SAT ('canceled' | 'pending'). */
  satStatus: string;
};

export type RefreshCancellationResult = {
  invoiceId: string;
  /** Estado local tras refrescar ('cancelled' | 'stamped'). */
  status: ApiInvoice["status"];
  cancelStatus: string | null;
  /** Estatus normalizado consultado al PAC/SAT. */
  satStatus: "canceled" | "pending" | "active";
  /** true si el refresco cambió el estado de la factura. */
  changed: boolean;
};

export type CoverageBucket = { count: number; amount: number };

export type InvoiceCoverage = {
  totalCount: number;
  totalAmount: number;
  invoicedIndividual: CoverageBucket;
  invoicedGlobal: CoverageBucket;
  pendingInvoice: CoverageBucket;
  counter: CoverageBucket;
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

  /** Emite un Complemento de Pago (REP) por el abono pendiente de un pedido PPD. */
  emitPaymentComplement(
    orderId: string,
  ): Promise<EmitPaymentComplementResult> {
    return apiFetch<EmitPaymentComplementResult>("/invoices/payment-complement", {
      method: "POST",
      body: JSON.stringify({ orderId }),
    });
  },

  /** Cancela un CFDI ante el SAT (motivo 02/03). */
  cancel(id: string, motive: string): Promise<CancelInvoiceResult> {
    return apiFetch<CancelInvoiceResult>(`/invoices/${id}/cancel`, {
      method: "POST",
      body: JSON.stringify({ motive }),
    });
  },

  /**
   * Re-consulta al SAT el estatus de una cancelación que quedó pendiente de
   * aceptación (CFDI 4.0) y resuelve la factura.
   */
  refreshCancellation(id: string): Promise<RefreshCancellationResult> {
    return apiFetch<RefreshCancellationResult>(`/invoices/${id}/cancel/status`, {
      method: "POST",
    });
  },

  /** Reporte de cobertura CFDI del periodo (facturado vs no facturado). */
  coverage(params: { from: string; to: string }): Promise<InvoiceCoverage> {
    const search = new URLSearchParams({ from: params.from, to: params.to });
    return apiFetch<InvoiceCoverage>(`/invoices/coverage?${search.toString()}`);
  },

  /** Vista previa de la factura global: pedidos y totales del periodo. */
  previewGlobal(params: {
    from: string;
    to: string;
  }): Promise<PreviewGlobalResult> {
    const search = new URLSearchParams({ from: params.from, to: params.to });
    return apiFetch<PreviewGlobalResult>(
      `/invoices/global/preview?${search.toString()}`,
    );
  },

  /** Timbra la factura global de público en general del periodo. */
  emitGlobal(params: GlobalInvoiceParams): Promise<EmitGlobalInvoiceResult> {
    return apiFetch<EmitGlobalInvoiceResult>("/invoices/global", {
      method: "POST",
      body: JSON.stringify(params),
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
