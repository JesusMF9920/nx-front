"use client";

import { useEffect, useState } from "react";
import { Modal } from "./modal";
import { ordersApi } from "@/lib/api/orders";
import { fmtDate } from "@/lib/format";
import type { ApiOrder } from "@/lib/api/types";

/** Órdenes que aún admiten (re)programar entrega. */
const SCHEDULABLE = (o: ApiOrder) =>
  o.status !== "delivered" && o.status !== "cancelled";

/**
 * Programa o reagenda la fecha de entrega de una orden abierta
 * (PATCH /orders/:id con deliverAt anclado a mediodía local).
 */
export function ScheduleDeliveryModal({
  onClose,
  onScheduled,
}: {
  onClose: () => void;
  onScheduled: () => void;
}) {
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [orderId, setOrderId] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await ordersApi.list({ take: 100 });
        if (!cancelled) setOrders(res.items.filter(SCHEDULABLE));
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Algo salió mal.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = orders.find((o) => o.id === orderId);

  async function handleSave() {
    if (!orderId || !date || busy) return;
    setBusy(true);
    setError(null);
    try {
      // "YYYY-MM-DD" anclado a mediodía LOCAL antes de ISO — mismo patrón que
      // el POS y el editor de orders/[id]: evita el corrimiento de día en
      // zonas al oeste de UTC.
      await ordersApi.update(orderId, {
        deliverAt: new Date(`${date}T12:00:00`).toISOString(),
      });
      onScheduled();
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : "Algo salió mal.");
    }
  }

  return (
    <Modal
      title="Programar entrega"
      onClose={busy ? () => undefined : onClose}
      width={480}
      footer={
        <>
          <button
            className="btn btn--ghost"
            type="button"
            onClick={onClose}
            disabled={busy}
          >
            Cancelar
          </button>
          <button
            className="btn btn--accent"
            type="button"
            onClick={handleSave}
            disabled={!orderId || !date || busy}
          >
            {busy ? "Guardando…" : "Guardar fecha"}
          </button>
        </>
      }
    >
      <div className="text-sm text-ink-2">
        Elige un pedido abierto y la fecha en que se entrega. Si ya tenía
        fecha, se reagenda.
      </div>

      <label className="text-xs text-muted block mt-4 mb-1">Pedido</label>
      <select
        className="select w-full"
        value={orderId}
        onChange={(e) => setOrderId(e.target.value)}
        disabled={loading}
      >
        <option value="">
          {loading ? "Cargando pedidos…" : "Selecciona un pedido"}
        </option>
        {orders.map((o) => (
          <option key={o.id} value={o.id}>
            {o.folio} · {o.clientName}
            {o.deliverAt ? ` · entrega ${fmtDate(o.deliverAt)}` : " · sin fecha"}
          </option>
        ))}
      </select>

      {selected?.deliverAt && (
        <div className="text-muted text-xs mt-2">
          Este pedido ya tiene entrega el {fmtDate(selected.deliverAt)} — al
          guardar se reagenda.
        </div>
      )}

      <label className="text-xs text-muted block mt-3 mb-1">
        Fecha de entrega
      </label>
      <input
        type="date"
        className="input w-full"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />

      {error && (
        <div
          className="rounded-md text-xs mt-3"
          style={{
            padding: "10px 12px",
            border: "1px solid var(--danger)",
            color: "var(--danger)",
            background: "var(--danger-soft)",
          }}
          role="alert"
        >
          {error}
        </div>
      )}
    </Modal>
  );
}
