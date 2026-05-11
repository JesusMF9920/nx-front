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
