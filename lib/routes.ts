export const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  pos: "Punto de venta",
  quotes: "Cotizaciones",
  orders: "Pedidos",
  invoices: "Facturas",
  collections: "Cobranza",
  production: "Producción",
  purchases: "Compras",
  calendar: "Calendario",
  approvals: "Aprobaciones",
  products: "Productos",
  inventory: "Inventario",
  suppliers: "Proveedores",
  clients: "Clientes",
  users: "Usuarios",
  roles: "Roles y permisos",
  reports: "Reportes",
  settings: "Configuración",
};

export function labelForRoute(slug: string): string {
  return ROUTE_LABELS[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1);
}
