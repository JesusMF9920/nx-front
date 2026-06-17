"use client";

import { useCallback, useEffect, useState } from "react";
import { I } from "@/components/icons";
import { Modal } from "@/components/modal";
import { SkeletonText } from "@/components/skeleton";
import { PageHeader } from "@/components/page-header";
import { cashApi } from "@/lib/api/cash";
import { ApiError } from "@/lib/api/errors";
import { settingsApi } from "@/lib/api/settings";
import type {
  ApiCashCloseResult,
  ApiCashMovementType,
  ApiCashSession,
  ApiCashSessionDetail,
} from "@/lib/api/types";
import { useFeature, usePermission } from "@/lib/auth/auth-context";
import { fmtMXN } from "@/lib/format";
import { useToast } from "@/lib/toast/toast-context";
import { buildCashCutTicketHtml } from "@/lib/print/cash-cut-ticket";
import { printHtmlInIframe } from "@/lib/print/print-html";

const PAGE_SIZE = 20;

const dateTimeFmt = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short",
});
const fmtDT = (iso: string | null): string =>
  iso ? dateTimeFmt.format(new Date(iso)) : "—";

function errMsg(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return err instanceof Error ? err.message : "Algo salió mal.";
}

/** Diferencia coloreada: verde cuadra, ámbar sobra, rojo falta. */
function DifferenceTag({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted">—</span>;
  const color =
    value === 0 ? "var(--ok)" : value > 0 ? "var(--warn)" : "var(--danger)";
  const label =
    value === 0
      ? "Cuadra"
      : value > 0
        ? `Sobran ${fmtMXN(value)}`
        : `Faltan ${fmtMXN(Math.abs(value))}`;
  return (
    <span className="font-medium" style={{ color }}>
      {label}
    </span>
  );
}

export default function CashPage() {
  const toast = useToast();
  const featureOn = useFeature("cash_sessions");
  const canRead = usePermission("sales.cash.read");
  const canOpen = usePermission("sales.cash.open");
  const canClose = usePermission("sales.cash.close");
  const canSupervise = usePermission("sales.cash.supervise");
  const canManageSettings = usePermission("settings.manage");
  const ticketsOn = useFeature("tickets");

  const [active, setActive] = useState<ApiCashSession | null>(null);
  const [history, setHistory] = useState<ApiCashSession[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modales
  const [showOpen, setShowOpen] = useState(false);
  const [movementType, setMovementType] = useState<ApiCashMovementType | null>(
    null,
  );
  const [showClose, setShowClose] = useState(false);
  const [cutResult, setCutResult] = useState<ApiCashCloseResult | null>(null);
  const [detail, setDetail] = useState<ApiCashSessionDetail | null>(null);

  // Formularios
  const [floatDraft, setFloatDraft] = useState("");
  const [amountDraft, setAmountDraft] = useState("");
  const [reasonDraft, setReasonDraft] = useState("");
  const [countedDraft, setCountedDraft] = useState("");
  const [notesDraft, setNotesDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [act, list] = await Promise.all([
        cashApi.active(),
        cashApi.list({ skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
      ]);
      setActive(act);
      setHistory(list.items);
      setTotal(list.total);
      setError(null);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    if (!featureOn || !canRead) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [featureOn, canRead, load]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setModalError(null);
    try {
      await fn();
      await load();
    } catch (err) {
      setModalError(errMsg(err));
      throw err;
    } finally {
      setBusy(false);
    }
  };

  const openSession = () =>
    run(async () => {
      const value = Number(floatDraft);
      await cashApi.open(Number.isFinite(value) ? value : 0);
      toast.success("Caja abierta.");
      setShowOpen(false);
      setFloatDraft("");
    }).catch(() => undefined);

  const addMovement = () =>
    run(async () => {
      if (!movementType) return;
      const currentType = movementType;
      await cashApi.addMovement({
        type: movementType,
        amount: Number(amountDraft),
        reason: reasonDraft,
      });
      toast.success(
        currentType === "deposit" ? "Depósito registrado." : "Retiro registrado.",
      );
      setMovementType(null);
      setAmountDraft("");
      setReasonDraft("");
    }).catch(() => undefined);

  const closeSession = () =>
    run(async () => {
      if (!active) return;
      const result = await cashApi.close(active.id, {
        countedCash: Number(countedDraft),
        ...(notesDraft.trim() ? { notes: notesDraft.trim() } : {}),
      });
      toast.success("Corte de caja realizado.");
      setShowClose(false);
      setCountedDraft("");
      setNotesDraft("");
      setCutResult(result);
    }).catch(() => undefined);

  const printCut = async (sessionId: string) => {
    try {
      const [cut, business] = await Promise.all([
        cashApi.detail(sessionId),
        settingsApi.getBusinessCached(),
      ]);
      await printHtmlInIframe(buildCashCutTicketHtml(cut, business));
    } catch (err) {
      setError(errMsg(err));
    }
  };

  if (!featureOn) {
    return (
      <>
        <PageHeader title="Caja" sub="Sesiones y cortes de caja" />
        <div className="card" style={{ padding: 16 }}>
          <div className="text-muted text-sm">
            El corte de caja está desactivado.
            {canManageSettings
              ? " Actívalo en Configuración → Funciones → Corte de caja."
              : " Pídele a un administrador que lo active en Configuración."}
          </div>
        </div>
      </>
    );
  }

  if (!canRead) {
    return (
      <>
        <PageHeader title="Caja" sub="Sesiones y cortes de caja" />
        <div className="card" style={{ padding: 16 }}>
          <div className="text-muted text-sm">
            No tienes permiso para ver la caja ({" "}
            <span className="font-mono text-[11px]">sales.cash.read</span> ).
          </div>
        </div>
      </>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Caja"
        sub="Sesiones y cortes de caja"
        actions={
          !loading && !active && canOpen ? (
            <button
              className="btn btn--accent"
              type="button"
              onClick={() => setShowOpen(true)}
            >
              {I.plus} Abrir caja
            </button>
          ) : undefined
        }
      />

      {error && (
        <div
          className="card mb-3"
          style={{ padding: 12, border: "1px solid var(--danger)", color: "var(--danger)" }}
          role="alert"
        >
          {error}
        </div>
      )}

      {/* ── Sesión activa ─────────────────────────────────────────────── */}
      <div className="card mb-4" style={{ padding: 16 }}>
        {loading ? (
          <SkeletonText lines={3} />
        ) : active ? (
          <>
            <div className="flex items-center gap-3 mb-3">
              <span
                className="font-medium"
                style={{ color: "var(--ok)" }}
              >
                ● Caja abierta
              </span>
              <span className="num font-mono text-sm">{active.folio}</span>
              <span className="text-muted text-xs flex-1">
                desde {fmtDT(active.openedAt)} · fondo{" "}
                {fmtMXN(active.openingFloat)}
              </span>
              {canOpen && (
                <>
                  <button
                    className="btn btn--sm"
                    type="button"
                    onClick={() => setMovementType("deposit")}
                  >
                    + Depósito
                  </button>
                  <button
                    className="btn btn--sm"
                    type="button"
                    onClick={() => setMovementType("withdrawal")}
                  >
                    − Retiro
                  </button>
                </>
              )}
              {canSupervise && (
                <button
                  className="btn btn--sm"
                  type="button"
                  onClick={() => {
                    cashApi
                      .detail(active.id)
                      .then(setDetail)
                      .catch((err) => setError(errMsg(err)));
                  }}
                  title="Desglose en vivo de la caja sin cerrar la sesión"
                >
                  Corte X
                </button>
              )}
              {canClose && (
                <button
                  className="btn btn--accent btn--sm"
                  type="button"
                  onClick={() => setShowClose(true)}
                >
                  Hacer corte
                </button>
              )}
            </div>

            {active.movements.length > 0 ? (
              <div className="border border-line rounded-md">
                {active.movements.map((m, idx) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-2 px-3 py-2 text-[13px]"
                    style={{ borderTop: idx === 0 ? 0 : "1px solid var(--line)" }}
                  >
                    <span className="flex-1">
                      {m.type === "deposit" ? "Depósito" : "Retiro"} ·{" "}
                      <span className="text-muted">{m.reason}</span>
                    </span>
                    <span className="num">
                      {m.type === "deposit" ? "+" : "−"}
                      {fmtMXN(m.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted text-xs">
                Sin movimientos manuales en esta sesión.
              </div>
            )}
          </>
        ) : (
          <div className="text-muted text-sm">
            Caja cerrada — no hay sesión activa.
            {!canOpen && " Pídele a un cajero/administrador que la abra."}
          </div>
        )}
      </div>

      {/* ── Historial ─────────────────────────────────────────────────── */}
      <div className="card">
        <div className="card__head">
          <strong>Historial de cortes</strong>
        </div>
        <table className="tbl">
          <thead>
            <tr>
              <th>Folio</th>
              <th>Apertura</th>
              <th>Cierre</th>
              <th className="text-right">Contado</th>
              <th>Diferencia</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {history.length === 0 && (
              <tr>
                <td colSpan={6} className="text-muted text-sm">
                  Sin sesiones todavía.
                </td>
              </tr>
            )}
            {history.map((s) => (
              <tr key={s.id}>
                <td className="num font-mono">{s.folio}</td>
                <td>{fmtDT(s.openedAt)}</td>
                <td>{fmtDT(s.closedAt)}</td>
                <td className="num text-right">
                  {s.countedCash === null ? "—" : fmtMXN(s.countedCash)}
                </td>
                <td>
                  {s.status === "open" ? (
                    <span style={{ color: "var(--ok)" }}>Abierta</span>
                  ) : (
                    <DifferenceTag value={s.difference} />
                  )}
                </td>
                <td className="text-right">
                  {s.status === "closed" && (
                    <button
                      className="btn btn--sm"
                      type="button"
                      onClick={() => {
                        cashApi
                          .detail(s.id)
                          .then(setDetail)
                          .catch((err) => setError(errMsg(err)));
                      }}
                    >
                      Ver corte
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex items-center gap-2 p-3">
            <button
              className="btn btn--sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </button>
            <span className="text-muted text-xs">
              Página {page} de {totalPages}
            </span>
            <button
              className="btn btn--sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </button>
          </div>
        )}
      </div>

      {/* ── Modal abrir caja ──────────────────────────────────────────── */}
      {showOpen && (
        <Modal
          title="Abrir caja"
          onClose={busy ? () => undefined : () => setShowOpen(false)}
          width={380}
          footer={
            <>
              <button
                className="btn btn--ghost"
                onClick={() => setShowOpen(false)}
                disabled={busy}
              >
                Cancelar
              </button>
              <button
                className="btn btn--accent"
                onClick={() => void openSession()}
                disabled={busy || floatDraft.trim() === ""}
              >
                {busy ? "Abriendo…" : "Abrir caja"}
              </button>
            </>
          }
        >
          <div className="field">
            <span className="label">Fondo inicial (efectivo en caja)</span>
            <input
              className="input num"
              type="number"
              min={0}
              step={0.01}
              value={floatDraft}
              onChange={(e) => setFloatDraft(e.target.value)}
              autoFocus
            />
          </div>
          {modalError && (
            <div className="text-xs mt-2" style={{ color: "var(--danger)" }}>
              {modalError}
            </div>
          )}
        </Modal>
      )}

      {/* ── Modal movimiento ──────────────────────────────────────────── */}
      {movementType && (
        <Modal
          title={movementType === "deposit" ? "Depósito a caja" : "Retiro de caja"}
          onClose={busy ? () => undefined : () => setMovementType(null)}
          width={380}
          footer={
            <>
              <button
                className="btn btn--ghost"
                onClick={() => setMovementType(null)}
                disabled={busy}
              >
                Cancelar
              </button>
              <button
                className="btn btn--accent"
                onClick={() => void addMovement()}
                disabled={
                  busy || !(Number(amountDraft) > 0) || reasonDraft.trim() === ""
                }
              >
                {busy ? "Guardando…" : "Registrar"}
              </button>
            </>
          }
        >
          <div className="grid gap-3">
            <div className="field">
              <span className="label">Monto</span>
              <input
                className="input num"
                type="number"
                min={0.01}
                step={0.01}
                value={amountDraft}
                onChange={(e) => setAmountDraft(e.target.value)}
                autoFocus
              />
            </div>
            <div className="field">
              <span className="label">Razón (obligatoria)</span>
              <input
                className="input"
                value={reasonDraft}
                onChange={(e) => setReasonDraft(e.target.value)}
                placeholder={
                  movementType === "deposit"
                    ? "p.ej. cambio de la mañana"
                    : "p.ej. pago a proveedor"
                }
              />
            </div>
          </div>
          {modalError && (
            <div className="text-xs mt-2" style={{ color: "var(--danger)" }}>
              {modalError}
            </div>
          )}
        </Modal>
      )}

      {/* ── Modal arqueo ciego ────────────────────────────────────────── */}
      {showClose && active && (
        <Modal
          title={`Corte de caja · ${active.folio}`}
          onClose={busy ? () => undefined : () => setShowClose(false)}
          width={420}
          footer={
            <>
              <button
                className="btn btn--ghost"
                onClick={() => setShowClose(false)}
                disabled={busy}
              >
                Cancelar
              </button>
              <button
                className="btn btn--accent"
                onClick={() => void closeSession()}
                disabled={busy || countedDraft.trim() === ""}
              >
                {busy ? "Cerrando…" : "Cerrar caja"}
              </button>
            </>
          }
        >
          <div className="text-muted text-xs mb-3">
            Arqueo ciego: cuenta TODO el efectivo de la caja (incluido el
            fondo) y captúralo. El sistema te dirá la diferencia al cerrar.
          </div>
          <div className="grid gap-3">
            <div className="field">
              <span className="label">Efectivo contado</span>
              <input
                className="input num"
                type="number"
                min={0}
                step={0.01}
                value={countedDraft}
                onChange={(e) => setCountedDraft(e.target.value)}
                autoFocus
              />
            </div>
            <div className="field">
              <span className="label">Notas (opcional)</span>
              <input
                className="input"
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
              />
            </div>
          </div>
          {modalError && (
            <div className="text-xs mt-2" style={{ color: "var(--danger)" }}>
              {modalError}
            </div>
          )}
        </Modal>
      )}

      {/* ── Resultado del corte ───────────────────────────────────────── */}
      {cutResult && (
        <Modal
          title={`Corte ${cutResult.folio}`}
          onClose={() => setCutResult(null)}
          width={400}
          footer={
            <>
              {ticketsOn && (
                <button
                  className="btn"
                  onClick={() => void printCut(cutResult.sessionId)}
                >
                  {I.printer} Imprimir corte
                </button>
              )}
              <button
                className="btn btn--accent"
                onClick={() => setCutResult(null)}
              >
                Listo
              </button>
            </>
          }
        >
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Esperado en caja</span>
              <span className="num">{fmtMXN(cutResult.expectedCash)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Contado</span>
              <span className="num">{fmtMXN(cutResult.countedCash)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <span>Diferencia</span>
              <DifferenceTag value={cutResult.difference} />
            </div>
          </div>
        </Modal>
      )}

      {/* ── Detalle de un corte (historial) ───────────────────────────── */}
      {detail && (
        <Modal
          title={
            detail.closedAt
              ? `Corte ${detail.folio}`
              : `Corte X en vivo · ${detail.folio}`
          }
          onClose={() => setDetail(null)}
          width={440}
          footer={
            <>
              {ticketsOn && (
                <button
                  className="btn"
                  onClick={() => void printCut(detail.id)}
                >
                  {I.printer} Imprimir corte
                </button>
              )}
              <button className="btn btn--accent" onClick={() => setDetail(null)}>
                Cerrar
              </button>
            </>
          }
        >
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Apertura</span>
              <span>{fmtDT(detail.openedAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Cierre</span>
              <span>{fmtDT(detail.closedAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Fondo inicial</span>
              <span className="num">{fmtMXN(detail.openingFloat)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">
                Efectivo cobrado ({detail.cashCount ?? 0})
              </span>
              <span className="num">{fmtMXN(detail.cashTotal ?? 0)}</span>
            </div>
            {(detail.refundsTotal ?? 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-muted">
                  Devoluciones efectivo ({detail.refundsCount ?? 0})
                </span>
                <span className="num">−{fmtMXN(detail.refundsTotal ?? 0)}</span>
              </div>
            )}
            {detail.movements.map((m) => (
              <div key={m.id} className="flex justify-between text-[13px]">
                <span className="text-muted">
                  {m.type === "deposit" ? "Depósito" : "Retiro"} · {m.reason}
                </span>
                <span className="num">
                  {m.type === "deposit" ? "+" : "−"}
                  {fmtMXN(m.amount)}
                </span>
              </div>
            ))}
            <div className="divider" />
            <div className="flex justify-between">
              <span className="text-muted">
                {detail.closedAt ? "Esperado" : "Esperado en caja"}
              </span>
              <span className="num">{fmtMXN(detail.expectedCash ?? 0)}</span>
            </div>
            {/* Contado/Diferencia solo aplican a un corte cerrado (Z); el
                corte X en vivo solo muestra lo esperado. */}
            {detail.closedAt && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted">Contado</span>
                  <span className="num">{fmtMXN(detail.countedCash ?? 0)}</span>
                </div>
                <div className="flex justify-between text-base font-semibold">
                  <span>Diferencia</span>
                  <DifferenceTag value={detail.difference} />
                </div>
              </>
            )}
            <div className="flex justify-between text-[13px]">
              <span className="text-muted">
                Terminal (informativo, {detail.terminalCount ?? 0})
              </span>
              <span className="num">{fmtMXN(detail.terminalTotal ?? 0)}</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-muted">
                Transferencia (informativo, {detail.transferCount ?? 0})
              </span>
              <span className="num">{fmtMXN(detail.transferTotal ?? 0)}</span>
            </div>
            {detail.closingNotes && (
              <div className="text-muted text-xs">
                Notas: {detail.closingNotes}
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
