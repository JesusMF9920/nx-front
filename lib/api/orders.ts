import { apiFetch } from "./client";
import type { ApiAuditEntry } from "./audit";
import type {
  ApiConsumptionLine,
  ApiList,
  ApiOrder,
  ApiOrderDetail,
  ApiOrderStatus,
  ApiPaymentMethod,
  ApiStockShortage,
} from "./types";

export type CheckoutLineInput = {
  productId: string;
  /** Requerida para none/preset/size; ignorada para sized_from_material; para dimension se deriva. */
  qty?: number;
  /** Requerido para variantType preset/size. */
  variantCode?: string;
  /** Requerido para sized_from_material — los sobreprecios los resuelve el backend. */
  sizeBreakdown?: { sizeId: string; qty: number }[];
  /** Requerido para variantType dimension. */
  dimension?: { width: number; height: number };
};

export type CheckoutPaymentInput = {
  method: ApiPaymentMethod;
  amount: number;
  reference?: string;
};

export type RefundInput = {
  method: ApiPaymentMethod;
  amount: number;
  /** Motivo de la devolución (obligatorio). */
  reason: string;
};

export type RefundResult = {
  orderId: string;
  folio: string;
  refundFolio: string;
  refunded: number;
  paid: number;
  total: number;
};

export type CheckoutInput = {
  clientId: string;
  lines: CheckoutLineInput[];
  discount?: number;
  /** Vacío = venta a crédito (orden "Pendiente" de pago). */
  payments: CheckoutPaymentInput[];
  /** El backend valida ±0.01 y responde 409 si difiere del total real. */
  expectedTotal?: number;
  deliverAt?: string;
  notes?: string;
};

export type CheckoutPreviewInput = {
  clientId: string;
  lines: CheckoutLineInput[];
  discount?: number;
};

export type CheckoutPreview = {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  lines: {
    productId: string;
    productName: string;
    qty: number;
    unitPrice: number;
    lineTotal: number;
  }[];
  consumption: ApiConsumptionLine[];
  shortages: ApiStockShortage[];
  available: boolean;
};

export type CheckoutResult = {
  orderId: string;
  folio: string;
  total: number;
  paid: number;
};

export type ListOrdersParams = {
  status?: ApiOrderStatus;
  clientId?: string;
  /** Busca por folio o nombre de cliente. */
  search?: string;
  from?: string;
  to?: string;
  /** Rango half-open [deliverFrom, deliverTo) sobre deliverAt — calendario. */
  deliverFrom?: string;
  deliverTo?: string;
  skip?: number;
  take?: number;
};

export const posApi = {
  checkout(input: CheckoutInput): Promise<CheckoutResult> {
    return apiFetch<CheckoutResult>("/pos/checkout", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  /** Totales + consumo de inventario SIN escribir nada (alimenta el modal de cobro). */
  preview(input: CheckoutPreviewInput): Promise<CheckoutPreview> {
    return apiFetch<CheckoutPreview>("/pos/checkout/preview", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
};

export const ordersApi = {
  list(params: ListOrdersParams = {}): Promise<ApiList<ApiOrder>> {
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && `${v}`.length > 0) {
        search.set(k, `${v}`);
      }
    }
    const qs = search.toString();
    return apiFetch<ApiList<ApiOrder>>(`/orders${qs ? `?${qs}` : ""}`);
  },

  /** Acepta UUID o folio (ORD-1001). */
  get(idOrFolio: string): Promise<ApiOrderDetail> {
    return apiFetch<ApiOrderDetail>(`/orders/${idOrFolio}`);
  },

  timeline(idOrFolio: string): Promise<{ items: ApiAuditEntry[] }> {
    return apiFetch<{ items: ApiAuditEntry[] }>(
      `/orders/${idOrFolio}/timeline`,
    );
  },

  addPayment(
    orderId: string,
    payment: CheckoutPaymentInput,
  ): Promise<{ paid: number; total: number }> {
    return apiFetch<{ paid: number; total: number }>(
      `/orders/${orderId}/payments`,
      { method: "POST", body: JSON.stringify(payment) },
    );
  },

  /** Devolución de dinero (DEV-). SOLO dinero — no revierte stock. */
  refund(orderId: string, input: RefundInput): Promise<RefundResult> {
    return apiFetch<RefundResult>(`/orders/${orderId}/refunds`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  transitionStatus(orderId: string, status: ApiOrderStatus): Promise<void> {
    return apiFetch<void>(`/orders/${orderId}/status`, {
      method: "POST",
      body: JSON.stringify({ status }),
    });
  },

  transitionItemStatus(
    orderId: string,
    itemId: string,
    status: ApiOrderStatus,
  ): Promise<void> {
    return apiFetch<void>(`/orders/${orderId}/items/${itemId}/status`, {
      method: "POST",
      body: JSON.stringify({ status }),
    });
  },

  cancel(orderId: string): Promise<void> {
    return apiFetch<void>(`/orders/${orderId}/cancel`, { method: "POST" });
  },

  update(
    orderId: string,
    patch: { deliverAt?: string | null; notes?: string | null },
  ): Promise<void> {
    return apiFetch<void>(`/orders/${orderId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },
};
