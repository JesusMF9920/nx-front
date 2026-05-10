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
            <th className="text-right">Unidades</th>
            <th>Ventas</th>
            <th className="text-right">Margen</th>
            <th className="text-right">%</th>
          </tr>
        </thead>
        <tbody>
          {NEXUM_TOP_PRODUCTS.map((p) => {
            const mPct = (p.margin / p.sales) * 100;
            return (
              <tr key={p.name}>
                <td className="font-medium">{p.name}</td>
                <td>
                  <span className="tag text-[10px]">{p.cat}</span>
                </td>
                <td className="num text-right">{p.qty}</td>
                <td>
                  <div className="flex items-center gap-2.5">
                    <div
                      className="bg-surface-3 overflow-hidden"
                      style={{ width: 140, height: 6, borderRadius: 3 }}
                    >
                      <div
                        className="h-full bg-accent"
                        style={{ width: `${(p.sales / max) * 100}%` }}
                      />
                    </div>
                    <span className="num font-semibold">{fmtMXN(p.sales)}</span>
                  </div>
                </td>
                <td className="num text-right text-ok">{fmtMXN(p.margin)}</td>
                <td className="num text-right text-muted">{mPct.toFixed(0)}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
