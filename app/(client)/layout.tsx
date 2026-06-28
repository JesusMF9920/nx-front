import type { ReactNode } from "react";

import { ClientAuthProvider } from "@/lib/auth/client-auth-context";

/**
 * Layout del PORTAL DEL CLIENTE. Monta su propio `ClientAuthProvider` (sesión de
 * cliente, cookies client_*), independiente del back-office de staff. El
 * AuthProvider de staff del layout raíz sigue arriba pero no se usa aquí; sus
 * llamadas a /me no rebotan porque `/portal` está en el allowlist del apiFetch.
 */
export default function ClientPortalLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ClientAuthProvider>
      <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
        {children}
      </div>
    </ClientAuthProvider>
  );
}
