"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { I } from "./icons";

type ModalProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
};

// Pila de modales abiertos (un token por instancia). Solo el de hasta arriba
// responde a Escape y atrapa el foco, para que con modales anidados el teclado
// actúe sobre el visible. El bloqueo de scroll del body se aplica una sola vez
// (al abrir el primero) y se restaura al cerrar el último.
const modalStack: string[] = [];
let bodyOverflowBeforeLock = "";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({ title, onClose, children, footer, width = 720 }: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  // Elemento que tenía el foco antes de abrir, para devolvérselo al cerrar.
  const restoreFocusTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // `titleId` (de useId) es único por instancia: sirve de token en la pila.
    const token = titleId;
    restoreFocusTo.current = document.activeElement as HTMLElement | null;

    const wasEmpty = modalStack.length === 0;
    modalStack.push(token);
    if (wasEmpty) {
      bodyOverflowBeforeLock = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }

    const panel = panelRef.current;
    // El selector ya excluye [disabled] y tabindex=-1. No filtramos por
    // visibilidad (offsetParent es null para position:fixed y en SSR/tests),
    // para que la trampa de foco nunca colapse a vacío.
    const focusables = () =>
      panel ? Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)) : [];

    // Al abrir, enfoca el primer control de contenido (saltando el botón de
    // cerrar del header) para permitir captura inmediata; si no hay, el panel.
    const firstContent = focusables().find(
      (el) => !el.hasAttribute("data-modal-close"),
    );
    if (firstContent) firstContent.focus();
    else panel?.focus();

    const isTop = () => modalStack[modalStack.length - 1] === token;

    const onKey = (e: KeyboardEvent) => {
      if (!isTop()) return;
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === "Tab") {
        const items = focusables();
        if (items.length === 0) {
          e.preventDefault();
          panel?.focus();
          return;
        }
        const firstEl = items[0];
        const lastEl = items[items.length - 1];
        const active = document.activeElement;
        const insidePanel = panel?.contains(active) ?? false;
        if (e.shiftKey) {
          if (active === firstEl || !insidePanel) {
            e.preventDefault();
            lastEl.focus();
          }
        } else if (active === lastEl || !insidePanel) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };

    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
      const i = modalStack.indexOf(token);
      if (i >= 0) modalStack.splice(i, 1);
      if (modalStack.length === 0) {
        document.body.style.overflow = bodyOverflowBeforeLock;
      }
      // Devuelve el foco a quien lo tenía antes de abrir (si sigue en el DOM).
      const target = restoreFocusTo.current;
      if (target && document.contains(target)) target.focus();
    };
  }, [onClose, titleId]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      {/* Topa el ancho al viewport en teléfono (deja 8px de margen por lado);
          en pantallas grandes usa el `width` pedido. */}
      <div
        ref={panelRef}
        className="modal"
        style={{ width: `min(${width}px, calc(100vw - 16px))` }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="modal__head">
          <div className="modal__title" id={titleId}>
            {title}
          </div>
          <div className="spacer" />
          <button
            className="icon-btn"
            onClick={onClose}
            aria-label="Cerrar"
            data-modal-close
          >
            {I.x}
          </button>
        </div>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__foot">{footer}</div>}
      </div>
    </div>
  );
}
