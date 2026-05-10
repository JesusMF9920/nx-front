import { fmtMXN } from "@/lib/format";
import { NEXUM_TOP_CLIENTS } from "@/lib/mock-reports";

export function ReportsClients() {
  return (
    <div className="card">
      <div className="card__head">
        <div className="card__title">Clientes top</div>
      </div>
      <table className="tbl">
        <thead>
          <tr>
            <th>Cliente</th>
            <th style={{ textAlign: "right" }}>Pedidos</th>
            <th style={{ textAlign: "right" }}>Ventas</th>
            <th style={{ textAlign: "right" }}>Margen</th>
            <th style={{ textAlign: "right" }}>Saldo</th>
          </tr>
        </thead>
        <tbody>
          {NEXUM_TOP_CLIENTS.map((c) => (
            <tr key={c.name}>
              <td style={{ fontWeight: 500 }}>{c.name}</td>
              <td className="num" style={{ textAlign: "right" }}>{c.orders}</td>
              <td className="num" style={{ textAlign: "right", fontWeight: 600 }}>
                {fmtMXN(c.sales)}
              </td>
              <td className="num" style={{ textAlign: "right", color: "var(--ok)" }}>
                {fmtMXN(c.margin)}
              </td>
              <td
                className="num"
                style={{
                  textAlign: "right",
                  color: c.debt ? "var(--warn)" : "var(--muted)",
                }}
              >
                {c.debt ? fmtMXN(c.debt) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
