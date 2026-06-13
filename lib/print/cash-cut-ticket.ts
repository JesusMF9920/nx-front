import type { ApiBusinessSettings, ApiCashSessionDetail } from "@/lib/api/types";
import { fmtMXN } from "@/lib/format";
import { escapeHtml, TICKET_80MM_STYLES } from "./thermal-ticket";

/**
 * Ticket de corte de caja (80 mm) — FUNCIÓN PURA, mismo contrato que el
 * ticket de venta: todo valor dinámico pasa por escapeHtml (va por srcdoc).
 */

const DATE_TIME_ES = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short",
});

const fmtSigned = (n: number): string =>
  n > 0 ? `+${fmtMXN(n)}` : n < 0 ? `−${fmtMXN(Math.abs(n))}` : fmtMXN(0);

export function buildCashCutTicketHtml(
  cut: ApiCashSessionDetail,
  business: ApiBusinessSettings,
): string {
  const deposits = cut.movements.filter((m) => m.type === "deposit");
  const withdrawals = cut.movements.filter((m) => m.type === "withdrawal");

  const movementRows = (items: typeof cut.movements, sign: string) =>
    items
      .map(
        (m) =>
          `<div class="row sm"><span>${sign} ${escapeHtml(m.reason)}</span><span>${fmtMXN(m.amount)}</span></div>`,
      )
      .join("");

  const difference = cut.difference ?? 0;
  const diffLabel =
    difference === 0 ? "Cuadra exacto" : difference > 0 ? "Sobrante" : "Faltante";

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Corte ${escapeHtml(cut.folio)}</title>
<style>${TICKET_80MM_STYLES}</style>
</head>
<body>
  <div class="center b" style="font-size:14px">${escapeHtml(business.name)}</div>
  <div class="center sm">CORTE DE CAJA</div>
  <div class="div"></div>
  <div class="row"><span class="b">${escapeHtml(cut.folio)}</span></div>
  <div class="row sm"><span>Apertura</span><span>${escapeHtml(DATE_TIME_ES.format(new Date(cut.openedAt)))}</span></div>
  ${cut.closedAt ? `<div class="row sm"><span>Cierre</span><span>${escapeHtml(DATE_TIME_ES.format(new Date(cut.closedAt)))}</span></div>` : ""}
  <div class="div"></div>
  <div class="row"><span>Fondo inicial</span><span>${fmtMXN(cut.openingFloat)}</span></div>
  <div class="row"><span>Efectivo cobrado (${cut.cashCount ?? 0})</span><span>${fmtMXN(cut.cashTotal ?? 0)}</span></div>
  ${(cut.refundsTotal ?? 0) > 0 ? `<div class="row"><span>Devoluciones efectivo (${cut.refundsCount ?? 0})</span><span>−${fmtMXN(cut.refundsTotal ?? 0)}</span></div>` : ""}
  ${deposits.length > 0 ? `<div class="sm b" style="margin-top:4px">Depósitos</div>${movementRows(deposits, "+")}` : ""}
  ${withdrawals.length > 0 ? `<div class="sm b" style="margin-top:4px">Retiros</div>${movementRows(withdrawals, "−")}` : ""}
  <div class="div"></div>
  <div class="row"><span>Esperado en caja</span><span>${fmtMXN(cut.expectedCash ?? 0)}</span></div>
  <div class="row"><span>Contado</span><span>${fmtMXN(cut.countedCash ?? 0)}</span></div>
  <div class="row total"><span>${escapeHtml(diffLabel)}</span><span>${escapeHtml(fmtSigned(difference))}</span></div>
  <div class="div"></div>
  <div class="row sm"><span>Terminal (informativo, ${cut.terminalCount ?? 0})</span><span>${fmtMXN(cut.terminalTotal ?? 0)}</span></div>
  <div class="row sm"><span>Transferencia (informativo, ${cut.transferCount ?? 0})</span><span>${fmtMXN(cut.transferTotal ?? 0)}</span></div>
  ${cut.closingNotes ? `<div class="sm">Notas: ${escapeHtml(cut.closingNotes)}</div>` : ""}
</body>
</html>`;
}
