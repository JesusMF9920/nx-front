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

// ── Design (Fase F): fichas de diseño + aprobación de clientes ─────────────

export type ApiDesignProofStatus =
  | "draft"
  | "awaiting_client"
  | "changes_requested"
  | "approved";

export type ApiApprovalChannel = "link" | "whatsapp" | "email";

export type ApiDesignCommentAuthorType = "user" | "client" | "system";

/** Forma del GET /design/proofs (lista). */
export type ApiDesignProofListItem = {
  id: string;
  folio: string;
  orderId: string;
  orderFolio: string;
  clientName: string;
  productName: string;
  status: ApiDesignProofStatus;
  currentVersion: number;
  lastChannel: ApiApprovalChannel | null;
  lastSentAt: string | null;
  updatedAt: string;
};

export type ApiDesignProofVersion = {
  version: number;
  contentType: string;
  note: string | null;
  sentAt: string | null;
  channel: ApiApprovalChannel | null;
  createdAt: string;
};

export type ApiDesignProofComment = {
  id: string;
  authorType: ApiDesignCommentAuthorType;
  authorName: string;
  body: string;
  createdAt: string;
};

/** Forma del GET /design/proofs/:idOrFolio (detalle). */
export type ApiDesignProofDetail = {
  id: string;
  folio: string;
  orderId: string;
  orderItemId: string;
  orderFolio: string;
  clientName: string;
  productName: string;
  itemSource: "internal" | "supplier";
  status: ApiDesignProofStatus;
  currentVersion: number;
  lastChannel: ApiApprovalChannel | null;
  lastSentAt: string | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
  versions: ApiDesignProofVersion[];
  comments: ApiDesignProofComment[];
};

export type ApiSendProofResult = {
  proofId: string;
  version: number;
  channel: ApiApprovalChannel;
  /** URL pública completa — única vez que el backend la entrega. */
  url: string;
  expiresAt: string;
  /** Correo del destinatario cuando channel='email'; null en otros canales. */
  sentTo: string | null;
};

export type ApiProofDownload = {
  downloadUrl: string;
  contentType: string;
  expiresIn: number;
};

/** Vista pública (página /approve/[token], sin login). */
export type ApiPublicApproval = {
  folio: string;
  orderFolio: string;
  productName: string;
  clientName: string;
  status: ApiDesignProofStatus;
  version: number;
  versionNote: string | null;
  contentType: string;
  previewUrl: string;
  tokenExpiresAt: string;
  comments: ApiDesignProofComment[];
};

