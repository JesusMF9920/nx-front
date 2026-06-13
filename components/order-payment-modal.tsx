"use client";

import { useState, type FormEvent } from "react";
import { Modal } from "@/components/modal";
import { SummaryRow } from "@/components/summary-row";
import { ApiError } from "@/lib/api/errors";
import { ordersApi } from "@/lib/api/orders";
import { PAYMENT_METHOD_ES } from "@/lib/api/sales-mappers";
import type { ApiOrderDetail, ApiPaymentMethod } from "@/lib/api/types";
import { fmtMXN } from "@/lib/format";

type OrderPaymentModalProps = {
  order: ApiOrderDetail;
  onClose: () => void;
  /** Se llama tras registrar el pago (antes de cerrar) — el padre recarga. */
  onDone: () => void | Promise<void>;
};

export function OrderPaymentModal({ order, onClose, onDone }: OrderPaymentModalProps) {
  const balance = Math.max(0, +(order.total - order.paid).toFixed(2));
  const blocked = balance <= 0 || order.status === "cancelled";

  const [method, setMethod] = useState<ApiPaymentMethod>("cash");
  const [amount, setAmount] = useState(balance > 0 ? balance.toFixed(2) : "");
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Key estable por apertura del modal: un reintento tras timeout de red reusa
  // el mismo header idempotency-key y el backend no duplica el cobro.
  const [idemKey] = useState(() => crypto.randomUUID());

  const parsed = Number(amount);
  const valid = !blocked && Number.isFinite(parsed) && parsed > 0;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await ordersApi.addPayment(
        order.id,
        {
          method,
          amount: +parsed.toFixed(2),
          reference: reference.trim() || undefined,
        },
        idemKey,
      );
      await onDone();
      onClose();
    } catch (err) {
      if (
        err instanceof ApiError &&
        err.status === 409 &&
        err.body?.error === "PaymentExceedsTotalError"
      ) {
        setError(`El pago excede el saldo del pedido (${fmtMXN(balance)}).`);
      } else {
        setError(
          err instanceof ApiError ? err.message : "No se pudo registrar el pago.",
        );
      }
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={`Registrar pago — ${order.folio}`}
      onClose={onClose}
      width={440}
      footer={
        <>
          <button className="btn btn--ghost" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn btn--accent"
            type="submit"
            form="order-payment-form"
            disabled={submitting || !valid}
          >
            {submitting ? "Registrando…" : "Registrar pago"}
          </button>
        </>
      }
    >
      <form id="order-payment-form" onSubmit={submit} className="grid gap-3.5">
        <div>
          <SummaryRow label="Total" value={fmtMXN(order.total)} />
          <SummaryRow label="Pagado" value={fmtMXN(order.paid)} />
          <SummaryRow label="Por cobrar" value={fmtMXN(balance)} muted={balance === 0} />
        </div>

        {blocked && (
          <div className="text-muted text-sm" role="status">
            {order.status === "cancelled"
              ? "El pedido está cancelado — no se pueden registrar pagos."
              : "El pedido no tiene saldo pendiente."}
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
          <span className="label">Referencia (opcional)</span>
          <input
            className="input"
            placeholder="Voucher / referencia de terminal"
            maxLength={120}
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            disabled={blocked || submitting}
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
