import { PAYMENT_METHOD_ES } from "@/lib/api/sales-mappers";
import type {
  ApiBusinessSettings,
  ApiDimensionData,
  ApiOrderDetail,
} from "@/lib/api/types";
import { fmtMXN } from "@/lib/format";

/**
 * Template del ticket térmico 80 mm — FUNCIÓN PURA que devuelve un documento
 * HTML completo (estilos inline + @page propio) para imprimirse dentro de un
 * iframe aislado (lib/print/print-html.ts). Todo valor dinámico pasa por
 * escapeHtml: productName/clientName/notes son entrada de usuario y este HTML
 * se inyecta vía srcdoc.
 */

/** Saldos menores a medio centavo son ruido de redondeo, no deuda. */
const PENDING_EPSILON = 0.005;

const DATE_TIME_ES = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short",
});

const DATE_ES = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Sólo URLs http(s) — un logoUrl raro (javascript:, data:) no se renderiza. */
function safeLogoUrl(url: string | null): string | null {
  if (!url) return null;
  return /^https?:\/\//i.test(url) ? url : null;
}

function dimensionText(d: ApiDimensionData): string {
  const dims = `${d.width} × ${d.height} ${d.unit}`;
  if (d.priceMode === "area") return `${dims} = ${d.computedQty} m²`;
  if (d.priceMode === "linear") return `${dims} = ${d.computedQty} m`;
  return dims;
}

/** Hoja base 80mm compartida por todos los tickets térmicos (venta, corte). */
export const TICKET_80MM_STYLES = `
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; }
  body {
    width: 72mm; margin: 0 auto; padding: 4mm 0 8mm;
    font: 12px/1.4 -apple-system, "Segoe UI", Arial, sans-serif;
    color: #000; background: #fff;
    -webkit-print-color-adjust: exact;
  }
  .center { text-align: center; }
  .b { font-weight: 700; }
  .sm { font-size: 10px; }
  .row { display: flex; justify-content: space-between; gap: 8px; }
  .row > :last-child { text-align: right; white-space: nowrap; }
  .div { border-top: 1px dashed #000; margin: 6px 0; }
  .total { font-size: 15px; font-weight: 700; }
  .item { margin: 4px 0; }
  img.logo { display: block; margin: 0 auto 4px; max-width: 60mm; max-height: 22mm; }
`;

export function buildThermalTicketHtml(
  order: ApiOrderDetail,
  business: ApiBusinessSettings,
): string {
  const logoUrl = safeLogoUrl(business.logoUrl);
  const businessMeta = [
    business.address,
    business.phone ? `Tel. ${business.phone}` : null,
    business.rfc ? `RFC ${business.rfc}` : null,
    business.email,
  ].filter((v): v is string => v !== null);

  const items = order.items
    .map((item) => {
      const variant = item.variantLabel ? ` · ${item.variantLabel}` : "";
      const sizes = (item.sizeBreakdown ?? [])
        .map((e) => {
          const label = e.sizeLabel ?? e.sizeId;
          const extra = e.surcharge > 0 ? ` (+${fmtMXN(e.surcharge)})` : "";
          return `<div class="row sm"><span>· ${escapeHtml(label)} ×${e.qty}${escapeHtml(extra)}</span></div>`;
        })
        .join("");
      const dimension = item.dimensionData
        ? `<div class="sm">${escapeHtml(dimensionText(item.dimensionData))}</div>`
        : "";
      return `
        <div class="item">
          <div>${escapeHtml(item.productName)}${escapeHtml(variant)}</div>
          <div class="sm">${escapeHtml(item.sku)}</div>
          ${sizes}
          ${dimension}
          <div class="row"><span>${item.qty} × ${fmtMXN(item.unitPrice)}</span><span>${fmtMXN(item.lineTotal)}</span></div>
        </div>`;
    })
    .join("");

  const payments = order.payments
    .map((p) => {
      const method = PAYMENT_METHOD_ES[p.method] ?? p.method;
      const ref = p.reference ? ` ref. ${p.reference}` : "";
      return `<div class="row sm"><span>${escapeHtml(method)}${escapeHtml(ref)}</span><span>${fmtMXN(p.amount)}</span></div>`;
    })
    .join("");

  const pending = order.total - order.paid;

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Ticket ${escapeHtml(order.folio)}</title>
<style>${TICKET_80MM_STYLES}</style>
</head>
<body>
  ${logoUrl ? `<img class="logo" src="${escapeHtml(logoUrl)}" alt="">` : ""}
  <div class="center b" style="font-size:14px">${escapeHtml(business.name)}</div>
  ${businessMeta.map((l) => `<div class="center sm">${escapeHtml(l)}</div>`).join("")}
  <div class="div"></div>
  <div class="row"><span class="b">${escapeHtml(order.folio)}</span><span class="sm">${escapeHtml(DATE_TIME_ES.format(new Date(order.createdAt)))}</span></div>
  <div class="sm">Cliente: ${escapeHtml(order.clientName)}</div>
  <div class="div"></div>
  ${items}
  <div class="div"></div>
  <div class="row"><span>Subtotal</span><span>${fmtMXN(order.subtotal)}</span></div>
  ${order.discount > 0 ? `<div class="row"><span>Descuento</span><span>−${fmtMXN(order.discount)}</span></div>` : ""}
  <div class="row"><span>IVA 16%</span><span>${fmtMXN(order.tax)}</span></div>
  <div class="row total"><span>TOTAL</span><span>${fmtMXN(order.total)}</span></div>
  ${payments}
  ${pending > PENDING_EPSILON ? `<div class="row b"><span>Saldo pendiente</span><span>${fmtMXN(pending)}</span></div>` : ""}
  ${
    order.deliverAt
      ? `<div class="div"></div><div class="sm">Entrega: ${escapeHtml(DATE_ES.format(new Date(order.deliverAt)))}</div>`
      : ""
  }
  ${order.notes ? `<div class="sm">Notas: ${escapeHtml(order.notes)}</div>` : ""}
  <div class="div"></div>
  <div class="center sm">¡Gracias por su compra!</div>
</body>
</html>`;
}
