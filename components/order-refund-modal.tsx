"use client";

import { useState, type FormEvent } from "react";
import { Modal } from "@/components/modal";
import { SummaryRow } from "@/components/summary-row";
import { ApiError } from "@/lib/api/errors";
import { ordersApi } from "@/lib/api/orders";
import { PAYMENT_METHOD_ES } from "@/lib/api/sales-mappers";
import { useToast } from "@/lib/toast/toast-context";
import type { ApiOrderDetail, ApiPaymentMethod } from "@/lib/api/types";
import { fmtMXN } from "@/lib/format";

type OrderRefundModalProps = {
  order: ApiOrderDetail;
  onClose: () => void;
  /** Se llama tras registrar la devolución (antes de cerrar) — el padre recarga. */
  onDone: () => void | Promise<void>;
};

export function OrderRefundModal({ order, onClose, onDone }: OrderRefundModalProps) {
  const toast = useToast();
  // Tope: no se puede devolver más de lo pagado (neto de devoluciones previas).
  const refundable = Math.max(0, +(order.paid - order.refunded).toFixed(2));
  // Las devoluciones SÍ se permiten en pedidos cancelados (devolver el dinero
  // de una venta cancelada). La única guarda es que haya saldo devolvible.
  const blocked = refundable <= 0;

  const [method, setMethod] = useState<ApiPaymentMethod>("cash");
  const [amount, setAmount] = useState(refundable > 0 ? refundable.toFixed(2) : "");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Una clave por sesión del modal: un reintento tras un error de red NO emite
  // una segunda devolución (no paga el efectivo dos veces).
  const [idemKey] = useState(() => crypto.randomUUID());

  const parsed = Number(amount);
  const valid =
    !blocked &&
    Number.isFinite(parsed) &&
    parsed > 0 &&
    reason.trim().length > 0;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await ordersApi.refund(
        order.id,
        {
          method,
          amount: +parsed.toFixed(2),
          reason: reason.trim(),
        },
        idemKey,
      );
      toast.success(`Devolución de ${fmtMXN(+parsed.toFixed(2))} aplicada`);
      await onDone();
      onClose();
    } catch (err) {
      if (
        err instanceof ApiError &&
        err.status === 409 &&
        err.body?.error === "RefundExceedsPaidError"
      ) {
        setError(`La devolución excede lo pagado (${fmtMXN(refundable)}).`);
      } else if (
        err instanceof ApiError &&
        err.status === 409 &&
        err.body?.error === "CashSessionRequiredError"
      ) {
        setError("Devolver en efectivo requiere una caja abierta.");
      } else {
        setError(
          err instanceof ApiError
            ? err.message
            : "No se pudo registrar la devolución.",
        );
      }
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={`Devolver dinero — ${order.folio}`}
      onClose={onClose}
      width={440}
      footer={
        <>
          <button className="btn btn--ghost" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn btn--danger"
            type="submit"
            form="order-refund-form"
            disabled={submitting || !valid}
          >
            {submitting ? "Devolviendo…" : "Devolver"}
          </button>
        </>
      }
    >
      <form id="order-refund-form" onSubmit={submit} className="grid gap-3.5">
        <div>
          <SummaryRow label="Pagado" value={fmtMXN(order.paid)} />
          {order.refunded > 0 && (
            <SummaryRow label="Ya devuelto" value={fmtMXN(order.refunded)} />
          )}
          <SummaryRow
            label="Devolvible"
            value={fmtMXN(refundable)}
            muted={refundable === 0}
          />
        </div>

        {blocked && (
          <div className="text-muted text-sm" role="status">
            No hay saldo pagado por devolver.
          </div>
        )}

        <div className="field">
          <span className="label">Método</span>
          <div className="flex gap-1.5">
            {(Object.keys(PAYMENT_METHOD_ES) as ApiPaymentMethod[]).map((m) => (
              <button
                type="button"
                key={m}
                className={`btn btn--sm ${method === m ? "btn--primary" : ""}`}
                onClick={() => setMethod(m)}
                disabled={blocked || submitting}
              >
                {PAYMENT_METHOD_ES[m]}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="label">Monto</span>
          <input
            className="input"
            type="number"
            inputMode="decimal"
            min={0.01}
            step={0.01}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={blocked || submitting}
            required
          />
        </div>

        <div className="field">
          <span className="label">Motivo</span>
          <input
            className="input"
            placeholder="Motivo de la devolución"
            maxLength={200}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={blocked || submitting}
            required
          />
        </div>

        {error && (
          <div
            className="rounded-md text-xs"
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
      </form>
    </Modal>
  );
}
