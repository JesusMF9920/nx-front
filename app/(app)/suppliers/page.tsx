import { I } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { fmtDate } from "@/lib/format";
import { NEXUM_SUPPLIERS } from "@/lib/mock-suppliers";

type SupplierOrder = {
  id: string;
  supplier: string;
  item: string;
  due: string;
  status: string;
};

const SUPPLIER_ORDERS: SupplierOrder[] = [
  { id: "PRV-118", supplier: "Lonas del Bajío", item: "Lona 4×2 m frontlit",     due: "2026-05-09", status: "Producción" },
  { id: "PRV-117", supplier: "Bordados Norte",  item: "Parches bordados x60",    due: "2026-05-11", status: "Esperado" },
  { id: "PRV-116", supplier: "Fotograbado MX",  item: "Sello automático 4×6",    due: "2026-05-09", status: "En camino" },
];

export default function SuppliersPage() {
  return (
    <>
      <PageHeader
        title="Proveedores"
        sub={`${NEXUM_SUPPLIERS.length} proveedores activos · ${SUPPLIER_ORDERS.length} pedidos en curso`}
        actions={
          <button className="btn btn--accent">
            {I.plus} Nuevo proveedor
          </button>
        }
      />

      <div className="grid" style={{ gridTemplateColumns: "1.5fr 1fr", gap: 20 }}>
        <div className="card">
          <div className="card__head">
            <div className="card__title">Proveedores</div>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Proveedor</th>
                <th>Servicio</th>
                <th style={{ textAlign: "right" }}>Lead</th>
                <th>Confiabilidad</th>
                <th>Último pedido</th>
              </tr>
            </thead>
            <tbody>
              {NEXUM_SUPPLIERS.map((s) => (
                <tr key={s.id}>
                  <td>
                    <strong>{s.name}</strong>
                  </td>
                  <td>{s.service}</td>
                  <td className="num" style={{ textAlign: "right" }}>{s.leadDays}d</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div
                        style={{
                          flex: 1,
                          height: 4,
                          background: "var(--surface-3)",
                          borderRadius: 2,
                        }}
                      >
                        <div
                          style={{
                            width: `${s.reliability}%`,
                            height: "100%",
                            background: "var(--ok)",
                            borderRadius: 2,
                          }}
                        />
                      </div>
                      <span className="num" style={{ fontSize: 12 }}>{s.reliability}%</span>
                    </div>
                  </td>
                  <td className="num">{fmtDate(s.lastOrder)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="card__head">
            <div className="card__title">Pedidos a proveedor en curso</div>
          </div>
          <div className="card__body" style={{ padding: 0 }}>
            {SUPPLIER_ORDERS.map((p, i, a) => (
              <div
                key={p.id}
                style={{
                  padding: "12px 16px",
                  borderBottom: i < a.length - 1 ? "1px solid var(--line)" : 0,
                  display: "flex",
                  gap: 10,
                }}
              >
                <div className="num" style={{ fontSize: 11, color: "var(--muted)", minWidth: 60 }}>
                  {p.id}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{p.item}</div>
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>
                    {p.supplier} · entrega {fmtDate(p.due)}
                  </div>
                </div>
                <span className="pill pill--supplier">{p.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
