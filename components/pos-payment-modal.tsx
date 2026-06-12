"use client";

import { useEffect, useState, type ReactNode } from "react";
import { I } from "@/components/icons";
import { Modal } from "@/components/modal";
import { SummaryRow } from "@/components/summary-row";
import { fmtMXN } from "@/lib/format";
import { DEFAULT_DEPOSIT_PCT, depositAmount } from "@/lib/pos-cart";
import { ApiError } from "@/lib/api/errors";
import {
  posApi,
  type CheckoutLineInput,
  type CheckoutPaymentInput,
  type CheckoutPreview,
  type CheckoutResult,
} from "@/lib/api/orders";
import type { ApiStockShortage } from "@/lib/api/types";
import { cashApi } from "@/lib/api/cash";
import { useFeature } from "@/lib/auth/auth-context";
import type { PaymentMethod } from "@/lib/types";

/** Métodos que tocan EFECTIVO (requieren caja abierta con el feature on). */
const CASH_METHODS: PaymentMethod[] = ["Efectivo", "Mixto"];

/** Qué tickets imprimir tras el cobro — lo ejecuta la página (no el modal). */
export type TicketPrintPrefs = {
  printThermal: boolean;
  printLetter: boolean;
};

type Props = {
  clientId: string;
  lines: CheckoutLineInput[];
  discount: number;
  deliverAt?: string;
  notes?: string;
  customerEmail?: string;
  onClose: () => void;
  onPaid: (result: CheckoutResult, prints: TicketPrintPrefs) => void;
};

