/** Tipos del portal del cliente — espejan los view-models client-scoped del API. */

export type ClientOrderStatus =
  | "pending"
  | "in_design"
  | "client_approval"
  | "production"
  | "with_supplier"
  | "ready_for_delivery"
  | "delivered"
  | "cancelled";

export type ClientSession = {
  id: string;
  name: string;
  email: string;
  /** 'business' | 'individual' */
  type: string;
};

export type ClientOrderListItem = {
  id: string;
  folio: string;
  status: ClientOrderStatus;
  total: number;
  paid: number;
  balance: number;
  deliverAt: string | null;
  itemsCount: number;
  createdAt: string;
};

export type ClientOrderLine = {
  productName: string;
  qty: number;
  variantLabel: string | null;
  status: string;
  designVersion: number;
  needsApproval: boolean;
  lineTotal: number;
};

export type ClientOrderPayment = {
  method: string;
  amount: number;
  createdAt: string;
};

export type ClientReceivableBucket = "0-30" | "31-60" | "61-90" | "90+";

export type ClientReceivableOrder = {
  folio: string;
  total: number;
  paid: number;
  balance: number;
  ageDays: number;
  bucket: ClientReceivableBucket;
  dueDate: string;
  createdAt: string;
};

export type ClientDebtSummary = {
  totalBalance: number;
  overdueBalance: number;
  orderCount: number;
  b030: number;
  b3160: number;
  b6190: number;
  b90: number;
};

export type ClientOrderDetail = {
  id: string;
  folio: string;
  status: ClientOrderStatus;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid: number;
  balance: number;
  deliverAt: string | null;
  items: ClientOrderLine[];
  payments: ClientOrderPayment[];
  createdAt: string;
};
