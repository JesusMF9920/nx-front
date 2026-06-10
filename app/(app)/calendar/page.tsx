"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarEvent } from "@/components/calendar-event";
import { I } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { ScheduleDeliveryModal } from "@/components/schedule-delivery-modal";
import {
  UpcomingByStatus,
  type UpcomingItem,
} from "@/components/upcoming-by-status";
import { ordersApi } from "@/lib/api/orders";
import type { ApiOrder } from "@/lib/api/types";
import { usePermission } from "@/lib/auth/auth-context";

/** Lunes de la semana del día dado (semana laboral MX: lun–dom). */
function startOfWeek(d: Date): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (out.getDay() + 6) % 7; // 0 = lunes
  out.setDate(out.getDate() - dow);
  return out;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

/** Clave de día LOCAL (deliverAt viene anclado a mediodía local). */
function dayKey(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

const DAY_LABEL = new Intl.DateTimeFormat("es-MX", {
  weekday: "short",
  day: "2-digit",
});
const RANGE_LABEL = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "long",
});
const MONTH_LABEL = new Intl.DateTimeFormat("es-MX", {
  month: "long",
  year: "numeric",
});

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function deliveryNote(o: ApiOrder): string {
  if (!o.deliverAt) return "Sin fecha de entrega";
  return `Entrega ${RANGE_LABEL.format(new Date(o.deliverAt))}`;
}

