import { I } from "@/components/icons";
import { fmtDate, fmtMXN } from "@/lib/format";
import type { ApiAgingRow } from "@/lib/api/types";

type Tone = "ok" | "warn" | "warn-strong" | "danger";

const TONE_COLOR: Record<Tone, string> = {
  ok: "var(--ok)",
  warn: "var(--warn)",
  "warn-strong": "var(--warn)",
  danger: "var(--danger)",
};

export function ReportsAging({ items }: { items: ApiAgingRow[] }) {
  const tot = items.reduce(
    (s, a) => ({
      b030: s.b030 + a.b030,
      b3160: s.b3160 + a.b3160,
      b6190: s.b6190 + a.b6190,
      b90: s.b90 + a.b90,
    }),
    { b030: 0, b3160: 0, b6190: 0, b90: 0 },
  );
  const grand = tot.b030 + tot.b3160 + tot.b6190 + tot.b90;

  return (
    <div>
      <div className="kpi-grid mb-[18px]">
        <AgingBucket label="Corriente · 0-30 días" value={tot.b030} total={grand} tone="ok" />
        <AgingBucket label="Atrasado · 31-60 días" value={tot.b3160} total={grand} tone="warn" />
        <AgingBucket label="Atrasado · 61-90 días" value={tot.b6190} total={grand} tone="warn-strong" />
        <AgingBucket label="Crítico · 90+ días" value={tot.b90} total={grand} tone="danger" />
      </div>

      <div className="card">
        <div className="card__head">
          <div className="card__title">Cuentas por cobrar abiertas</div>
          <div className="spacer" />
          <button className="btn btn--sm">{I.whatsapp} Enviar recordatorios</button>
        </div>
        {items.length === 0 ? (
          <div className="empty m-3.5">Sin cuentas por cobrar abiertas.</div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Pedido</th>
                <th>Venta</th>
                <th className="text-right">0-30</th>
                <th className="text-right">31-60</th>
                <th className="text-right">61-90</th>
                <th className="text-right">90+</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.orderId}>
                  <td className="font-medium">{a.clientName}</td>
                  <td className="num">{a.folio}</td>
                  <td className="num text-xs text-muted">
                    {fmtDate(a.date + "T00:00:00")}
                  </td>
                  <td className="num text-right">{a.b030 ? fmtMXN(a.b030) : "—"}</td>
                  <td
                    className="num text-right"
                    style={{ color: a.b3160 ? "var(--warn)" : "var(--muted-2)" }}
                  >
                    {a.b3160 ? fmtMXN(a.b3160) : "—"}
                  </td>
                  <td
                    className="num text-right"
                    style={{ color: a.b6190 ? "var(--warn)" : "var(--muted-2)" }}
                  >
                    {a.b6190 ? fmtMXN(a.b6190) : "—"}
                  </td>
                  <td
                    className="num text-right"
                    style={{ color: a.b90 ? "var(--danger)" : "var(--muted-2)" }}
                  >
                    {a.b90 ? fmtMXN(a.b90) : "—"}
                  </td>
                  <td className="num text-right font-semibold">{fmtMXN(a.total)}</td>
                </tr>
              ))}
              <tr className="bg-surface-2 font-semibold">
                <td colSpan={3}>Totales</td>
                <td className="num text-right">{fmtMXN(tot.b030)}</td>
                <td className="num text-right text-warn">{fmtMXN(tot.b3160)}</td>
                <td className="num text-right text-warn">{fmtMXN(tot.b6190)}</td>
                <td className="num text-right text-danger">{fmtMXN(tot.b90)}</td>
                <td className="num text-right">{fmtMXN(grand)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function AgingBucket({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: Tone;
}) {
  const pct = total ? (value / total) * 100 : 0;
  const color = TONE_COLOR[tone];
  return (
    <div className="kpi">
      <div className="kpi__label">{label}</div>
      <div className="kpi__value num" style={{ color }}>
        {fmtMXN(value)}
      </div>
      <div className="bg-surface-3 mt-2 overflow-hidden" style={{ height: 4, borderRadius: 2 }}>
        <div className="h-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="text-[11px] text-muted mt-1">{pct.toFixed(0)}% del saldo</div>
    </div>
  );
}
