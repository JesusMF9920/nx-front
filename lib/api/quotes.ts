import type { ApiAuditEntry } from "./audit";
import { apiFetch } from "./client";
import type { CheckoutLineInput, CheckoutPaymentInput } from "./orders";
import type {
  ApiConvertResult,
  ApiList,
  ApiQuote,
  ApiQuoteChannel,
  ApiQuoteDetail,
  ApiQuotePreview,
  ApiQuoteStatus,
} from "./types";

/** Línea de cotización: como el checkout, más precio negociado opcional. */
export type QuoteLineInput = CheckoutLineInput & {
  /** Precio unitario negociado (override). Ignora surcharges en esa línea. */
  unitPriceOverride?: number;
};

export type QuoteInput = {
  clientId: string;
  lines: QuoteLineInput[];
  discount?: number;
  validUntil?: string;
  notes?: string;
};

export type PreviewQuoteInput = {
  clientId: string;
  lines: QuoteLineInput[];
  discount?: number;
};

export type ConvertQuoteInput = {
  /** Cobro inmediato. Vacío = orden a crédito. */
  payments: CheckoutPaymentInput[];
  deliverAt?: string;
  notes?: string;
};

export type ListQuotesParams = {
  status?: ApiQuoteStatus;
  clientId?: string;
  /** Busca por folio o nombre de cliente. */
  search?: string;
  from?: string;
  to?: string;
  skip?: number;
  take?: number;
};

export const quotesApi = {
  list(params: ListQuotesParams = {}): Promise<ApiList<ApiQuote>> {
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && `${v}`.length > 0) {
        search.set(k, `${v}`);
      }
    }
    const qs = search.toString();
    return apiFetch<ApiList<ApiQuote>>(`/quotes${qs ? `?${qs}` : ""}`);
  },

  /** URL absoluta del CSV para `<a download>` (usa la cookie de sesión). */
  exportCsvUrl(params: ListQuotesParams = {}): string {
    const base = process.env.NEXT_PUBLIC_API_URL ?? "";
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && `${v}`.length > 0) {
        search.set(k, `${v}`);
      }
    }
    const qs = search.toString();
    return `${base}/quotes/export.csv${qs ? `?${qs}` : ""}`;
  },

  /** Acepta UUID o folio (COT-1001). */
  get(idOrFolio: string): Promise<ApiQuoteDetail> {
    return apiFetch<ApiQuoteDetail>(`/quotes/${idOrFolio}`);
  },

  timeline(idOrFolio: string): Promise<{ items: ApiAuditEntry[] }> {
    return apiFetch<{ items: ApiAuditEntry[] }>(`/quotes/${idOrFolio}/timeline`);
  },

  /** Totales server-side (con overrides) SIN escribir nada. */
  preview(input: PreviewQuoteInput): Promise<ApiQuotePreview> {
    return apiFetch<ApiQuotePreview>("/quotes/preview", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  create(input: QuoteInput): Promise<{ quoteId: string; folio: string }> {
    return apiFetch<{ quoteId: string; folio: string }>("/quotes", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  /** Sólo borradores. */
  update(quoteId: string, input: QuoteInput): Promise<{ quoteId: string }> {
    return apiFetch<{ quoteId: string }>(`/quotes/${quoteId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },

  send(
    quoteId: string,
    channel: ApiQuoteChannel,
  ): Promise<{
    quoteId: string;
    status: ApiQuoteStatus;
    /** Correo del destinatario cuando channel='email'; null en otros canales. */
    sentTo: string | null;
  }> {
    return apiFetch(`/quotes/${quoteId}/send`, {
      method: "POST",
      body: JSON.stringify({ channel }),
    });
  },

  approve(
    quoteId: string,
  ): Promise<{ quoteId: string; status: ApiQuoteStatus }> {
    return apiFetch(`/quotes/${quoteId}/approve`, { method: "POST" });
  },

  reject(
    quoteId: string,
    reason?: string,
  ): Promise<{ quoteId: string; status: ApiQuoteStatus }> {
    return apiFetch(`/quotes/${quoteId}/reject`, {
      method: "POST",
      body: JSON.stringify(reason ? { reason } : {}),
    });
  },

  convert(quoteId: string, input: ConvertQuoteInput): Promise<ApiConvertResult> {
    return apiFetch<ApiConvertResult>(`/quotes/${quoteId}/convert`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
};
