import type {
  ApiOrderPriority,
  ApiOrderStatus,
  ApiPaymentMethod,
  ApiProductionStation,
  ApiQuoteChannel,
  ApiQuoteStatus,
} from "./types";

/** Prioridad operativa (EN → ES). Exhaustivo: el build truena si falta una. */
export const ORDER_PRIORITY_ES: Record<ApiOrderPriority, string> = {
  urgent: "Urgente",
  normal: "Normal",
};

/** Estaciones/centros de trabajo del taller (EN → ES). */
export const PRODUCTION_STATION_ES: Record<ApiProductionStation, string> = {
  offset: "Offset",
  screen_printing: "Serigrafía",
  large_format: "Gran formato",
  finishing: "Acabados",
};

/** Etiqueta de estación con fallback a "Sin asignar" para null. */
export function stationLabel(s: ApiProductionStation | null): string {
  return s ? PRODUCTION_STATION_ES[s] : "Sin asignar";
}

/**
 * Mapeo EN (API) → ES (UI). `Record` exhaustivo a propósito: si el backend
 * agrega un status nuevo, el build truena aquí hasta mapearlo.
 */
export const ORDER_STATUS_ES: Record<ApiOrderStatus, string> = {
  pending: "Pendiente",
  in_design: "En diseño",
  client_approval: "Aprobación cliente",
  production: "Producción",
  with_supplier: "Con proveedor",
  ready_for_delivery: "Listo para entrega",
  delivered: "Entregado",
  cancelled: "Cancelada",
};

export const PAYMENT_METHOD_ES: Record<ApiPaymentMethod, string> = {
  cash: "Efectivo",
  terminal: "Terminal",
  transfer: "Transferencia",
};

/**
 * Etiqueta de pago derivada — "Mixto" y "Pendiente" NUNCA se almacenan:
 * sin pagos → Pendiente; >1 método → Mixto; un método → su etiqueta.
 */
export function paymentLabel(order: {
  paymentMethods: ApiPaymentMethod[];
}): "Efectivo" | "Terminal" | "Transferencia" | "Mixto" | "Pendiente" {
  if (order.paymentMethods.length === 0) return "Pendiente";
  if (order.paymentMethods.length > 1) return "Mixto";
  return PAYMENT_METHOD_ES[order.paymentMethods[0]] as
    | "Efectivo"
    | "Terminal"
    | "Transferencia";
}

/** Status que la UI ofrece como transición manual (sin pending/cancelled). */
export const MANUAL_ORDER_TRANSITIONS: ApiOrderStatus[] = [
  "in_design",
  "client_approval",
  "production",
  "with_supplier",
  "ready_for_delivery",
  "delivered",
];

/**
 * Acciones de auditoría del módulo sales (backend:
 * sales/domain/events/order.events.ts) → etiqueta ES para el timeline.
 * Lookup con fallback a la acción cruda: `SALES_AUDIT_ACTION_ES[a] ?? a`.
 */
export const SALES_AUDIT_ACTION_ES: Record<string, string> = {
  "sales.order.placed": "Venta creada",
  "sales.order.payment_received": "Pago registrado",
  "sales.order.refunded": "Devolución registrada",
  "sales.order.status_changed": "Estatus del pedido actualizado",
  "sales.order.item_status_changed": "Estatus de producto actualizado",
  "sales.order.cancelled": "Pedido cancelado",
  "sales.order.deliver_date_changed": "Fecha de entrega actualizada",
  "sales.order.assignee_changed": "Responsable actualizado",
  "sales.order.priority_changed": "Prioridad actualizada",
  "sales.order.internal_note_added": "Nota interna agregada",
  "sales.quote.created": "Cotización creada",
  "sales.quote.sent": "Cotización enviada",
  "sales.quote.approved": "Cotización aprobada",
  "sales.quote.rejected": "Cotización rechazada",
  "sales.quote.converted": "Convertida a pedido",
};

// ── Cotizaciones ──────────────────────────────────────────────────────────

/** Mapeo EN (API) → ES (UI). Exhaustivo: el build truena si falta un status. */
export const QUOTE_STATUS_ES: Record<ApiQuoteStatus, string> = {
  draft: "Borrador",
  sent: "Enviada",
  approved: "Aprobada",
  rejected: "Rechazada",
  converted: "Convertida",
};

export const QUOTE_CHANNEL_ES: Record<ApiQuoteChannel, string> = {
  whatsapp: "WhatsApp",
  email: "Correo",
  link: "Link",
  in_person: "Presencial",
};

/**
 * Etiqueta de estatus para mostrar: "Vencida" es derivada (isExpired) y nunca
 * se almacena; en cualquier otro caso, la etiqueta del status real.
 */
export function quoteDisplayStatus(quote: {
  status: ApiQuoteStatus;
  isExpired: boolean;
}): string {
  if (quote.isExpired) return "Vencida";
  return QUOTE_STATUS_ES[quote.status];
}
