"use client";

import { useState } from "react";
import { I } from "@/components/icons";
import { Modal } from "@/components/modal";
import { ApiError } from "@/lib/api/errors";
import { clientsApi } from "@/lib/api/clients";
import {
  collectionsApi,
  type SendReminderResult,
} from "@/lib/api/collections";
import { settingsApi } from "@/lib/api/settings";
import { useFeature, usePermission } from "@/lib/auth/auth-context";
import { fmtMXN } from "@/lib/format";
import {
  buildCollectionReminderWhatsappMessage,
  buildWaMeUrl,
  normalizeMxPhone,
} from "@/lib/share/whatsapp";

/** Objetivo del recordatorio: un pedido concreto o todo el saldo de un cliente. */
export type ReminderTarget =
  | {
      kind: "order";
      orderId: string;
      clientId: string;
      clientName: string;
      folio: string;
      balance: number;
    }
  | {
      kind: "client";
      clientId: string;
      clientName: string;
      debt: number;
    };

type Props = {
  target: ReminderTarget;
  onClose: () => void;
  /** Tras enviar el correo (el padre cierra y avisa). */
  onSent: (result: SendReminderResult) => void;
};

export function CollectionReminderModal({ target, onClose, onSent }: Props) {
  const waOn = useFeature("whatsapp");
  const canRemind = usePermission("sales.collections.remind");

  const [busy, setBusy] = useState<"wa" | "email" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [waNote, setWaNote] = useState<string | null>(null);

  const amount = target.kind === "order" ? target.balance : target.debt;

  const openWhatsapp = async () => {
    setBusy("wa");
    setError(null);
    setWaNote(null);
    try {
      const [client, business] = await Promise.all([
        clientsApi.get(target.clientId),
        settingsApi.getBusinessCached(),
      ]);
      const message = buildCollectionReminderWhatsappMessage({
        businessName: business.name,
        clientName: target.clientName,
        totalBalance: amount,
        folios: target.kind === "order" ? [target.folio] : undefined,
      });
      window.open(
        buildWaMeUrl(client.phone, message),
        "_blank",
        "noopener",
      );
      setWaNote(
        normalizeMxPhone(client.phone)
          ? "WhatsApp abierto con el mensaje listo."
          : "El cliente no tiene un teléfono válido — WhatsApp abrió para que elijas el contacto.",
      );
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudo preparar el mensaje de WhatsApp.",
      );
    } finally {
      setBusy(null);
    }
  };

  const sendEmail = async () => {
    setBusy("email");
    setError(null);
    try {
      const res = await collectionsApi.remind(
        target.kind === "order"
          ? { orderId: target.orderId }
          : { clientId: target.clientId },
      );
      onSent(res);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudo enviar el recordatorio por correo.",
      );
      setBusy(null);
    }
  };

  return (
    <Modal
      title="Enviar recordatorio de cobro"
      onClose={onClose}
      width={480}
      footer={
        <button
          className="btn btn--ghost"
          type="button"
          onClick={onClose}
          disabled={busy !== null}
        >
          Cerrar
        </button>
      }
    >
      <p className="text-[13px] mb-3">
        Recordatorio a <strong>{target.clientName}</strong> por un saldo de{" "}
        <strong>{fmtMXN(amount)}</strong>
        {target.kind === "order" ? ` (pedido ${target.folio})` : ""}.
      </p>

      <div className="flex flex-col gap-2">
        {waOn && (
          <button
            className="btn"
            type="button"
            onClick={() => void openWhatsapp()}
            disabled={busy !== null}
          >
            {I.whatsapp}{" "}
            {busy === "wa" ? "Abriendo WhatsApp…" : "Recordar por WhatsApp"}
          </button>
        )}
        {canRemind && (
          <button
            className="btn btn--accent"
            type="button"
            onClick={() => void sendEmail()}
            disabled={busy !== null}
          >
            {I.mail}{" "}
            {busy === "email" ? "Enviando correo…" : "Enviar por correo"}
          </button>
        )}
        {!waOn && !canRemind && (
          <p className="text-muted text-[12px]">
            No tienes habilitado ningún canal de recordatorio.
          </p>
        )}
      </div>

      {waNote && (
        <p className="text-muted text-[12px] mt-3" role="status">
          {waNote}
        </p>
      )}

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
