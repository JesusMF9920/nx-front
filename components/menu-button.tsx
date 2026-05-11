"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

export type MenuItem = {
  label: string;
  icon?: ReactNode;
  kind?: "default" | "danger";
  disabled?: boolean;
  onClick: () => void | Promise<void>;
};

type MenuButtonProps = {
  items: MenuItem[];
  /** Contenido del botón trigger (típicamente un ícono). */
  trigger: ReactNode;
  /** Alineación del popover respecto al trigger. */
  align?: "left" | "right";
  ariaLabel?: string;
  className?: string;
};

export function MenuButton({
  items,
  trigger,
  align = "right",
  ariaLabel = "Más acciones",
  className = "icon-btn",
}: MenuButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onMouse = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onMouse);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouse);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const popoverStyle: CSSProperties = {
    position: "absolute",
    top: "100%",
    marginTop: 4,
    minWidth: 200,
    padding: 4,
    background: "var(--surface)",
    border: "1px solid var(--line)",
    borderRadius: 8,
    boxShadow: "var(--sh-lg)",
    zIndex: 50,
    ...(align === "right" ? { right: 0 } : { left: 0 }),
  };

  return (
    <div
      ref={ref}
      style={{ position: "relative", display: "inline-block" }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        className={className}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        type="button"
      >
        {trigger}
      </button>
      {open && (
        <div role="menu" style={popoverStyle}>
          {items.map((it, i) => (
            <MenuItemButton
              key={i}
              item={it}
              onSelect={() => setOpen(false)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MenuItemButton({
  item,
  onSelect,
}: {
  item: MenuItem;
  onSelect: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const danger = item.kind === "danger";

  const baseStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    padding: "8px 10px",
    borderRadius: 6,
    border: 0,
    background:
      hovered && !item.disabled
        ? danger
          ? "var(--danger-soft)"
          : "var(--surface-2)"
        : "transparent",
    cursor: item.disabled ? "not-allowed" : "pointer",
    opacity: item.disabled ? 0.5 : 1,
    color: danger ? "var(--danger)" : "var(--ink)",
    fontSize: 13,
    textAlign: "left",
  };

  return (
    <button
      type="button"
      role="menuitem"
      disabled={item.disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={baseStyle}
      onClick={async () => {
        if (item.disabled) return;
        onSelect();
        await item.onClick();
      }}
    >
      {item.icon && (
        <span style={{ display: "inline-flex", width: 16, height: 16 }}>
          {item.icon}
        </span>
      )}
      <span className="flex-1">{item.label}</span>
    </button>
  );
}
