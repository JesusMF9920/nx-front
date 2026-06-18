"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Avatar } from "@/components/avatar";
import { I } from "@/components/icons";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { PurchaseNewModal } from "@/components/purchase-new-modal";
import { PurchasePartialReceiveModal } from "@/components/purchase-partial-receive-modal";
import { PurchaseStatusPill } from "@/components/purchase-status-pill";
import { SkeletonText } from "@/components/skeleton";
import { SummaryRow } from "@/components/summary-row";
import type { ApiAuditEntry } from "@/lib/api/audit";
import { ApiError } from "@/lib/api/errors";
import { purchasesApi } from "@/lib/api/purchases";
import { PURCHASE_AUDIT_ACTION_ES } from "@/lib/api/purchases-mappers";
import type { ApiPurchaseOrderDetail, ApiUser } from "@/lib/api/types";
import { usersApi } from "@/lib/api/users";
import { usePermission } from "@/lib/auth/auth-context";
import { fmtDate, fmtDateLong, fmtMXN } from "@/lib/format";
import { useToast } from "@/lib/toast/toast-context";

const ACTION_ICON: Record<string, ReactNode> = {
  "inventory.purchase_order.created": I.receipt,
  "inventory.purchase_order.sent": I.truck,
  "inventory.goods_receipt.recorded": I.box,
  "inventory.purchase_order.received": I.download,
  "inventory.purchase_order.cancelled": I.x,
  "inventory.stock.moved": I.layers,
};

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timelineSub(entry: ApiAuditEntry): string | null {
  const md = entry.metadata ?? {};
  switch (entry.action) {
    case "inventory.purchase_order.created": {
      const parts: string[] = [];
      if (typeof md.total === "number") parts.push(fmtMXN(md.total));
      if (typeof md.itemsCount === "number")
        parts.push(`${md.itemsCount} línea${md.itemsCount === 1 ? "" : "s"}`);
      return parts.join(" · ") || null;
    }
    case "inventory.purchase_order.received":
      return typeof md.stockedLines === "number"
        ? `${md.stockedLines} insumo${md.stockedLines === 1 ? "" : "s"} al stock`
        : null;
    case "inventory.goods_receipt.recorded": {
      const parts: string[] = [];
      if (typeof md.lineCount === "number")
        parts.push(`${md.lineCount} línea${md.lineCount === 1 ? "" : "s"}`);
      parts.push(md.isFull === true ? "completa" : "parcial");
      return parts.join(" · ");
    }
    case "inventory.purchase_order.cancelled":
      return typeof md.reason === "string" && md.reason ? md.reason : null;
    default:
      return null;
  }
}

