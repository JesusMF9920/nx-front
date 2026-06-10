import { describe, expect, it } from "vitest";

import { cartTotals, effectiveQty, lineSubtotal } from "./pos-cart";

describe("effectiveQty", () => {
  it("sin tallas → qty de la línea", () => {
    expect(effectiveQty({ qty: 3, price: 100 })).toBe(3);
  });

  it("con tallas → suma del desglose (la qty de la línea se ignora)", () => {
    expect(
      effectiveQty({
        qty: 1,
        price: 100,
        sizeBreakdown: [
          { qty: 2, surcharge: 0 },
          { qty: 1, surcharge: 15 },
        ],
      }),
    ).toBe(3);
  });
});

describe("lineSubtotal", () => {
  it("qty × price simple", () => {
    expect(lineSubtotal({ qty: 2, price: 80 })).toBe(160);
  });

  it("con tallas: cada talla suma su surcharge sobre el precio base", () => {
    // 2 CH a $150 + 1 EG a $165 = 465 (mismo caso del e2e de checkout).
    expect(
      lineSubtotal({
        qty: 3,
        price: 150,
        sizeBreakdown: [
          { qty: 2, surcharge: 0 },
          { qty: 1, surcharge: 15 },
        ],
      }),
    ).toBe(465);
  });

  it("unitPriceOverride manda: ignora surcharges a propósito", () => {
    expect(
      lineSubtotal({
        qty: 3,
        price: 150,
        unitPriceOverride: 100,
        sizeBreakdown: [
          { qty: 2, surcharge: 0 },
          { qty: 1, surcharge: 15 },
        ],
      }),
    ).toBe(300); // 3 piezas × $100, sin recargos
  });

  it("override 0 es válido (línea regalada), no se confunde con undefined", () => {
    expect(lineSubtotal({ qty: 2, price: 50, unitPriceOverride: 0 })).toBe(0);
  });
});

describe("cartTotals", () => {
  it("subtotal + IVA 16% sin descuento", () => {
    const t = cartTotals([{ qty: 1, price: 80 }], 0);
    expect(t.subtotal).toBe(80);
    expect(t.discountApplied).toBe(0);
    expect(t.tax).toBeCloseTo(12.8, 2);
    expect(t.total).toBeCloseTo(92.8, 2);
  });

  it("descuento mayor que el subtotal se clampa (total nunca negativo)", () => {
    const t = cartTotals([{ qty: 1, price: 50 }], 500);
    expect(t.discountApplied).toBe(50);
    expect(t.tax).toBe(0);
    expect(t.total).toBe(0);
  });

  it("el IVA se calcula sobre el subtotal YA descontado", () => {
    const t = cartTotals([{ qty: 2, price: 100 }], 50);
    expect(t.subtotal).toBe(200);
    expect(t.discountApplied).toBe(50);
    expect(t.tax).toBeCloseTo(24, 2); // (200-50) × 0.16
    expect(t.total).toBeCloseTo(174, 2);
  });

  it("carrito vacío → todo en cero", () => {
    expect(cartTotals([], 100)).toEqual({
      subtotal: 0,
      discountApplied: 0,
      tax: 0,
      total: 0,
    });
  });
});
