import { apiFetch } from "./client";

/** Cobranza — cuentas por cobrar (saldos pendientes derivados de los pedidos). */

export type ReceivableBucket = "0-30" | "31-60" | "61-90" | "90+";

export type ApiReceivableOrder = {
  orderId: string;
  folio: string;
  clientId: string;
  clientName: string;
  createdAt: string;
  total: number;
  /** Σ pagos. */
  paid: number;
  /** total − paid. */
  balance: number;
  ageDays: number;
  bucket: ReceivableBucket;
};

export type ApiReceivableClient = {
  clientId: string;
  clientName: string;
  debt: number;
  orderCount: number;
  oldestAgeDays: number;
  oldestBucket: ReceivableBucket;
};

export type CollectionsSummary = {
  totalBalance: number;
  overdueBalance: number;
  debtorCount: number;
  orderCount: number;
  b030: number;
  b3160: number;
  b6190: number;
  b90: number;
};

export type CollectionsListParams = {
  search?: string;
  clientId?: string;
  onlyOverdue?: boolean;
  skip?: number;
  take?: number;
};

export type SendReminderResult = {
  clientId: string;
  sentTo: string;
  totalBalance: number;
  orderCount: number;
};

function qs(params: Record<string, unknown>): string {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && `${v}`.length > 0) {
      s.set(k, `${v}`);
    }
  }
  const str = s.toString();
  return str ? `?${str}` : "";
}

export const collectionsApi = {
  /** Bandeja por pedido. Con `clientId` = estado de cuenta de un cliente. */
  listByOrder(
    params: CollectionsListParams = {},
  ): Promise<{ items: ApiReceivableOrder[]; total: number }> {
    return apiFetch<{ items: ApiReceivableOrder[]; total: number }>(
      `/collections/orders${qs(params)}`,
    );
  },

  /** Bandeja por cliente (deuda total + antigüedad del saldo más viejo). */
  listByClient(
    params: CollectionsListParams = {},
  ): Promise<{ items: ApiReceivableClient[]; total: number }> {
    return apiFetch<{ items: ApiReceivableClient[]; total: number }>(
      `/collections/clients${qs(params)}`,
    );
  },

  /** KPIs del set filtrado (independiente de la paginación). */
  summary(
    params: Omit<CollectionsListParams, "skip" | "take"> = {},
  ): Promise<CollectionsSummary> {
    return apiFetch<CollectionsSummary>(`/collections/summary${qs(params)}`);
  },

  /** Recordatorio de cobro por correo. Exactamente uno de orderId/clientId. */
  remind(input: {
    orderId?: string;
    clientId?: string;
  }): Promise<SendReminderResult> {
    return apiFetch<SendReminderResult>("/collections/remind", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
};
