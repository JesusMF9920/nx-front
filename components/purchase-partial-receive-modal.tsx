"use client";

import { useMemo, useState } from "react";
import { I } from "@/components/icons";
import { Modal } from "@/components/modal";
import { ApiError } from "@/lib/api/errors";
import { purchasesApi } from "@/lib/api/purchases";
import type { ApiPurchaseOrderDetail } from "@/lib/api/types";
import { useToast } from "@/lib/toast/toast-context";

type Props = {
  order: ApiPurchaseOrderDetail;
  onClose: () => void;
  onReceived: () => void;
};

/** Sólo dígitos y un punto decimal (cantidades hasta 3 decimales). */
function sanitizeQty(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, "");
  const [int, ...rest] = cleaned.split(".");
  return rest.length > 0 ? `${int}.${rest.join("").slice(0, 3)}` : int;
}

/**
 * Recepción de mercancía. Con líneas de catálogo pendientes muestra una tabla
 * por línea (cantidad por defecto = saldo): dejar todo recibe completo, bajar
 * una cantidad genera una recepción parcial. Una OC de puras líneas libres
 * (sin catálogo) se marca recibida directamente.
 */
export function PurchasePartialReceiveModal({
  order,
  onClose,
  onReceived,
}: Props) {
  const toast = useToast();

  const lines = useMemo(
    () =>
      order.items.filter((i) => i.kind === "catalog" && i.remainingQty > 0),
    [order.items],
  );

  // Una idempotencyKey por sesión del modal: un reintento tras un error de red
  // reusa la misma key y NO duplica la entrada de stock.
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [qtys, setQtys] = useState<Record<string, string>>(() =>
    Object.fromEntries(lines.map((l) => [l.id, String(l.remainingQty)])),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed = lines
    .map((l) => ({ line: l, qty: Number(qtys[l.id] ?? "0") }))
    .filter((x) => Number.isFinite(x.qty) && x.qty > 0);
  const over = parsed.find((x) => x.qty > x.line.remainingQty + 1e-6);
  const allFree = lines.length === 0;
  const canSubmit = busy ? false : allFree || (parsed.length > 0 && !over);

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      if (allFree) {
        await purchasesApi.receive(order.id);
        toast.success("Mercancía recibida");
      } else {
        const res = await purchasesApi.receivePartial(order.id, {
          idempotencyKey,
          lines: parsed.map((x) => ({
            purchaseOrderItemId: x.line.id,
            qty: x.qty,
          })),
        });
        toast.success(
          res.isFull
            ? "Mercancía recibida"
            : "Recepción parcial registrada",
        );
      }
      onReceived();
    } catch (err) {
      setBusy(false);
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudo registrar la recepción.",
      );
    }
  };

  return (
    <Modal
      title="Recibir mercancía"
      onClose={busy ? () => undefined : onClose}
      width={allFree ? 420 : 560}
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
            onClick={() => void submit()}
            disabled={!canSubmit}
          >
            {I.download} {busy ? "Registrando…" : "Confirmar recepción"}
          </button>
        </>
      }
    >
      {allFree ? (
        <div className="text-[13px]">
          Esta orden no tiene insumos de catálogo pendientes. Se marcará como
          recibida (las líneas libres no afectan stock).
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="text-[13px] text-muted">
            Deja las cantidades como están para recibir todo, o ajústalas para
            una recepción parcial. El costo de cada material se actualiza al de
            esta compra.
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Insumo</th>
                <th className="text-right">Ordenado</th>
                <th className="text-right">Recibido</th>
                <th className="text-right">Recibir ahora</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => {
                const qty = Number(qtys[l.id] ?? "0");
                const lineOver = qty > l.remainingQty + 1e-6;
                return (
                  <tr key={l.id}>
                    <td>
                      <div className="font-medium">
                        {l.materialName}
                        {l.variantLabel ? ` — ${l.variantLabel}` : ""}
                      </div>
                      {l.sku && (
                        <div className="text-muted text-[11px] font-mono">
                          {l.sku}
                        </div>
                      )}
                    </td>
                    <td className="num text-right">{l.qty}</td>
                    <td className="num text-right">{l.receivedQty}</td>
                    <td className="text-right">
                      <input
                        className="input num text-right"
                        style={{
                          width: 88,
                          display: "inline-block",
                          borderColor: lineOver ? "var(--danger)" : undefined,
                        }}
                        inputMode="decimal"
                        value={qtys[l.id] ?? ""}
                        onChange={(e) =>
                          setQtys((q) => ({
                            ...q,
                            [l.id]: sanitizeQty(e.target.value),
                          }))
                        }
                        disabled={busy}
                        aria-label={`Recibir de ${l.materialName}`}
                      />
                      <div className="text-muted text-[11px]">
                        saldo {l.remainingQty}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {over && (
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
          No puedes recibir más de {over.line.remainingQty} de «
          {over.line.materialName}».
        </div>
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
