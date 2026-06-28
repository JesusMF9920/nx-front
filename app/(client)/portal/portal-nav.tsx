import Link from "next/link";

/** Navegación del portal entre pedidos y adeudos. */
export function PortalNav({ active }: { active: "pedidos" | "adeudos" }) {
  const tab = (href: string, label: string, key: "pedidos" | "adeudos") => (
    <Link
      href={href}
      className={[
        "rounded-lg px-3 py-1.5 text-sm",
        active === key
          ? "bg-[var(--accent,#1f6feb)] text-white"
          : "opacity-70 hover:opacity-100",
      ].join(" ")}
    >
      {label}
    </Link>
  );
  return (
    <nav className="mb-6 mt-3 flex gap-2">
      {tab("/portal", "Pedidos", "pedidos")}
      {tab("/portal/adeudos", "Adeudos", "adeudos")}
    </nav>
  );
}
