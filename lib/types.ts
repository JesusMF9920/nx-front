export type Role = "Administrador" | "Cajero" | "Diseñadora" | "Producción";

export type UserStatus = "Activo" | "Inactivo";

export type User = {
  id: string;
  name: string;
  initials: string;
  email: string;
  role: Role;
  status: UserStatus;
  lastLogin: string;
  permissions: string[];
};

export type RoleSummary = {
  name: Role;
  scope: string;
};

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
  variantLabel?: string;
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
