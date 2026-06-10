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
      <div className="card__body p-0">
        {items.length === 0 && (
          <div className="text-muted text-xs px-4 py-3">Sin pedidos.</div>
        )}
        {items.map((it, i) => (
          <Link
            key={it.id}
            href={`/orders/${it.id}`}
            className="flex items-center gap-2.5 px-4 py-3 no-underline text-inherit"
            style={{
              borderBottom: i < items.length - 1 ? "1px solid var(--line)" : "0",
            }}
          >
            <Avatar name={it.client} size={28} />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium">{it.client}</div>
              <div className="text-muted text-xs">
                {it.id} · {it.note}
              </div>
            </div>
            {it.supplier && <span className="pill pill--supplier">Proveedor</span>}
            <span className="text-muted">{I.chevronRight}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
