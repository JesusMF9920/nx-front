const DATA = [12.4, 11.2, 15.8, 9.6, 17.4, 18.2, 13.9, 14.8, 16.4, 12.0, 15.2, 17.9, 16.8, 18.4];

export function SalesChart() {
  const max = Math.max(...DATA);
  const w = 540;
  const h = 160;
  const pad = 24;
  const stepX = (w - pad * 2) / (DATA.length - 1);
  const points = DATA.map((v, i) => [pad + i * stepX, h - pad - (v / max) * (h - pad * 2)] as const);
  const path = points.map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
  const area = path + ` L ${points[points.length - 1][0]},${h - pad} L ${points[0][0]},${h - pad} Z`;

  return (
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
      {DATA.map((_, i) =>
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
            {`${22 + i}/04`}
          </text>
        ) : null,
      )}
    </svg>
  );
}
