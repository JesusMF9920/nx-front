"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Fragment, useEffect, useRef, useState } from "react";
import { labelForRoute } from "@/lib/routes";
import { I } from "./icons";
import { Modal } from "./modal";
import { ThemeToggle } from "./theme-toggle";
import { useAuth } from "@/lib/auth/auth-context";
import { designApi } from "@/lib/api/design";
import { productionApi } from "@/lib/api/production";
import { inventoryApi } from "@/lib/api/inventory";

function crumbsFor(pathname: string): string[] {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return ["Nexum POS"];
  return ["Nexum POS", labelForRoute(segments[0])];
}

/** Señal accionable real, derivada de endpoints existentes (sin backend nuevo). */
type Notif = { key: string; label: string; count: number; href: string };

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const crumbs = crumbsFor(pathname);
  const { permissions } = useAuth();
  const perms = new Set(permissions);

  const [q, setQ] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // ⌘/Ctrl+K enfoca el buscador global.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const canDesign = perms.has("design.proofs.read");
  const canProduction = perms.has("sales.production.advance");
  const canInventory = perms.has("inventory.materials.read");

  // Señales reales para el panel de notificaciones (fail-closed por permiso).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next: Notif[] = [];
      if (canDesign) {
        try {
          const r = await designApi.list("awaiting_client");
          if (r.items.length > 0) {
            next.push({
              key: "approvals",
              label: "Aprobaciones esperando al cliente",
              count: r.items.length,
              href: "/approvals",
            });
          }
        } catch {
          /* ignore */
        }
      }
      if (canProduction) {
        try {
          const r = await productionApi.queue({ overdue: true, take: 1 });
          if (r.total > 0) {
            next.push({
              key: "overdue",
              label: "Producción vencida",
              count: r.total,
              href: "/production",
            });
          }
        } catch {
          /* ignore */
        }
      }
      if (canInventory) {
        try {
          const r = await inventoryApi.list({ belowReorder: true, take: 1 });
          if (r.total > 0) {
            next.push({
              key: "lowstock",
              label: "Insumos bajo stock",
              count: r.total,
              href: "/inventory",
            });
          }
        } catch {
          /* ignore */
        }
      }
      if (!cancelled) setNotifs(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [canDesign, canProduction, canInventory]);

  const notifTotal = notifs.reduce((s, n) => s + n.count, 0);

  const submitSearch = () => {
    const term = q.trim();
    if (term.length === 0) return;
    router.push(`/buscar?q=${encodeURIComponent(term)}`);
  };

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
        <input
          ref={searchRef}
          placeholder="Buscar pedidos, clientes, productos…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submitSearch();
          }}
        />
        <span className="kbd">⌘K</span>
      </div>

      <div className="relative">
        <button
          className="icon-btn"
          type="button"
          title="Notificaciones"
          aria-label="Notificaciones"
          aria-expanded={notifOpen}
          onClick={() => setNotifOpen((o) => !o)}
        >
          {I.bell}
          {notifTotal > 0 && (
            <span className="nav-item__badge">
              {notifTotal > 99 ? "99+" : notifTotal}
            </span>
          )}
        </button>
        {notifOpen && (
          <>
            <div
              className="fixed inset-0"
              style={{ zIndex: 19 }}
              onClick={() => setNotifOpen(false)}
            />
            <div
              className="card"
              style={{
                position: "absolute",
                right: 0,
                top: "calc(100% + 6px)",
                zIndex: 20,
                width: 300,
                padding: 0,
              }}
            >
              <div className="card__head">
                <div className="card__title">Notificaciones</div>
              </div>
              {notifs.length === 0 ? (
                <div className="empty m-3.5">Sin pendientes.</div>
              ) : (
                <div className="flex flex-col">
                  {notifs.map((n) => (
                    <Link
                      key={n.key}
                      href={n.href}
                      onClick={() => setNotifOpen(false)}
                      className="flex items-center gap-2"
                      style={{
                        padding: "10px 14px",
                        borderTop: "1px solid var(--line)",
                        textDecoration: "none",
                        color: "inherit",
                      }}
                    >
                      <span className="flex-1">{n.label}</span>
                      <span className="nav-item__badge">{n.count}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <ThemeToggle />

      <button
        className="icon-btn"
        type="button"
        title="Ayuda"
        aria-label="Ayuda"
        onClick={() => setHelpOpen(true)}
      >
        {I.alert}
      </button>

      {helpOpen && (
        <Modal title="Ayuda" width={520} onClose={() => setHelpOpen(false)}>
          <div className="flex flex-col gap-4 text-sm">
            <div>
              <div className="font-medium mb-2">Atajos de teclado</div>
              <div className="flex flex-col gap-1.5 text-muted">
                <div className="flex items-center justify-between">
                  <span>Buscar (pedidos, clientes, productos)</span>
                  <span className="kbd">⌘K</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Cerrar diálogo</span>
                  <span className="kbd">Esc</span>
                </div>
              </div>
            </div>
            <div>
              <div className="font-medium mb-2">Soporte</div>
              <div className="text-muted">
                ¿Necesitas ayuda? Escríbenos a{" "}
                <a className="text-accent" href="mailto:soporte@nexum.mx">
                  soporte@nexum.mx
                </a>
                .
              </div>
            </div>
          </div>
        </Modal>
      )}
    </header>
  );
}
