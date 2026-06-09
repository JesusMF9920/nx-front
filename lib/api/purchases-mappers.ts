import type { ApiPurchaseStatus } from "./types";

/** Mapeo EN (API) → ES (UI). Exhaustivo: el build truena si falta un status. */
export const PURCHASE_STATUS_ES: Record<ApiPurchaseStatus, string> = {
  draft: "Borrador",
  sent: "Enviada",
  received: "Recibida",
  cancelled: "Cancelada",
};

/**
 * Acciones de auditoría del flujo de compras (backend:
 * inventory/domain/events/purchase-order.events.ts) → etiqueta ES para el
 * timeline. Lookup con fallback: `PURCHASE_AUDIT_ACTION_ES[a] ?? a`.
 */
export const PURCHASE_AUDIT_ACTION_ES: Record<string, string> = {
  "inventory.purchase_order.created": "Orden de compra creada",
  "inventory.purchase_order.sent": "Enviada al proveedor",
  "inventory.purchase_order.received": "Mercancía recibida",
  "inventory.purchase_order.cancelled": "Orden cancelada",
  "inventory.stock.moved": "Entrada de stock",
};
