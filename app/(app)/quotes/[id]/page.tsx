"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Avatar } from "@/components/avatar";
import { I } from "@/components/icons";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { QuoteConvertModal } from "@/components/quote-convert-modal";
import { QuoteNewModal } from "@/components/quote-new-modal";
import { QuoteStatusPill } from "@/components/quote-status-pill";
import { SummaryRow } from "@/components/summary-row";
import type { ApiAuditEntry } from "@/lib/api/audit";
import { ApiError } from "@/lib/api/errors";
import { quotesApi } from "@/lib/api/quotes";
import {
  QUOTE_CHANNEL_ES,
  SALES_AUDIT_ACTION_ES,
} from "@/lib/api/sales-mappers";
import type {
  ApiQuoteChannel,
  ApiQuoteDetail,
  ApiUser,
} from "@/lib/api/types";
import { usersApi } from "@/lib/api/users";
import { usePermission } from "@/lib/auth/auth-context";
import { fmtDate, fmtDateLong, fmtMXN } from "@/lib/format";

const ACTION_ICON: Record<string, ReactNode> = {
  "sales.quote.created": I.receipt,
  "sales.quote.sent": I.send,
  "sales.quote.approved": I.check,
  "sales.quote.rejected": I.x,
  "sales.quote.converted": I.cart,
};

