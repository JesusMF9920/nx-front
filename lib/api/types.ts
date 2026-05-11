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
