// @vitest-environment happy-dom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PaymentPill } from "./payment-pill";

describe("PaymentPill", () => {
  it("mapea cada etiqueta de pago a su clase y texto", () => {
    const cases = [
      ["Efectivo", "pill--neutral"],
      ["Terminal", "pill--info"],
      ["Transferencia", "pill--info"],
      ["Mixto", "pill--accent"],
      ["Pendiente", "pill--danger"],
    ] as const;
    for (const [method, cls] of cases) {
      const { unmount } = render(<PaymentPill method={method} />);
      const pill = screen.getByText(method);
      expect(pill.className).toContain(cls);
      unmount();
    }
  });
});
