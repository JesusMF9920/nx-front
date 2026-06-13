// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusPill } from "./status-pill";

describe("StatusPill", () => {
  it("renderiza la etiqueta y la clase del status conocido", () => {
    render(<StatusPill s="En diseño" />);
    const pill = screen.getByText("En diseño");
    expect(pill).toBeTruthy();
    expect(pill.className).toContain("pill--info");
  });

  it("status desconocido cae a pill--neutral", () => {
    render(<StatusPill s="Algo raro" />);
    expect(screen.getByText("Algo raro").className).toContain("pill--neutral");
  });

  it("muestra el marcador de proveedor solo con supplier", () => {
    const { rerender } = render(<StatusPill s="Con proveedor" />);
    expect(screen.queryByText("•Prov.")).toBeNull();
    rerender(<StatusPill s="Con proveedor" supplier />);
    expect(screen.getByText("•Prov.")).toBeTruthy();
  });
});
