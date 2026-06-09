import { fmtMXN } from "@/lib/format";
import type { ApiTopClient } from "@/lib/api/types";

export function ReportsClients({ items }: { items: ApiTopClient[] }) {
  return (
    <div className="card">
      <div className="card__head">
        <div className="card__title">Clientes top</div>
      </div>
      {items.length === 0 ? (
        <div className="empty m-3.5">Sin ventas en el periodo.</div>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>Cliente</th>
              <th className="text-right">Pedidos</th>
              <th className="text-right">Ventas</th>
              <th className="text-right">Margen</th>
              <th className="text-right">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.clientId}>
                <td className="font-medium">{c.name}</td>
                <td className="num text-right">{c.orders}</td>
                <td className="num text-right font-semibold">{fmtMXN(c.sales)}</td>
                <td className="num text-right text-ok">{fmtMXN(c.margin)}</td>
                <td
                  className="num text-right"
                  style={{ color: c.debt ? "var(--warn)" : "var(--muted)" }}
                >
                  {c.debt ? fmtMXN(c.debt) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
