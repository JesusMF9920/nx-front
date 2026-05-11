"use client";

import { useState, type ReactNode } from "react";
import { Modal } from "./modal";

export type ConfirmDialogProps = {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" → botón rojo; "primary" → acento; "default" → ghost. */
  kind?: "danger" | "primary" | "default";
  /** Async opcional. Si throw, el error se muestra dentro del modal. */
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
};

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  kind = "default",
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmClass =
    kind === "danger"
      ? "btn btn--danger"
      : kind === "primary"
        ? "btn btn--accent"
        : "btn";

  const handleConfirm = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo salió mal.");
      setBusy(false);
    }
  };

  return (
    <Modal
      title={title}
      onClose={busy ? () => undefined : onClose}
      width={420}
      footer={
        <>
          <button
            className="btn btn--ghost"
            type="button"
            onClick={onClose}
            disabled={busy}
          >
            {cancelLabel}
          </button>
          <button
            className={confirmClass}
            type="button"
            onClick={handleConfirm}
            disabled={busy}
          >
            {busy ? "Procesando…" : confirmLabel}
          </button>
        </>
      }
    >
      <div className="text-sm text-ink-2">{message}</div>
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
