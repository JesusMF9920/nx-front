"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/modal";
import { I } from "@/components/icons";
import { invoicingApi, type PreviewGlobalResult } from "@/lib/api/invoicing";
import { ApiError } from "@/lib/api/errors";
import { fmtDate, fmtInt, fmtMXN } from "@/lib/format";

/** c_Periodicidad del SAT (el nodo InformacionGlobal del CFDI 4.0). */
const PERIODICITY_OPTIONS = [
  { code: "04", label: "Mensual" },
  { code: "03", label: "Quincenal" },
  { code: "02", label: "Semanal" },
  { code: "01", label: "Diaria" },
  { code: "05", label: "Bimestral" },
];

function currentMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** "YYYY-MM" → periodo del mes completo (TZ local) + códigos del nodo global. */
function monthRange(
  month: string,
): { from: string; to: string; monthCode: string; year: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) return null;
  const year = Number(m[1]);
  const monthNum = Number(m[2]);
  if (monthNum < 1 || monthNum > 12) return null;
  const from = new Date(year, monthNum - 1, 1, 0, 0, 0, 0);
  const to = new Date(year, monthNum, 0, 23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString(), monthCode: m[2], year };
}

type Props = {
  onClose: () => void;
  onGenerated: (result: {
    folio: string | null;
    uuid: string;
    includedCount: number;
  }) => void;
};

export function GlobalInvoiceModal({ onClose, onGenerated }: Props) {
  const [month, setMonth] = useState(currentMonth);
  const [periodicity, setPeriodicity] = useState("04");
  const [preview, setPreview] = useState<PreviewGlobalResult | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const range = useMemo(() => monthRange(month), [month]);

  useEffect(() => {
    // `range` sólo es null con un mes inválido (el <input type="month"> nunca
    // lo produce); en ese caso no recalculamos.
    if (!range) return;
    let cancelled = false;
    const run = async () => {
      setLoadingPreview(true);
      setPreviewError(null);
      try {
        const res = await invoicingApi.previewGlobal({
          from: range.from,
          to: range.to,
        });
        if (!cancelled) setPreview(res);
      } catch (err) {
        if (cancelled) return;
        setPreview(null);
        setPreviewError(
          err instanceof ApiError
            ? err.message
            : "No se pudo calcular la vista previa.",
        );
      } finally {
        if (!cancelled) setLoadingPreview(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [range]);

  const canGenerate = !!range && !!preview && preview.count > 0 && !submitting;

  const generate = async () => {
    if (!range || !preview || preview.count === 0) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await invoicingApi.emitGlobal({
        from: range.from,
        to: range.to,
        periodicity,
        month: range.monthCode,
        year: range.year,
      });
      onGenerated({
        folio: res.folio,
        uuid: res.uuid,
        includedCount: res.includedCount,
      });
    } catch (err) {
      setSubmitError(
        err instanceof ApiError
          ? err.message
          : "No se pudo generar la factura global.",
      );
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Generar factura global"
      onClose={onClose}
      width={560}
      footer={
        <>
          <button
            className="btn btn--ghost"
            type="button"
            onClick={onClose}
            disabled={submitting}
          >
            Cancelar
          </button>
          <button
            className="btn btn--accent"
            type="button"
            onClick={() => void generate()}
            disabled={!canGenerate}
          >
            {I.receipt}{" "}
            {submitting
              ? "Generando…"
              : `Generar (${preview?.count ?? 0})`}
          </button>
        </>
      }
    >
      <p className="text-[13px] text-muted mb-3">
        Agrupa las ventas de mostrador del periodo que <strong>no</strong>{" "}
        pidieron factura individual en un solo CFDI a público en general
        (XAXX010101000, uso S01).
      </p>

      <div className="flex gap-3 mb-3">
        <label className="field text-xs flex-1">
          Periodo (mes)
          <input
            type="month"
            className="input"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </label>
        <label className="field text-xs flex-1">
          Periodicidad
          <select
            className="input"
            value={periodicity}
            onChange={(e) => setPeriodicity(e.target.value)}
          >
            {PERIODICITY_OPTIONS.map((p) => (
              <option key={p.code} value={p.code}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {previewError && (
        <div
          className="card mb-3"
          style={{
            padding: 12,
            border: "1px solid var(--danger)",
            color: "var(--danger)",
            background: "var(--danger-soft)",
          }}
          role="alert"
        >
          {previewError}
        </div>
      )}

      <div className="card" style={{ padding: 14 }}>
        {loadingPreview ? (
          <div className="text-muted text-[13px]">
            Calculando ventas del periodo…
          </div>
        ) : !preview || preview.count === 0 ? (
          <div className="text-muted text-[13px]">
            No hay ventas de mostrador por globalizar en este periodo.
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-2">
              <div className="text-[13px]">
                <strong>{fmtInt(preview.count)}</strong> ventas · subtotal{" "}
                {fmtMXN(preview.subtotal)} · IVA {fmtMXN(preview.tax)}
              </div>
              <div className="spacer" />
              <div className="text-[15px] font-semibold">
                {fmtMXN(preview.total)}
              </div>
            </div>
            <div className="overflow-x-auto" style={{ maxHeight: 220 }}>
              <table className="tbl min-w-[320px]">
                <thead>
                  <tr>
                    <th>Pedido</th>
                    <th>Fecha</th>
                    <th style={{ textAlign: "right" }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.orders.map((o) => (
                    <tr key={o.id}>
                      <td className="num">{o.folio}</td>
                      <td className="num">{fmtDate(o.createdAt)}</td>
                      <td className="num" style={{ textAlign: "right" }}>
                        {fmtMXN(o.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {submitError && (
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
          {submitError}
        </div>
      )}
    </Modal>
  );
}
