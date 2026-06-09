import { fmtMXN } from "@/lib/format";
import type { ApiSeller } from "@/lib/api/types";

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "·";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function ReportsSellers({ items }: { items: ApiSeller[] }) {
  const max = Math.max(...items.map((s) => s.sales), 1);
  return (
    <div className="card">
      <div className="card__head">
        <div className="card__title">Desempeño por vendedor</div>
      </div>
      {items.length === 0 ? (
        <div className="empty m-3.5">Sin ventas en el periodo.</div>
      ) : (
        <div className="p-3.5">
          {items.map((s) => {
            const name = s.name ?? "Sin nombre";
            return (
              <div
                key={s.sellerId}
                className="grid gap-4 items-center"
                style={{
                  padding: "14px 0",
                  borderTop: "1px solid var(--line)",
                  gridTemplateColumns: "auto 1fr auto auto auto auto",
                }}
              >
                <div className="avatar text-[13px]" style={{ width: 36, height: 36 }}>
                  {initialsFor(name)}
                </div>
                <div>
                  <div className="font-medium">{name}</div>
                  <div
                    className="bg-surface-3 mt-1.5 overflow-hidden"
                    style={{ height: 6, borderRadius: 3, width: "70%" }}
                  >
                    <div
                      className="h-full bg-accent"
                      style={{ width: `${(s.sales / max) * 100}%` }}
                    />
                  </div>
                </div>
                <SellerStat value={fmtMXN(s.sales)} label="Ventas" big />
                <SellerStat value={s.orders} label="Pedidos" />
                <SellerStat value={fmtMXN(s.avgTicket)} label="Ticket prom." />
                <SellerStat value={`${s.conversionPct.toFixed(0)}%`} label="Conversión" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SellerStat({
  value,
  label,
  big,
}: {
  value: string | number;
  label: string;
  big?: boolean;
}) {
  return (
    <div className="text-right" style={{ minWidth: 80 }}>
      <div className={`num ${big ? "text-lg font-semibold" : "text-[13px] font-medium"}`}>
        {value}
      </div>
      <div className="text-[10px] text-muted uppercase" style={{ letterSpacing: ".06em" }}>
        {label}
      </div>
    </div>
  );
}
