import { describe, expect, it } from "vitest";

import { looksLikePhone } from "@/components/pos-client-picker";

describe("looksLikePhone (prellenado del alta rápida)", () => {
  it("dígitos corridos o formateados → teléfono", () => {
    expect(looksLikePhone("5544332211")).toBe(true);
    expect(looksLikePhone("55 4433 2211")).toBe(true);
    expect(looksLikePhone("(449) 987-65-43")).toBe(true);
    expect(looksLikePhone("+52 449 111 22 33")).toBe(true);
  });

  it("nombres → no es teléfono", () => {
    expect(looksLikePhone("María López")).toBe(false);
    expect(looksLikePhone("Café Aurora")).toBe(false);
  });

  it("texto con letras y números (direcciones, alias) → no es teléfono", () => {
    expect(looksLikePhone("Local 4491112233")).toBe(false);
  });

  it("pocos dígitos → no es teléfono (no asumir con 5-6 dígitos)", () => {
    expect(looksLikePhone("12345")).toBe(false);
    expect(looksLikePhone("")).toBe(false);
  });
});
