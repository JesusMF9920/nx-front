"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Avatar } from "@/components/avatar";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { I } from "@/components/icons";
import { Modal } from "@/components/modal";
import { OrderEditLinesModal } from "@/components/order-edit-lines-modal";
import { OrderPaymentModal } from "@/components/order-payment-modal";
import { OrderRefundModal } from "@/components/order-refund-modal";
import { OrderStatusBanner } from "@/components/order-status-banner";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { SummaryRow } from "@/components/summary-row";
import type { ApiAuditEntry } from "@/lib/api/audit";
import { clientsApi } from "@/lib/api/clients";
import { useFeature, usePermission } from "@/lib/auth/auth-context";
import { downloadFile } from "@/lib/api/download";
import { ApiError } from "@/lib/api/errors";
import { invoicingApi } from "@/lib/api/invoicing";
import { ordersApi } from "@/lib/api/orders";
import { openLetterTicket, printThermalTicket } from "@/lib/print/order-ticket";
import {
  MANUAL_ORDER_TRANSITIONS,
  ORDER_STATUS_ES,
  PAYMENT_METHOD_ES,
  SALES_AUDIT_ACTION_ES,
  paymentLabel,
  stationLabel,
} from "@/lib/api/sales-mappers";
import type {
  ApiClient,
  ApiInvoice,
  ApiOrderDetail,
  ApiOrderStatus,
  ApiPaymentMethod,
  ApiUser,
} from "@/lib/api/types";
import { usersApi } from "@/lib/api/users";
import { fmtDate, fmtDateLong, fmtMXN } from "@/lib/format";
import {
  buildOrderReceiptWhatsappMessage,
  buildWaMeUrl,
} from "@/lib/share/whatsapp";

const ACTION_ICON: Record<string, ReactNode> = {
  "sales.order.placed": I.cart,
  "sales.order.payment_received": I.cash,
  "sales.order.refunded": I.arrowLeft,
  "sales.order.status_changed": I.arrowRight,
  "sales.order.item_status_changed": I.layers,
  "sales.order.cancelled": I.x,
  "sales.order.deliver_date_changed": I.calendar,
};

function statusEs(v: unknown): string {
  return typeof v === "string" && v in ORDER_STATUS_ES
    ? ORDER_STATUS_ES[v as ApiOrderStatus]
    : String(v ?? "—");
}

function methodEs(v: unknown): string {
  return typeof v === "string" && v in PAYMENT_METHOD_ES
    ? PAYMENT_METHOD_ES[v as ApiPaymentMethod]
    : String(v ?? "—");
}