// Los tokens NO viajan en el body: viven solo en las cookies httpOnly que setea
// el backend. El front usa `user` + los expiry para UX.
export type ApiLoginResponse = {
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
  /** CFDI — razón social fiscal si difiere del nombre comercial. */
  fiscalName: string | null;
  /** CFDI — uso del CFDI por defecto (c_UsoCFDI). */
  usoCFDI: string | null;
  /** CFDI — CP del domicilio fiscal del receptor (DomicilioFiscalReceptor). */
  postalCode: string | null;
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

/** Escalón de mayoreo: desde `minQty` unidades, el precio base es `unitPrice`. */
export type ApiPriceTier = {
  minQty: number;
  unitPrice: number;
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
  /** CFDI — códigos SAT del concepto (null = hereda el default del negocio). */
  claveProdServ: string | null;
  claveUnidad: string | null;
  objetoImpuesto: string | null;
  variantType: ApiVariantType;
  /**
   * Mayoreo por volumen (asc por minQty); null/[] = sin mayoreo. Viaja también
   * en la lista (no sólo en el detalle) para que el POS muestre el precio por
   * cantidad sin un GET por producto.
   */
  priceTiers: ApiPriceTier[] | null;
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
  /** Insumo bajo demanda: no se almacena, se compra al pedir. */
  buyToOrder: boolean;
  isActive: boolean;
  variants: ApiMaterialVariant[];
  createdAt: string;
  updatedAt: string;
};

/** Insumo bajo demanda que se comprará para la venta (no descuenta stock). */
export type ApiToPurchaseLine = {
  materialId: string;
  materialName: string;
  unit: string;
  materialVariantId: string | null;
  materialVariantCode: string | null;
  qty: number;
  supplierName: string | null;
};

/** Demanda de compra pendiente (insumo bajo demanda) de un pedido — "Por comprar". */
export type ApiMaterialDemand = {
  id: string;
  orderId: string;
  orderFolio: string;
  clientName: string;
  deliverAt: string | null;
  materialId: string;
  materialName: string;
  unit: string;
  materialVariantId: string | null;
  materialVariantCode: string | null;
  qty: number;
  unitCost: number;
  supplierName: string | null;
  createdAt: string;
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

export type ApiPaymentMethod = "cash" | "terminal" | "transfer";

export type ApiPayment = {
  id: string;
  method: ApiPaymentMethod;
  amount: number;
  reference: string | null;
  receivedById: string;
  createdAt: string;
};

/** Devolución de dinero (DEV-). SOLO dinero — no revierte stock. */
export type ApiRefund = {
  id: string;
  folio: string;
  method: ApiPaymentMethod;
  amount: number;
  reason: string;
  createdById: string;
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
  /** Null en líneas ad-hoc (producto libre). */
  productId: string | null;
  /** Nombre del producto libre (ad-hoc); null en líneas de catálogo. */
  adHocName: string | null;
  productName: string;
  sku: string;
  /** Nota libre por línea; null si no hay. */
  lineNote: string | null;
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

/** Un job en la cola de producción (GET /production/queue). */
export type ApiProductionItem = {
  itemId: string;
  orderId: string;
  orderFolio: string;
  clientName: string;
  productName: string;
  sku: string;
  qty: number;
  variantLabel: string | null;
  source: ApiProductSource;
  supplierName: string | null;
  needsApproval: boolean;
  status: ApiOrderStatus;
  designVersion: number;
  /** Estación del taller; null = "Sin asignar". */
  station: ApiProductionStation | null;
  deliverAt: string | null;
  orderCreatedAt: string;
};

export type ApiProductionStation =
  | "offset"
  | "screen_printing"
  | "large_format"
  | "finishing";

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
  /** Σ refunds (devoluciones) — siempre derivado por el backend. */
  refunded: number;
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
  refunds: ApiRefund[];
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
  /** Null en líneas ad-hoc (producto libre). */
  productId: string | null;
  /** Nombre del producto libre (ad-hoc); null en líneas de catálogo. */
  adHocName: string | null;
  productName: string;
  sku: string;
  /** Nota libre por línea; null si no hay. */
  lineNote: string | null;
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

export type ApiPaymentMixMethod = "cash" | "terminal" | "transfer" | "credit";

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

/** Identidad del negocio (módulo settings) — la llevan tickets y PDFs. */
export type ApiBusinessSettings = {
  name: string;
  address: string | null;
  phone: string | null;
  rfc: string | null;
  email: string | null;
  /** Object key en Spaces (settings/logo-…); null sin logo. */
  logoKey: string | null;
  /** GET presignada temporal (TTL 10 min); null sin logo o sin storage. */
  logoUrl: string | null;
  /** CFDI — régimen fiscal SAT del emisor (c_RegimenFiscal). */
  taxRegimen: string | null;
  /** CFDI — CP del domicilio fiscal / lugar de expedición. */
  postalCode: string | null;
  /** CFDI — defaults SAT de conceptos (override por producto). */
  defaultClaveProdServ: string | null;
  defaultClaveUnidad: string | null;
  defaultObjetoImpuesto: string | null;
  updatedAt: string | null;
};

/** Feature flag del catálogo del backend (label/description ya en español). */
export type ApiFeatureFlag = {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  updatedAt: string | null;
};

/** Corte de caja (I.1). */
export type ApiCashMovementType = "deposit" | "withdrawal";

export type ApiCashMovement = {
  id: string;
  type: ApiCashMovementType;
  amount: number;
  reason: string;
  createdById: string;
  createdAt: string;
};

export type ApiCashSessionStatus = "open" | "closed";

/**
 * Sesión de caja. Arqueo CIEGO: counted/expected/difference son null mientras
 * está abierta — el esperado solo existe después del corte.
 */
export type ApiCashSession = {
  id: string;
  folio: string;
  status: ApiCashSessionStatus;
  openingFloat: number;
  openedById: string;
  openedAt: string;
  closedById: string | null;
  closedAt: string | null;
  countedCash: number | null;
  expectedCash: number | null;
  /** counted − expected (negativo = faltante). */
  difference: number | null;
  closingNotes: string | null;
  movements: ApiCashMovement[];
};

/**
 * Corte X/Z: la sesión + desglose de pagos. Los totales son null en sesiones
 * ABIERTAS (exponerlos permitiría derivar el esperado del arqueo ciego).
 */
export type ApiCashSessionDetail = ApiCashSession & {
  cashTotal: number | null;
  cashCount: number | null;
  /** Σ devoluciones en efectivo de la sesión — salen del cajón. */
  refundsTotal: number | null;
  refundsCount: number | null;
  terminalTotal: number | null;
  terminalCount: number | null;
  transferTotal: number | null;
  transferCount: number | null;
};

export type ApiCashCloseResult = {
  sessionId: string;
  folio: string;
  countedCash: number;
  expectedCash: number;
  difference: number;
};

// ── Facturación (CFDI) ─────────────────────────────────────────────────────

export type ApiInvoiceType = "ingreso" | "pago" | "global";
export type ApiInvoiceStatus = "draft" | "stamped" | "sent" | "cancelled";

export type ApiInvoice = {
  id: string;
  type: ApiInvoiceType;
  status: ApiInvoiceStatus;
  orderId: string | null;
  orderFolio: string | null;
  /** Factura global: pedidos agregados. Vacío en ingreso/pago. */
  includedOrderIds: string[];
  /** Folio fiscal (UUID); null hasta timbrar. */
  uuid: string | null;
  serie: string | null;
  folio: string | null;
  /** MetodoPago SAT del Ingreso ('PUE'|'PPD'); null en pago/global. */
  paymentMethod: string | null;
  subtotal: number;
  total: number;
  currency: string;
  receiverRfc: string | null;
  receiverName: string | null;
  cancelReason: string | null;
  /** Estatus del acuse de cancelación del SAT ('canceled' | 'pending'). */
  cancelStatus: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
};
