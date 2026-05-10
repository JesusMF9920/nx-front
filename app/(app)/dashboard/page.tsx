import { PageHeader } from "@/components/page-header";

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        sub="Resumen operativo · Imprenta Centro"
      />
      <div className="empty">
        <div style={{ fontSize: 14, color: "var(--ink-2)", fontWeight: 500, marginBottom: 6 }}>
          Próximamente
        </div>
        El dashboard con KPIs, ventas del día y entregas próximas se entregará en una iteración posterior.
        <br />
        Por ahora puedes navegar a <strong>Usuarios</strong> en el sidebar para ver el módulo implementado.
      </div>
    </>
  );
}
