// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider, useToast } from "./toast-context";

function Harness() {
  const toast = useToast();
  return (
    <div>
      <button onClick={() => toast.success("Guardado")}>ok</button>
      <button onClick={() => toast.error("Falló")}>err</button>
      <button onClick={() => toast.info("Aviso", { duration: 0 })}>sticky</button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <ToastProvider>
      <Harness />
    </ToastProvider>,
  );
}

describe("ToastProvider / useToast", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    cleanup();
  });

  it("anuncia el éxito en la live-region polite (role=status)", () => {
    const { container } = renderWithProvider();
    fireEvent.click(screen.getByText("ok"));
    // La live-region persistente con role=status contiene el texto.
    expect(screen.getByRole("status").textContent).toContain("Guardado");
    // Y existe el toast visual con su variante.
    expect(container.querySelector(".toast--success")).toBeTruthy();
  });

  it("los errores van a la live-region assertive (role=alert)", () => {
    const { container } = renderWithProvider();
    fireEvent.click(screen.getByText("err"));
    const alert = screen.getByRole("alert");
    expect(alert.getAttribute("aria-live")).toBe("assertive");
    expect(alert.textContent).toContain("Falló");
    expect(container.querySelector(".toast--error")).toBeTruthy();
  });

  it("se auto-descarta al vencer la duración", () => {
    const { container } = renderWithProvider();
    fireEvent.click(screen.getByText("ok"));
    expect(container.querySelector(".toast--success")).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(container.querySelector(".toast--success")).toBeNull();
    expect(screen.getByRole("status").textContent).not.toContain("Guardado");
  });

  it("duration=0 no se auto-descarta", () => {
    const { container } = renderWithProvider();
    fireEvent.click(screen.getByText("sticky"));
    act(() => {
      vi.advanceTimersByTime(60000);
    });
    expect(container.querySelector(".toast--info")).toBeTruthy();
  });

  it("el botón cerrar descarta el toast", () => {
    const { container } = renderWithProvider();
    fireEvent.click(screen.getByText("ok"));
    fireEvent.click(screen.getByLabelText(/Cerrar notificación/));
    expect(container.querySelector(".toast--success")).toBeNull();
  });

  it("useToast fuera del provider lanza error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Harness />)).toThrow(/ToastProvider/);
    spy.mockRestore();
  });
});
