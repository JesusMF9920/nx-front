"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { useAuth } from "@/lib/auth/auth-context";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { status, mustChangePassword } = useAuth();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    } else if (status === "authenticated" && mustChangePassword) {
      router.replace("/change-password");
    }
  }, [status, mustChangePassword, router]);

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
      <Sidebar />
      <div className="main">
        <Topbar />
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
