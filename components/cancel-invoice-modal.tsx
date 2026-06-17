"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import { invoicingApi, type CancelInvoiceResult } from "@/lib/api/invoicing";
import { ApiError } from "@/lib/api/errors";
import type { ApiInvoice } from "@/lib/api/types";

/** Motivos SAT soportados (sin sustitución). */
const MOTIVE_OPTIONS = [
  { code: "02", label: "02 — Comprobante emitido con errores sin relación" },
  { code: "03", label: "03 — No se llevó a cabo la operación" },
];

type Props = {
  invoice: ApiInvoice;
  onClose: () => void;
  onCancelled: (result: CancelInvoiceResult) => void;
};

export function CancelInvoiceModal({ invoice, onClose, onCancelled }: Props) {
  const [motive, setMotive] = useState("02");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await invoicingApi.cancel(invoice.id, motive);
      // El padre (onCancelled) muestra un banner con el detalle del SAT; no
      // duplicamos con toast.
      onCancelled(res);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudo cancelar la factura.",
      );
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Cancelar factura (CFDI)"
      onClose={onClose}
      width={480}
      footer={
        <>
          <button
            className="btn btn--ghost"
            type="button"
            onClick={onClose}
            disabled={submitting}
          >
            Volver
          </button>
          <button
            className="btn btn--danger"
            type="button"
            onClick={() => void submit()}
            disabled={submitting}
          >
            {submitting ? "Cancelando…" : "Cancelar CFDI"}
          </button>
        </>
      }
    >
      <p className="text-[13px] mb-3">
        Vas a solicitar al SAT la cancelación del CFDI{" "}
        <strong>{invoice.folio ?? invoice.uuid ?? invoice.id}</strong>
        {invoice.receiverName ? ` de ${invoice.receiverName}` : ""}. Esta acción
        es irreversible.
      </p>

      <label className="field text-xs mb-2">
        Motivo de cancelación (SAT)
        <select
          className="select"
          value={motive}
          onChange={(e) => setMotive(e.target.value)}
        >
          {MOTIVE_OPTIONS.map((m) => (
            <option key={m.code} value={m.code}>
              {m.label}
            </option>
          ))}
        </select>
      </label>

      <p className="text-muted text-[11px]">
        CFDI 4.0: si el receptor es un contribuyente y el monto lo amerita, la
        cancelación puede quedar <strong>en proceso</strong> hasta su aceptación
        (o el plazo del SAT). Las globales a público en general cancelan sin
        aceptación.
      </p>

      {error && (
        <div
          className="card mt-3"
          style={{
            padding: 12,
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
