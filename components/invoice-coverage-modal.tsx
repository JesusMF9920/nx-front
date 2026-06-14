"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/modal";
import { invoicingApi, type InvoiceCoverage } from "@/lib/api/invoicing";
import { ApiError } from "@/lib/api/errors";
import { fmtInt, fmtMXN } from "@/lib/format";

function currentMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function monthRange(month: string): { from: string; to: string } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) return null;
  const year = Number(m[1]);
  const monthNum = Number(m[2]);
  if (monthNum < 1 || monthNum > 12) return null;
  const from = new Date(year, monthNum - 1, 1, 0, 0, 0, 0);
  const to = new Date(year, monthNum, 0, 23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
}

const ROWS: {
  key: keyof Omit<InvoiceCoverage, "totalCount" | "totalAmount">;
  label: string;
  color: string;
}[] = [
  { key: "invoicedIndividual", label: "Facturado individual", color: "var(--accent)" },
  { key: "invoicedGlobal", label: "En factura global", color: "var(--accent)" },
  { key: "pendingInvoice", label: "Pendiente de factura", color: "var(--danger)" },
  { key: "counter", label: "Mostrador sin factura", color: "var(--muted)" },
];

type Props = { onClose: () => void };

export function InvoiceCoverageModal({ onClose }: Props) {
  const [month, setMonth] = useState(currentMonth);
  const [data, setData] = useState<InvoiceCoverage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(() => monthRange(month), [month]);

  useEffect(() => {
    if (!range) return;
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await invoicingApi.coverage({
          from: range.from,
          to: range.to,
        });
        if (!cancelled) setData(res);
      } catch (err) {
        if (cancelled) return;
        setData(null);
        setError(
          err instanceof ApiError
            ? err.message
            : "No se pudo calcular la cobertura.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [range]);

  const invoiced = data
    ? data.invoicedIndividual.count + data.invoicedGlobal.count
    : 0;
  const pct =
    data && data.totalCount > 0
      ? Math.round((invoiced / data.totalCount) * 100)
      : 0;

  return (
    <Modal title="Cobertura de facturación" onClose={onClose} width={520}>
      <p className="text-[13px] text-muted mb-3">
        De las ventas del periodo (pedidos no cancelados), cuántas están
        amparadas por un CFDI y cuántas no.
      </p>

      <label className="field text-xs mb-3" style={{ maxWidth: 200 }}>
        Periodo (mes)
        <input
          type="month"
          className="input"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />
      </label>

      {error && (
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
          {error}
        </div>
      )}

      <div className="card" style={{ padding: 14 }}>
        {loading ? (
          <div className="text-muted text-[13px]">Calculando…</div>
        ) : !data || data.totalCount === 0 ? (
          <div className="text-muted text-[13px]">
            No hay ventas en este periodo.
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-3">
              <div className="text-[13px]">
                <strong>{fmtInt(data.totalCount)}</strong> ventas ·{" "}
                {fmtMXN(data.totalAmount)}
              </div>
              <div className="spacer" />
              <div className="text-[15px] font-semibold">
                {pct}% facturado
              </div>
            </div>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Estado</th>
                  <th style={{ textAlign: "right" }}>Ventas</th>
                  <th style={{ textAlign: "right" }}>Monto</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r) => {
                  const b = data[r.key];
                  return (
                    <tr key={r.key}>
                      <td>
                        <span style={{ color: r.color, fontWeight: 500 }}>
                          {r.label}
                        </span>
                      </td>
                      <td className="num" style={{ textAlign: "right" }}>
                        {fmtInt(b.count)}
                      </td>
                      <td className="num" style={{ textAlign: "right" }}>
                        {fmtMXN(b.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </div>
    </Modal>
  );
}
