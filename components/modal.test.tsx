// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Modal } from "./modal";

afterEach(() => {
  cleanup();
  // Asegura que el lock de scroll no se filtre entre tests.
  document.body.style.overflow = "";
});

describe("Modal (accesibilidad)", () => {
  it("expone role=dialog, aria-modal y aria-labelledby ligado al título", () => {
    render(
      <Modal title="Editar cliente" onClose={() => {}}>
        contenido
      </Modal>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    const labelledBy = dialog.getAttribute("aria-labelledby");
    expect(labelledBy).toBeTruthy();
    const title = document.getElementById(labelledBy!);
    expect(title?.textContent).toBe("Editar cliente");
  });

  it("Escape invoca onClose", () => {
    const onClose = vi.fn();
    render(
      <Modal title="X" onClose={onClose}>
        c
      </Modal>,
    );
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("clic en el backdrop cierra; clic en el panel no", () => {
    const onClose = vi.fn();
    // El modal se portaliza a document.body, así que el backdrop no está en el
    // container del render.
    render(
      <Modal title="X" onClose={onClose}>
        c
      </Modal>,
    );
    fireEvent.click(screen.getByRole("dialog")); // panel
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(document.querySelector(".modal-backdrop")!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("bloquea el scroll del body mientras está abierto y lo restaura al cerrar", () => {
    const { unmount } = render(
      <Modal title="X" onClose={() => {}}>
        <button>dentro</button>
      </Modal>,
    );
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("anidados: el scroll-lock se sostiene hasta cerrar el último modal", () => {
    function Nested({ inner }: { inner: boolean }) {
      return (
        <Modal title="A" onClose={() => {}}>
          {inner && (
            <Modal title="B" onClose={() => {}}>
              <button>x</button>
            </Modal>
          )}
        </Modal>
      );
    }
    const { rerender, unmount } = render(<Nested inner />);
    expect(document.body.style.overflow).toBe("hidden");
    rerender(<Nested inner={false} />); // cierra el interno
    expect(document.body.style.overflow).toBe("hidden"); // el externo sigue abierto
    unmount(); // cierra el externo
    expect(document.body.style.overflow).toBe("");
  });

  it("mueve el foco al primer enfocable al abrir", () => {
    render(
      <Modal title="X" onClose={() => {}}>
        <button>primero</button>
        <button>segundo</button>
      </Modal>,
    );
    expect(document.activeElement?.textContent).toBe("primero");
  });
});
