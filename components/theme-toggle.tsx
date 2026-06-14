"use client";

import { useState, type ReactNode } from "react";
import { I } from "./icons";
import { useTheme } from "@/lib/theme/theme-context";
import type { ThemePreference } from "@/lib/theme/theme";

const OPTIONS: { value: ThemePreference; label: string; icon: ReactNode }[] = [
  { value: "light", label: "Claro", icon: I.sun },
  { value: "dark", label: "Oscuro", icon: I.moon },
  { value: "system", label: "Sistema", icon: I.monitor },
];

const TRIGGER_ICON: Record<ThemePreference, ReactNode> = {
  light: I.sun,
  dark: I.moon,
  system: I.monitor,
};

/** Selector de tema (Claro/Oscuro/Sistema) para el topbar. Popular el mismo
 *  molde de popover que el panel de notificaciones (overlay + .card absoluto). */
export function ThemeToggle() {
  const { preference, setPreference } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        className="icon-btn"
        type="button"
        title="Tema"
        aria-label="Cambiar tema"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {TRIGGER_ICON[preference]}
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0"
            style={{ zIndex: 19 }}
            onClick={() => setOpen(false)}
          />
          <div
            className="card"
            role="menu"
            aria-label="Tema"
            style={{
              position: "absolute",
              right: 0,
              top: "calc(100% + 6px)",
              zIndex: 20,
              width: 180,
              padding: 6,
            }}
          >
            {OPTIONS.map((opt) => {
              const active = preference === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => {
                    setPreference(opt.value);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2 w-full text-left"
                  style={{
                    padding: "7px 9px",
                    borderRadius: "var(--r-md)",
                    border: 0,
                    cursor: "pointer",
                    background: active ? "var(--surface-3)" : "transparent",
                    color: "var(--ink)",
                    fontSize: 13,
                    fontWeight: active ? 500 : 400,
                  }}
                >
                  <span className="inline-flex" style={{ color: "var(--muted)" }}>
                    {opt.icon}
                  </span>
                  <span className="flex-1">{opt.label}</span>
                  {active && (
                    <span className="inline-flex" style={{ color: "var(--accent)" }}>
                      {I.check}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
