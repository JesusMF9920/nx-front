// NOTE: Los tipos de IAM (Role, User, RoleSummary, UserStatus, RoleDefinition,
// PermissionItem, PermissionGroup) viven ahora en `lib/api/types.ts` (datos reales)
// y `lib/permissions-catalog.ts` (catálogo de permisos). Los archivos mock
// (lib/mock-users.ts, mock-roles.ts, mock-permissions.ts) declaran sus propios
// shapes ya que no son la fuente de verdad para IAM — sólo prototipo de UI.

export type OrderStatus =
  | "En diseño"
  | "Aprobación cliente"
  | "Producción"
  | "Listo para entrega"
  | "Entregado"
  | "Con proveedor"
  | "Pendiente";

export type Order = {
  id: string;
  date: string;
  client: string;
  clientId: string;
  total: number;
  paid: number;
  payment: "Efectivo" | "Terminal" | "Mixto" | "Pendiente";
  status: OrderStatus;
  deliver: string;
  items: number;
};

export type Delivery = {
  id: string;
  client: string;
  items: string;
  time: string;
  status: OrderStatus;
  supplier: boolean;
};

export type ApprovalStatus = "Esperando cliente" | "Cambios solicitados" | "Aprobado";

export type ClientType = "Negocio" | "Persona";

export type Client = {
  id: string;
  name: string;
  type: ClientType;
  contact: string;
  phone: string;
  email: string;
  rfc: string;
  balance: number;
  orders: number;
  lastOrder: string;
  tags: string[];
};

export type ClientFilter = "Todos" | "Frecuentes" | "Con crédito" | "Saldo pendiente";

export type Supplier = {
  id: string;
  name: string;
  service: string;
  leadDays: number;
  lastOrder: string;
  reliability: number;
};

export type ProductSource = "Interno" | "Proveedor";

export type VariantType = "none" | "size" | "preset" | "dimension" | "sizedFromMaterial";

export type Variant = {
  id: string;
  label: string;
  priceMod: number;
  stock: number;
};

export type DimensionConfig = {
  unit: "cm" | "m" | "pulgadas";
  min: number;
  max: number;
  step: number;
  priceMode: "area" | "linear" | "flat";
};

export type Product = {
  id: string;
  sku: string;
  name: string;
  category: string;
  method: string;
  source: ProductSource;
  supplier?: string;
  leadDays: number;
  price: number;
  cost: number;
  stock: number;
  unit: string;
  needsApproval: boolean;
  active: boolean;
  variantType: VariantType;
  variants?: Variant[];
  dimensionConfig?: DimensionConfig;
  sizedFromMaterial?: string;
  sizeSurcharges?: Record<string, number>;
};

export type ProductFilter = "Todos" | "Internos" | "Proveedor" | "Bajo stock";

export type ProductView = "list" | "grid";

export type MaterialVariant = {
  id: string;
  label: string;
  stock: number;
};

export type Material = {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  stock: number;
  reorder: number;
  cost: number;
  location: string;
  supplierName: string;
  variants?: MaterialVariant[];
};

export type RecipeItem = {
  materialId: string;
  qty: number;
  byVariant?: boolean;
  note?: string;
};

export type Recipe = RecipeItem[];

export type SizeBreakdownEntry = {
  sizeId: string;
  qty: number;
  surcharge: number;
};

export type PaymentMethod = "Efectivo" | "Terminal" | "Mixto" | "Crédito";

export type StockMoveType = "entrada" | "salida" | "ajuste";

export type StockMove = {
  id: string;
  date: string;
  type: StockMoveType;
  materialId: string;
  qty: number;
  ref: string;
  note: string;
  user: string;
};

export type QuoteStatus = "Enviada" | "Aprobada" | "Convertida" | "Rechazada" | "Vencida" | "Borrador";

export type QuoteChannel = "WhatsApp" | "Correo" | "Link" | "Presencial";

export type Quote = {
  id: string;
  date: string;
  client: string;
  items: number;
  total: number;
  status: QuoteStatus;
  validUntil: string;
  seller: string;
  notes: string;
  channel: QuoteChannel;
};

export type PurchaseStatus = "Borrador" | "Enviada" | "Recibida parcial" | "Recibida" | "Cancelada";

export type PurchaseLine = {
  materialId: string | null;
  name?: string;
  qty: number;
  cost: number;
  received?: number;
};

export type Purchase = {
  id: string;
  date: string;
  supplier: string;
  items: number;
  total: number;
  status: PurchaseStatus;
  expected: string;
  buyer: string;
  forOrder?: string;
  lines: PurchaseLine[];
};

export type ReportDay = {
  date: string;
  sales: number;
  orders: number;
  margin: number;
};

export type ProductPerformance = {
  name: string;
  cat: string;
  qty: number;
  sales: number;
  margin: number;
};

export type ClientPerformance = {
  name: string;
  orders: number;
  sales: number;
  margin: number;
  debt: number;
};

export type SellerPerformance = {
  name: string;
  initials: string;
  orders: number;
  sales: number;
  ticket: number;
  conv: number;
};

export type AgingEntry = {
  client: string;
  invoice: string;
  date: string;
  total: number;
  b030: number;
  b3160: number;
  b6190: number;
  b90: number;
};

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

export type Approval = {
  id: string;
  order: string;
  client: string;
  product: string;
  version: number;
  sent: string;
  channel: "Link" | "WhatsApp";
  status: ApprovalStatus;
  note: string;
};
