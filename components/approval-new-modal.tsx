"use client";

import { useEffect, useState } from "react";
import { Modal } from "./modal";
import { designApi } from "@/lib/api/design";
import { ordersApi } from "@/lib/api/orders";
import type { ApiOrder, ApiOrderItem } from "@/lib/api/types";

/** Etapas donde un job admite abrir ficha de diseño. */
const DESIGN_STAGES = ["in_design", "client_approval"];

/**
 * Crea una ficha de diseño: elige una orden en diseño y un job con
 * aprobación pendiente. El backend rechaza duplicados (409) y jobs sin
 * needsApproval (422).
 */
export function ApprovalNewModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [orderId, setOrderId] = useState<string>("");
  const [items, setItems] = useState<ApiOrderItem[]>([]);
  const [itemId, setItemId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Órdenes con algún job todavía en etapa de diseño: el status derivado
        // de la orden es el del job más atrasado, así que basta in_design.
        const res = await ordersApi.list({ status: "in_design", take: 100 });
        if (!cancelled) setOrders(res.items);
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

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    (async () => {
      try {
        const detail = await ordersApi.get(orderId);
        if (cancelled) return;
        const eligible = detail.items.filter(
          (i) => i.needsApproval && DESIGN_STAGES.includes(i.status),
        );
        setItems(eligible);
        setItemId(eligible[0]?.id ?? "");
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Algo salió mal.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  async function handleCreate() {
    if (!orderId || !itemId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await designApi.create({ orderId, itemId });
      onCreated(res.id);
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : "Algo salió mal.");
    }
  }

  return (
    <Modal
      title="Nueva ficha de diseño"
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
            onClick={handleCreate}
            disabled={!itemId || busy}
          >
            {busy ? "Creando…" : "Crear ficha"}
          </button>
        </>
      }
    >
      <div className="text-sm text-ink-2">
        Cada producto vendido con aprobación de diseño lleva su propia ficha
        con versiones y conversación.
      </div>

      <label className="text-xs text-muted block mt-4 mb-1">
        Orden (en diseño)
      </label>
      <select
        className="select w-full"
        value={orderId}
        onChange={(e) => {
          // Reset aquí (no en el effect) para evitar setState síncrono en efectos.
          setOrderId(e.target.value);
          setItems([]);
          setItemId("");
        }}
        disabled={loading}
      >
        <option value="">
          {loading ? "Cargando órdenes…" : "Selecciona una orden"}
        </option>
        {orders.map((o) => (
          <option key={o.id} value={o.id}>
            {o.folio} · {o.clientName}
          </option>
        ))}
      </select>

      {orderId && (
        <>
          <label className="text-xs text-muted block mt-3 mb-1">
            Producto (con aprobación pendiente)
          </label>
          {items.length === 0 ? (
            <div className="text-muted text-xs">
              Esta orden no tiene productos en etapa de diseño con aprobación
              pendiente.
            </div>
          ) : (
            <select
              className="select w-full"
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
            >
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.productName} · v{i.designVersion}
                </option>
              ))}
            </select>
          )}
        </>
      )}

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