export default function PurchaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<ApiPurchaseOrderDetail | null>(null);
  const [timeline, setTimeline] = useState<ApiAuditEntry[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showReceive, setShowReceive] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const canManage = usePermission("inventory.purchases.manage");
  const canReceive = usePermission("inventory.purchases.receive");
  const toast = useToast();

  // Token incremental: invalida cargas previas (cambio rápido de id o recargas
  // tras una acción) para no setear estado con datos de otro id.
  const loadReqRef = useRef(0);

  const load = useCallback(async () => {
    const myReq = ++loadReqRef.current;
    try {
      const [order, history] = await Promise.all([
        purchasesApi.get(id),
        purchasesApi.timeline(id),
      ]);
      if (loadReqRef.current !== myReq) return;
      setDetail(order);
      setTimeline(history.items);
      setLoadError(null);
      setMissing(false);
    } catch (err) {
      if (loadReqRef.current !== myReq) return;
      if (err instanceof ApiError && err.status === 404) {
        setMissing(true);
        setLoadError(null);
      } else {
        setLoadError(
          err instanceof ApiError
            ? err.message
            : "No se pudo cargar la orden de compra.",
        );
      }
    } finally {
      if (loadReqRef.current === myReq) setLoading(false);
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

  const runAction = async (
    fn: () => Promise<unknown>,
    fail: string,
    ok?: string,
  ) => {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
      if (ok) toast.success(ok);
      await load();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : fail);
    } finally {
      setBusy(false);
    }
  };

  // Los endpoints de mutación exigen UUID (ParseUUIDPipe); la URL trae el folio
  // (OC-…), así que se usa SIEMPRE detail.id (UUID), no el route param.
  const send = () => {
    if (!detail) return;
    void (async () => {
      setBusy(true);
      setActionError(null);
      try {
        const res = await purchasesApi.send(detail.id);
        toast.success(`Orden enviada a ${res.sentTo}`);
        await load();
      } catch (err) {
        // 422 = el proveedor no tiene correo: dirige al usuario a su ficha.
        if (err instanceof ApiError && err.status === 422) {
          setActionError(
            "El proveedor no tiene un correo registrado. Agrégalo en su ficha y vuelve a enviar la orden.",
          );
        } else {
          setActionError(
            err instanceof ApiError ? err.message : "No se pudo enviar la orden.",
          );
        }
      } finally {
        setBusy(false);
      }
    })();
  };

  const cancel = () => {
    if (!detail) return;
    const reason = cancelReason.trim();
    setShowCancel(false);
    setCancelReason("");
    void runAction(
      () => purchasesApi.cancel(detail.id, reason || undefined),
      "No se pudo cancelar la orden.",
      "Orden de compra cancelada",
    );
  };

  const breadcrumb = (
    <div className="flex items-center gap-2.5 mb-2 text-[13px]">
      <Link className="btn btn--ghost btn--sm" href="/purchases">
        {I.arrowLeft} Compras
      </Link>
      {detail && <span className="num text-muted">{detail.folio}</span>}
    </div>
  );

  if (loading) {
    return (
      <>
        {breadcrumb}
        <PageHeader title="Orden de compra" sub="Cargando…" />
        <div className="card">
          <div className="card__body">
            <SkeletonText lines={5} />
          </div>
        </div>
      </>
    );
  }

  if (missing) {
    return (
      <>
        {breadcrumb}
        <PageHeader title="Orden no encontrada" sub={id} />
        <div className="card">
          <div className="card__body text-muted text-sm">
            La orden de compra no existe o fue eliminada.
          </div>
        </div>
      </>
    );
  }

  if (loadError || !detail) {
    return (
      <>
        {breadcrumb}
        <PageHeader title="Orden de compra" sub={id} />
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
            {loadError ?? "No se pudo cargar la orden de compra."}
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
  const isPartial = detail.status === "partially_received";
  // ¿Mostrar el progreso de recepción por línea? (sólo con recepciones en curso)
  const showReceived = isPartial || detail.status === "received";

  return (
    <>
      {breadcrumb}

      <PageHeader
        title={
          <>
            Orden de compra{" "}
            <span className="num font-mono">{detail.folio}</span>
          </>
        }
        sub={
          <>
            {detail.supplierName} · creada {fmtDateLong(detail.createdAt)}
            {detail.expectedDate
              ? ` · esperada ${fmtDate(detail.expectedDate)}`
              : ""}
          </>
        }
        actions={
          <>
            {canManage && isDraft && (
              <button
                className="btn"
                type="button"
                onClick={() => setShowEdit(true)}
              >
                {I.edit} Editar
              </button>
            )}
            {canManage && isDraft && (
              <button
                className="btn btn--primary"
                type="button"
                disabled={busy}
                onClick={() => void send()}
              >
                {I.truck} Enviar al proveedor
              </button>
            )}
            {canReceive && (isSent || isPartial) && (
              <button
                className="btn btn--accent"
                type="button"
                disabled={busy}
                onClick={() => setShowReceive(true)}
              >
                {I.download} {isPartial ? "Recibir saldo" : "Recibir mercancía"}
              </button>
            )}
            {canManage && (isDraft || isSent) && (
              <button
                className="btn btn--danger"
                type="button"
                disabled={busy}
                onClick={() => setShowCancel(true)}
              >
                {I.x} Cancelar
              </button>
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

      <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 320px" }}>
        <div className="grid gap-5">
          <div className="card">
            <div className="card__head">
              <div>
                <div className="card__title">Líneas</div>
                <div className="card__sub">
                  Costos capturados (snapshot al guardar).
                </div>
              </div>
              <div className="spacer" />
              <PurchaseStatusPill status={detail.status} />
            </div>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Insumo</th>
                  <th className="text-right">Cant.</th>
                  {showReceived && <th className="text-right">Recibido</th>}
                  <th className="text-right">Costo u.</th>
                  <th className="text-right">Importe</th>
                </tr>
              </thead>
              <tbody>
                {detail.items.map((it) => (
                  <tr key={it.id}>
                    <td>
                      <div className="font-medium">
                        {it.materialName}
                        {it.variantLabel ? ` — ${it.variantLabel}` : ""}
                      </div>
                      {it.kind === "free" ? (
                        <span className="tag text-[10px]">Línea libre</span>
                      ) : (
                        it.sku && (
                          <div className="text-muted text-[11px] font-mono">
                            {it.sku}
                          </div>
                        )
                      )}
                    </td>
                    <td className="num text-right">{it.qty}</td>
                    {showReceived && (
                      <td
                        className="num text-right"
                        style={{
                          color:
                            it.kind === "catalog" && it.remainingQty > 0
                              ? "var(--warn)"
                              : undefined,
                        }}
                      >
                        {it.kind === "free" ? "—" : it.receivedQty}
                      </td>
                    )}
                    <td className="num text-right">{fmtMXN(it.unitCost)}</td>
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
                <div className="text-muted text-sm">
                  Sin actividad registrada.
                </div>
              ) : (
                <div className="relative pl-6">
                  <div
                    className="absolute bg-line"
                    style={{ left: 9, top: 6, bottom: 6, width: 1 }}
                  />
                  {timeline.map((t) => {
                    const actor = actorName(t.actorId);
                    const sub = [timelineSub(t), actor ? `por ${actor}` : null]
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <div key={t.id} className="relative mb-3.5">
                        <div
                          className="absolute rounded-full bg-surface border border-line text-muted grid place-items-center"
                          style={{ left: -19, top: 2, width: 18, height: 18 }}
                        >
                          <span
                            className="block"
                            style={{ width: 12, height: 12 }}
                          >
                            {ACTION_ICON[t.action] ?? I.clock}
                          </span>
                        </div>
                        <div className="text-[13px]">
                          <strong>
                            {PURCHASE_AUDIT_ACTION_ES[t.action] ?? t.action}
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
                Total de la OC
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
                <SummaryRow
                  label="IVA / impuestos"
                  value={fmtMXN(detail.tax)}
                  muted={detail.tax === 0}
                />
              </div>
              <div className="divider" />
              <SummaryRow
                label="Esperada"
                value={detail.expectedDate ? fmtDate(detail.expectedDate) : "—"}
                mono={false}
              />
              {detail.receivedAt && (
                <SummaryRow
                  label="Recibida"
                  value={fmtDate(detail.receivedAt)}
                  mono={false}
                />
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
              <div className="card__title">Proveedor</div>
            </div>
            <div className="card__body flex gap-2.5">
              <Avatar name={detail.supplierName} size={36} />
              <div className="flex-1 min-w-0">
                <div className="font-medium">{detail.supplierName}</div>
                <div className="text-muted text-xs">Proveedor</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showEdit && (
        <PurchaseNewModal
          editOrder={detail}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false);
            void load();
          }}
        />
      )}

      {showReceive && (
        <PurchasePartialReceiveModal
          order={detail}
          onClose={() => setShowReceive(false)}
          onReceived={() => {
            setShowReceive(false);
            void load();
          }}
        />
      )}

      {showCancel && (
        <Modal
          title="Cancelar orden de compra"
          onClose={() => setShowCancel(false)}
          width={420}
          footer={
            <>
              <button
                className="btn btn--ghost"
                onClick={() => setShowCancel(false)}
              >
                Volver
              </button>
              <button className="btn btn--danger" onClick={cancel} disabled={busy}>
                {I.x} Cancelar OC
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
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Cambio de proveedor, error de captura…"
            />
          </label>
        </Modal>
      )}
    </>
  );
}
