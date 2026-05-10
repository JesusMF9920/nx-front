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

      <div className="card mb-5">
        <div className="card__head">
          <button className="icon-btn" aria-label="Semana anterior">{I.chevronLeft}</button>
          <button className="btn btn--sm">Hoy</button>
          <button className="icon-btn" aria-label="Semana siguiente">{I.chevronRight}</button>
          <div className="ml-2 font-medium">Mayo 2026</div>
          <div className="spacer" />
          <div className="flex gap-4 text-xs text-muted">
            <span className="flex items-center gap-1.5"><span className="dot dot--info" />Diseño</span>
            <span className="flex items-center gap-1.5"><span className="dot dot--warn" />Aprobación</span>
            <span className="flex items-center gap-1.5"><span className="dot dot--accent" />Producción</span>
            <span className="flex items-center gap-1.5"><span className="dot dot--supplier" />Proveedor</span>
            <span className="flex items-center gap-1.5"><span className="dot dot--ok" />Listo</span>
          </div>
          <div className="spacer" />
          <div className="flex border border-line rounded-md overflow-hidden">
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
          className="grid"
          style={{
            gridTemplateColumns: "repeat(7, 1fr)",
            borderTop: "1px solid var(--line)",
            gap: 0,
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
                  className="flex items-center gap-1.5 px-3 py-2.5 text-xs sticky top-0"
                  style={{
                    borderBottom: "1px solid var(--line)",
                    color: d.today ? "var(--accent-ink)" : "var(--ink-2)",
                    fontWeight: d.today ? 600 : 500,
                    background: "inherit",
                  }}
                >
                  {d.label}
                  {d.today && (
                    <span className="pill pill--accent ml-auto" style={{ padding: "0 6px" }}>
                      Hoy
                    </span>
                  )}
                </div>

                <div className="p-2 flex flex-col gap-1.5">
                  {events.length === 0 ? (
                    <div className="text-muted-2 text-[11px] text-center" style={{ padding: "20px 4px" }}>
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

      <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <UpcomingByStatus title="Esperando aprobación cliente" items={WAITING_APPROVAL} />
        <UpcomingByStatus title="Con proveedor — riesgo" items={SUPPLIER_RISK} />
      </div>
    </>
  );
}
