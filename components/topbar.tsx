"use client";

import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { I } from "./icons";

const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  pos: "Punto de venta",
  quotes: "Cotizaciones",
  orders: "Pedidos",
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

function crumbsFor(pathname: string): string[] {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return ["Nexum POS"];
  const head = segments[0];
  return ["Nexum POS", ROUTE_LABELS[head] ?? head];
}

export function Topbar() {
  const pathname = usePathname();
  const crumbs = crumbsFor(pathname);

  return (
    <header className="topbar">
      <div className="crumbs">
        {crumbs.map((c, i) => (
          <Fragment key={i}>
            {i > 0 && <span className="sep">{I.chevronRight}</span>}
            {i === crumbs.length - 1 ? <strong>{c}</strong> : <span>{c}</span>}
          </Fragment>
        ))}
      </div>

      <div className="topbar__search">
        {I.search}
        <input placeholder="Buscar pedidos, clientes, productos…" />
        <span className="kbd">⌘K</span>
      </div>

      <button className="icon-btn" title="Notificaciones" aria-label="Notificaciones">
        {I.bell}
      </button>
      <button className="icon-btn" title="Ayuda" aria-label="Ayuda">
        {I.alert}
      </button>
    </header>
  );
}
