"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { I } from "./icons";
import { useAuth } from "@/lib/auth/auth-context";
import { reportsApi } from "@/lib/api/reports";
import { inventoryApi } from "@/lib/api/inventory";
import { settingsApi } from "@/lib/api/settings";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  /** Si está presente, sólo se muestra cuando el usuario tiene este permiso. */
  perm?: string;
  /** Si está presente, sólo se muestra con este feature flag encendido. */
  feature?: string;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Operación",
    items: [
      { href: "/dashboard", label: "Dashboard",      icon: I.home,    perm: "reports.read" },
      { href: "/pos",       label: "Punto de venta", icon: I.cart,    perm: "sales.pos.sell" },
      { href: "/cash",      label: "Caja",           icon: I.cash,    perm: "sales.cash.read", feature: "cash_sessions" },
      { href: "/quotes",    label: "Cotizaciones",   icon: I.receipt, perm: "sales.quotes.read" },
      { href: "/orders",    label: "Pedidos",        icon: I.receipt, perm: "sales.orders.read" },
      { href: "/invoices",  label: "Facturas",       icon: I.receipt, perm: "invoicing.read", feature: "cfdi" },
      { href: "/production", label: "Producción",    icon: I.printer, perm: "sales.production.advance" },
      { href: "/purchases", label: "Compras",        icon: I.truck,   perm: "inventory.purchases.read" },
      { href: "/calendar",  label: "Entregas",       icon: I.calendar, perm: "sales.orders.read" },
      { href: "/approvals", label: "Aprobaciones",   icon: I.paint,   perm: "design.proofs.read" },
    ],
  },
  {
    title: "Catálogo",
    items: [
      { href: "/products",  label: "Productos",   icon: I.box,     perm: "catalog.products.read" },
      { href: "/inventory", label: "Inventario",  icon: I.layers,  perm: "inventory.materials.read" },
      { href: "/suppliers", label: "Proveedores", icon: I.factory, perm: "suppliers.read" },
    ],
  },
  {
    title: "Personas",
    items: [
      { href: "/clients", label: "Clientes",         icon: I.users,  perm: "clients.read" },
      { href: "/users",   label: "Usuarios",         icon: I.user,   perm: "iam.users.read" },
      { href: "/roles",   label: "Roles y permisos", icon: I.shield, perm: "iam.roles.read" },
    ],
  },
  {
    title: "Análisis",
    items: [
      { href: "/reports",  label: "Reportes",      icon: I.chart,  perm: "reports.read" },
      { href: "/audit",    label: "Bitácora",      icon: I.shield, perm: "audit.read" },
      { href: "/settings", label: "Configuración", icon: I.settings, perm: "settings.manage" },
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
  const { user, roles, permissions, features, logout } = useAuth();
  const displayName = user?.name ?? "—";
  const displayInitials = user ? initialsFor(user.name) : "·";
  const displayRole =
    roles.find((r) => user?.roleIds.includes(r.id))?.name ?? "Sin rol";
  const permsSet = new Set(permissions);

  // Contadores reales para los badges (decorativos: si el fetch falla, sin badge).
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [orgName, setOrgName] = useState<string | null>(null);
  const canReports = permsSet.has("reports.read");
  const canInventory = permsSet.has("inventory.materials.read");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next: Record<string, number> = {};
      if (canReports) {
        try {
          const d = await reportsApi.dashboard();
          next["/orders"] = d.openOrders;
          next["/calendar"] = d.upcomingDeliveries;
          next["/approvals"] = d.pendingApprovals;
        } catch {
          /* sin badges si falla */
        }
      }
      if (canInventory) {
        try {
          const r = await inventoryApi.list({ belowReorder: true, take: 1 });
          next["/inventory"] = r.total;
        } catch {
          /* ignore */
        }
      }
      if (!cancelled) setCounts(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [canReports, canInventory]);

  useEffect(() => {
    let cancelled = false;
    settingsApi
      .getBusinessCached()
      .then((b) => {
        if (!cancelled) setOrgName(b.name);
      })
      .catch(() => {
        /* sin nombre si falla */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const badgeFor = (href: string): string | undefined => {
    const c = counts[href];
    if (!c || c <= 0) return undefined;
    return c > 99 ? "99+" : String(c);
  };

  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter(
      (it) =>
        (!it.perm || permsSet.has(it.perm)) &&
        (!it.feature || features[it.feature] === true),
    ),
  })).filter((g) => g.items.length > 0);

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
        <div className="org-avatar">{orgName ? initialsFor(orgName) : "·"}</div>
        <div className="org-name">{orgName ?? "—"}</div>
        <span className="chev">{I.chevronDown}</span>
      </Link>

      <nav className="sidebar__nav">
        {groups.map((g) => (
          <div className="nav-group" key={g.title}>
            <div className="nav-group__title">{g.title}</div>
            {g.items.map((it) => {
              const active = pathname === it.href || pathname.startsWith(it.href + "/");
              const badge = badgeFor(it.href);
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={`nav-item ${active ? "is-active" : ""}`}
                >
                  <span className="nav-item__icon">{it.icon}</span>
                  {it.label}
                  {badge && <span className="nav-item__badge">{badge}</span>}
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
