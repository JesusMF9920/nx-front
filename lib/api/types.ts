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
  createdAt: string;
  updatedAt: string;
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
  createdAt: string;
  updatedAt: string;
};

export type ApiStockMoveType = "entry" | "exit" | "adjust";

export type ApiStockMove = {
  id: string;
  materialId: string;
  type: ApiStockMoveType;
  qty: number;
  resultingStock: number;
  ref: string | null;
  note: string | null;
  actorId: string | null;
  createdAt: string;
};
