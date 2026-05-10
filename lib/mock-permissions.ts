import type { PermissionGroup } from "./types";

export const NEXUM_PERMISSIONS: PermissionGroup[] = [
  {
    group: "Ventas",
    items: [
      { id: "sales.pos",           label: "Operar Punto de Venta" },
      { id: "sales.discount",      label: "Aplicar descuentos" },
      { id: "sales.discount_high", label: "Descuentos > 15%" },
      { id: "sales.credit",        label: "Vender a crédito" },
      { id: "sales.refund",        label: "Devoluciones y notas de crédito" },
      { id: "sales.cancel",        label: "Cancelar ventas" },
    ],
  },
  {
    group: "Cotizaciones",
    items: [
      { id: "quote.view",    label: "Ver cotizaciones" },
      { id: "quote.create",  label: "Crear cotizaciones" },
      { id: "quote.approve", label: "Convertir cotización a pedido" },
    ],
  },
  {
    group: "Producción",
    items: [
      { id: "prod.approve",  label: "Aprobar diseños internamente" },
      { id: "prod.send",     label: "Enviar pruebas al cliente" },
      { id: "prod.schedule", label: "Reasignar fechas y prioridades" },
    ],
  },
  {
    group: "Inventario",
    items: [
      { id: "inv.view",   label: "Ver inventario" },
      { id: "inv.entry",  label: "Registrar entradas de mercancía" },
      { id: "inv.adjust", label: "Ajustes de stock" },
      { id: "inv.recipe", label: "Editar recetas (BOM)" },
    ],
  },
  {
    group: "Compras",
    items: [
      { id: "buy.view",    label: "Ver órdenes de compra" },
      { id: "buy.create",  label: "Crear OC" },
      { id: "buy.approve", label: "Aprobar OC" },
      { id: "buy.receive", label: "Recibir mercancía" },
    ],
  },
  {
    group: "Catálogo",
    items: [
      { id: "cat.product",  label: "Administrar productos" },
      { id: "cat.price",    label: "Editar precios" },
      { id: "cat.supplier", label: "Administrar proveedores" },
      { id: "cat.client",   label: "Administrar clientes" },
    ],
  },
  {
    group: "Sistema",
    items: [
      { id: "sys.users",    label: "Administrar usuarios" },
      { id: "sys.roles",    label: "Administrar roles y permisos" },
      { id: "sys.reports",  label: "Ver reportes financieros" },
      { id: "sys.settings", label: "Configuración general" },
      { id: "sys.audit",    label: "Ver bitácora de auditoría" },
    ],
  },
];
