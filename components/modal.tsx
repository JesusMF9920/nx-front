"use client";

import { useEffect, type ReactNode } from "react";
import { I } from "./icons";

type ModalProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
};

export function Modal({ title, onClose, children, footer, width = 720 }: ModalProps) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      {/* Topa el ancho al viewport en teléfono (deja 8px de margen por lado);
          en pantallas grandes usa el `width` pedido. */}
      <div
        className="modal"
        style={{ width: `min(${width}px, calc(100vw - 16px))` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__head">
          <div className="modal__title">{title}</div>
          <div className="spacer" />
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar">
            {I.x}
          </button>
        </div>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__foot">{footer}</div>}
      </div>
    </div>
  );
}
