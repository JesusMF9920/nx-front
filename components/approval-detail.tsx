"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApprovalPill } from "@/components/approval-pill";
import { ApprovalSendModal } from "@/components/approval-send-modal";
import { Avatar } from "@/components/avatar";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { I } from "@/components/icons";
import {
  designApi,
  isProofContentType,
  PROOF_ACCEPT,
} from "@/lib/api/design";
import { APPROVAL_CHANNEL_ES } from "@/lib/api/design-mappers";
import type {
  ApiDesignProofComment,
  ApiDesignProofDetail,
} from "@/lib/api/types";
import { usePermission } from "@/lib/auth/auth-context";
import { fmtDate } from "@/lib/format";

/**
 * Detalle de una ficha de diseño: versiones reales con preview firmado,
 * subir nueva versión, enviar al cliente (link tokenizado), hilo de
 * conversación y decisiones manuales.
 */
export function ApprovalDetail({
  proofId,
  onMutated,
}: {
  proofId: string;
  onMutated: () => void;
}) {
  const canCreate = usePermission("design.proofs.create");
  const canManage = usePermission("design.proofs.manage");

  const [detail, setDetail] = useState<ApiDesignProofDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeV, setActiveV] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [confirm, setConfirm] = useState<"approve" | "changes" | null>(null);
  const [commentText, setCommentText] = useState("");
  const [versionNote, setVersionNote] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const reload = useCallback(async () => {
    try {
      const d = await designApi.get(proofId);
      setDetail(d);
      setActiveV((v) => (v >= 1 && v <= d.currentVersion ? v : d.currentVersion));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo salió mal.");
    }
  }, [proofId]);

  useEffect(() => {
    void (async () => {
      await reload();
    })();
  }, [reload]);

  // Preview firmado de la versión activa.
  useEffect(() => {
    if (!detail || activeV < 1) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await designApi.downloadUrl(detail.id, activeV);
        if (!cancelled) {
          setPreviewUrl(res.downloadUrl);
          setPreviewType(res.contentType);
        }
      } catch {
        if (!cancelled) setPreviewUrl(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detail, activeV]);

  async function uploadVersion(file: File) {
    if (!detail || busy) return;
    if (!isProofContentType(file.type)) {
      setError("Tipo no permitido. Usa PNG, JPG, WebP o PDF.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const presign = await designApi.presignUpload(detail.id, file.type);
      await designApi.upload(presign.uploadUrl, file);
      await designApi.addVersion(detail.id, {
        fileKey: presign.key,
        contentType: file.type,
        ...(versionNote.trim() ? { note: versionNote.trim() } : {}),
      });
      setVersionNote("");
      await reload();
      onMutated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo salió mal.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function submitComment() {
    if (!detail || !commentText.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await designApi.addComment(detail.id, commentText.trim());
      setCommentText("");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo salió mal.");
    } finally {
      setBusy(false);
    }
  }

  if (error && !detail) {
    return (
      <div className="card self-start p-6 text-sm" style={{ color: "var(--danger)" }}>
        {error}
      </div>
    );
  }
  if (!detail) {
    return (
      <div className="card self-start p-6 text-muted text-sm">Cargando…</div>
    );
  }

  const approved = detail.status === "approved";
  const versions = detail.versions.slice().sort((a, b) => b.version - a.version);
  const isPdf = previewType === "application/pdf";

  return (
    <div className="card self-start">
      <div className="card__head">
        <div>
          <div className="card__title">{detail.productName}</div>
          <div className="card__sub">
            <span className="num">{detail.folio}</span> ·{" "}
            <span className="num text-accent-ink">{detail.orderFolio}</span> ·{" "}
            {detail.clientName}
          </div>
        </div>
        <div className="spacer" />
        <ApprovalPill s={detail.status} />
        {canManage && !approved && detail.currentVersion > 0 && (
          <button
            className="btn btn--sm btn--accent"
            onClick={() => setShowSend(true)}
          >
            {I.send} Enviar al cliente
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_220px]">
        <div
          className="p-5 bg-surface-2"
          style={{ borderRight: "1px solid var(--line)" }}
        >
          {detail.currentVersion === 0 ? (
            <div className="skeleton-img text-xs" style={{ height: 320 }}>
              Sin versiones — sube la primera propuesta
            </div>
          ) : previewUrl && !isPdf ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL firmada remota con query de firma; next/image no aplica
            <img
              src={previewUrl}
              alt={`Diseño v${activeV} de ${detail.productName}`}
              style={{
                width: "100%",
                height: 320,
                objectFit: "contain",
                borderRadius: 8,
                border: "1px solid var(--line)",
                background: "var(--surface)",
              }}
            />
          ) : (
            <div className="skeleton-img text-xs" style={{ height: 320 }}>
              {isPdf ? `PDF · v${activeV}` : "Cargando preview…"}
            </div>
          )}

          <div className="flex mt-3 items-center gap-2">
            <button
              className="icon-btn"
              aria-label="Versión anterior"
              disabled={activeV <= 1}
              onClick={() => setActiveV((v) => Math.max(1, v - 1))}
            >
              {I.chevronLeft}
            </button>
            <div className="text-xs text-muted font-mono">
              v{activeV} / v{detail.currentVersion}
            </div>
            <button
              className="icon-btn"
              aria-label="Versión siguiente"
              disabled={activeV >= detail.currentVersion}
              onClick={() =>
                setActiveV((v) => Math.min(detail.currentVersion, v + 1))
              }
            >
              {I.chevronRight}
            </button>
            <div className="spacer" />
            {previewUrl && (
              <a
                className="btn btn--sm"
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
              >
                {I.download} {isPdf ? "Abrir PDF" : "Descargar"}
              </a>
            )}
          </div>
        </div>

        <div className="flex flex-col">
          <div
            className="px-3.5 py-2.5 text-[11px] text-muted uppercase"
            style={{ borderBottom: "1px solid var(--line)", letterSpacing: ".06em" }}
          >
            Versiones ({detail.currentVersion})
          </div>
          {versions.map((v) => (
            <div
              key={v.version}
              onClick={() => setActiveV(v.version)}
              className="px-3.5 py-2.5 cursor-pointer flex gap-2.5 items-center"
              style={{
                borderBottom: "1px solid var(--line)",
                background: activeV === v.version ? "var(--surface-2)" : "transparent",
              }}
            >
              <div
                className="skeleton-img text-[9px] shrink-0"
                style={{ width: 36, height: 36 }}
              >
                v{v.version}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium">
                  v{v.version} · {fmtDate(v.createdAt)}
                </div>
                <div className="text-muted text-[11px] whitespace-nowrap overflow-hidden text-ellipsis">
                  {v.sentAt && v.channel
                    ? `Enviada vía ${APPROVAL_CHANNEL_ES[v.channel]}`
                    : (v.note ?? "—")}
                </div>
              </div>
            </div>
          ))}
          {canCreate && !approved && (
            <div className="p-2.5 flex flex-col gap-2">
              <input
                className="input text-[12px]"
                placeholder="Nota de esta versión para el cliente (opcional)"
                value={versionNote}
                onChange={(e) => setVersionNote(e.target.value)}
                disabled={busy}
              />
              <input
                ref={fileRef}
                type="file"
                accept={PROOF_ACCEPT}
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadVersion(f);
                }}
              />
              <button
                className="btn btn--ghost btn--sm self-start"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
              >
                {I.upload} {busy ? "Subiendo…" : "Subir nueva versión"}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="divider m-0" />
      <div className="p-4">
        <div className="font-medium text-[13px] mb-2.5">Conversación</div>

        {detail.comments.length === 0 && (
          <div className="text-muted text-xs mb-3">Sin comentarios todavía.</div>
        )}
        {detail.comments.map((c) => (
          <CommentRow key={c.id} comment={c} />
        ))}

        {canCreate && (
          <div className="mt-3.5 p-2.5 border border-line rounded-md bg-surface-2">
            <textarea
              className="textarea w-full p-0 bg-transparent"
              rows={2}
              placeholder="Escribe una nota interna o respuesta al cliente…"
              style={{ border: 0 }}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            <div className="flex gap-1.5 mt-2 items-center">
              <div className="spacer" />
              <button
                className="btn btn--accent btn--sm"
                disabled={!commentText.trim() || busy}
                onClick={() => void submitComment()}
              >
                {I.send} Comentar
              </button>
            </div>
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

        {canManage && !approved && detail.currentVersion > 0 && (
          <div className="mt-4 px-3.5 py-3 border border-line rounded-md bg-accent-soft flex items-center gap-2.5">
            <div className="flex-1">
              <div style={{ fontWeight: 500, fontSize: 13, color: "var(--accent-ink)" }}>
                Registrar decisión manual
              </div>
              <div style={{ color: "var(--muted)", fontSize: 12 }}>
                Si el cliente confirmó por WhatsApp o teléfono, regístralo tú
                mismo (invalida el link enviado).
              </div>
            </div>
            <button
              className="btn btn--sm btn--danger"
              onClick={() => setConfirm("changes")}
            >
              {I.x} Pidió cambios
            </button>
            <button
              className="btn btn--sm btn--accent"
              onClick={() => setConfirm("approve")}
            >
              {I.check} Aprobar
            </button>
          </div>
        )}
      </div>

      {showSend && (
        <ApprovalSendModal
          proofId={detail.id}
          clientName={detail.clientName}
          onClose={() => setShowSend(false)}
          onSent={() => {
            void reload();
            onMutated();
          }}
        />
      )}
      {confirm === "approve" && (
        <ConfirmDialog
          title="Aprobar manualmente"
          message={`Se registrará la aprobación de "${detail.productName}" (v${detail.currentVersion}) y el job pasará a producción.`}
          confirmLabel="Aprobar diseño"
          kind="primary"
          onConfirm={async () => {
            await designApi.approve(detail.id);
            setConfirm(null);
            await reload();
            onMutated();
          }}
          onClose={() => setConfirm(null)}
        />
      )}
      {confirm === "changes" && (
        <ConfirmDialog
          title="Registrar cambios solicitados"
          message={`El job de "${detail.productName}" regresará a "En diseño" y el link del cliente quedará invalidado.`}
          confirmLabel="Registrar cambios"
          kind="danger"
          onConfirm={async () => {
            await designApi.requestChanges(detail.id);
            setConfirm(null);
            await reload();
            onMutated();
          }}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

function CommentRow({ comment }: { comment: ApiDesignProofComment }) {
  const system = comment.authorType === "system";
  return (
    <div className="flex gap-2.5 mb-3">
      {system ? (
        <div
          className="rounded-full bg-surface-3 grid place-items-center text-muted text-xs"
          style={{ width: 28, height: 28 }}
        >
          N
        </div>
      ) : (
        <Avatar name={comment.authorName} size={28} />
      )}
      <div className="flex-1">
        <div className="text-xs">
          <strong>{comment.authorName}</strong>
          {comment.authorType === "client" && (
            <span className="text-muted"> · Cliente</span>
          )}
          <span className="text-muted-2 ml-1.5">{fmtDate(comment.createdAt)}</span>
        </div>
        <div
          className="text-[13px] mt-0.5"
          style={{ color: system ? "var(--muted)" : "var(--ink-2)" }}
        >
          {comment.body}
        </div>
      </div>
    </div>
  );
}
