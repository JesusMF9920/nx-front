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

      <div className="grid gap-5" style={{ gridTemplateColumns: "1.5fr 1fr" }}>
        <div className="card">
          <div className="card__head">
            <div className="card__title">Proveedores</div>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Proveedor</th>
                <th>Servicio</th>
                <th className="text-right">Lead</th>
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
                  <td className="num text-right">{s.leadDays}d</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div
                        className="flex-1 bg-surface-3 rounded-sm"
                        style={{ height: 4 }}
                      >
                        <div
                          className="h-full bg-ok rounded-sm"
                          style={{ width: `${s.reliability}%` }}
                        />
                      </div>
                      <span className="num text-xs">{s.reliability}%</span>
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
          <div className="card__body p-0">
            {SUPPLIER_ORDERS.map((p, i, a) => (
              <div
                key={p.id}
                className="flex gap-2.5 px-4 py-3"
                style={{
                  borderBottom: i < a.length - 1 ? "1px solid var(--line)" : 0,
                }}
              >
                <div className="num text-[11px] text-muted" style={{ minWidth: 60 }}>
                  {p.id}
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-medium">{p.item}</div>
                  <div className="text-muted text-xs">
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
