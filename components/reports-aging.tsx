import { I } from "@/components/icons";
import { fmtMXN } from "@/lib/format";
import { NEXUM_AGING } from "@/lib/mock-reports";

type Tone = "ok" | "warn" | "warn-strong" | "danger";

const TONE_COLOR: Record<Tone, string> = {
  ok: "var(--ok)",
  warn: "var(--warn)",
  "warn-strong": "var(--warn)",
  danger: "var(--danger)",
};

export function ReportsAging() {
  const tot = NEXUM_AGING.reduce(
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
      <div className="kpi-grid" style={{ marginBottom: 18 }}>
        <AgingBucket label="Corriente · 0-30 días"  value={tot.b030}  total={grand} tone="ok" />
        <AgingBucket label="Atrasado · 31-60 días"  value={tot.b3160} total={grand} tone="warn" />
        <AgingBucket label="Atrasado · 61-90 días"  value={tot.b6190} total={grand} tone="warn-strong" />
        <AgingBucket label="Crítico · 90+ días"     value={tot.b90}   total={grand} tone="danger" />
      </div>

      <div className="card">
        <div className="card__head">
          <div className="card__title">Cuentas por cobrar abiertas</div>
          <div className="spacer" />
          <button className="btn btn--sm">{I.whatsapp} Enviar recordatorios</button>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Factura</th>
              <th>Emisión</th>
              <th style={{ textAlign: "right" }}>0-30</th>
              <th style={{ textAlign: "right" }}>31-60</th>
              <th style={{ textAlign: "right" }}>61-90</th>
              <th style={{ textAlign: "right" }}>90+</th>
              <th style={{ textAlign: "right" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {NEXUM_AGING.map((a) => (
              <tr key={a.invoice}>
                <td style={{ fontWeight: 500 }}>{a.client}</td>
                <td className="num">{a.invoice}</td>
                <td className="num" style={{ fontSize: 12, color: "var(--muted)" }}>{a.date}</td>
                <td className="num" style={{ textAlign: "right" }}>
                  {a.b030 ? fmtMXN(a.b030) : "—"}
                </td>
                <td
                  className="num"
                  style={{
                    textAlign: "right",
                    color: a.b3160 ? "var(--warn)" : "var(--muted-2)",
                  }}
                >
                  {a.b3160 ? fmtMXN(a.b3160) : "—"}
                </td>
                <td
                  className="num"
                  style={{
                    textAlign: "right",
                    color: a.b6190 ? "var(--warn)" : "var(--muted-2)",
                  }}
                >
                  {a.b6190 ? fmtMXN(a.b6190) : "—"}
                </td>
                <td
                  className="num"
                  style={{
                    textAlign: "right",
                    color: a.b90 ? "var(--danger)" : "var(--muted-2)",
                  }}
                >
                  {a.b90 ? fmtMXN(a.b90) : "—"}
                </td>
                <td className="num" style={{ textAlign: "right", fontWeight: 600 }}>
                  {fmtMXN(a.total)}
                </td>
              </tr>
            ))}
            <tr style={{ background: "var(--surface-2)", fontWeight: 600 }}>
              <td colSpan={3}>Totales</td>
              <td className="num" style={{ textAlign: "right" }}>{fmtMXN(tot.b030)}</td>
              <td className="num" style={{ textAlign: "right", color: "var(--warn)" }}>
                {fmtMXN(tot.b3160)}
              </td>
              <td className="num" style={{ textAlign: "right", color: "var(--warn)" }}>
                {fmtMXN(tot.b6190)}
              </td>
              <td className="num" style={{ textAlign: "right", color: "var(--danger)" }}>
                {fmtMXN(tot.b90)}
              </td>
              <td className="num" style={{ textAlign: "right" }}>{fmtMXN(grand)}</td>
            </tr>
          </tbody>
        </table>
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
      <div
        style={{
          height: 4,
          background: "var(--surface-3)",
          borderRadius: 2,
          marginTop: 8,
          overflow: "hidden",
        }}
      >
        <div style={{ width: `${pct}%`, height: "100%", background: color }} />
      </div>
      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
        {pct.toFixed(0)}% del saldo
      </div>
    </div>
  );
}