/** Sub-línea del timeline derivada del metadata de cada acción de sales. */
function timelineSub(entry: ApiAuditEntry): string | null {
  const md = entry.metadata ?? {};
  switch (entry.action) {
    case "sales.order.placed": {
      const parts: string[] = [];
      if (typeof md.total === "number") parts.push(fmtMXN(md.total));
      if (typeof md.itemsCount === "number")
        parts.push(`${md.itemsCount} producto${md.itemsCount === 1 ? "" : "s"}`);
      return parts.join(" · ") || null;
    }
    case "sales.order.payment_received": {
      const parts: string[] = [methodEs(md.method)];
      if (typeof md.amount === "number") parts.push(fmtMXN(md.amount));
      if (typeof md.paid === "number" && typeof md.total === "number")
        parts.push(`acumulado ${fmtMXN(md.paid)} de ${fmtMXN(md.total)}`);
      return parts.join(" · ");
    }
    case "sales.order.refunded": {
      const parts: string[] = [methodEs(md.method)];
      if (typeof md.amount === "number") parts.push(fmtMXN(md.amount));
      if (typeof md.reason === "string" && md.reason.length > 0)
        parts.push(md.reason);
      return parts.join(" · ");
    }
    case "sales.order.status_changed":
      return `${statusEs(md.from)} → ${statusEs(md.to)}`;
    case "sales.order.item_status_changed":
      return `${typeof md.productName === "string" ? md.productName : "Producto"}: ${statusEs(md.from)} → ${statusEs(md.to)}`;
    case "sales.order.cancelled": {
      const parts: string[] = [];
      if (typeof md.total === "number") parts.push(`total ${fmtMXN(md.total)}`);
      if (typeof md.paid === "number") parts.push(`pagado ${fmtMXN(md.paid)}`);
      return parts.join(" · ") || null;
    }
    case "sales.order.deliver_date_changed":
      return typeof md.deliverAt === "string"
        ? `Nueva fecha: ${fmtDateLong(md.deliverAt)}`
        : "Sin fecha";
    default:
      return null;
  }
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** ISO → valor de <input type="date"> en zona local (evita el corrimiento UTC). */
function toDateInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<ApiOrderDetail | null>(null);
  const [client, setClient] = useState<ApiClient | null>(null);
  const [timeline, setTimeline] = useState<ApiAuditEntry[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  // Liquidación al entregar: si hay saldo al pasar a "Entregado", se ofrece
  // cobrarlo antes (deliverAfterPay encadena la entrega tras registrar el pago).
  const [deliverPrompt, setDeliverPrompt] = useState(false);
  const [deliverAfterPay, setDeliverAfterPay] = useState(false);
  const [showRefund, setShowRefund] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [showEditLines, setShowEditLines] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [itemBusy, setItemBusy] = useState<string | null>(null);
  const [deliverDraft, setDeliverDraft] = useState("");
  const [notesDraft, setNotesDraft] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);
  const [printing, setPrinting] = useState(false);

  // Gating de UI (el backend revalida con sus guards).
  const canManage = usePermission("sales.orders.manage");
  // Avanzar el estatus de un job (taller) es permiso propio (I.3); la gestión
  // en bloque de la orden sigue en sales.orders.manage.
  const canAdvance = usePermission("sales.production.advance");
  const canRecordPayment = usePermission("sales.payments.record");
  const canRefund = usePermission("sales.refunds.create");
  const canCancel = usePermission("sales.orders.cancel");
  // El select por job ofrece "Entregado" sólo a gestión de orden; el taller
  // (sales.production.advance) avanza un job hasta "listo para entrega".
  const jobStatusOptions = canManage
    ? MANUAL_ORDER_TRANSITIONS
    : MANUAL_ORDER_TRANSITIONS.filter((s) => s !== "delivered");
  // Quien puede ver la orden puede imprimirla; el gate real es el flag.
  const ticketsEnabled = useFeature("tickets");
  // Facturación (CFDI): flag + permisos. La factura del pedido se carga aparte.
  const cfdiEnabled = useFeature("cfdi");
  const canInvoice = usePermission("invoicing.create");
  const canReadInvoice = usePermission("invoicing.read");
  const [invoice, setInvoice] = useState<ApiInvoice | null>(null);
  const [invoicing, setInvoicing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [order, history] = await Promise.all([
        ordersApi.get(id),
        ordersApi.timeline(id),
      ]);
      setDetail(order);
      setTimeline(history.items);
      setDeliverDraft(toDateInput(order.deliverAt));
      setNotesDraft(order.notes ?? "");
      setLoadError(null);
      setMissing(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setMissing(true);
        setLoadError(null);
      } else {
        setLoadError(
          err instanceof ApiError ? err.message : "No se pudo cargar el pedido.",
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

  // Carga la factura del pedido (si existe) para gatear "Facturar" vs descargas.
  useEffect(() => {
    if (!detail || !cfdiEnabled || !canReadInvoice) return;
    let cancelled = false;
    void (async () => {
      try {
        const { invoice: found } = await invoicingApi.byOrder(detail.id);
        if (!cancelled) setInvoice(found);
      } catch {
        // sin factura o sin acceso: el botón "Facturar" queda disponible
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detail, cfdiEnabled, canReadInvoice]);

  // Datos de contacto del cliente para los accesos directos (correo/WhatsApp)
  // de la tarjeta Cliente. Falla silenciosa si no hay permiso clients.read.
  useEffect(() => {
    if (!detail?.clientId) return;
    let cancelled = false;
    void (async () => {
      try {
        const c = await clientsApi.get(detail.clientId);
        if (!cancelled) setClient(c);
      } catch {
        // sin acceso a clientes: los accesos directos de contacto se ocultan
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detail?.clientId]);

  // Usuarios sólo para resolver nombres de actores en el timeline. Falla silenciosa.
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
    return (actorId: string | null) => (actorId ? map.get(actorId) ?? null : null);
  }, [users]);

  const isCancelled = detail?.status === "cancelled";
  // Editable mientras ningún job salió de la cola (ready_for_delivery/delivered)
  // y no esté cancelado. El backend revalida (incl. pruebas de diseño) y devuelve
  // 409 si ya no aplica.
  const isEditable =
    !!detail &&
    canManage &&
    !isCancelled &&
    detail.status !== "delivered" &&
    detail.items.every(
      (it) =>
        it.status !== "ready_for_delivery" && it.status !== "delivered",
    );
  const pending = detail ? Math.max(0, +(detail.total - detail.paid).toFixed(2)) : 0;
  const metaDirty = detail
    ? deliverDraft !== toDateInput(detail.deliverAt) ||
      notesDraft !== (detail.notes ?? "")
    : false;

  const changeOrderStatus = async (status: ApiOrderStatus) => {
    if (!detail || status === detail.status) return;
    setTransitioning(true);
    setActionError(null);
    try {
      await ordersApi.transitionStatus(detail.id, status);
      await load();
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : "No se pudo actualizar el estatus del pedido.",
      );
    } finally {
      setTransitioning(false);
    }
  };

  // Intercepta "Entregado" con saldo pendiente: ofrece liquidar antes (aviso
  // suave, no bloquea). Las demás transiciones pasan directo.
  const onOrderStatusSelect = (status: ApiOrderStatus) => {
    if (!detail || status === detail.status) return;
    if (status === "delivered" && pending > 0 && canRecordPayment) {
      setDeliverPrompt(true);
      return;
    }
    void changeOrderStatus(status);
  };

  const changeItemStatus = async (itemId: string, status: ApiOrderStatus) => {
    if (!detail) return;
    setItemBusy(itemId);
    setActionError(null);
    try {
      await ordersApi.transitionItemStatus(detail.id, itemId, status);
      await load();
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : "No se pudo actualizar el estatus del producto.",
      );
    } finally {
      setItemBusy(null);
    }
  };

  const saveMeta = async () => {
    if (!detail || !metaDirty) return;
    setSavingMeta(true);
    setActionError(null);
    try {
      await ordersApi.update(detail.id, {
        deliverAt: deliverDraft
          ? new Date(`${deliverDraft}T12:00:00`).toISOString()
          : null,
        notes: notesDraft.trim() ? notesDraft.trim() : null,
      });
      await load();
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : "No se pudieron guardar la entrega y las notas.",
      );
    } finally {
      setSavingMeta(false);
    }
  };

  const breadcrumb = (
    <div className="flex items-center gap-2.5 mb-2 text-[13px]">
      <Link className="btn btn--ghost btn--sm" href="/orders">
        {I.arrowLeft} Pedidos
      </Link>
      {detail && <span className="num text-muted">{detail.folio}</span>}
    </div>
  );

  if (loading) {
    return (
      <>
        {breadcrumb}
        <PageHeader title="Pedido" sub="Cargando…" />
        <div className="card">
          <div className="card__body text-muted text-sm">Cargando pedido…</div>
        </div>
      </>
    );
  }

  if (missing) {
    return (
      <>
        {breadcrumb}
        <PageHeader title="Pedido no encontrado" sub={id} />
        <div className="card">
          <div className="card__body text-muted text-sm">
            El pedido no existe o fue eliminado.
          </div>
        </div>
      </>
    );
  }

  if (loadError || !detail) {
    return (
      <>
        {breadcrumb}
        <PageHeader title="Pedido" sub={id} />
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
            {loadError ?? "No se pudo cargar el pedido."}
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

  const printThermal = async () => {
    if (printing) return;
    setPrinting(true);
    setActionError(null);
    try {
      await printThermalTicket(detail);
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : "No se pudo imprimir el ticket.",
      );
    } finally {
      setPrinting(false);
    }
  };

  const openLetter = async () => {
    if (printing) return;
    setPrinting(true);
    setActionError(null);
    try {
      await openLetterTicket(detail.id);
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : "No se pudo generar el ticket carta.",
      );
    } finally {
      setPrinting(false);
    }
  };

  const resendReceipt = async () => {
    if (resending) return;
    setResending(true);
    setActionError(null);
    setActionNotice(null);
    try {
      await ordersApi.sendReceipt(detail.id);
      setActionNotice("Recibo reenviado por correo.");
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : "No se pudo reenviar el recibo por correo.",
      );
    } finally {
      setResending(false);
    }
  };

  const facturar = async () => {
    if (invoicing) return;
    setInvoicing(true);
    setActionError(null);
    setActionNotice(null);
    try {
      const res = await invoicingApi.emit(detail.id);
      setActionNotice(`Factura timbrada · UUID ${res.uuid}`);
      const { invoice: found } = await invoicingApi.byOrder(detail.id);
      setInvoice(found);
    } catch (err) {
      // El motivo del SAT/PAC (datos del receptor que no cuadran, etc.) viene
      // en el mensaje del error → mostrarlo tal cual.
      setActionError(
        err instanceof ApiError ? err.message : "No se pudo facturar el pedido.",
      );
    } finally {
      setInvoicing(false);
    }
  };

  const downloadInvoiceFile = (format: "xml" | "pdf") => {
    if (!invoice) return;
    const name = `factura-${invoice.folio ?? invoice.uuid ?? invoice.id}.${format}`;
    void downloadFile(invoicingApi.fileUrl(invoice.id, format), name);
  };

  const emitComplement = async () => {
    if (invoicing) return;
    setInvoicing(true);
    setActionError(null);
    setActionNotice(null);
    try {
      const res = await invoicingApi.emitPaymentComplement(detail.id);
      setActionNotice(
        `Complemento de pago timbrado · parcialidad ${res.partialityNumber} por ${fmtMXN(res.amount)} · UUID ${res.uuid}`,
      );
    } catch (err) {
      setActionError(
        err instanceof ApiError
          ? err.message
          : "No se pudo emitir el complemento de pago.",
      );
    } finally {
      setInvoicing(false);
    }
  };

  return (
    <>
      {breadcrumb}

      <PageHeader
        title={
          <>
            Pedido <span className="num font-mono">{detail.folio}</span>
          </>
        }
        sub={
          <>
            {detail.clientName} · creado {fmtDateLong(detail.createdAt)} · entrega{" "}
            {detail.deliverAt ? fmtDateLong(detail.deliverAt) : "Sin fecha"}
            {detail.quoteId && (
              <>
                {" · "}
                <Link
                  href={`/quotes/${detail.quoteId}`}
                  style={{ color: "var(--accent)" }}
                >
                  ver cotización origen
                </Link>
              </>
            )}
          </>
        }
        actions={
          <>
            {ticketsEnabled && (
              <>
                <button
                  className="btn"
                  type="button"
                  disabled={printing}
                  onClick={() => void printThermal()}
                >
                  {I.printer} Reimprimir ticket
                </button>
                <button
                  className="btn"
                  type="button"
                  disabled={printing}
                  onClick={() => void openLetter()}
                >
                  {I.printer} Ticket carta (PDF)
                </button>
                <button
                  className="btn"
                  type="button"
                  disabled={resending}
                  onClick={() => void resendReceipt()}
                >
                  {I.receipt} {resending ? "Reenviando…" : "Reenviar recibo"}
                </button>
              </>
            )}
            {cfdiEnabled &&
              (invoice && invoice.status !== "cancelled" ? (
                <>
                  <span
                    className="text-xs font-medium self-center"
                    style={{ color: "var(--ok)" }}
                    title={invoice.uuid ?? undefined}
                  >
                    ✓ Facturado
                  </span>
                  <button
                    className="btn"
                    type="button"
                    onClick={() => downloadInvoiceFile("pdf")}
                  >
                    {I.receipt} Factura PDF
                  </button>
                  <button
                    className="btn"
                    type="button"
                    onClick={() => downloadInvoiceFile("xml")}
                  >
                    {I.receipt} Factura XML
                  </button>
                  {invoice.paymentMethod === "PPD" && canInvoice && (
                    <button
                      className="btn"
                      type="button"
                      disabled={invoicing}
                      onClick={() => void emitComplement()}
                      title="Emite un CFDI de pago (REP) por el abono cobrado"
                    >
                      {I.receipt}{" "}
                      {invoicing ? "Emitiendo…" : "Complemento de pago"}
                    </button>
                  )}
                </>
              ) : (
                canInvoice &&
                !isCancelled && (
                  <button
                    className="btn btn--accent"
                    type="button"
                    disabled={invoicing}
                    onClick={() => void facturar()}
                  >
                    {I.receipt} {invoicing ? "Facturando…" : "Facturar"}
                  </button>
                )
              ))}
            {isEditable && (
              <button
                className="btn"
                type="button"
                onClick={() => setShowEditLines(true)}
              >
                {I.edit} Editar líneas
              </button>
            )}
            {canCancel && !isCancelled && detail.status !== "delivered" && (
              <button
                className="btn btn--danger"
                type="button"
                onClick={() => setShowCancel(true)}
              >
                {I.x} Cancelar pedido
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

      {actionNotice && (
        <div
          className="card mb-3 flex items-start gap-2"
          style={{
            padding: 12,
            border: "1px solid var(--ok)",
            color: "var(--ok)",
            background: "var(--surface)",
          }}
          role="status"
        >
          <span className="flex-1">{actionNotice}</span>
          <button
            className="icon-btn"
            onClick={() => setActionNotice(null)}
            aria-label="Cerrar mensaje"
            type="button"
          >
            {I.x}
          </button>
        </div>
      )}

      <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 320px" }}>
        <div className="grid gap-5">
          <OrderStatusBanner status={detail.status} cancelledAt={detail.cancelledAt} />

          <div className="card">
            <div className="card__head">
              <div>
                <div className="card__title">Productos del pedido (jobs)</div>
                <div className="card__sub">Cada producto tiene su propio diseño y status.</div>
              </div>
              <div className="spacer" />
              {canManage && (
                <label className="flex items-center gap-1.5 text-xs text-muted">
                  Mover pedido a
                  <select
                    className="select"
                    value={detail.status}
                    disabled={transitioning || isCancelled}
                    onChange={(e) => onOrderStatusSelect(e.target.value as ApiOrderStatus)}
                  >
                    {!MANUAL_ORDER_TRANSITIONS.includes(detail.status) && (
                      <option value={detail.status} disabled>
                        {ORDER_STATUS_ES[detail.status]}
                      </option>
                    )}
                    {MANUAL_ORDER_TRANSITIONS.map((s) => (
                      <option key={s} value={s}>
                        {ORDER_STATUS_ES[s]}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Job</th>
                  <th className="text-right">Cant.</th>
                  <th>Origen</th>
                  <th>Estación</th>
                  <th>Diseño</th>
                  <th>Status</th>
                  <th className="text-right">Importe</th>
                </tr>
              </thead>
              <tbody>
                {detail.items.map((j) => (
                  <tr key={j.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="skeleton-img text-[9px]" style={{ width: 36, height: 36 }}>
                          v{j.designVersion}
                        </div>
                        <div>
                          <div className="font-medium">
                            {j.productName}
                            {j.variantLabel ? ` — ${j.variantLabel}` : ""}
                          </div>
                          <div className="text-muted text-[11px] font-mono">{j.sku}</div>
                          {j.lineNote && (
                            <div className="text-[11px] mt-0.5 italic text-muted">
                              📝 {j.lineNote}
                            </div>
                          )}
                          {j.sizeBreakdown && j.sizeBreakdown.length > 0 && (
                            <div className="text-muted text-[11px]">
                              {j.sizeBreakdown
                                .map((e) => `${e.sizeLabel ?? e.sizeId}×${e.qty}`)
                                .join(" · ")}
                            </div>
                          )}
                          {j.dimensionData && (
                            <div className="text-muted text-[11px]">
                              {j.dimensionData.width}×{j.dimensionData.height} {j.dimensionData.unit}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="num text-right">{j.qty}</td>
                    <td>
                      {j.source === "supplier" ? (
                        <span className="pill pill--supplier">{j.supplierName ?? "Proveedor"}</span>
                      ) : (
                        <span className="pill pill--neutral">Interno</span>
                      )}
                    </td>
                    <td>
                      {j.station ? (
                        <span className="tag">{stationLabel(j.station)}</span>
                      ) : (
                        <span className="text-muted text-[11px]">Sin asignar</span>
                      )}
                    </td>
                    <td>
                      <span className="tag">v{j.designVersion}</span>
                    </td>
                    <td>
                      <div className="grid gap-1 justify-items-start">
                        <StatusPill s={ORDER_STATUS_ES[j.status]} />
                        {canAdvance && (
                        <select
                          className="select"
                          style={{ fontSize: 12, padding: "2px 6px" }}
                          value={j.status}
                          disabled={itemBusy !== null || isCancelled}
                          onChange={(e) =>
                            void changeItemStatus(j.id, e.target.value as ApiOrderStatus)
                          }
                          aria-label={`Estatus de ${j.productName}`}
                        >
                          {!jobStatusOptions.includes(j.status) && (
                            <option value={j.status} disabled>
                              {ORDER_STATUS_ES[j.status]}
                            </option>
                          )}
                          {jobStatusOptions.map((s) => (
                            <option key={s} value={s}>
                              {ORDER_STATUS_ES[s]}
                            </option>
                          ))}
                        </select>
                        )}
                      </div>
                    </td>
                    <td className="num text-right">{fmtMXN(j.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <div className="card__head">
              <div className="card__title">Actividad</div>
              <div className="spacer" />
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
                    const sub = [timelineSub(t), actor ? `por ${actor}` : null]
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
                          <strong>{SALES_AUDIT_ACTION_ES[t.action] ?? t.action}</strong>
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
              <div className="text-[11px] text-muted uppercase" style={{ letterSpacing: ".06em" }}>
                Total del pedido
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
                <SummaryRow label="Pagado" value={fmtMXN(detail.paid)} />
                {detail.refunded > 0 && (
                  <SummaryRow label="Devuelto" value={`-${fmtMXN(detail.refunded)}`} />
                )}
                <SummaryRow label="Por cobrar" value={fmtMXN(pending)} muted={pending === 0} />
                <SummaryRow label="Método" value={paymentLabel(detail)} mono={false} />
              </div>
              {detail.payments.length > 0 && (
                <div className="mt-2.5">
                  <div
                    className="text-[11px] text-muted uppercase"
                    style={{ letterSpacing: ".06em" }}
                  >
                    Pagos
                  </div>
                  {detail.payments.map((p) => (
                    <div key={p.id} className="my-1">
                      <div className="flex items-center text-[13px]">
                        <span>
                          {PAYMENT_METHOD_ES[p.method]}
                          {p.reference ? ` · ${p.reference}` : ""}
                        </span>
                        <div className="flex-1" />
                        <span className="num">{fmtMXN(p.amount)}</span>
                      </div>
                      <div className="text-muted text-[11px]">{fmtDate(p.createdAt)}</div>
                    </div>
                  ))}
                </div>
              )}
              {detail.refunds.length > 0 && (
                <div className="mt-2.5">
                  <div
                    className="text-[11px] text-muted uppercase"
                    style={{ letterSpacing: ".06em" }}
                  >
                    Devoluciones
                  </div>
                  {detail.refunds.map((r) => (
                    <div key={r.id} className="my-1">
                      <div className="flex items-center text-[13px]">
                        <span>
                          {r.folio} · {PAYMENT_METHOD_ES[r.method]}
                        </span>
                        <div className="flex-1" />
                        <span className="num">-{fmtMXN(r.amount)}</span>
                      </div>
                      <div className="text-muted text-[11px]">
                        {r.reason} · {fmtDate(r.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {canRecordPayment && pending > 0 && !isCancelled && (
                <button
                  className="btn btn--accent w-full justify-center mt-2.5"
                  type="button"
                  onClick={() => setShowPayment(true)}
                >
                  {I.cash} Registrar pago
                </button>
              )}
              {canRefund && detail.paid - detail.refunded > 0.001 && (
                <button
                  className="btn btn--danger w-full justify-center mt-2.5"
                  type="button"
                  onClick={() => setShowRefund(true)}
                >
                  {I.arrowLeft} Devolver dinero
                </button>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card__head">
              <div className="card__title">Entrega y notas</div>
            </div>
            <div className="card__body grid gap-3">
              <div className="field">
                <span className="label">Fecha de entrega</span>
                <input
                  className="input"
                  type="date"
                  value={deliverDraft}
                  onChange={(e) => setDeliverDraft(e.target.value)}
                  disabled={isCancelled || savingMeta || !canManage}
                />
                <span className="text-muted text-xs">
                  Actual: {detail.deliverAt ? fmtDateLong(detail.deliverAt) : "Sin fecha"}
                </span>
              </div>
              <div className="field">
                <span className="label">Notas</span>
                <textarea
                  className="textarea"
                  rows={3}
                  maxLength={2000}
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  disabled={isCancelled || savingMeta || !canManage}
                  placeholder="Instrucciones de entrega, acuerdos con el cliente…"
                />
              </div>
              {canManage && (
                <button
                  className="btn btn--sm"
                  type="button"
                  onClick={() => void saveMeta()}
                  disabled={isCancelled || savingMeta || !metaDirty}
                >
                  {savingMeta ? "Guardando…" : "Guardar cambios"}
                </button>
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
            <div className="divider m-0" />
            <div className="px-3.5 py-2.5 flex gap-1.5 flex-wrap">
              {client?.email ? (
                <a className="btn btn--sm" href={`mailto:${client.email}`}>
                  {I.mail} Correo
                </a>
              ) : (
                <button
                  className="btn btn--sm"
                  type="button"
                  disabled
                  title="El cliente no tiene correo registrado"
                >
                  {I.mail} Correo
                </button>
              )}
              <a
                className="btn btn--sm"
                href={buildWaMeUrl(
                  client?.phone,
                  buildOrderReceiptWhatsappMessage({
                    clientName: detail.clientName,
                    folio: detail.folio,
                    total: detail.total,
                    balance: pending,
                  }),
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                {I.whatsapp} WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>

      {showPayment && (
        <OrderPaymentModal
          order={detail}
          onClose={() => {
            setShowPayment(false);
            setDeliverAfterPay(false);
          }}
          onDone={async () => {
            await load();
            // Si el pago salió de la liquidación al entregar, completa la
            // entrega tras registrarlo (el cajero pudo cobrar parcial o total).
            if (deliverAfterPay) {
              setDeliverAfterPay(false);
              await changeOrderStatus("delivered");
            }
          }}
        />
      )}

      {deliverPrompt && (
        <Modal
          title="Liquidar antes de entregar"
          onClose={() => setDeliverPrompt(false)}
          width={440}
          footer={
            <>
              <button
                className="btn btn--ghost"
                type="button"
                onClick={() => setDeliverPrompt(false)}
              >
                Cancelar
              </button>
              <button
                className="btn"
                type="button"
                onClick={() => {
                  setDeliverPrompt(false);
                  void changeOrderStatus("delivered");
                }}
              >
                Entregar sin liquidar
              </button>
              <button
                className="btn btn--accent"
                type="button"
                onClick={() => {
                  setDeliverPrompt(false);
                  setDeliverAfterPay(true);
                  setShowPayment(true);
                }}
              >
                {I.cash} Registrar pago
              </button>
            </>
          }
        >
          <p className="text-[13px]">
            Este pedido tiene un{" "}
            <strong>saldo pendiente de {fmtMXN(pending)}</strong>. ¿Registrar el
            pago antes de marcarlo como entregado?
          </p>
        </Modal>
      )}

      {showRefund && (
        <OrderRefundModal
          order={detail}
          onClose={() => setShowRefund(false)}
          onDone={load}
        />
      )}

      {showEditLines && (
        <OrderEditLinesModal
          order={detail}
          onClose={() => setShowEditLines(false)}
          onDone={load}
        />
      )}

      {showCancel && (
        <ConfirmDialog
          title="Cancelar pedido"
          message={
            <>
              Se cancelará el pedido <strong>{detail.folio}</strong> de{" "}
              {detail.clientName}. Esta acción no se puede deshacer.
            </>
          }
          confirmLabel="Cancelar pedido"
          cancelLabel="Volver"
          kind="danger"
          onConfirm={async () => {
            try {
              await ordersApi.cancel(detail.id);
            } catch (err) {
              throw new Error(
                err instanceof ApiError
                  ? err.message
                  : "No se pudo cancelar el pedido.",
              );
            }
            await load();
            setShowCancel(false);
          }}
          onClose={() => setShowCancel(false)}
        />
      )}
    </>
  );
}
