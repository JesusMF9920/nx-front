import Link from "next/link";

type Tab = "pedidos" | "adeudos" | "aprobaciones";

/** Navegación del portal entre pedidos, adeudos y aprobaciones. */
export function PortalNav({ active }: { active: Tab }) {
  const tab = (href: string, label: string, key: Tab) => (
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
    <nav className="mb-6 mt-3 flex flex-wrap gap-2">
      {tab("/portal", "Pedidos", "pedidos")}
      {tab("/portal/adeudos", "Adeudos", "adeudos")}
      {tab("/portal/aprobaciones", "Aprobaciones", "aprobaciones")}
    </nav>
  );
}