export default function CalendarPage() {
  const canRead = usePermission("sales.orders.read");
  const canManage = usePermission("sales.orders.manage");

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [deliveries, setDeliveries] = useState<ApiOrder[]>([]);
  const [waitingApproval, setWaitingApproval] = useState<ApiOrder[]>([]);
  const [withSupplier, setWithSupplier] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const requestToken = useRef(0);

  const reload = useCallback(async () => {
    const token = ++requestToken.current;
    const from = weekStart;
    const to = addDays(weekStart, 7);
    setLoading(true);
    try {
      const [delRes, apprRes, suppRes] = await Promise.all([
        ordersApi.list({
          deliverFrom: from.toISOString(),
          deliverTo: to.toISOString(),
          take: 100,
        }),
        ordersApi.list({ status: "client_approval", take: 8 }),
        ordersApi.list({ status: "with_supplier", take: 8 }),
      ]);
      if (token !== requestToken.current) return; // respuesta vieja
      setDeliveries(delRes.items);
      setWaitingApproval(apprRes.items);
      setWithSupplier(suppRes.items);
      setError(null);
    } catch (err) {
      if (token !== requestToken.current) return;
      setError(err instanceof Error ? err.message : "Algo salió mal.");
    } finally {
      if (token === requestToken.current) setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    if (!canRead) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mismo patrón que orders/page.tsx
    void reload();
  }, [canRead, reload]);

  const todayKey = dayKey(new Date());
  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const date = addDays(weekStart, i);
        return {
          key: dayKey(date),
          label: cap(DAY_LABEL.format(date).replace(".", "")),
        };
      }),
    [weekStart],
  );

  const byDay = useMemo(() => {
    const map: Record<string, ApiOrder[]> = {};
    for (const o of deliveries) {
      if (!o.deliverAt) continue;
      const k = dayKey(new Date(o.deliverAt));
      (map[k] ??= []).push(o);
    }
    return map;
  }, [deliveries]);

  const weekEndLabel = RANGE_LABEL.format(addDays(weekStart, 6));
  const sub = loading
    ? "Cargando entregas…"
    : `Semana del ${RANGE_LABEL.format(weekStart)} al ${weekEndLabel} · ${deliveries.length} entrega${deliveries.length === 1 ? "" : "s"} programada${deliveries.length === 1 ? "" : "s"}`;

  const approvalItems: UpcomingItem[] = waitingApproval.map((o) => ({
    id: o.folio,
    client: o.clientName,
    note: deliveryNote(o),
  }));
  const supplierItems: UpcomingItem[] = withSupplier.map((o) => ({
    id: o.folio,
    client: o.clientName,
    note: deliveryNote(o),
    supplier: true,
  }));

  if (!canRead) {
    return (
      <>
        <PageHeader
          title="Calendario de entregas"
          sub="Entregas programadas de la semana."
        />
        <div className="empty m-4 p-6">
          No tienes permiso para ver los pedidos.
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Calendario de entregas"
        sub={sub}
        actions={
          canManage ? (
            <button
              className="btn btn--accent"
              onClick={() => setShowSchedule(true)}
            >
              {I.plus} Programar entrega
            </button>
          ) : undefined
        }
      />

      {error && (
        <div
          className="m-4 p-4 rounded-md text-xs"
          style={{
            border: "1px solid var(--danger)",
            color: "var(--danger)",
            background: "var(--danger-soft)",
          }}
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="card mb-5">
        <div className="card__head">
          <button
            className="icon-btn"
            aria-label="Semana anterior"
            onClick={() => setWeekStart((w) => addDays(w, -7))}
          >
            {I.chevronLeft}
          </button>
          <button
            className="btn btn--sm"
            onClick={() => setWeekStart(startOfWeek(new Date()))}
          >
            Hoy
          </button>
          <button
            className="icon-btn"
            aria-label="Semana siguiente"
            onClick={() => setWeekStart((w) => addDays(w, 7))}
          >
            {I.chevronRight}
          </button>
          <div className="ml-2 font-medium">
            {cap(MONTH_LABEL.format(weekStart))}
          </div>
          <div className="spacer" />
          <div className="flex gap-4 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <span className="dot dot--info" />
              Diseño
            </span>
            <span className="flex items-center gap-1.5">
              <span className="dot dot--warn" />
              Aprobación
            </span>
            <span className="flex items-center gap-1.5">
              <span className="dot dot--accent" />
              Producción
            </span>
            <span className="flex items-center gap-1.5">
              <span className="dot dot--supplier" />
              Proveedor
            </span>
            <span className="flex items-center gap-1.5">
              <span className="dot dot--ok" />
              Listo
            </span>
          </div>
        </div>

        {/* Responsive tablet (H3): la semana NO colapsa a menos columnas —
            scrollea horizontal hasta que las 7 caben (≥1024). */}
        <div className="overflow-x-auto">
        <div
          className="grid grid-cols-7 min-w-[980px] lg:min-w-0"
          style={{
            borderTop: "1px solid var(--line)",
            gap: 0,
          }}
        >
          {days.map((d, i) => {
            const events = byDay[d.key] ?? [];
            const today = d.key === todayKey;
            return (
              <div
                key={d.key}
                style={{
                  borderRight: i < 6 ? "1px solid var(--line)" : "0",
                  minHeight: 380,
                  background: today ? "var(--surface-2)" : "var(--surface)",
                }}
              >
                <div
                  className="flex items-center gap-1.5 px-3 py-2.5 text-xs sticky top-0"
                  style={{
                    borderBottom: "1px solid var(--line)",
                    color: today ? "var(--accent-ink)" : "var(--ink-2)",
                    fontWeight: today ? 600 : 500,
                    background: "inherit",
                  }}
                >
                  {d.label}
                  {today && (
                    <span
                      className="pill pill--accent ml-auto"
                      style={{ padding: "0 6px" }}
                    >
                      Hoy
                    </span>
                  )}
                </div>

                <div className="p-2 flex flex-col gap-1.5">
                  {loading ? (
                    <div
                      className="text-muted-2 text-[11px] text-center"
                      style={{ padding: "20px 4px" }}
                    >
                      …
                    </div>
                  ) : events.length === 0 ? (
                    <div
                      className="text-muted-2 text-[11px] text-center"
                      style={{ padding: "20px 4px" }}
                    >
                      Sin entregas
                    </div>
                  ) : (
                    events.map((ev) => <CalendarEvent key={ev.id} order={ev} />)
                  )}
                </div>
              </div>
            );
          })}
        </div>
        </div>
      </div>

      <div className="grid gap-5 grid-cols-1 lg:grid-cols-2">
        <UpcomingByStatus
          title="Esperando aprobación cliente"
          items={approvalItems}
        />
        <UpcomingByStatus title="Con proveedor" items={supplierItems} />
      </div>

      {showSchedule && (
        <ScheduleDeliveryModal
          onClose={() => setShowSchedule(false)}
          onScheduled={() => {
            setShowSchedule(false);
            void reload();
          }}
        />
      )}
    </>
  );
}
