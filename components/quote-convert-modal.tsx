"use client";

import { useState, type ReactNode } from "react";
import { I } from "@/components/icons";
import { Modal } from "@/components/modal";
import { SummaryRow } from "@/components/summary-row";
import { ApiError } from "@/lib/api/errors";
import type { CheckoutPaymentInput } from "@/lib/api/orders";
import { quotesApi } from "@/lib/api/quotes";
import type { ApiConvertResult, ApiQuoteDetail, ApiStockShortage } from "@/lib/api/types";
import { fmtMXN } from "@/lib/format";
import { DEFAULT_DEPOSIT_PCT, depositAmount } from "@/lib/pos-cart";
import type { PaymentMethod } from "@/lib/types";

type Props = {
  quote: ApiQuoteDetail;
  onClose: () => void;
  onConverted: (result: ApiConvertResult) => void;
};

const METHOD_OPTIONS: { id: PaymentMethod; icon: ReactNode; sub: string }[] = [
  { id: "Efectivo", icon: I.cash, sub: "Pago de contado" },
  { id: "Terminal", icon: I.card, sub: "Tarjeta" },
  { id: "Transferencia", icon: I.send, sub: "SPEI / depósito" },
  { id: "Mixto", icon: I.layers, sub: "Efectivo + tarjeta" },
];

/** Cuánto se cobra AHORA; el resto queda como saldo (se liquida al entregar). */
type ChargeMode = "deposit" | "full" | "credit" | "custom";

