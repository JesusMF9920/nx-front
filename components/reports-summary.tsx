"use client";

import { useState } from "react";
import { fmtMXN } from "@/lib/format";
import type {
  ApiCategoryMixEntry,
  ApiPaymentMixEntry,
  ApiReportDaily,
} from "@/lib/api/types";

const W = 880;
const H = 260;
const P = { l: 50, r: 16, t: 16, b: 28 };

type Hover = ApiReportDaily & { i: number };

const PAYMENT_META: Record<string, { label: string; color: string }> = {
  cash: { label: "Efectivo", color: "var(--ok)" },
  terminal: { label: "Terminal", color: "var(--accent)" },
  credit: { label: "Crédito", color: "var(--warn)" },
};

const CATEGORY_COLORS = [
  "var(--accent)",
  "var(--info)",
  "var(--ok)",
  "var(--warn)",
  "var(--supplier)",
  "var(--danger)",
];

export function ReportsSummary({
  daily,
  paymentMix,
  categoryMix,
}: {
  daily: ApiReportDaily[];
  paymentMix: ApiPaymentMixEntry[];
  categoryMix: ApiCategoryMixEntry[];
}) {
  const data = daily;
  const [hover, setHover] = useState<Hover | null>(null);

  const maxSales = Math.max(...data.map((d) => d.sales), 1) * 1.1;
  const innerW = W - P.l - P.r;
  const innerH = H - P.t - P.b;
  const denom = data.length > 1 ? data.length - 1 : 1;
  const xStep = innerW / denom;
  const yFor = (v: number) => P.t + innerH - (v / maxSales) * innerH;
  const xFor = (i: number) => P.l + i * xStep;

  const linePath = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${xFor(i).toFixed(1)} ${yFor(d.sales).toFixed(1)}`)
    .join(" ");
  const areaPath =
    data.length > 0
      ? `${linePath} L ${xFor(data.length - 1).toFixed(1)} ${P.t + innerH} L ${P.l} ${P.t + innerH} Z`
      : "";
  const marginPath = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${xFor(i).toFixed(1)} ${yFor(d.margin).toFixed(1)}`)
    .join(" ");

  const yTicks = 4;
  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => (maxSales / yTicks) * i);

  return (
    <div className="grid gap-[18px]" style={{ gridTemplateColumns: "1fr 320px" }}>
      <div className="card">
        <div className="card__head">
          <div className="card__title">Ventas y margen diarios</div>
          <div className="spacer" />
          <div className="row gap-3 text-[11px]">
            <span className="flex items-center gap-1">
              <span className="bg-accent" style={{ width: 10, height: 2, borderRadius: 1 }} />
              Ventas
            </span>
            <span className="flex items-center gap-1">
              <span style={{ width: 10, height: 0, borderTop: "2px dashed var(--ok)" }} />
              Margen
            </span>
          </div>
        </div>
        <div className="p-3.5 relative">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            style={{ width: "100%", height: 280 }}
            onMouseLeave={() => setHover(null)}
          >
            {ticks.map((t, i) => (
              <g key={i}>
                <line
                  x1={P.l}
                  x2={W - P.r}
                  y1={yFor(t)}
                  y2={yFor(t)}
                  stroke="var(--line)"
                  strokeDasharray={i === 0 ? "0" : "2 3"}
                />
                <text
                  x={P.l - 8}
                  y={yFor(t) + 3}
                  fontSize={10}
                  fill="var(--muted)"
                  textAnchor="end"
                  fontFamily="var(--font-mono)"
                >
                  {t >= 1000 ? `${(t / 1000).toFixed(0)}k` : t.toFixed(0)}
                </text>
              </g>
            ))}

            {data.map((d, i) =>
              i % 5 === 0 ? (
                <text
                  key={i}
                  x={xFor(i)}
                  y={H - 8}
                  fontSize={10}
                  fill="var(--muted)"
                  textAnchor="middle"
                  fontFamily="var(--font-mono)"
                >
                  {d.day.slice(5)}
                </text>
              ) : null,
            )}

            <defs>
              <linearGradient id="nexum-rep-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            {areaPath && <path d={areaPath} fill="url(#nexum-rep-grad)" />}
            <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth={2} />
            <path
              d={marginPath}
              fill="none"
              stroke="var(--ok)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />

            {data.map((d, i) => (
              <g key={i}>
                <rect
                  x={xFor(i) - xStep / 2}
                  y={P.t}
                  width={xStep}
                  height={innerH}
                  fill="transparent"
                  onMouseEnter={() => setHover({ ...d, i })}
                />
                {hover?.i === i && (
                  <>
                    <line
                      x1={xFor(i)}
                      x2={xFor(i)}
                      y1={P.t}
                      y2={P.t + innerH}
                      stroke="var(--ink-2)"
                      strokeDasharray="2 3"
                    />
                    <circle
                      cx={xFor(i)}
                      cy={yFor(d.sales)}
                      r={3.5}
                      fill="var(--accent)"
                      stroke="white"
                      strokeWidth={1.5}
                    />
                    <circle
                      cx={xFor(i)}
                      cy={yFor(d.margin)}
                      r={3}
                      fill="var(--ok)"
                      stroke="white"
                      strokeWidth={1.5}
                    />
                  </>
                )}
              </g>
            ))}
          </svg>
          {hover && (
            <div
              className="absolute bg-surface border border-line rounded-sm text-[11px]"
              style={{ top: 16, right: 24, padding: "8px 10px", boxShadow: "var(--sh-sm)", minWidth: 160 }}
            >
              <div className="font-mono font-medium mb-1">{hover.day}</div>
              <Row label="Ventas" v={<span className="font-semibold">{fmtMXN(hover.sales)}</span>} />
              <Row label="Margen" v={<span className="text-ok">{fmtMXN(hover.margin)}</span>} />
              <Row label="Pedidos" v={hover.orders} />
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card__head">
          <div className="card__title">Desglose por método de pago</div>
        </div>
        <div className="p-3.5">
          {paymentMix.length === 0 && (
            <div className="text-muted text-xs mb-3">Sin ventas en el periodo.</div>
          )}
          {paymentMix.map((r) => {
            const meta = PAYMENT_META[r.method] ?? { label: r.method, color: "var(--muted)" };
            return (
              <div key={r.method} className="mb-3">
                <div className="flex text-xs mb-1">
                  <span className="flex items-center gap-1.5">
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: meta.color }} />
                    {meta.label}
                  </span>
                  <div className="spacer" />
                  <span className="num font-medium">{fmtMXN(r.amount)}</span>
                  <span className="num ml-2 text-muted text-right" style={{ width: 44 }}>
                    {r.pct.toFixed(1)}%
                  </span>
                </div>
                <div className="bg-surface-3 overflow-hidden" style={{ height: 6, borderRadius: 3 }}>
                  <div className="h-full" style={{ width: `${Math.min(100, r.pct)}%`, background: meta.color }} />
                </div>
              </div>
            );
          })}

          <div className="divider" />
          <div className="card__title text-[13px] mb-2">Mix por categoría</div>
          {categoryMix.length === 0 && <div className="text-muted text-xs">Sin ventas en el periodo.</div>}
          {categoryMix.map((r, i) => (
            <div key={r.category} className="flex text-xs mb-1.5 items-center gap-1.5">
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  background: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                }}
              />
              <span>{r.category}</span>
              <div className="spacer" />
              <span className="num text-muted">{r.pct.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({ label, v }: { label: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{label}</span>
      <span className="num">{v}</span>
    </div>
  );
}
