"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { I } from "./icons";
import { useAuth } from "@/lib/auth/auth-context";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  badge?: string;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Operación",
    items: [
      { href: "/dashboard", label: "Dashboard",      icon: I.home },
      { href: "/pos",       label: "Punto de venta", icon: I.cart,    badge: "F2" },
      { href: "/quotes",    label: "Cotizaciones",   icon: I.receipt, badge: "5" },
      { href: "/orders",    label: "Pedidos",        icon: I.receipt, badge: "23" },
      { href: "/purchases", label: "Compras",        icon: I.truck,   badge: "3" },
      { href: "/calendar",  label: "Entregas",       icon: I.calendar, badge: "8" },
      { href: "/approvals", label: "Aprobaciones",   icon: I.paint,   badge: "5" },
    ],
  },
  {
    title: "Catálogo",
    items: [
      { href: "/products",  label: "Productos",   icon: I.box },
      { href: "/inventory", label: "Inventario",  icon: I.layers, badge: "3" },
      { href: "/suppliers", label: "Proveedores", icon: I.factory },
    ],
  },
  {
    title: "Personas",
    items: [
      { href: "/clients", label: "Clientes",         icon: I.users },
      { href: "/users",   label: "Usuarios",         icon: I.user },
      { href: "/roles",   label: "Roles y permisos", icon: I.shield },
    ],
  },
  {
    title: "Análisis",
    items: [
      { href: "/reports",  label: "Reportes",      icon: I.chart },
      { href: "/settings", label: "Configuración", icon: I.settings },
    ],
  },
];

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "·";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, roles, logout } = useAuth();
  const displayName = user?.name ?? "—";
  const displayInitials = user ? initialsFor(user.name) : "·";
  const displayRole =
    roles.find((r) => user?.roleIds.includes(r.id))?.name ?? "Sin rol";

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="brand-mark">N</div>
        <div className="brand-name">
          Nexum <small>POS</small>
        </div>
      </div>

      <Link href="/settings" className="sidebar__org" style={{ textDecoration: "none", color: "inherit" }}>
        <div className="org-avatar">IM</div>
        <div className="org-name">Imprenta Centro</div>
        <span className="chev">{I.chevronDown}</span>
      </Link>

      <nav className="sidebar__nav">
        {NAV_GROUPS.map((g) => (
          <div className="nav-group" key={g.title}>
            <div className="nav-group__title">{g.title}</div>
            {g.items.map((it) => {
              const active = pathname === it.href || pathname.startsWith(it.href + "/");
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={`nav-item ${active ? "is-active" : ""}`}
                >
                  <span className="nav-item__icon">{it.icon}</span>
                  {it.label}
                  {it.badge && <span className="nav-item__badge">{it.badge}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar__user">
        <div className="user-avatar">{displayInitials}</div>
        <div className="user-meta">
          <div className="user-name">{displayName}</div>
          <div className="user-role">{displayRole}</div>
        </div>
        <button
          className="icon-btn"
          title="Cerrar sesión"
          onClick={handleLogout}
          aria-label="Cerrar sesión"
        >
          {I.logout}
        </button>
      </div>
    </aside>
  );
}
