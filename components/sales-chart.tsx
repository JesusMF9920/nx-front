import { fmtMXN } from "@/lib/format";

export type SalesChartPoint = { day: string; sales: number };

export function SalesChart({ data }: { data: SalesChartPoint[] }) {
  if (data.length === 0) {
    return <div className="empty">Sin ventas en el periodo.</div>;
  }

  const w = 540;
  const h = 160;
  const pad = 24;
  const max = Math.max(...data.map((d) => d.sales), 1);
  const denom = data.length > 1 ? data.length - 1 : 1;
  const stepX = (w - pad * 2) / denom;
  const points = data.map(
    (d, i) =>
      [pad + i * stepX, h - pad - (d.sales / max) * (h - pad * 2)] as const,
  );
  const path = points
    .map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + "," + p[1].toFixed(1))
    .join(" ");
  const area =
    path +
    ` L ${points[points.length - 1][0]},${h - pad} L ${points[0][0]},${h - pad} Z`;
  const last = data[data.length - 1];

  return (
    <div>
      <div className="text-xs text-muted mb-1">
        Última: <span className="num font-medium">{fmtMXN(last.sales)}</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={190} preserveAspectRatio="none">
        <defs>
          <linearGradient id="nexum-sales-grad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity=".18" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((p, i) => (
          <line
            key={i}
            x1={pad}
            x2={w - pad}
            y1={pad + p * (h - pad * 2)}
            y2={pad + p * (h - pad * 2)}
            stroke="var(--line)"
            strokeDasharray="2 4"
          />
        ))}
        <path d={area} fill="url(#nexum-sales-grad)" />
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth={1.8} />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p[0]}
            cy={p[1]}
            r={i === points.length - 1 ? 4 : 2}
            fill={i === points.length - 1 ? "var(--accent)" : "var(--surface)"}
            stroke="var(--accent)"
            strokeWidth={1.5}
          />
        ))}
        {data.map((d, i) =>
          i % 3 === 0 ? (
            <text
              key={i}
              x={pad + i * stepX}
              y={h - 6}
              fontSize={10}
              fill="var(--muted)"
              textAnchor="middle"
              fontFamily="var(--font-mono)"
            >
              {d.day.slice(5)}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  );
}
