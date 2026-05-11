// TODO: Este archivo ya no es la fuente de verdad para usuarios — IAM real vive
// en `lib/api/users.ts`. Se mantiene sólo para el select de "Vendedor" en
// quote-new-modal.tsx mientras no exista el módulo de ventas en el backend.

type MockRoleName = "Administrador" | "Cajero" | "Diseñadora" | "Producción";

export type MockUser = {
  id: string;
  name: string;
  initials: string;
  email: string;
  role: MockRoleName;
  status: "Activo" | "Inactivo";
  lastLogin: string;
  permissions: string[];
};

export const NEXUM_USERS: MockUser[] = [
  { id: "u1", name: "Mariana Castillo", initials: "MC", email: "mariana@nexum.mx", role: "Administrador", status: "Activo",   lastLogin: "Hace 2 min",   permissions: ["Todo"] },
  { id: "u2", name: "Diego Fuentes",    initials: "DF", email: "diego@nexum.mx",   role: "Cajero",        status: "Activo",   lastLogin: "Hace 14 min",  permissions: ["POS", "Tickets"] },
  { id: "u3", name: "Alma Reyes",       initials: "AR", email: "alma@nexum.mx",    role: "Diseñadora",    status: "Activo",   lastLogin: "Hace 1 h",     permissions: ["Diseños", "Aprobaciones"] },
  { id: "u4", name: "Rubén Ortega",     initials: "RO", email: "ruben@nexum.mx",   role: "Producción",    status: "Activo",   lastLogin: "Hace 3 h",     permissions: ["Pedidos", "Producción"] },
  { id: "u5", name: "Sofía Lara",       initials: "SL", email: "sofia@nexum.mx",   role: "Cajero",        status: "Inactivo", lastLogin: "Hace 12 días", permissions: ["POS"] },
  { id: "u6", name: "Tomás Ibarra",     initials: "TI", email: "tomas@nexum.mx",   role: "Administrador", status: "Activo",   lastLogin: "Hace 5 h",     permissions: ["Todo"] },
];
