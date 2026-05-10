"use client";

import { useState } from "react";
import { I } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { ReportsAging } from "@/components/reports-aging";
import { ReportsClients } from "@/components/reports-clients";
import { ReportsProducts } from "@/components/reports-products";
import { ReportsSellers } from "@/components/reports-sellers";
import { ReportsSummary } from "@/components/reports-summary";
import { fmtMXN } from "@/lib/format";
import { NEXUM_AGING, NEXUM_REPORT_DAILY } from "@/lib/mock-reports";

type Range = "7d" | "30d" | "90d" | "Año";
type Tab = "Resumen" | "Productos" | "Clientes" | "Vendedores" | "Cobranza";

const RANGES: Range[] = ["7d", "30d", "90d", "Año"];
const TABS: Tab[] = ["Resumen", "Productos", "Clientes", "Vendedores", "Cobranza"];

type KpiTone = "ok" | "warn" | "neutral";

export default function ReportsPage() {
  const [range, setRange] = useState<Range>("30d");
  const [tab, setTab] = useState<Tab>("Resumen");

  const data = NEXUM_REPORT_DAILY;
  const totSales = data.reduce((s, d) => s + d.sales, 0);
  const totOrders = data.reduce((s, d) => s + d.orders, 0);
  const totMargin = data.reduce((s, d) => s + d.margin, 0);
  const avgTicket = totSales / totOrders;
  const marginPct = (totMargin / totSales) * 100;
  const totCxC = NEXUM_AGING.reduce((s, a) => s + a.total, 0);
  const overdue = NEXUM_AGING.reduce((s, a) => s + a.b3160 + a.b6190 + a.b90, 0);

  return (
    <>
      <PageHeader
        title="Reportes"
        sub="Ventas, margen, cobranza y desempeño · vista de gerencia"
        actions={
          <>
            <div
              className="row"
              style={{
                gap: 4,
                border: "1px solid var(--line)",
                borderRadius: "var(--r-md)",
                padding: 3,
                background: "var(--surface)",
              }}
            >
              {RANGES.map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`btn btn--sm ${range === r ? "btn--primary" : "btn--ghost"}`}
                  style={{ border: "none" }}
                >
                  {r}
                </button>
              ))}
            </div>
            <button className="btn">{I.download} Exportar Excel</button>
            <button className="btn">{I.copy} PDF</button>
          </>
        }
      />

      <div className="kpi-grid" style={{ marginBottom: 18 }}>
        <Kpi
          label="Ventas netas"
          value={fmtMXN(totSales)}
          delta="+18.4%"
          up
          hint="vs período anterior"
        />
        <Kpi
          label="Pedidos"
          value={totOrders}
          delta="+12"
          up
          hint={`Ticket promedio ${fmtMXN(avgTicket)}`}
        />
        <Kpi
          label="Margen bruto"
          value={fmtMXN(totMargin)}
          delta={`${marginPct.toFixed(1)}%`}
          up
          hint="utilidad estimada"
          tone="ok"
        />
        <Kpi
          label="Cuentas por cobrar"
          value={fmtMXN(totCxC)}
          delta={fmtMXN(overdue)}
          up={false}
          hint="vencido > 30 días"
          tone={overdue > 0 ? "warn" : "neutral"}
        />
      </div>

      <div
        className="row"
        style={{
          gap: 4,
          marginBottom: 14,
          padding: 3,
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-md)",
          display: "inline-flex",
        }}
      >
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`btn btn--sm ${tab === t ? "btn--primary" : "btn--ghost"}`}
            style={{ border: "none" }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Resumen" && <ReportsSummary />}
      {tab === "Productos" && <ReportsProducts />}
      {tab === "Clientes" && <ReportsClients />}
      {tab === "Vendedores" && <ReportsSellers />}
      {tab === "Cobranza" && <ReportsAging />}
    </>
  );
}

function Kpi({
  label,
  value,
  delta,
  up,
  hint,
  tone,
}: {
  label: string;
  value: string | number;
  delta: string;
  up: boolean;
  hint: string;
  tone?: KpiTone;
}) {
  const deltaColor =
    tone === "warn" ? "var(--warn)" : tone === "ok" ? "var(--ok)" : up ? "var(--ok)" : "var(--muted)";
  return (
    <div className="kpi">
      <div className="kpi__label">{label}</div>
      <div className="kpi__value num">{value}</div>
      <div className="kpi__foot">
        <span style={{ color: deltaColor, fontWeight: 500 }}>{delta}</span>
        <span style={{ color: "var(--muted)", fontSize: 11 }}>· {hint}</span>
      </div>
    </div>
  );
}
