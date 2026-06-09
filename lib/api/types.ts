export type ApiUser = {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  emailVerifiedAt: string | null;
  roleIds: string[];
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ApiRole = {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
};

export type ApiLoginUser = {
  id: string;
  email: string;
  name: string;
  roleIds: string[];
  permissions: string[];
  mustChangePassword: boolean;
};

// Storage — presigned URLs para subir/leer en DigitalOcean Spaces.
export type ApiPresignUpload = {
  /** Object key generado por el backend (no lo controla el cliente). */
  key: string;
  /** URL firmada para el PUT directo a Spaces. */
  uploadUrl: string;
  /** Vigencia de `uploadUrl` en segundos. */
  expiresIn: number;
};

export type ApiPresignDownload = {
  /** URL firmada temporal para ver/descargar el objeto privado. */
  downloadUrl: string;
  /** Vigencia de `downloadUrl` en segundos. */
  expiresIn: number;
};

export type ApiLoginResponse = {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: string;
  refreshExpiresAt: string;
  user: ApiLoginUser;
};

export type ApiMe = {
  user: ApiUser;
  roles: ApiRole[];
  permissions: string[];
};

export type ApiList<T> = {
  items: T[];
  total: number;
};

export type ApiClientType = "business" | "individual";

export type ApiClientAddressType = "billing" | "delivery" | "other";

export type ApiClientAddress = {
  id: string;
  type: ApiClientAddressType;
  label: string | null;
  line1: string;
  line2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string;
  createdAt: string;
  updatedAt: string;
};

export type ApiClient = {
  id: string;
  name: string;
  type: ApiClientType;
  contact: string | null;
  phone: string | null;
  email: string | null;
  rfc: string | null;
  taxRegimen: string | null;
  notes: string | null;
  tags: string[];
  additionalPhones: string[];
  additionalEmails: string[];
  isActive: boolean;
  addresses: ApiClientAddress[];
  createdAt: string;
  updatedAt: string;
};

export type ApiProductSource = "internal" | "supplier";

export type ApiVariantType =
  | "none"
  | "size"
  | "preset"
  | "dimension"
  | "sized_from_material";

export type ApiProductVariant = {
  code: string;
  label: string;
  priceMod: number;
  stock: number;
  sortOrder: number;
};

export type ApiDimensionConfig = {
  unit: "cm" | "m" | "in";
  min: number;
  max: number;
  step: number;
  priceMode: "area" | "linear" | "flat";
};

export type ApiRecipeItem = {
  materialId: string;
  qty: number;
  byVariant: boolean;
  note: string | null;
};

export type ApiProduct = {
  id: string;
  sku: string;
  name: string;
  category: string;
  method: string | null;
  source: ApiProductSource;
  supplierName: string | null;
  leadDays: number;
  price: number;
  cost: number;
  stock: number;
  unit: string;
  needsApproval: boolean;
  isActive: boolean;
  variantType: ApiVariantType;
  createdAt: string;
  updatedAt: string;
};

/** Forma del GET /products/:id — la lista sólo trae ApiProduct. */
export type ApiProductDetail = ApiProduct & {
  variants: ApiProductVariant[];
  dimensionConfig: ApiDimensionConfig | null;
  sizeSurcharges: Record<string, number> | null;
  sizedFromMaterialId: string | null;
  recipeItems: ApiRecipeItem[];
};

export type ApiMaterialVariant = {
  id: string;
  code: string;
  label: string;
  stock: number;
  sortOrder: number;
};

export type ApiMaterial = {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  stock: number;
  reorderPoint: number;
  cost: number;
  location: string | null;
  supplierName: string | null;
  isActive: boolean;
  variants: ApiMaterialVariant[];
  createdAt: string;
  updatedAt: string;
};

export type ApiStockMoveType = "entry" | "exit" | "adjust";

export type ApiStockMove = {
  id: string;
  materialId: string;
  /** null = movimiento sobre el material completo (o variante eliminada). */
  materialVariantId: string | null;
  materialVariantCode: string | null;
  materialVariantLabel: string | null;
  type: ApiStockMoveType;
  qty: number;
  resultingStock: number;
  ref: string | null;
  note: string | null;
  actorId: string | null;
  createdAt: string;
};

export type ApiOrderStatus =
  | "pending"
  | "in_design"
  | "client_approval"
  | "production"
  | "with_supplier"
  | "ready_for_delivery"
  | "delivered"
  | "cancelled";

export type ApiPaymentMethod = "cash" | "terminal";

export type ApiPayment = {
  id: string;
  method: ApiPaymentMethod;
  amount: number;
  reference: string | null;
  receivedById: string;
  createdAt: string;
};

export type ApiSizeBreakdownEntry = {
  sizeId: string;
  /** Piezas de esa talla. */
  qty: number;
  /** Sobreprecio resuelto server-side al vender (snapshot). */
  surcharge: number;
  /** Etiqueta legible (p.ej. "Chica"), snapshot al vender; órdenes viejas no la traen. */
  sizeLabel?: string;
};

export type ApiDimensionData = {
  width: number;
  height: number;
  unit: "cm" | "m" | "in";
  priceMode: "area" | "linear" | "flat";
  /** Unidades calculadas (m², m lineales o 1 para tarifa fija). */
  computedQty: number;
};

export type ApiOrderItem = {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  qty: number;
  unitPrice: number;
  variantCode: string | null;
  variantLabel: string | null;
  sizeBreakdown: ApiSizeBreakdownEntry[] | null;
  dimensionData: ApiDimensionData | null;
  source: ApiProductSource;
  supplierName: string | null;
  needsApproval: boolean;
  status: ApiOrderStatus;
  designVersion: number;
  lineTotal: number;
};

/** Forma del GET /orders (lista). */
export type ApiOrder = {
  id: string;
  folio: string;
  clientId: string;
  clientName: string;
  status: ApiOrderStatus;
  total: number;
  /** Σ payments — siempre derivado por el backend. */
  paid: number;
  paymentMethods: ApiPaymentMethod[];
  deliverAt: string | null;
  itemsCount: number;
  createdAt: string;
};

/** Forma del GET /orders/:idOrFolio (detalle). */
export type ApiOrderDetail = Omit<ApiOrder, "itemsCount"> & {
  subtotal: number;
  discount: number;
  tax: number;
  notes: string | null;
  quoteId: string | null;
  cancelledAt: string | null;
  items: ApiOrderItem[];
  payments: ApiPayment[];
  updatedAt: string;
};

// ── Cotizaciones (Fase C) ─────────────────────────────────────────────────

export type ApiQuoteStatus =
  | "draft"
  | "sent"
  | "approved"
  | "rejected"
  | "converted";

export type ApiQuoteChannel = "whatsapp" | "email" | "link" | "in_person";

export type ApiQuoteItem = {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  qty: number;
  unitPrice: number;
  /** true ⇒ el precio unitario fue negociado a mano. */
  priceOverridden: boolean;
  variantCode: string | null;
  variantLabel: string | null;
  sizeBreakdown: ApiSizeBreakdownEntry[] | null;
  dimensionData: ApiDimensionData | null;
  source: ApiProductSource;
  supplierName: string | null;
  needsApproval: boolean;
  lineTotal: number;
};

/** Forma del GET /quotes (lista). */
export type ApiQuote = {
  id: string;
  folio: string;
  clientId: string;
  clientName: string;
  createdByName: string;
  status: ApiQuoteStatus;
  total: number;
  validUntil: string | null;
  /** Derivado en el backend: vigencia vencida y status sent/approved. */
  isExpired: boolean;
  itemsCount: number;
  /** Orden generada al convertir (null si aún no se convierte). */
  convertedOrderId: string | null;
  createdAt: string;
};

/** Forma del GET /quotes/:idOrFolio (detalle). */
export type ApiQuoteDetail = Omit<ApiQuote, "itemsCount"> & {
  createdById: string;
  subtotal: number;
  discount: number;
  tax: number;
  notes: string | null;
  channel: ApiQuoteChannel | null;
  rejectionReason: string | null;
  sentAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  convertedAt: string | null;
  items: ApiQuoteItem[];
  updatedAt: string;
};

export type ApiQuotePreviewLine = {
  productId: string;
  productName: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  priceOverridden: boolean;
};

export type ApiQuotePreview = {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  lines: ApiQuotePreviewLine[];
};

/** Resultado de convertir una cotización en orden. */
export type ApiConvertResult = {
  orderId: string;
  folio: string;
  total: number;
  paid: number;
};

// ── Compras / Órdenes de compra (Fase D) ──────────────────────────────────

export type ApiPurchaseStatus = "draft" | "sent" | "received" | "cancelled";

export type ApiPurchaseLineKind = "catalog" | "free";

export type ApiPurchaseLine = {
  id: string;
  /** 'catalog' (referencia un material) | 'free' (línea libre ad-hoc). */
  kind: ApiPurchaseLineKind;
  /** null en línea libre. */
  materialId: string | null;
  /** Nombre del material (catálogo) o el texto de la línea libre. */
  materialName: string;
  sku: string | null;
  materialVariantId: string | null;
  variantCode: string | null;
  variantLabel: string | null;
  qty: number;
  unitCost: number;
  lineTotal: number;
};

/** Forma del GET /purchases (lista). */
export type ApiPurchaseOrder = {
  id: string;
  folio: string;
  supplierId: string;
  supplierName: string;
  status: ApiPurchaseStatus;
  total: number;
  expectedDate: string | null;
  itemsCount: number;
  receivedAt: string | null;
  createdAt: string;
};

/** Forma del GET /purchases/:idOrFolio (detalle). */
export type ApiPurchaseOrderDetail = Omit<ApiPurchaseOrder, "itemsCount"> & {
  createdById: string;
  subtotal: number;
  discount: number;
  tax: number;
  notes: string | null;
  cancelledAt: string | null;
  items: ApiPurchaseLine[];
  updatedAt: string;
};

export type ApiStockShortage = {
  materialId: string;
  materialName: string;
  unit: string;
  materialVariantCode: string | null;
  required: number;
  available: number;
  /** true si el material/talla no existe (línea de receta rota). */
  missing: boolean;
};

export type ApiConsumptionLine = {
  materialId: string;
  materialName: string;
  unit: string;
  materialVariantId: string | null;
  materialVariantCode: string | null;
  qty: number;
  stockBefore: number;
  stockAfter: number;
  reorderPoint: number;
};

export type ApiSupplier = {
  id: string;
  name: string;
  service: string | null;
  contact: string | null;
  email: string | null;
  phone: string | null;
  rfc: string | null;
  leadDays: number;
  reliability: number;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

// ── Reportes / Dashboard (Fase E) ──────────────────────────────────────────

export type ApiReportDaily = {
  /** 'YYYY-MM-DD' en TZ America/Mexico_City. */
  day: string;
  sales: number;
  orders: number;
  margin: number;
};

export type ApiDashboardDelivery = {
  orderId: string;
  folio: string;
  clientName: string;
  status: ApiOrderStatus;
  deliverAt: string;
  itemsCount: number;
};

export type ApiDashboardOrder = {
  orderId: string;
  folio: string;
  clientName: string;
  sellerName: string | null;
  status: ApiOrderStatus;
  total: number;
  deliverAt: string | null;
  createdAt: string;
};

export type ApiDashboard = {
  salesToday: number;
  openOrders: number;
  upcomingDeliveries: number;
  /** Proxy por order.status='client_approval' hasta el módulo design (Fase F). */
  pendingApprovals: number;
  salesSeries: ApiReportDaily[];
  todayDeliveries: ApiDashboardDelivery[];
  recentOrders: ApiDashboardOrder[];
};

export type ApiPaymentMixMethod = "cash" | "terminal" | "credit";

export type ApiPaymentMixEntry = {
  method: ApiPaymentMixMethod;
  amount: number;
  /** % sobre ventas (0–100). */
  pct: number;
};

export type ApiCategoryMixEntry = {
  category: string;
  sales: number;
  /** % sobre el total de categorías (suma 100). */
  pct: number;
};

export type ApiSalesSummary = {
  totals: {
    sales: number;
    orders: number;
    avgTicket: number;
    margin: number;
    marginPct: number;
  };
  daily: ApiReportDaily[];
  paymentMix: ApiPaymentMixEntry[];
  categoryMix: ApiCategoryMixEntry[];
};

export type ApiTopProduct = {
  productId: string;
  name: string;
  category: string;
  qty: number;
  sales: number;
  margin: number;
  marginPct: number;
};

export type ApiTopClient = {
  clientId: string;
  name: string;
  orders: number;
  sales: number;
  margin: number;
  debt: number;
};

export type ApiSeller = {
  sellerId: string;
  name: string | null;
  orders: number;
  sales: number;
  avgTicket: number;
  conversionPct: number;
};

export type ApiAgingBucket = "0-30" | "31-60" | "61-90" | "90+";

export type ApiAgingRow = {
  orderId: string;
  folio: string;
  clientName: string;
  /** 'YYYY-MM-DD' (fecha de la venta). */
  date: string;
  bucket: ApiAgingBucket;
  total: number;
  b030: number;
  b3160: number;
  b6190: number;
  b90: number;
};
