import { apiFetchBlob } from "@/lib/api/client";
import { settingsApi } from "@/lib/api/settings";
import type { ApiOrderDetail } from "@/lib/api/types";
import { printHtmlInIframe } from "./print-html";
import { buildThermalTicketHtml } from "./thermal-ticket";

/**
 * Orquestación de impresión de tickets de una orden. Ambas funciones lanzan
 * en error — el CALLER decide si bloquea o sólo avisa (en el checkout la
 * venta ya existe: avisar y seguir).
 */

/** Ticket térmico 80 mm: datos del negocio cacheados + iframe + print(). */
export async function printThermalTicket(order: ApiOrderDetail): Promise<void> {
  const business = await settingsApi.getBusinessCached();
  await printHtmlInIframe(buildThermalTicketHtml(order, business));
}

/**
 * Ticket carta (PDF del backend) en un tab nuevo para imprimir/compartir.
 * Si el popup se bloquea (la activación del clic expira tras los await),
 * degrada a descarga directa — patrón de reportsApi.download.
 */
export async function openLetterTicket(idOrFolio: string): Promise<void> {
  const blob = await apiFetchBlob(
    `/orders/${encodeURIComponent(idOrFolio)}/ticket`,
  );
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (!win) {
    const a = document.createElement("a");
    a.href = url;
    a.download = `ticket-${idOrFolio}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  // Revocar tarde: el tab abierto necesita la URL viva mientras carga el PDF.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
