import { fmtMXN } from "@/lib/format";
import { NEXUM_TOP_SELLERS } from "@/lib/mock-reports";

export function ReportsSellers() {
  const max = Math.max(...NEXUM_TOP_SELLERS.map((s) => s.sales));
  return (
    <div className="card">
      <div className="card__head">
        <div className="card__title">Desempeño por vendedor</div>
      </div>
      <div className="p-3.5">
        {NEXUM_TOP_SELLERS.map((s) => (
          <div
            key={s.initials}
            className="grid gap-4 items-center"
            style={{
              padding: "14px 0",
              borderTop: "1px solid var(--line)",
              gridTemplateColumns: "auto 1fr auto auto auto",
            }}
          >
            <div className="avatar text-[13px]" style={{ width: 36, height: 36 }}>
              {s.initials}
            </div>
            <div>
              <div className="font-medium">{s.name}</div>
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
            <SellerStat value={fmtMXN(s.ticket)} label="Ticket prom." />
          </div>
        ))}
      </div>
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
      <div
        className="text-[10px] text-muted uppercase"
        style={{ letterSpacing: ".06em" }}
      >
        {label}
      </div>
    </div>
  );
}
