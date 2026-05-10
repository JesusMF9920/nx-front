import { fmtMXN } from "@/lib/format";
import { NEXUM_TOP_PRODUCTS } from "@/lib/mock-reports";

export function ReportsProducts() {
  const max = Math.max(...NEXUM_TOP_PRODUCTS.map((p) => p.sales));
  return (
    <div className="card">
      <div className="card__head">
        <div className="card__title">Productos más vendidos</div>
      </div>
      <table className="tbl">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Categoría</th>
            <th style={{ textAlign: "right" }}>Unidades</th>
            <th>Ventas</th>
            <th style={{ textAlign: "right" }}>Margen</th>
            <th style={{ textAlign: "right" }}>%</th>
          </tr>
        </thead>
        <tbody>
          {NEXUM_TOP_PRODUCTS.map((p) => {
            const mPct = (p.margin / p.sales) * 100;
            return (
              <tr key={p.name}>
                <td style={{ fontWeight: 500 }}>{p.name}</td>
                <td>
                  <span className="tag" style={{ fontSize: 10 }}>{p.cat}</span>
                </td>
                <td className="num" style={{ textAlign: "right" }}>{p.qty}</td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 140,
                        height: 6,
                        background: "var(--surface-3)",
                        borderRadius: 3,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${(p.sales / max) * 100}%`,
                          height: "100%",
                          background: "var(--accent)",
                        }}
                      />
                    </div>
                    <span className="num" style={{ fontWeight: 600 }}>{fmtMXN(p.sales)}</span>
                  </div>
                </td>
                <td className="num" style={{ textAlign: "right", color: "var(--ok)" }}>
                  {fmtMXN(p.margin)}
                </td>
                <td className="num" style={{ textAlign: "right", color: "var(--muted)" }}>
                  {mPct.toFixed(0)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