const CHARGE_PRESETS: { id: ChargeMode; label: string }[] = [
  { id: "deposit", label: `Anticipo ${Math.round(DEFAULT_DEPOSIT_PCT * 100)}%` },
  { id: "full", label: "Total" },
  { id: "credit", label: "Crédito" },
  { id: "custom", label: "Otro" },
];

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function QuoteConvertModal({ quote, onClose, onConverted }: Props) {
  const total = quote.total;
  const [method, setMethod] = useState<PaymentMethod>("Efectivo");
  const [chargeMode, setChargeMode] = useState<ChargeMode>("deposit");
  const [customCharge, setCustomCharge] = useState("");
  const [reference, setReference] = useState("");
  const [mixedCash, setMixedCash] = useState("");
  const [mixedTerminal, setMixedTerminal] = useState("");
  const [deliverAt, setDeliverAt] = useState("");
  const [shortages, setShortages] = useState<ApiStockShortage[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Cobro inicial: anticipo (default 50%), total, crédito (0) o monto libre.
  // El resto queda como saldo a liquidar a la entrega.
  const customChargeNum = parseFloat(customCharge || "0") || 0;
  const chargeNow = round2(
    chargeMode === "full"
      ? total
      : chargeMode === "credit"
        ? 0
        : chargeMode === "deposit"
          ? depositAmount(total)
          : Math.min(Math.max(0, customChargeNum), total),
  );
  const balanceAfter = round2(Math.max(0, total - chargeNow));
  const isCredit = chargeNow <= 0;

  const mixedCashNum = parseFloat(mixedCash || "0") || 0;
  const mixedTerminalNum = parseFloat(mixedTerminal || "0") || 0;
  const mixedSum = round2(mixedCashNum + mixedTerminalNum);
  const mixedRemaining = round2(chargeNow - mixedSum);
  const mixedOk =
    mixedCashNum >= 0 &&
    mixedTerminalNum >= 0 &&
    mixedSum > 0 &&
    Math.abs(mixedSum - chargeNow) <= 0.01;

  const buildPayments = (): CheckoutPaymentInput[] => {
    if (isCredit) return [];
    switch (method) {
      case "Efectivo":
        return [{ method: "cash", amount: chargeNow }];
      case "Terminal": {
        const ref = reference.trim();
        return [
          { method: "terminal", amount: chargeNow, ...(ref ? { reference: ref } : {}) },
        ];
      }
      case "Transferencia": {
        const ref = reference.trim();
        return [
          { method: "transfer", amount: chargeNow, ...(ref ? { reference: ref } : {}) },
        ];
      }
      case "Mixto": {
        const out: CheckoutPaymentInput[] = [];
        if (mixedCashNum > 0) out.push({ method: "cash", amount: round2(mixedCashNum) });
        if (mixedTerminalNum > 0) {
          const ref = reference.trim();
          out.push({
            method: "terminal",
            amount: round2(mixedTerminalNum),
            ...(ref ? { reference: ref } : {}),
          });
        }
        return out;
      }
      case "Crédito":
        return [];
    }
  };

  const canConfirm =
    !submitting && (isCredit || method !== "Mixto" || mixedOk);

  const confirm = async () => {
    if (!canConfirm) return;
    setSubmitting(true);
    setSubmitError(null);
    setShortages([]);
    try {
      const res = await quotesApi.convert(quote.id, {
        payments: buildPayments(),
        ...(deliverAt
          ? { deliverAt: new Date(`${deliverAt}T12:00:00`).toISOString() }
          : {}),
      });
      onConverted(res);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        if (err.body?.error === "InsufficientStockForSaleError") {
          setShortages(err.body.shortages ?? []);
          setSubmitError("Inventario insuficiente para generar el pedido.");
        } else if (err.body?.error === "PaymentExceedsTotalError") {
          setSubmitError("El monto de los pagos excede el total.");
        } else if (err.body?.error === "QuoteAlreadyConvertedError") {
          setSubmitError("Esta cotización ya fue convertida en pedido.");
        } else {
          setSubmitError(err.message);
        }
      } else {
        setSubmitError(
          err instanceof ApiError ? err.message : "No se pudo convertir la cotización.",
        );
      }
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={`Convertir ${quote.folio} en pedido`}
      onClose={onClose}
      width={560}
      footer={
        <>
          <button className="btn btn--ghost" onClick={onClose} disabled={submitting}>
            Cancelar
          </button>
          <button
            className="btn btn--accent btn--lg"
            onClick={() => void confirm()}
            disabled={!canConfirm}
          >
            {I.check} {submitting ? "Generando…" : "Generar pedido"}
          </button>
        </>
      }
    >
      {submitError && (
        <div
          className="flex items-start gap-2 rounded-md mb-3"
          style={{
            padding: 12,
            border: "1px solid var(--danger)",
            color: "var(--danger)",
            background: "var(--danger-soft)",
          }}
          role="alert"
        >
          <span className="flex-1">{submitError}</span>
        </div>
      )}

      {quote.isExpired && (
        <div
          className="flex items-start gap-2 rounded-md mb-3 text-[13px]"
          style={{
            padding: 10,
            border: "1px solid var(--warn)",
            color: "var(--warn)",
            background: "var(--warn-soft, transparent)",
          }}
        >
          {I.alert} La cotización está vencida — confirma con el cliente antes de
          generar el pedido.
        </div>
      )}

      <div className="bg-surface-2 border border-line rounded-md p-3.5 mb-3.5">
        <SummaryRow label="Subtotal" value={fmtMXN(quote.subtotal)} />
        <SummaryRow label="Descuento" value={fmtMXN(quote.discount)} muted />
        <SummaryRow label="IVA 16%" value={fmtMXN(quote.tax)} />
        <div className="bg-line my-2" style={{ height: 1 }} />
        <SummaryRow label="Total del pedido" value={fmtMXN(total)} big />
        <div className="text-[11px] text-muted mt-1.5">
          Se respeta el precio cotizado (snapshot); no se recalcula contra el
          catálogo.
        </div>
      </div>

      <div className="label mb-2">Cobro inicial</div>
      <div className="grid grid-cols-4 gap-1.5">
        {CHARGE_PRESETS.map((c) => (
          <button
            type="button"
            key={c.id}
            onClick={() => setChargeMode(c.id)}
            className="rounded-md py-2 px-1.5 cursor-pointer text-[12px] font-medium text-center"
            style={{
              border:
                chargeMode === c.id
                  ? "1.5px solid var(--accent)"
                  : "1px solid var(--line)",
              background:
                chargeMode === c.id ? "var(--accent-soft)" : "var(--surface)",
              color: chargeMode === c.id ? "var(--accent-ink)" : "var(--ink)",
            }}
          >
            {c.label}
          </button>
        ))}
      </div>
      {chargeMode === "custom" && (
        <label className="field mt-2">
          <span className="label">
            Monto a cobrar ahora (máx {fmtMXN(total)})
          </span>
          <input
            className="input num"
            type="number"
            min={0}
            max={total}
            step="0.01"
            value={customCharge}
            onChange={(e) => setCustomCharge(e.target.value)}
            placeholder={String(depositAmount(total))}
          />
        </label>
      )}
      <div className="text-[11px] mt-1.5" style={{ color: "var(--muted)" }}>
        Cobro ahora{" "}
        <strong className="num" style={{ color: "var(--ink)" }}>
          {fmtMXN(chargeNow)}
        </strong>{" "}
        · Saldo a la entrega <span className="num">{fmtMXN(balanceAfter)}</span>
      </div>

      {!isCredit && (
      <>
      <div className="label mb-2 mt-3">Método de pago</div>
      <div className="grid grid-cols-2 gap-1.5">
        {METHOD_OPTIONS.map((m) => (
          <button
            type="button"
            key={m.id}
            onClick={() => setMethod(m.id)}
            className="text-left rounded-md p-2.5 cursor-pointer flex flex-col gap-1"
            style={{
              border:
                method === m.id ? "1.5px solid var(--accent)" : "1px solid var(--line)",
              background: method === m.id ? "var(--accent-soft)" : "var(--surface)",
              color: method === m.id ? "var(--accent-ink)" : "var(--ink)",
            }}
          >
            <span>{m.icon}</span>
            <div className="font-medium text-[13px]">{m.id}</div>
            <div className="text-[11px] text-muted">{m.sub}</div>
          </button>
        ))}
      </div>

      {(method === "Terminal" || method === "Transferencia") && (
        <label className="field mt-3">
          <span className="label">
            {method === "Transferencia"
              ? "Referencia / clave de rastreo (opcional)"
              : "Referencia (opcional)"}
          </span>
          <input
            className="input"
            placeholder="Núm. de operación"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        </label>
      )}

      {method === "Mixto" && (
        <div className="mt-3 flex flex-col gap-2.5">
          <label className="field">
            <span className="label">Efectivo</span>
            <input
              className="input num"
              type="number"
              min={0}
              step="0.01"
              value={mixedCash}
              onChange={(e) => setMixedCash(e.target.value)}
            />
          </label>
          <label className="field">
            <span className="label">Terminal</span>
            <input
              className="input num"
              type="number"
              min={0}
              step="0.01"
              value={mixedTerminal}
              onChange={(e) => setMixedTerminal(e.target.value)}
            />
          </label>
          <div
            className="text-[11px]"
            style={{ color: mixedOk ? "var(--muted)" : "var(--danger)" }}
          >
            {mixedOk
              ? "Los montos cubren el cobro inicial."
              : `Los montos deben sumar ${fmtMXN(chargeNow)} (restan ${fmtMXN(mixedRemaining)}).`}
          </div>
        </div>
      )}

      </>
      )}

      {isCredit && (
        <div className="mt-3 p-3 border border-line rounded-md bg-surface-2 text-xs text-muted">
          {I.clock} El pedido se genera <strong className="text-ink">sin pago inicial</strong>{" "}
          y queda pendiente de cobro (se liquida a la entrega).
        </div>
      )}

      <label className="field mt-3.5">
        <span className="label">Fecha de entrega (opcional)</span>
        <input
          className="input"
          type="date"
          value={deliverAt}
          onChange={(e) => setDeliverAt(e.target.value)}
        />
      </label>

      {shortages.length > 0 && (
        <div className="mt-3.5">
          <div
            className="label mb-2 flex items-center gap-1.5"
            style={{ color: "var(--danger)" }}
          >
            {I.alert} Inventario insuficiente
          </div>
          <div
            className="rounded-md p-2.5"
            style={{
              border: "1px solid var(--danger)",
              background: "var(--danger-soft)",
            }}
            role="alert"
          >
            {shortages.map((s) => (
              <div
                key={s.materialId + (s.materialVariantCode ?? "")}
                className="flex items-center gap-2 text-xs py-1"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium">
                    {s.materialName}
                    {s.materialVariantCode ? ` · ${s.materialVariantCode}` : ""}
                  </div>
                  <div className="text-muted text-[10px]">
                    {s.missing
                      ? "Material o talla inexistente (receta rota)"
                      : `Se requieren ${s.required} ${s.unit}, hay ${s.available}`}
                  </div>
                </div>
                <span className="num font-semibold" style={{ color: "var(--danger)" }}>
                  −{(s.required - s.available).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