const METHOD_OPTIONS: { id: PaymentMethod; icon: ReactNode; sub: string }[] = [
  { id: "Efectivo", icon: I.cash,   sub: "Calcular cambio" },
  { id: "Terminal", icon: I.card,   sub: "Mercado Libre" },
  { id: "Mixto",    icon: I.layers, sub: "Efectivo + tarjeta" },
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

export function PosPaymentModal({
  clientId,
  lines,
  discount,
  deliverAt,
  notes,
  customerEmail,
  onClose,
  onPaid,
}: Props) {
  const [method, setMethod] = useState<PaymentMethod>("Efectivo");
  const [chargeMode, setChargeMode] = useState<ChargeMode>("deposit");
  const [customCharge, setCustomCharge] = useState("");
  const [cash, setCash] = useState(0);
  const [reference, setReference] = useState("");
  const [mixedCash, setMixedCash] = useState("");
  const [mixedTerminal, setMixedTerminal] = useState("");
  const ticketsEnabled = useFeature("tickets");
  const [printTicket, setPrintTicket] = useState(true);
  const [printLetter, setPrintLetter] = useState(false);
  const [emailTicket, setEmailTicket] = useState(true);

  // Corte de caja: con el feature ON y sin sesión abierta, Efectivo/Mixto se
  // bloquean (el backend igual lo rechaza con 409 — esto es UX). Si el fetch
  // falla, null = desconocido → no se bloquea la UI.
  const cashFeatureOn = useFeature("cash_sessions");
  const [cashSessionOpen, setCashSessionOpen] = useState<boolean | null>(null);
  useEffect(() => {
    if (!cashFeatureOn) return;
    let cancelled = false;
    cashApi
      .active()
      .then((s) => {
        if (!cancelled) setCashSessionOpen(s !== null);
      })
      .catch(() => {
        if (!cancelled) setCashSessionOpen(null);
      });
    return () => {
      cancelled = true;
    };
  }, [cashFeatureOn]);
  const cashBlocked = cashFeatureOn && cashSessionOpen === false;

  const [preview, setPreview] = useState<CheckoutPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [shortages, setShortages] = useState<ApiStockShortage[]>([]);
  const [stockBlocked, setStockBlocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadPreview = async () => {
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const res = await posApi.preview({
        clientId,
        lines,
        discount: discount > 0 ? discount : undefined,
      });
      setPreview(res);
      setShortages(res.shortages);
      setStockBlocked(!res.available);
    } catch (err) {
      setPreviewError(
        err instanceof ApiError
          ? err.message
          : "No se pudo calcular el total de la venta.",
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = preview?.total ?? 0;
  // Cobro AHORA: anticipo (default 50%), total, crédito (0) o un monto libre.
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
  const change = Math.max(0, cash - chargeNow);

  // El "Recibido" (efectivo) arranca en el monto a cobrar ahora; al cambiar de
  // modo de cobro se re-sincroniza. El cajero puede sobrescribirlo manualmente.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCash(chargeNow);
  }, [chargeNow]);

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
    !!preview &&
    !previewLoading &&
    !stockBlocked &&
    !submitting &&
    (isCredit ||
      (!(cashBlocked && CASH_METHODS.includes(method)) &&
        (method !== "Efectivo" || cash >= chargeNow - 0.005) &&
        (method !== "Mixto" || mixedOk)));

  const confirm = async () => {
    if (!preview || !canConfirm) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await posApi.checkout({
        clientId,
        lines,
        ...(discount > 0 ? { discount } : {}),
        payments: buildPayments(),
        expectedTotal: preview.total,
        // El input date da "YYYY-MM-DD"; lo anclamos a mediodía LOCAL antes de
        // serializar a ISO para que el backend no lo interprete como medianoche
        // UTC y la fecha no retroceda un día al renderizar en zonas al oeste de
        // UTC (mismo patrón que el editor de fecha en orders/[id]).
        ...(deliverAt
          ? { deliverAt: new Date(`${deliverAt}T12:00:00`).toISOString() }
          : {}),
        ...(notes ? { notes } : {}),
      });
      onPaid(res, {
        printThermal: ticketsEnabled && printTicket,
        printLetter: ticketsEnabled && printLetter,
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        if (err.body?.error === "InsufficientStockForSaleError") {
          setShortages(err.body.shortages ?? []);
          setStockBlocked(true);
          setSubmitError("Inventario insuficiente para completar la venta.");
        } else if (err.body?.error === "TotalsMismatchError") {
          setSubmitError("Los precios cambiaron, revisa el total.");
          void loadPreview();
        } else if (err.body?.error === "PaymentExceedsTotalError") {
          setSubmitError("El monto de los pagos excede el total de la venta.");
        } else {
          setSubmitError(err.message);
        }
      } else {
        setSubmitError(
          err instanceof ApiError ? err.message : "No se pudo completar el cobro.",
        );
      }
      setSubmitting(false);
    }
  };

  const quickCash = [
    chargeNow,
    Math.ceil(chargeNow / 100) * 100,
    Math.ceil(chargeNow / 500) * 500,
    Math.ceil(chargeNow / 1000) * 1000,
  ];

  const consumption = preview?.consumption ?? [];

  return (
    <Modal
      title="Cobrar"
      onClose={onClose}
      width={640}
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
            {I.check} {submitting ? "Procesando…" : "Confirmar pago"}
          </button>
        </>
      }
    >
      {(previewError || submitError) && (
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
          <span className="flex-1">{previewError ?? submitError}</span>
          {submitError && !previewError && (
            <button
              className="icon-btn"
              type="button"
              onClick={() => setSubmitError(null)}
              aria-label="Cerrar"
            >
              {I.x}
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-[18px]">
        <div>
          <div className="label mb-2">Cobro ahora</div>
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
            <div className="field mt-2">
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
            </div>
          )}
          <div className="text-[11px] mt-1.5" style={{ color: "var(--muted)" }}>
            Cobro ahora{" "}
            <strong className="num" style={{ color: "var(--ink)" }}>
              {fmtMXN(chargeNow)}
            </strong>{" "}
            · Saldo a la entrega <span className="num">{fmtMXN(balanceAfter)}</span>
          </div>
          <div className="divider" />

          {!isCredit && (
          <>
          <div className="label mb-2">Método de pago</div>
          <div className="grid grid-cols-2 gap-1.5">
            {METHOD_OPTIONS.map((m) => {
              const blocked = cashBlocked && CASH_METHODS.includes(m.id);
              return (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  disabled={blocked}
                  className="text-left rounded-md p-2.5 cursor-pointer flex flex-col gap-1"
                  style={{
                    border: method === m.id ? "1.5px solid var(--accent)" : "1px solid var(--line)",
                    background: method === m.id ? "var(--accent-soft)" : "var(--surface)",
                    color: method === m.id ? "var(--accent-ink)" : "var(--ink)",
                    opacity: blocked ? 0.45 : 1,
                  }}
                >
                  <span>{m.icon}</span>
                  <div className="font-medium text-[13px]">{m.id}</div>
                  <div className="text-[11px] text-muted">
                    {blocked ? "Requiere caja abierta" : m.sub}
                  </div>
                </button>
              );
            })}
          </div>
          {cashBlocked && (
            <div
              className="rounded-md text-xs mt-2"
              style={{
                padding: "8px 10px",
                border: "1px solid var(--warn)",
                color: "var(--warn)",
                background: "var(--warn-soft)",
              }}
              role="status"
            >
              La caja está cerrada — ábrela en la sección Caja para cobrar en
              efectivo. Terminal y crédito siguen disponibles.
            </div>
          )}

          {method === "Efectivo" && (
            <>
              <div className="field mt-3.5">
                <span className="label">Recibido</span>
                <input
                  className="input num text-lg"
                  style={{ height: 40 }}
                  value={cash}
                  onChange={(e) => setCash(parseFloat(e.target.value || "0"))}
                />
              </div>
              <div className="grid grid-cols-4 gap-1.5 mt-2">
                {quickCash.map((x, i) => (
                  <button type="button" key={i} className="btn btn--sm" onClick={() => setCash(x)}>
                    {fmtMXN(x)}
                  </button>
                ))}
              </div>
            </>
          )}

          {method === "Terminal" && (
            <div className="mt-3.5 p-3.5 border border-line rounded-md bg-surface-2">
              <div className="flex gap-2.5 items-center mb-2">
                <span className="text-accent">{I.card}</span>
                <strong className="text-[13px]">Terminal Mercado Libre</strong>
              </div>
              <div className="text-xs text-muted mb-2.5">
                Conectada · Point Mini W · estado <span className="pill pill--ok">Listo</span>
              </div>
              <label className="field mb-2.5">
                <span className="label">Referencia (opcional)</span>
                <input
                  className="input"
                  placeholder="Núm. de operación"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </label>
              <button className="btn btn--primary w-full justify-center" type="button">
                {I.send} Enviar {fmtMXN(chargeNow)} a la terminal
              </button>
            </div>
          )}

          {method === "Mixto" && (
            <div className="mt-3.5 flex flex-col gap-2.5">
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
              <label className="field">
                <span className="label">Referencia terminal (opcional)</span>
                <input
                  className="input"
                  placeholder="Núm. de operación"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </label>
              <div className="text-[11px]" style={{ color: mixedOk ? "var(--muted)" : "var(--danger)" }}>
                {mixedOk
                  ? "Los montos cubren el cobro."
                  : `Los montos deben sumar ${fmtMXN(chargeNow)} (restan ${fmtMXN(mixedRemaining)}).`}
              </div>
            </div>
          )}

          </>
          )}

          {isCredit && (
            <div className="mt-3.5 p-3.5 border border-line rounded-md bg-surface-2 text-xs text-muted">
              {I.clock} La orden se registra <strong className="text-ink">sin pagos</strong> y queda
              pendiente de cobro. Los abonos (incluida la liquidación a la
              entrega) se capturan después desde el pedido.
            </div>
          )}
        </div>

        <div>
          <div className="label mb-2">Resumen</div>
          <div className="bg-surface-2 border border-line rounded-md p-3.5">
            {preview && (
              <>
                <SummaryRow label="Subtotal" value={fmtMXN(preview.subtotal)} />
                <SummaryRow label="Descuento" value={fmtMXN(preview.discount)} muted />
                <SummaryRow label="IVA 16%" value={fmtMXN(preview.tax)} />
              </>
            )}
            <SummaryRow
              label="Total del pedido"
              value={previewLoading ? "Calculando…" : fmtMXN(total)}
            />
            <SummaryRow label="Cobro ahora" value={fmtMXN(chargeNow)} big />
            <SummaryRow
              label="Saldo a la entrega"
              value={fmtMXN(balanceAfter)}
              muted={balanceAfter === 0}
            />
            {!isCredit && method === "Efectivo" && (
              <>
                <SummaryRow label="Recibido" value={fmtMXN(cash)} />
                <SummaryRow label="Cambio" value={fmtMXN(change)} />
              </>
            )}
            {!isCredit && method === "Mixto" && (
              <>
                <SummaryRow label="Efectivo" value={fmtMXN(mixedCashNum)} />
                <SummaryRow label="Terminal" value={fmtMXN(mixedTerminalNum)} />
              </>
            )}
          </div>

          <div className="divider" />

          <div className="label mb-2">Comprobante</div>
          <div className="flex flex-col gap-2">
            {ticketsEnabled && (
              <>
                <label className="flex items-center gap-2 text-[13px]">
                  <input
                    type="checkbox"
                    checked={printTicket}
                    onChange={(e) => setPrintTicket(e.target.checked)}
                  />
                  {I.printer} Imprimir ticket térmico (80 mm)
                </label>
                <label className="flex items-center gap-2 text-[13px]">
                  <input
                    type="checkbox"
                    checked={printLetter}
                    onChange={(e) => setPrintLetter(e.target.checked)}
                  />
                  {I.printer} Imprimir ticket carta con logo
                </label>
              </>
            )}
            <label className="flex items-center gap-2 text-[13px]">
              <input
                type="checkbox"
                checked={emailTicket}
                onChange={(e) => setEmailTicket(e.target.checked)}
              />
              {I.mail} Enviar por correo a{" "}
              <strong className="text-accent-ink">{customerEmail ?? "cliente@nexum.mx"}</strong>
            </label>
            <label className="flex items-center gap-2 text-[13px]">
              <input type="checkbox" />
              {I.whatsapp} Enviar link de portal por WhatsApp
            </label>
          </div>

          {shortages.length > 0 && (
            <>
              <div className="divider" />
              <div className="label mb-2 flex items-center gap-1.5" style={{ color: "var(--danger)" }}>
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
              <div className="text-[10px] text-muted mt-1.5">
                No se puede cobrar hasta resolver el faltante de inventario.
              </div>
            </>
          )}

          {consumption.length > 0 && (
            <>
              <div className="divider" />
              <div className="label mb-2 flex items-center gap-1.5">
                {I.layers} Inventario que se descontará
              </div>
              <div className="bg-surface-2 border border-line rounded-md p-2.5">
                {consumption.map((c) => {
                  const willCritical = c.stockAfter <= c.reorderPoint * 0.5;
                  const willLow = c.stockAfter <= c.reorderPoint;
                  return (
                    <div
                      key={c.materialId + (c.materialVariantCode ?? "")}
                      className="flex items-center gap-2 text-xs py-1"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">
                          {c.materialName}
                          {c.materialVariantCode ? ` · ${c.materialVariantCode}` : ""}
                        </div>
                        <div className="text-muted text-[10px]">
                          {c.stockBefore} →{" "}
                          <strong
                            style={{
                              color: willCritical
                                ? "var(--danger)"
                                : willLow
                                  ? "var(--warn)"
                                  : "var(--ink)",
                            }}
                          >
                            {c.stockAfter.toFixed(2)}
                          </strong>{" "}
                          {c.unit}
                        </div>
                      </div>
                      <span className="num font-semibold text-danger">
                        −{c.qty.toFixed(2)}
                      </span>
                      {willCritical && (
                        <span className="pill pill--danger text-[9px]">{I.alert}</span>
                      )}
                      {!willCritical && willLow && (
                        <span className="pill pill--warn text-[9px]">!</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="text-[10px] text-muted mt-1.5">
                Solo productos internos descuentan inventario. Productos con proveedor generan OC.
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
