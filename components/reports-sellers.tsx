import { fmtMXN } from "@/lib/format";
import { NEXUM_TOP_SELLERS } from "@/lib/mock-reports";

export function ReportsSellers() {
  const max = Math.max(...NEXUM_TOP_SELLERS.map((s) => s.sales));
  return (
    <div className="card">
      <div className="card__head">
        <div className="card__title">Desempeño por vendedor</div>
      </div>
      <div style={{ padding: 14 }}>
        {NEXUM_TOP_SELLERS.map((s) => (
          <div
            key={s.initials}
            style={{
              padding: "14px 0",
              borderTop: "1px solid var(--line)",
              display: "grid",
              gridTemplateColumns: "auto 1fr auto auto auto",
              gap: 16,
              alignItems: "center",
            }}
          >
            <div className="avatar" style={{ width: 36, height: 36, fontSize: 13 }}>
              {s.initials}
            </div>
            <div>
              <div style={{ fontWeight: 500 }}>{s.name}</div>
              <div
                style={{
                  height: 6,
                  background: "var(--surface-3)",
                  borderRadius: 3,
                  marginTop: 6,
                  width: "70%",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${(s.sales / max) * 100}%`,
                    height: "100%",
                    background: "var(--accent)",
                  }}
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
    <div style={{ textAlign: "right", minWidth: 80 }}>
      <div
        className="num"
        style={{ fontSize: big ? 18 : 13, fontWeight: big ? 600 : 500 }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 10,
          color: "var(--muted)",
          textTransform: "uppercase",
          letterSpacing: ".06em",
        }}
      >
        {label}
      </div>
    </div>
  );
}
