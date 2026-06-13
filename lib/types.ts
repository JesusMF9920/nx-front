// Tipos de UI que NO duplican el contrato del API (esos viven en
// `lib/api/types.ts`). Aquí sólo quedan shapes locales del POS y los pocos
// unions en español que consumen componentes de presentación.

/** Status de orden en español — sólo display (StatusPill). */
export type OrderStatus =
  | "En diseño"
  | "Aprobación cliente"
  | "Producción"
  | "Listo para entrega"
  | "Entregado"
  | "Con proveedor"
  | "Pendiente";

export type ProductSource = "Interno" | "Proveedor";

export type SizeBreakdownEntry = {
  sizeId: string;
  qty: number;
  surcharge: number;
};

export type PaymentMethod =
  | "Efectivo"
  | "Terminal"
  | "Transferencia"
  | "Mixto"
  | "Crédito";

export type CartLine = {
  lineId: string;
  id: string;
  name: string;
  sku: string;
  source: ProductSource;
  supplier?: string;
  needsApproval: boolean;
  qty: number;
  price: number;
  /** Code de la variante (preset/size) — lo que CheckoutLineInput exige; el label es solo display. */
  variantCode?: string;
  variantLabel?: string;
  /** Medidas crudas para variantType dimension — el backend deriva qty/precio. */
  dimension?: { width: number; height: number };
  sizeBreakdown?: SizeBreakdownEntry[];
  sizedFromMaterial?: string;
};
