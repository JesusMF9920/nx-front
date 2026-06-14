"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { useAuth } from "@/lib/auth/auth-context";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { status, mustChangePassword } = useAuth();

  // Drawer del sidebar en móvil/tablet (< lg). En desktop el sidebar es sticky y
  // este estado es inerte (el CSS lo ignora arriba de lg).
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    } else if (status === "authenticated" && mustChangePassword) {
      router.replace("/change-password");
    }
  }, [status, mustChangePassword, router]);

  // Cierra el drawer al navegar (clic en un nav-item, back/forward o redirección
  // programática). Sincronizar el drawer con la ruta es el uso correcto del effect.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNavOpen(false);
  }, [pathname]);

  if (status !== "authenticated" || mustChangePassword) {
    return (
      <div
        className="min-h-screen grid place-items-center text-muted text-sm"
        style={{ background: "var(--bg)" }}
      >
        Cargando…
      </div>
    );
  }

  return (
    <div className="app">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      {navOpen && (
        <div
          className="app__backdrop"
          onClick={() => setNavOpen(false)}
          aria-hidden
        />
      )}
      <div className="main">
        <Topbar onMenuClick={() => setNavOpen((o) => !o)} />
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
