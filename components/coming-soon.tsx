import { PageHeader } from "./page-header";

const ROUTE_LABELS: Record<string, string> = {
  pos: "Punto de venta",
  orders: "Pedidos",
  calendar: "Calendario de entregas",
  approvals: "Aprobaciones",
  products: "Productos",
  inventory: "Inventario",
  suppliers: "Proveedores",
  clients: "Clientes",
  reports: "Reportes",
  settings: "Configuración",
};

export function ComingSoon({ slug }: { slug: string }) {
  const title = ROUTE_LABELS[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1);
  return (
    <>
      <PageHeader title={title} sub="Módulo en construcción" />
      <div className="empty">
        <div style={{ fontSize: 14, color: "var(--ink-2)", fontWeight: 500, marginBottom: 6 }}>
          Próximamente
        </div>
        Este módulo se entregará en una iteración posterior. Por ahora, sólo Login y Usuarios están implementados a nivel maqueta.
      </div>
    </>
  );
}
