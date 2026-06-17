import { describe, expect, it } from "vitest";

import type { ApiPriceTier } from "@/lib/api/types";
import { getPriceForQty, hasPriceTiers, tierRanges } from "./pricing";

const tiers: ApiPriceTier[] = [
  { minQty: 10, unitPrice: 45 },
  { minQty: 50, unitPrice: 38 },
];

describe("getPriceForQty", () => {
  it("bajo el primer umbral → precio base", () => {
    expect(getPriceForQty(55, tiers, 1)).toBe(55);
    expect(getPriceForQty(55, tiers, 9)).toBe(55);
  });

  it("en el umbral exacto → ese precio", () => {
    expect(getPriceForQty(55, tiers, 10)).toBe(45);
    expect(getPriceForQty(55, tiers, 50)).toBe(38);
  });

  it("entre umbrales → el escalón inferior aplicable", () => {
    expect(getPriceForQty(55, tiers, 25)).toBe(45);
    expect(getPriceForQty(55, tiers, 49)).toBe(45);
  });

  it("sobre el último umbral → el último precio", () => {
    expect(getPriceForQty(55, tiers, 200)).toBe(38);
  });

  it("sin tiers (null/vacío) → precio base", () => {
    expect(getPriceForQty(55, null, 100)).toBe(55);
    expect(getPriceForQty(55, [], 100)).toBe(55);
    expect(getPriceForQty(55, undefined, 100)).toBe(55);
  });

  it("ordena tiers desordenados antes de resolver", () => {
    const desordenado: ApiPriceTier[] = [
      { minQty: 50, unitPrice: 38 },
      { minQty: 10, unitPrice: 45 },
    ];
    expect(getPriceForQty(55, desordenado, 12)).toBe(45);
    expect(getPriceForQty(55, desordenado, 60)).toBe(38);
  });

  it("cantidad decimal (m²/lineal) resuelve por umbral", () => {
    const area: ApiPriceTier[] = [
      { minQty: 5, unitPrice: 180 },
      { minQty: 20, unitPrice: 150 },
    ];
    expect(getPriceForQty(200, area, 4.99)).toBe(200);
    expect(getPriceForQty(200, area, 6)).toBe(180);
    expect(getPriceForQty(200, area, 25)).toBe(150);
  });
});

describe("hasPriceTiers", () => {
  it("true sólo con escalones", () => {
    expect(hasPriceTiers(tiers)).toBe(true);
    expect(hasPriceTiers([])).toBe(false);
    expect(hasPriceTiers(null)).toBe(false);
    expect(hasPriceTiers(undefined)).toBe(false);
  });
});

describe("tierRanges", () => {
  it("arma rangos legibles 1–9 · 10–49 · 50+", () => {
    expect(tierRanges(55, tiers)).toEqual([
      { label: "1–9", unitPrice: 55, isBase: true },
      { label: "10–49", unitPrice: 45, isBase: false },
      { label: "50+", unitPrice: 38, isBase: false },
    ]);
  });

  it("sin tiers → sólo el rango base 1+", () => {
    expect(tierRanges(55, null)).toEqual([
      { label: "1+", unitPrice: 55, isBase: true },
    ]);
  });

  it("un solo escalón → base + N+", () => {
    expect(tierRanges(55, [{ minQty: 10, unitPrice: 45 }])).toEqual([
      { label: "1–9", unitPrice: 55, isBase: true },
      { label: "10+", unitPrice: 45, isBase: false },
    ]);
  });
});

/**
 * Paridad con el backend. `getPriceForQty` es el espejo front del resolver de
 * tiers de mayoreo que vive (replicado) en el back:
 *   catalog · price-tiers.vo.ts          → resolveTierUnitPrice
 *   sales   · pricing.service.ts         → resolveTierUnitPrice
 * Es lógica money-critical: si el front muestra un precio que el back no cobra,
 * el cliente ve una cosa y paga otra. Estos vectores golden son IDÉNTICOS a los
 * de `nxpos-api/.../pricing-tiers-parity.spec.ts` (GOLDEN_TIER_CASES): si
 * cambias un caso allá, cámbialo aquí.
 */
const GOLDEN_TIER_CASES: {
  name: string;
  basePrice: number;
  tiers: ApiPriceTier[] | null;
  qty: number;
  expected: number;
}[] = [
  { name: "sin tiers → precio base", basePrice: 55, tiers: [], qty: 100, expected: 55 },
  { name: "tiers null → precio base", basePrice: 55, tiers: null, qty: 100, expected: 55 },
  { name: "bajo el primer umbral → base", basePrice: 55, tiers: [{ minQty: 10, unitPrice: 45 }, { minQty: 50, unitPrice: 38 }], qty: 9, expected: 55 },
  { name: "umbral inferior exacto", basePrice: 55, tiers: [{ minQty: 10, unitPrice: 45 }, { minQty: 50, unitPrice: 38 }], qty: 10, expected: 45 },
  { name: "entre umbrales → escalón inferior", basePrice: 55, tiers: [{ minQty: 10, unitPrice: 45 }, { minQty: 50, unitPrice: 38 }], qty: 49, expected: 45 },
  { name: "umbral superior exacto", basePrice: 55, tiers: [{ minQty: 10, unitPrice: 45 }, { minQty: 50, unitPrice: 38 }], qty: 50, expected: 38 },
  { name: "sobre el último umbral", basePrice: 55, tiers: [{ minQty: 10, unitPrice: 45 }, { minQty: 50, unitPrice: 38 }], qty: 200, expected: 38 },
  { name: "dimension decimal bajo umbral", basePrice: 200, tiers: [{ minQty: 5, unitPrice: 180 }, { minQty: 20, unitPrice: 150 }], qty: 4.99, expected: 200 },
  { name: "dimension decimal en umbral", basePrice: 200, tiers: [{ minQty: 5, unitPrice: 180 }, { minQty: 20, unitPrice: 150 }], qty: 6, expected: 180 },
  { name: "dimension decimal alto", basePrice: 200, tiers: [{ minQty: 5, unitPrice: 180 }, { minQty: 20, unitPrice: 150 }], qty: 25, expected: 150 },
  { name: "tiers DESORDENADOS, qty media", basePrice: 55, tiers: [{ minQty: 50, unitPrice: 38 }, { minQty: 10, unitPrice: 45 }], qty: 12, expected: 45 },
  { name: "tiers DESORDENADOS, qty alta", basePrice: 55, tiers: [{ minQty: 50, unitPrice: 38 }, { minQty: 10, unitPrice: 45 }], qty: 60, expected: 38 },
  { name: "tiers DESORDENADOS, bajo umbral", basePrice: 55, tiers: [{ minQty: 50, unitPrice: 38 }, { minQty: 10, unitPrice: 45 }], qty: 9, expected: 55 },
];

describe("paridad con el backend (vectores golden)", () => {
  for (const c of GOLDEN_TIER_CASES) {
    it(`${c.name}: getPriceForQty = ${c.expected}`, () => {
      expect(getPriceForQty(c.basePrice, c.tiers, c.qty)).toBe(c.expected);
    });
  }
});
