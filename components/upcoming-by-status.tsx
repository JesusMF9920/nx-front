import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { I } from "@/components/icons";

export type UpcomingItem = {
  id: string;
  client: string;
  note: string;
  supplier?: boolean;
};

export function UpcomingByStatus({ title, items }: { title: string; items: UpcomingItem[] }) {
  return (
    <div className="card">
      <div className="card__head">
        <div className="card__title">{title}</div>
      </div>
      <div className="card__body" style={{ padding: 0 }}>
        {items.map((it, i) => (
          <Link
            key={it.id}
            href={`/orders/${it.id}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 16px",
              borderBottom: i < items.length - 1 ? "1px solid var(--line)" : "0",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <Avatar name={it.client} size={28} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{it.client}</div>
              <div style={{ color: "var(--muted)", fontSize: 12 }}>
                {it.id} · {it.note}
              </div>
            </div>
            {it.supplier && <span className="pill pill--supplier">Proveedor</span>}
            <span style={{ color: "var(--muted)" }}>{I.chevronRight}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
