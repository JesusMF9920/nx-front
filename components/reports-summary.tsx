"use client";

import { useState } from "react";
import { fmtMXN } from "@/lib/format";
import { NEXUM_REPORT_DAILY } from "@/lib/mock-reports";
import type { ReportDay } from "@/lib/types";

const W = 880;
const H = 260;
const P = { l: 50, r: 16, t: 16, b: 28 };

type Hover = ReportDay & { i: number };

const PAYMENT_MIX = [
  { label: "Efectivo",     pct: 38, color: "var(--ok)" },
  { label: "Terminal",     pct: 41, color: "var(--accent)" },
  { label: "Transferencia", pct: 16, color: "var(--info)" },
  { label: "Crédito",       pct:  5, color: "var(--warn)" },
];

const CATEGORY_MIX = [
  { label: "Textil",       pct: 42, color: "var(--accent)" },
  { label: "Promocional",  pct: 22, color: "var(--info)" },
  { label: "Papelería",    pct: 18, color: "var(--ok)" },
  { label: "Gran formato", pct: 12, color: "var(--warn)" },
  { label: "Bordado",      pct:  6, color: "var(--supplier)" },
];

export function ReportsSummary() {
  const data = NEXUM_REPORT_DAILY;
  const [hover, setHover] = useState<Hover | null>(null);

  const totSales = data.reduce((s, d) => s + d.sales, 0);
  const maxSales = Math.max(...data.map((d) => d.sales)) * 1.1;
  const innerW = W - P.l - P.r;
  const innerH = H - P.t - P.b;
  const xStep = innerW / (data.length - 1);
  const yFor = (v: number) => P.t + innerH - (v / maxSales) * innerH;
  const xFor = (i: number) => P.l + i * xStep;

  const linePath = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${xFor(i).toFixed(1)} ${yFor(d.sales).toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L ${xFor(data.length - 1).toFixed(1)} ${P.t + innerH} L ${P.l} ${P.t + innerH} Z`;
  const marginPath = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${xFor(i).toFixed(1)} ${yFor(d.margin).toFixed(1)}`)
    .join(" ");

  const yTicks = 4;
  const ticks = Array.from({ length: yTicks + 1 }, (_, i) => (maxSales / yTicks) * i);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 18 }}>
      <div className="card">
        <div className="card__head">
          <div className="card__title">Ventas y margen diarios</div>
          <div className="spacer" />
          <div className="row" style={{ gap: 12, fontSize: 11 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 10, height: 2, background: "var(--accent)", borderRadius: 1 }} />
              Ventas
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span
                style={{
                  width: 10,
                  height: 0,
                  borderTop: "2px dashed var(--ok)",
                }}
              />
              Margen
            </span>
          </div>
        </div>
        <div style={{ padding: 14, position: "relative" }}>
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
                  {d.date.slice(5)}
                </text>
              ) : null,
            )}

            <defs>
              <linearGradient id="nexum-rep-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#nexum-rep-grad)" />
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
              style={{
                position: "absolute",
                top: 16,
                right: 24,
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: "var(--r-sm)",
                padding: "8px 10px",
                fontSize: 11,
                boxShadow: "var(--sh-sm)",
                minWidth: 160,
              }}
            >
              <div style={{ fontFamily: "var(--font-mono)", fontWeight: 500, marginBottom: 4 }}>
                {hover.date}
              </div>
              <Row label="Ventas" v={<span style={{ fontWeight: 600 }}>{fmtMXN(hover.sales)}</span>} />
              <Row label="Margen" v={<span style={{ color: "var(--ok)" }}>{fmtMXN(hover.margin)}</span>} />
              <Row label="Pedidos" v={hover.orders} />
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card__head">
          <div className="card__title">Desglose por método de pago</div>
        </div>
        <div style={{ padding: 14 }}>
          {PAYMENT_MIX.map((r) => (
            <div key={r.label} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", fontSize: 12, marginBottom: 4 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: r.color }} />
                  {r.label}
                </span>
                <div className="spacer" />
                <span className="num" style={{ fontWeight: 500 }}>
                  {fmtMXN(totSales * (r.pct / 100))}
                </span>
                <span
                  className="num"
                  style={{ marginLeft: 8, color: "var(--muted)", width: 36, textAlign: "right" }}
                >
                  {r.pct}%
                </span>
              </div>
              <div
                style={{
                  height: 6,
                  background: "var(--surface-3)",
                  borderRadius: 3,
                  overflow: "hidden",
                }}
              >
                <div style={{ width: `${r.pct}%`, height: "100%", background: r.color }} />
              </div>
            </div>
          ))}

          <div className="divider" />
          <div className="card__title" style={{ fontSize: 13, marginBottom: 8 }}>
            Mix por categoría
          </div>
          {CATEGORY_MIX.map((r) => (
            <div
              key={r.label}
              style={{
                display: "flex",
                fontSize: 12,
                marginBottom: 6,
                alignItems: "center",
                gap: 6,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: 2, background: r.color }} />
              <span>{r.label}</span>
              <div className="spacer" />
              <span className="num" style={{ color: "var(--muted)" }}>{r.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({ label, v }: { label: string; v: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span style={{ color: "var(--muted)" }}>{label}</span>
      <span className="num">{v}</span>
    </div>
  );
}
