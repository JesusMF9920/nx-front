"use client";

import { useState } from "react";
import { CalendarEvent } from "@/components/calendar-event";
import { I } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { UpcomingByStatus, type UpcomingItem } from "@/components/upcoming-by-status";
import { NEXUM_DELIVERIES_BY_DAY } from "@/lib/mock-orders";

type CalendarView = "day" | "week" | "month";

type Day = {
  date: string;
  label: string;
  today?: boolean;
};

const WEEK: Day[] = [
  { date: "2026-05-04", label: "Lun 04" },
  { date: "2026-05-05", label: "Mar 05" },
  { date: "2026-05-06", label: "Mié 06", today: true },
  { date: "2026-05-07", label: "Jue 07" },
  { date: "2026-05-08", label: "Vie 08" },
  { date: "2026-05-09", label: "Sáb 09" },
  { date: "2026-05-10", label: "Dom 10" },
];

const WAITING_APPROVAL: UpcomingItem[] = [
  { id: "ORD-1842", client: "Café Aurora",         note: "Diseño v1 enviado hace 6 h" },
  { id: "ORD-1840", client: "Estudio Pliegue",     note: "Diseño v3 — sin respuesta 18 h" },
  { id: "ORD-1837", client: "Mercería Las Flores", note: "Cambios solicitados" },
];

const SUPPLIER_RISK: UpcomingItem[] = [
  { id: "ORD-1843", client: "Pastelería Belluno", note: "Lonas del Bajío · entrega vie 09", supplier: true },
  { id: "ORD-1844", client: "Gimnasio FlexCore",  note: "Bordados Norte · entrega lun 11", supplier: true },
];

const VIEW_LABELS: { id: CalendarView; label: string }[] = [
  { id: "day",   label: "Día" },
  { id: "week",  label: "Semana" },
  { id: "month", label: "Mes" },
];

export default function CalendarPage() {
  const [view, setView] = useState<CalendarView>("week");

  const total = WEEK.reduce((acc, d) => acc + (NEXUM_DELIVERIES_BY_DAY[d.date]?.length ?? 0), 0);

  return (
    <>
      <PageHeader
        title="Calendario de entregas"
        sub={`Semana del 4 al 10 de mayo · ${total} entregas programadas`}
        actions={
          <>
            <button className="btn">{I.download} Exportar</button>
            <button className="btn">{I.printer} Imprimir hoja</button>
            <button className="btn btn--accent">{I.plus} Programar entrega</button>
          </>
        }
      />

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card__head">
          <button className="icon-btn" aria-label="Semana anterior">{I.chevronLeft}</button>
          <button className="btn btn--sm">Hoy</button>
          <button className="icon-btn" aria-label="Semana siguiente">{I.chevronRight}</button>
          <div style={{ marginLeft: 8, fontWeight: 500 }}>Mayo 2026</div>
          <div className="spacer" />
          <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--muted)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span className="dot dot--info" />Diseño</span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span className="dot dot--warn" />Aprobación</span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span className="dot dot--accent" />Producción</span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span className="dot dot--supplier" />Proveedor</span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span className="dot dot--ok" />Listo</span>
          </div>
          <div className="spacer" />
          <div
            style={{
              display: "flex",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-md)",
              overflow: "hidden",
            }}
          >
            {VIEW_LABELS.map((v) => (
              <button
                key={v.id}
                className={`btn btn--sm ${view === v.id ? "btn--primary" : "btn--ghost"}`}
                style={{ borderRadius: 0, border: 0 }}
                onClick={() => setView(v.id)}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            borderTop: "1px solid var(--line)",
          }}
        >
          {WEEK.map((d, i) => {
            const events = NEXUM_DELIVERIES_BY_DAY[d.date] ?? [];
            return (
              <div
                key={d.date}
                style={{
                  borderRight: i < 6 ? "1px solid var(--line)" : "0",
                  minHeight: 380,
                  background: d.today ? "var(--surface-2)" : "var(--surface)",
                }}
              >
                <div
                  style={{
                    padding: "10px 12px",
                    borderBottom: "1px solid var(--line)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    color: d.today ? "var(--accent-ink)" : "var(--ink-2)",
                    fontWeight: d.today ? 600 : 500,
                    position: "sticky",
                    top: 0,
                    background: "inherit",
                  }}
                >
                  {d.label}
                  {d.today && (
                    <span className="pill pill--accent" style={{ marginLeft: "auto", padding: "0 6px" }}>
                      Hoy
                    </span>
                  )}
                </div>

                <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                  {events.length === 0 ? (
                    <div
                      style={{
                        color: "var(--muted-2)",
                        fontSize: 11,
                        padding: "20px 4px",
                        textAlign: "center",
                      }}
                    >
                      Sin entregas
                    </div>
                  ) : (
                    events.map((ev) => <CalendarEvent key={ev.id} ev={ev} />)
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <UpcomingByStatus title="Esperando aprobación cliente" items={WAITING_APPROVAL} />
        <UpcomingByStatus title="Con proveedor — riesgo" items={SUPPLIER_RISK} />
      </div>
    </>
  );
}