const CHANNELS: ApiQuoteChannel[] = ["whatsapp", "email", "link", "in_person"];

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function quoteTimelineSub(entry: ApiAuditEntry): string | null {
  const md = entry.metadata ?? {};
  switch (entry.action) {
    case "sales.quote.created": {
      const parts: string[] = [];
      if (typeof md.total === "number") parts.push(fmtMXN(md.total));
      if (typeof md.itemsCount === "number")
        parts.push(`${md.itemsCount} producto${md.itemsCount === 1 ? "" : "s"}`);
      return parts.join(" · ") || null;
    }
    case "sales.quote.sent":
      return typeof md.channel === "string"
        ? (QUOTE_CHANNEL_ES[md.channel as ApiQuoteChannel] ?? md.channel)
        : null;
    case "sales.quote.rejected":
      return typeof md.reason === "string" && md.reason ? md.reason : null;
    case "sales.quote.converted":
      return typeof md.orderFolio === "string" ? `→ ${md.orderFolio}` : null;
    default:
      return null;
  }
}

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<ApiQuoteDetail | null>(null);
  const [timeline, setTimeline] = useState<ApiAuditEntry[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showConvert, setShowConvert] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const canManage = usePermission("sales.quotes.manage");
  const canConvert = usePermission("sales.quotes.convert");

  const load = useCallback(async () => {
    try {
      const [quote, history] = await Promise.all([
        quotesApi.get(id),
        quotesApi.timeline(id),
      ]);
      setDetail(quote);
      setTimeline(history.items);
      setLoadError(null);
      setMissing(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setMissing(true);
        setLoadError(null);
      } else {
        setLoadError(
          err instanceof ApiError
            ? err.message
            : "No se pudo cargar la cotización.",
        );
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    void load();
  }, [id, load]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await usersApi.list({ take: 100 });
        if (!cancelled) setUsers(res.items);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const actorName = useMemo(() => {
    const map = new Map(users.map((u) => [u.id, u.name]));
    return (actorId: string | null) =>
      actorId ? (map.get(actorId) ?? null) : null;
  }, [users]);

  const runAction = async (fn: () => Promise<unknown>, fail: string) => {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
      await load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : fail);
    } finally {
      setBusy(false);
    }
  };

  // Los endpoints de mutación exigen UUID (ParseUUIDPipe); la URL puede traer
  // el folio (COT-…), así que se usa SIEMPRE detail.id (UUID), no el route param.
  const send = (channel: ApiQuoteChannel) => {
    if (!detail) return;
    const quoteId = detail.id;
    setShowSend(false);
    void runAction(
      () => quotesApi.send(quoteId, channel),
      "No se pudo enviar la cotización.",
    );
  };

  const approve = () => {
    if (!detail) return;
    const quoteId = detail.id;
    void runAction(
      () => quotesApi.approve(quoteId),
      "No se pudo aprobar la cotización.",
    );
  };

  const reject = () => {
    if (!detail) return;
    const quoteId = detail.id;
    const reason = rejectReason.trim();
    setShowReject(false);
    setRejectReason("");
    void runAction(
      () => quotesApi.reject(quoteId, reason || undefined),
      "No se pudo rechazar la cotización.",
    );
  };

  const breadcrumb = (
    <div className="flex items-center gap-2.5 mb-2 text-[13px]">
      <Link className="btn btn--ghost btn--sm" href="/quotes">
        {I.arrowLeft} Cotizaciones
      </Link>
      {detail && <span className="num text-muted">{detail.folio}</span>}
    </div>
  );

  if (loading) {
    return (
      <>
        {breadcrumb}
        <PageHeader title="Cotización" sub="Cargando…" />
        <div className="card">
          <div className="card__body text-muted text-sm">Cargando…</div>
        </div>
      </>
    );
  }

  if (missing) {
    return (
      <>
        {breadcrumb}
        <PageHeader title="Cotización no encontrada" sub={id} />
        <div className="card">
          <div className="card__body text-muted text-sm">
            La cotización no existe o fue eliminada.
          </div>
        </div>
      </>
    );
  }

  if (loadError || !detail) {
    return (
      <>
        {breadcrumb}
        <PageHeader title="Cotización" sub={id} />
        <div
          className="card flex items-center gap-2"
          style={{
            padding: 12,
            border: "1px solid var(--danger)",
            color: "var(--danger)",
            background: "var(--danger-soft)",
          }}
          role="alert"
        >
          <span className="flex-1">
            {loadError ?? "No se pudo cargar la cotización."}
          </span>
          <button
            className="btn btn--sm"
            type="button"
            onClick={() => {
              setLoading(true);
              void load();
            }}
          >
            Reintentar
          </button>
        </div>
      </>
    );
  }

  const isDraft = detail.status === "draft";
  const isSent = detail.status === "sent";
  const isApproved = detail.status === "approved";

  return (
    <>
      {breadcrumb}

      <PageHeader
        title={
          <>
            Cotización <span className="num font-mono">{detail.folio}</span>
          </>
        }
        sub={
          <>
            {detail.clientName} · creada {fmtDateLong(detail.createdAt)} ·
            vendedor {detail.createdByName}
          </>
        }
        actions={
          <>
            {canManage && isDraft && (
              <button className="btn" type="button" onClick={() => setShowEdit(true)}>
                {I.edit} Editar
              </button>
            )}
            {canManage && isDraft && (
              <button
                className="btn btn--primary"
                type="button"
                disabled={busy}
                onClick={() => setShowSend(true)}
              >
                {I.send} Enviar
              </button>
            )}
            {canManage && isSent && (
              <>
                <button
                  className="btn btn--danger"
                  type="button"
                  disabled={busy}
                  onClick={() => setShowReject(true)}
                >
                  {I.x} Rechazar
                </button>
                <button
                  className="btn btn--accent"
                  type="button"
                  disabled={busy}
                  onClick={() => void approve()}
                >
                  {I.check} Aprobar
                </button>
              </>
            )}
            {canConvert && isApproved && (
              <button
                className="btn btn--accent"
                type="button"
                disabled={busy}
                onClick={() => setShowConvert(true)}
              >
                {I.cart} Convertir a pedido
              </button>
            )}
            {detail.status === "converted" && detail.convertedOrderId && (
              <Link
                className="btn btn--primary"
                href={`/orders/${detail.convertedOrderId}`}
              >
                {I.arrowRight} Ver pedido
              </Link>
            )}
          </>
        }
      />

      {actionError && (
        <div
          className="card mb-3 flex items-start gap-2"
          style={{
            padding: 12,
            border: "1px solid var(--danger)",
            color: "var(--danger)",
            background: "var(--danger-soft)",
          }}
          role="alert"
        >
          <span className="flex-1">{actionError}</span>
          <button
            className="icon-btn"
            onClick={() => setActionError(null)}
            aria-label="Cerrar mensaje"
            type="button"
          >
            {I.x}
          </button>
        </div>
      )}

      {detail.isExpired && (
        <div
          className="card mb-3 flex items-center gap-2 text-[13px]"
          style={{
            padding: 12,
            border: "1px solid var(--warn)",
            color: "var(--warn)",
          }}
        >
          {I.alert} Esta cotización está vencida (vigencia{" "}
          {detail.validUntil ? fmtDate(detail.validUntil) : "—"}).
        </div>
      )}

      <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 320px" }}>
        <div className="grid gap-5">
          <div className="card">
            <div className="card__head">
              <div>
                <div className="card__title">Conceptos</div>
                <div className="card__sub">
                  Precios cotizados (snapshot al guardar).
                </div>
              </div>
              <div className="spacer" />
              <QuoteStatusPill status={detail.status} isExpired={detail.isExpired} />
            </div>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th className="text-right">Cant.</th>
                  <th className="text-right">Precio u.</th>
                  <th className="text-right">Importe</th>
                </tr>
              </thead>
              <tbody>
                {detail.items.map((it) => (
                  <tr key={it.id}>
                    <td>
                      <div className="font-medium">
                        {it.productName}
                        {it.variantLabel ? ` — ${it.variantLabel}` : ""}
                      </div>
                      <div className="text-muted text-[11px] font-mono">
                        {it.sku}
                      </div>
                      {it.sizeBreakdown && it.sizeBreakdown.length > 0 && (
                        <div className="text-muted text-[11px]">
                          {it.sizeBreakdown
                            .map((e) => `${e.sizeLabel ?? e.sizeId}×${e.qty}`)
                            .join(" · ")}
                        </div>
                      )}
                      {it.dimensionData && (
                        <div className="text-muted text-[11px]">
                          {it.dimensionData.width}×{it.dimensionData.height}{" "}
                          {it.dimensionData.unit}
                        </div>
                      )}
                    </td>
                    <td className="num text-right">{it.qty}</td>
                    <td className="num text-right">
                      {fmtMXN(it.unitPrice)}
                      {it.priceOverridden && (
                        <div className="text-[10px] text-accent-ink">
                          negociado
                        </div>
                      )}
                    </td>
                    <td className="num text-right">{fmtMXN(it.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <div className="card__head">
              <div className="card__title">Actividad</div>
            </div>
            <div className="card__body">
              {timeline.length === 0 ? (
                <div className="text-muted text-sm">Sin actividad registrada.</div>
              ) : (
                <div className="relative pl-6">
                  <div
                    className="absolute bg-line"
                    style={{ left: 9, top: 6, bottom: 6, width: 1 }}
                  />
                  {timeline.map((t) => {
                    const actor = actorName(t.actorId);
                    const sub = [quoteTimelineSub(t), actor ? `por ${actor}` : null]
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <div key={t.id} className="relative mb-3.5">
                        <div
                          className="absolute rounded-full bg-surface border border-line text-muted grid place-items-center"
                          style={{ left: -19, top: 2, width: 18, height: 18 }}
                        >
                          <span className="block" style={{ width: 12, height: 12 }}>
                            {ACTION_ICON[t.action] ?? I.clock}
                          </span>
                        </div>
                        <div className="text-[13px]">
                          <strong>
                            {SALES_AUDIT_ACTION_ES[t.action] ?? t.action}
                          </strong>
                          <span className="text-muted ml-2 font-mono text-[11px]">
                            {fmtDate(t.createdAt)} · {fmtTime(t.createdAt)}
                          </span>
                        </div>
                        {sub && <div className="text-muted text-xs">{sub}</div>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-5 content-start">
          <div className="card">
            <div className="card__body">
              <div
                className="text-[11px] text-muted uppercase"
                style={{ letterSpacing: ".06em" }}
              >
                Total cotizado
              </div>
              <div
                className="font-semibold"
                style={{
                  fontSize: 28,
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: "-.01em",
                }}
              >
                {fmtMXN(detail.total)}
              </div>
              <div className="mt-3">
                <SummaryRow label="Subtotal" value={fmtMXN(detail.subtotal)} />
                <SummaryRow
                  label="Descuento"
                  value={`-${fmtMXN(detail.discount)}`}
                  muted={detail.discount === 0}
                />
                <SummaryRow label="IVA" value={fmtMXN(detail.tax)} />
              </div>
              <div className="divider" />
              <SummaryRow
                label="Vigencia"
                value={detail.validUntil ? fmtDate(detail.validUntil) : "—"}
                mono={false}
              />
              {detail.channel && (
                <SummaryRow
                  label="Canal"
                  value={QUOTE_CHANNEL_ES[detail.channel]}
                  mono={false}
                />
              )}
              {detail.rejectionReason && (
                <div className="mt-2 text-[12px]">
                  <span className="text-muted">Motivo de rechazo: </span>
                  {detail.rejectionReason}
                </div>
              )}
              {detail.notes && (
                <div className="mt-2 text-[12px]">
                  <span className="text-muted">Notas: </span>
                  {detail.notes}
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card__head">
              <div className="card__title">Cliente</div>
            </div>
            <div className="card__body flex gap-2.5">
              <Avatar name={detail.clientName} size={36} />
              <div className="flex-1 min-w-0">
                <div className="font-medium">{detail.clientName}</div>
                <div className="text-muted text-xs">Cliente</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showEdit && (
        <QuoteNewModal
          editQuote={detail}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false);
            void load();
          }}
        />
      )}

      {showConvert && (
        <QuoteConvertModal
          quote={detail}
          onClose={() => setShowConvert(false)}
          onConverted={(res) => {
            setShowConvert(false);
            router.push(`/orders/${res.folio}`);
          }}
        />
      )}

      {showSend && (
        <Modal title="Enviar cotización" onClose={() => setShowSend(false)} width={420}>
          <div className="label mb-2">¿Por qué canal la envías?</div>
          <div className="grid grid-cols-2 gap-2">
            {CHANNELS.map((c) => (
              <button
                key={c}
                type="button"
                className="btn"
                disabled={busy}
                onClick={() => send(c)}
              >
                {QUOTE_CHANNEL_ES[c]}
              </button>
            ))}
          </div>
          <div className="text-[11px] text-muted mt-3">
            Solo registra el canal — el envío real (WhatsApp/correo) llega en una
            fase posterior.
          </div>
        </Modal>
      )}

      {showReject && (
        <Modal
          title="Rechazar cotización"
          onClose={() => setShowReject(false)}
          width={420}
          footer={
            <>
              <button className="btn btn--ghost" onClick={() => setShowReject(false)}>
                Cancelar
              </button>
              <button className="btn btn--danger" onClick={reject} disabled={busy}>
                {I.x} Rechazar
              </button>
            </>
          }
        >
          <label className="field">
            <span className="label">Motivo (opcional)</span>
            <textarea
              className="textarea"
              rows={3}
              maxLength={500}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Precio, tiempos, el cliente eligió otra opción…"
            />
          </label>
        </Modal>
      )}
    </>
  );
}
