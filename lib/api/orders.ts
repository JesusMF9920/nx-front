import { apiFetch } from "./client";
import type { ApiAuditEntry } from "./audit";
import type {
  ApiAssignableUser,
  ApiConsumptionLine,
  ApiList,
  ApiOrder,
  ApiOrderAlerts,
  ApiOrderDetail,
  ApiOrderInternalNote,
  ApiOrderPriority,
  ApiOrderStatus,
  ApiPaymentMethod,
  ApiStockShortage,
  ApiTeamWorkloadRow,
  ApiToPurchaseLine,
} from "./types";

export type CheckoutLineInput = {
  /** Opcional: una línea ad-hoc (producto libre) no lo trae y manda adHocName + adHocPrice. */
  productId?: string;
  /** Línea ad-hoc: nombre del producto libre (sin productId). */
  adHocName?: string;
  /** Línea ad-hoc: precio unitario capturado a mano (> 0). */
  adHocPrice?: number;
  /** Línea ad-hoc: costo unitario opcional (margen de reportes); default 0. */
  adHocCost?: number;
  /** Nota libre por línea (instrucciones de producción). */
  lineNote?: string;
  /**
   * Override de "requiere diseño" decidido al vender. Si se omite, el backend
   * usa el default del catálogo (o false en ad-hoc). El front lo manda siempre.
   */
  needsApproval?: boolean;
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
  /** CFDI: el cliente pedirá factura individual → se excluye de la global. */
  requiresInvoice?: boolean;
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
  /** Insumos bajo demanda que se comprarán (no descuentan ni bloquean). */
  toPurchase: ApiToPurchaseLine[];
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
  /** Responsable concreto (diseño o producción). */
  assigneeId?: string;
  priority?: ApiOrderPriority;
  /** Sólo pedidos sin responsable de diseño ni de producción. */
  unassigned?: boolean;
  /** "Mis pedidos": donde el usuario actual es responsable. */
  mine?: boolean;
  /** Sólo pedidos vencidos (entrega pasada, aún no entregados). */
  overdue?: boolean;
  skip?: number;
  take?: number;
};

export const posApi = {
  /**
   * `idempotencyKey` (opcional, header `idempotency-key`): el backend deduplica
   * cobros repetidos (reintento tras timeout de red) sin crear un pedido doble
   * ni reconsumir stock. Debe ser ESTABLE para un mismo intento de cobro.
   */
  checkout(
    input: CheckoutInput,
    idempotencyKey?: string,
  ): Promise<CheckoutResult> {
    return apiFetch<CheckoutResult>("/pos/checkout", {
      method: "POST",
      body: JSON.stringify(input),
      ...(idempotencyKey
        ? { headers: { "idempotency-key": idempotencyKey } }
        : {}),
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

  /** URL absoluta del CSV para `<a download>` (usa la cookie de sesión). */
  exportCsvUrl(params: ListOrdersParams = {}): string {
    const base = process.env.NEXT_PUBLIC_API_URL ?? "";
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && `${v}`.length > 0) {
        search.set(k, `${v}`);
      }
    }
    const qs = search.toString();
    return `${base}/orders/export.csv${qs ? `?${qs}` : ""}`;
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

  /** Bandeja del día / alertas para el dashboard. */
  alerts(): Promise<ApiOrderAlerts> {
    return apiFetch<ApiOrderAlerts>(`/orders/alerts`);
  },

  /** Usuarios asignables como responsables (activos). */
  assignableUsers(): Promise<{ items: ApiAssignableUser[] }> {
    return apiFetch<{ items: ApiAssignableUser[] }>(`/orders/assignable-users`);
  },

  /** Carga del equipo: pedidos activos por responsable. */
  teamWorkload(): Promise<{ items: ApiTeamWorkloadRow[] }> {
    return apiFetch<{ items: ApiTeamWorkloadRow[] }>(`/orders/workload`);
  },

  /**
   * Asigna/reasigna responsables de etapa. Por campo: omitido = sin cambio;
   * null = quitar; UUID = asignar. Requiere permiso sales.orders.assign.
   */
  assign(
    orderId: string,
    patch: { designerId?: string | null; producerId?: string | null },
  ): Promise<{ orderId: string }> {
    return apiFetch<{ orderId: string }>(`/orders/${orderId}/assignees`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  /** Cambia la prioridad operativa (urgente/normal). */
  setPriority(
    orderId: string,
    priority: ApiOrderPriority,
  ): Promise<{ orderId: string; priority: ApiOrderPriority }> {
    return apiFetch<{ orderId: string; priority: ApiOrderPriority }>(
      `/orders/${orderId}/priority`,
      { method: "PATCH", body: JSON.stringify({ priority }) },
    );
  },

  /** Notas internas del equipo (de la más vieja a la más reciente). */
  listNotes(idOrFolio: string): Promise<{ items: ApiOrderInternalNote[] }> {
    return apiFetch<{ items: ApiOrderInternalNote[] }>(
      `/orders/${idOrFolio}/notes`,
    );
  },

  /** Agrega una nota interna del equipo (append-only). */
  addNote(orderId: string, body: string): Promise<{ id: string }> {
    return apiFetch<{ id: string }>(`/orders/${orderId}/notes`, {
      method: "POST",
      body: JSON.stringify({ body }),
    });
  },

  /** `idempotencyKey` (header `idempotency-key`): evita doble cobro tras un
   * reintento de red. Estable por intento. */
  addPayment(
    orderId: string,
    payment: CheckoutPaymentInput,
    idempotencyKey?: string,
  ): Promise<{ paid: number; total: number }> {
    return apiFetch<{ paid: number; total: number }>(
      `/orders/${orderId}/payments`,
      {
        method: "POST",
        body: JSON.stringify(payment),
        ...(idempotencyKey
          ? { headers: { "idempotency-key": idempotencyKey } }
          : {}),
      },
    );
  },

  /** Envía el comprobante (ticket carta PDF) al correo del cliente. */
  sendReceipt(
    orderId: string,
  ): Promise<{ orderId: string; folio: string; sentTo: string }> {
    return apiFetch<{ orderId: string; folio: string; sentTo: string }>(
      `/orders/${orderId}/receipt-email`,
      { method: "POST" },
    );
  },

  /**
   * Devolución de dinero (DEV-). SOLO dinero — no revierte stock.
   * `idempotencyKey` (header `idempotency-key`): evita pagar el efectivo dos
   * veces tras un reintento de red. Estable por intento de devolución.
   */
  refund(
    orderId: string,
    input: RefundInput,
    idempotencyKey?: string,
  ): Promise<RefundResult> {
    return apiFetch<RefundResult>(`/orders/${orderId}/refunds`, {
      method: "POST",
      body: JSON.stringify(input),
      ...(idempotencyKey
        ? { headers: { "idempotency-key": idempotencyKey } }
        : {}),
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

  /**
   * Reemplaza las líneas de un pedido (corrección temprana). El backend
   * re-cotiza, recalcula totales y valida el gating y total ≥ pagado (409).
   */
  editLines(
    orderId: string,
    input: { lines: CheckoutLineInput[]; discount?: number },
  ): Promise<EditOrderLinesResult> {
    return apiFetch<EditOrderLinesResult>(`/orders/${orderId}/lines`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },
};

export type EditOrderLinesResult = {
  orderId: string;
  folio: string;
  total: number;
  editSeq: number;
};
