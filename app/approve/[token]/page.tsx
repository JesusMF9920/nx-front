"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Avatar } from "@/components/avatar";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { publicApprovalApi } from "@/lib/api/design";
import { ApiError } from "@/lib/api/errors";
import type { ApiPublicApproval } from "@/lib/api/types";
import { fmtDate } from "@/lib/format";

type ErrKind = "invalid" | "used" | "expired" | "other";

/**
 * Página PÚBLICA (sin login) donde el cliente revisa la prueba de diseño,
 * comenta y aprueba o pide cambios. La autorización es el token de la URL —
 * single-use para decidir; ver y comentar no lo consumen.
 */
export default function PublicApprovalPage() {
  const { token } = useParams<{ token: string }>();

  const [data, setData] = useState<ApiPublicApproval | null>(null);
  const [loading, setLoading] = useState(true);
  const [errKind, setErrKind] = useState<ErrKind | null>(null);
  const [decided, setDecided] = useState<"approved" | "changes" | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [showApprove, setShowApprove] = useState(false);
  const [changesOpen, setChangesOpen] = useState(false);
  const [changesText, setChangesText] = useState("");

  const classify = (err: unknown): ErrKind => {
    if (err instanceof ApiError) {
      if (err.status === 404) return "invalid";
      if (err.status === 410) {
        return err.body?.code === "TOKEN_USED" ? "used" : "expired";
      }
    }
    return "other";
  };

  const load = useCallback(async () => {
    try {
      const res = await publicApprovalApi.get(token);
      setData(res);
      setErrKind(null);
    } catch (err) {
      setErrKind(classify(err));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, [load]);

  async function submitComment() {
    if (!commentText.trim() || busy) return;
    setBusy(true);
    setActionError(null);
    try {
      await publicApprovalApi.comment(token, commentText.trim());
      setCommentText("");
      await load();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "No se pudo enviar el comentario.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function decide(decision: "approve" | "request_changes") {
    const comment =
      decision === "request_changes" ? changesText.trim() : undefined;
    setBusy(true);
    setActionError(null);
    try {
      await publicApprovalApi.decide(token, decision, comment);
      setDecided(decision === "approve" ? "approved" : "changes");
    } catch (err) {
      if (err instanceof ApiError && (err.status === 410 || err.status === 404)) {
        setErrKind(classify(err));
      } else if (err instanceof ApiError && err.status === 409) {
        setActionError(
          "Esta prueba ya fue resuelta o el pedido cambió — contacta a la imprenta.",
        );
      } else {
        setActionError(
          err instanceof Error ? err.message : "No se pudo registrar la decisión.",
        );
      }
    } finally {
      setBusy(false);
    }
  }

  const isPdf = data?.contentType === "application/pdf";

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--bg)", padding: "32px 16px" }}
    >
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div className="flex items-center gap-2 mb-5">
          <div
            className="rounded-md grid place-items-center text-white font-bold"
            style={{ width: 28, height: 28, background: "var(--accent)" }}
          >
            N
          </div>
          <span className="font-semibold">Nexum POS</span>
          <span className="text-muted text-xs">· Aprobación de diseño</span>
        </div>

        {loading && (
          <div className="card p-6 text-muted text-sm">Cargando…</div>
        )}

        {!loading && errKind && (
          <div className="card p-6">
            <div className="font-semibold text-[15px] mb-1.5">
              {errKind === "used" && "Este enlace ya fue utilizado"}
              {errKind === "expired" && "Este enlace ya no está disponible"}
              {errKind === "invalid" && "Enlace inválido"}
              {errKind === "other" && "No pudimos cargar la prueba"}
            </div>
            <div className="text-muted text-sm">
              {errKind === "used" &&
                "La decisión sobre este diseño ya quedó registrada. Si necesitas cambiar algo, contacta a la imprenta."}
              {errKind === "expired" &&
                "El enlace venció o fue reemplazado por una versión más reciente del diseño. Pide a la imprenta que te comparta uno nuevo."}
              {errKind === "invalid" &&
                "Revisa que el enlace esté completo o pide a la imprenta que te lo reenvíe."}
              {errKind === "other" &&
                "Intenta de nuevo en unos minutos o contacta a la imprenta."}
            </div>
          </div>
        )}

        {!loading && !errKind && decided && (
          <div className="card p-6">
            <div className="font-semibold text-[15px] mb-1.5">
              {decided === "approved"
                ? "¡Diseño aprobado! ✓"
                : "Cambios solicitados ✓"}
            </div>
            <div className="text-muted text-sm">
              {decided === "approved"
                ? "Gracias — tu pedido pasa a producción. La imprenta te avisará cuando esté listo."
                : "Gracias — la imprenta retomará el diseño con tus comentarios y te enviará una nueva versión."}
            </div>
          </div>
        )}

        {!loading && !errKind && !decided && data && (
          <div className="card">
            <div className="card__head">
              <div>
                <div className="card__title">{data.productName}</div>
                <div className="card__sub">
                  Hola, {data.clientName} — revisa la versión v{data.version} de
                  tu diseño (pedido <span className="num">{data.orderFolio}</span>)
                </div>
              </div>
            </div>

            <div className="p-5 bg-surface-2" style={{ borderBottom: "1px solid var(--line)" }}>
              {isPdf ? (
                <a
                  className="btn"
                  href={data.previewUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir el diseño (PDF)
                </a>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- URL firmada remota con query de firma; next/image no aplica
                <img
                  src={data.previewUrl}
                  alt={`Diseño v${data.version} de ${data.productName}`}
                  style={{
                    width: "100%",
                    maxHeight: 420,
                    objectFit: "contain",
                    borderRadius: 8,
                    border: "1px solid var(--line)",
                    background: "var(--surface)",
                  }}
                />
              )}
              {data.versionNote && (
                <div className="text-muted text-xs mt-2">
                  Nota de la diseñadora: {data.versionNote}
                </div>
              )}
            </div>

            <div className="p-4" style={{ borderBottom: "1px solid var(--line)" }}>
              <div className="font-medium text-[13px] mb-2.5">Conversación</div>
              {data.comments.length === 0 && (
                <div className="text-muted text-xs mb-2">
                  Sin comentarios todavía — escribe tus dudas u observaciones.
                </div>
              )}
              {data.comments.map((c) => (
                <div key={c.id} className="flex gap-2.5 mb-3">
                  {c.authorType === "system" ? (
                    <div
                      className="rounded-full bg-surface-3 grid place-items-center text-muted text-xs"
                      style={{ width: 28, height: 28 }}
                    >
                      N
                    </div>
                  ) : (
                    <Avatar name={c.authorName} size={28} />
                  )}
                  <div className="flex-1">
                    <div className="text-xs">
                      <strong>{c.authorName}</strong>
                      <span className="text-muted-2 ml-1.5">
                        {fmtDate(c.createdAt)}
                      </span>
                    </div>
                    <div
                      className="text-[13px] mt-0.5"
                      style={{
                        color:
                          c.authorType === "system"
                            ? "var(--muted)"
                            : "var(--ink-2)",
                      }}
                    >
                      {c.body}
                    </div>
                  </div>
                </div>
              ))}
              <div className="mt-3 p-2.5 border border-line rounded-md bg-surface-2">
                <textarea
                  className="textarea w-full p-0 bg-transparent"
                  rows={2}
                  placeholder="Escribe un comentario para la imprenta…"
                  style={{ border: 0 }}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                />
                <div className="flex mt-2">
                  <div className="spacer" />
                  <button
                    className="btn btn--sm"
                    disabled={!commentText.trim() || busy}
                    onClick={() => void submitComment()}
                  >
                    Comentar
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4">
              {!changesOpen ? (
                <div className="flex items-center gap-2.5">
                  <div className="flex-1 text-muted text-xs">
                    ¿El diseño está como lo quieres? Aprueba para mandarlo a
                    producción, o pide cambios.
                  </div>
                  <button
                    className="btn btn--danger"
                    disabled={busy}
                    onClick={() => setChangesOpen(true)}
                  >
                    Solicitar cambios
                  </button>
                  <button
                    className="btn btn--accent"
                    disabled={busy}
                    onClick={() => setShowApprove(true)}
                  >
                    Aprobar diseño
                  </button>
                </div>
              ) : (
                <div>
                  <div className="text-sm font-medium mb-1.5">
                    ¿Qué cambios necesitas?
                  </div>
                  <textarea
                    className="textarea w-full"
                    rows={3}
                    placeholder="Describe los cambios (obligatorio)…"
                    value={changesText}
                    onChange={(e) => setChangesText(e.target.value)}
                  />
                  <div className="flex gap-2 mt-2">
                    <div className="spacer" />
                    <button
                      className="btn btn--ghost"
                      disabled={busy}
                      onClick={() => setChangesOpen(false)}
                    >
                      Cancelar
                    </button>
                    <button
                      className="btn btn--danger"
                      disabled={!changesText.trim() || busy}
                      onClick={() => void decide("request_changes")}
                    >
                      {busy ? "Enviando…" : "Enviar solicitud de cambios"}
                    </button>
                  </div>
                </div>
              )}

              {actionError && (
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
                  {actionError}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="text-muted-2 text-[11px] mt-4 text-center">
          Enlace seguro de un solo uso · Nexum POS
        </div>
      </div>

      {showApprove && (
        <ConfirmDialog
          title="Aprobar diseño"
          message="Al aprobar, tu pedido pasa a producción con esta versión del diseño. ¿Confirmas?"
          confirmLabel="Sí, aprobar"
          kind="primary"
          onConfirm={async () => {
            setShowApprove(false);
            await decide("approve");
          }}
          onClose={() => setShowApprove(false)}
        />
      )}
    </div>
  );
}
