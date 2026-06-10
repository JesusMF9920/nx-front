/**
 * Imprime un documento HTML completo dentro de un IFRAME OCULTO con su propio
 * srcdoc: los estilos del ticket (incl. @page 80mm) viven aislados de Tailwind
 * y el iframe colgado de document.body sobrevive la navegación client-side de
 * App Router. Chrome con --kiosk-printing imprime sin diálogo; sin esa flag
 * aparece el diálogo nativo (1 clic).
 */

export type PrintHtmlOptions = {
  /**
   * Acción de impresión, inyectable porque happy-dom no implementa
   * window.print — los tests pasan un spy. Default: focus + print.
   */
  onPrint?: (win: Window) => void;
  /** Espera máxima del evento load del iframe (entornos sin srcdoc real). */
  loadTimeoutMs?: number;
  /** Espera máxima de las <img> (el logo); vencida, se imprime sin logo. */
  imageTimeoutMs?: number;
  /** Fallback para remover el iframe si afterprint nunca llega. */
  cleanupTimeoutMs?: number;
};

function waitForImages(doc: Document, timeoutMs: number): Promise<void> {
  const images = Array.from(doc.images ?? []);
  const pending = images.filter((img) => !img.complete);
  if (pending.length === 0) return Promise.resolve();
  return new Promise((resolve) => {
    let remaining = pending.length;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    const timer = setTimeout(finish, timeoutMs);
    const onSettle = () => {
      remaining -= 1;
      if (remaining === 0) {
        clearTimeout(timer);
        finish();
      }
    };
    for (const img of pending) {
      img.addEventListener("load", onSettle, { once: true });
      img.addEventListener("error", onSettle, { once: true });
    }
  });
}

export async function printHtmlInIframe(
  html: string,
  opts: PrintHtmlOptions = {},
): Promise<void> {
  const loadTimeoutMs = opts.loadTimeoutMs ?? 1500;
  const imageTimeoutMs = opts.imageTimeoutMs ?? 3000;
  const cleanupTimeoutMs = opts.cleanupTimeoutMs ?? 60_000;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.visibility = "hidden";
  iframe.srcdoc = html;

  const cleanup = () => {
    iframe.remove();
  };

  try {
    // Esperar el load (con fallback de tiempo: algunos entornos de prueba no
    // disparan load para srcdoc).
    await new Promise<void>((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      iframe.addEventListener("load", done, { once: true });
      document.body.appendChild(iframe);
      setTimeout(done, loadTimeoutMs);
    });

    const win = iframe.contentWindow;
    if (!win) {
      cleanup();
      throw new Error("No se pudo preparar el documento de impresión.");
    }

    // El logo debe estar cargado ANTES de print() o sale en blanco; con el
    // timeout vencido se imprime sin él en vez de colgar la venta.
    if (iframe.contentDocument) {
      await waitForImages(iframe.contentDocument, imageTimeoutMs);
    }

    // Limpieza tras imprimir; el timeout cubre los navegadores/kioskos donde
    // afterprint no dispara.
    win.addEventListener("afterprint", cleanup, { once: true });
    setTimeout(cleanup, cleanupTimeoutMs);

    (opts.onPrint ?? ((w: Window) => {
      w.focus();
      w.print();
    }))(win);
  } catch (err) {
    cleanup();
    throw err;
  }
}
