"use client";

import { useState } from "react";
import { Modal } from "./modal";
import { designApi } from "@/lib/api/design";
import { settingsApi } from "@/lib/api/settings";
import type { ApiApprovalChannel, ApiSendProofResult } from "@/lib/api/types";
import { useFeature } from "@/lib/auth/auth-context";
import { buildProofWhatsappMessage, buildWaMeUrl } from "@/lib/share/whatsapp";

/**
 * Envía la prueba al cliente: registra el canal y genera el link público
 * tokenizado. El link sólo se muestra AQUÍ (el backend no guarda el token en
 * claro) — si se pierde, re-enviar genera uno nuevo e invalida el anterior.
 */
export function ApprovalSendModal({
  proofId,
  clientName,
  onClose,
  onSent,
}: {
  proofId: string;
  clientName: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const whatsappEnabled = useFeature("whatsapp");
  const [channel, setChannel] = useState<ApiApprovalChannel>("link");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiSendProofResult | null>(null);
  /** Link wa.me persistente (inmune a popup blockers). */
  const [waLink, setWaLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSend() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await designApi.send(proofId, channel);
      setResult(res);
      if (channel === "whatsapp" && whatsappEnabled) {
        // sentTo trae el teléfono del cliente (o null → selector de contactos).
        const business = await settingsApi.getBusinessCached();
        const url = buildWaMeUrl(
          res.sentTo,
          buildProofWhatsappMessage({
            businessName: business.name,
            clientName,
            version: res.version,
            url: res.url,
            expiresAt: res.expiresAt,
          }),
        );
        setWaLink(url);
        // Intento de apertura directa; si el popup se bloquea queda el enlace.
        window.open(url, "_blank");
      }
      onSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo salió mal.");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("No se pudo copiar — selecciona y copia el link a mano.");
    }
  }

  return (
    <Modal
      title="Enviar al cliente"
      onClose={busy ? () => undefined : onClose}
      width={480}
      footer={
        <>
          <button
            className="btn btn--ghost"
            type="button"
            onClick={onClose}
            disabled={busy}
          >
            Cerrar
          </button>
          {!result && (
            <button
              className="btn btn--accent"
              type="button"
              onClick={handleSend}
              disabled={busy}
            >
              {busy ? "Generando link…" : "Generar link y enviar"}
            </button>
          )}
        </>
      }
    >
      {!result ? (
        <>
          <div className="text-sm text-ink-2">
            Se genera un link único donde el cliente ve el diseño, comenta y
            aprueba o pide cambios — sin necesidad de cuenta. Registra por qué
            canal se lo compartes:
          </div>
          <div className="mt-3 flex gap-2">
            {(
              [
                ["link", "Link directo"],
                ["whatsapp", "WhatsApp"],
                ["email", "Correo"],
              ] as const
            ).map(([c, label]) => (
              <button
                key={c}
                type="button"
                className={`btn btn--sm ${channel === c ? "btn--primary" : "btn--ghost"}`}
                onClick={() => setChannel(c)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="text-muted text-xs mt-2">
            {channel === "email"
              ? "El link de aprobación se enviará al correo registrado del cliente."
              : channel === "whatsapp" && whatsappEnabled
                ? "Se abrirá WhatsApp con el mensaje y el link de aprobación prellenados."
                : channel === "whatsapp"
                  ? "El envío real por WhatsApp llega en una fase posterior — por ahora copia el link y compártelo tú."
                  : "Copia el link y compártelo con el cliente por el medio que prefieras."}
          </div>
        </>
      ) : (
        <>
          {result.channel === "email" && result.sentTo && (
            <div
              className="rounded-md text-sm mb-3"
              style={{
                padding: "10px 12px",
                border: "1px solid var(--ok)",
                background: "var(--ok-soft)",
              }}
              role="status"
            >
              Enviado por correo a <strong>{result.sentTo}</strong>.
            </div>
          )}
          {waLink && (
            <div
              className="rounded-md text-sm mb-3 flex items-center gap-2"
              style={{
                padding: "10px 12px",
                border: "1px solid var(--ok)",
                background: "var(--ok-soft)",
              }}
              role="status"
            >
              <span className="flex-1">
                {result.sentTo
                  ? `Mensaje de WhatsApp listo para ${result.sentTo}.`
                  : "Mensaje de WhatsApp listo — el cliente no tiene teléfono registrado, elige el contacto al abrir."}
              </span>
              <a
                className="btn btn--sm btn--accent"
                href={waLink}
                target="_blank"
                rel="noreferrer"
              >
                Abrir WhatsApp
              </a>
            </div>
          )}
          <div className="text-sm text-ink-2">
            Link generado (v{result.version}).{" "}
            {result.sentTo
              ? "También puedes compartirlo tú —"
              : "Compártelo con el cliente —"}{" "}
            <strong>sólo se muestra una vez</strong>; si se pierde, re-envía
            para generar otro.
          </div>
          <div
            className="num text-xs mt-3 rounded-md"
            style={{
              padding: "10px 12px",
              border: "1px solid var(--line)",
              background: "var(--surface-2)",
              wordBreak: "break-all",
            }}
          >
            {result.url}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button className="btn btn--sm btn--accent" onClick={copyLink}>
              {copied ? "Copiado ✓" : "Copiar link"}
            </button>
            <span className="text-muted text-xs">
              Vence el {new Date(result.expiresAt).toLocaleDateString("es-MX")}
            </span>
          </div>
        </>
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
