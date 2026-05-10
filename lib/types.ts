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
