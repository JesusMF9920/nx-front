import type { Role, RoleSummary, User } from "./types";

export const NEXUM_USERS: User[] = [
  { id: "u1", name: "Mariana Castillo", initials: "MC", email: "mariana@nexum.mx", role: "Administrador", status: "Activo",   lastLogin: "Hace 2 min",   permissions: ["Todo"] },
  { id: "u2", name: "Diego Fuentes",    initials: "DF", email: "diego@nexum.mx",   role: "Cajero",        status: "Activo",   lastLogin: "Hace 14 min",  permissions: ["POS", "Tickets"] },
  { id: "u3", name: "Alma Reyes",       initials: "AR", email: "alma@nexum.mx",    role: "Diseñadora",    status: "Activo",   lastLogin: "Hace 1 h",     permissions: ["Diseños", "Aprobaciones"] },
  { id: "u4", name: "Rubén Ortega",     initials: "RO", email: "ruben@nexum.mx",   role: "Producción",    status: "Activo",   lastLogin: "Hace 3 h",     permissions: ["Pedidos", "Producción"] },
  { id: "u5", name: "Sofía Lara",       initials: "SL", email: "sofia@nexum.mx",   role: "Cajero",        status: "Inactivo", lastLogin: "Hace 12 días", permissions: ["POS"] },
  { id: "u6", name: "Tomás Ibarra",     initials: "TI", email: "tomas@nexum.mx",   role: "Administrador", status: "Activo",   lastLogin: "Hace 5 h",     permissions: ["Todo"] },
];

export const ROLE_DEFINITIONS: RoleSummary[] = [
  { name: "Administrador", scope: "Todo el sistema, configuración y reportes." },
  { name: "Cajero",        scope: "POS, tickets, clientes." },
  { name: "Diseñadora",    scope: "Diseños, versiones y aprobaciones." },
  { name: "Producción",    scope: "Pedidos, status de producción y entrega." },
];

export const CURRENT_USER: { name: string; initials: string; role: Role } = {
  name: "Mariana Castillo",
  initials: "MC",
  role: "Administrador",
};
