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

  it("muestra un toast de éxito con role=status", () => {
    renderWithProvider();
    fireEvent.click(screen.getByText("ok"));
    const toast = screen.getByText("Guardado").closest(".toast");
    expect(toast).toBeTruthy();
    expect(toast?.getAttribute("role")).toBe("status");
    expect(toast?.className).toContain("toast--success");
  });

  it("los errores usan role=alert (assertive)", () => {
    renderWithProvider();
    fireEvent.click(screen.getByText("err"));
    const toast = screen.getByText("Falló").closest(".toast");
    expect(toast?.getAttribute("role")).toBe("alert");
    expect(toast?.getAttribute("aria-live")).toBe("assertive");
  });

  it("se auto-descarta al vencer la duración", () => {
    renderWithProvider();
    fireEvent.click(screen.getByText("ok"));
    expect(screen.queryByText("Guardado")).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.queryByText("Guardado")).toBeNull();
  });

  it("duration=0 no se auto-descarta", () => {
    renderWithProvider();
    fireEvent.click(screen.getByText("sticky"));
    act(() => {
      vi.advanceTimersByTime(60000);
    });
    expect(screen.queryByText("Aviso")).toBeTruthy();
  });

  it("el botón cerrar descarta el toast", () => {
    renderWithProvider();
    fireEvent.click(screen.getByText("ok"));
    fireEvent.click(screen.getByLabelText("Cerrar notificación"));
    expect(screen.queryByText("Guardado")).toBeNull();
  });

  it("useToast fuera del provider lanza error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Harness />)).toThrow(/ToastProvider/);
    spy.mockRestore();
  });
});
