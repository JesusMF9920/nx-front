import { describe, expect, it } from "vitest";

import {
  colorCodeFromLabel,
  materialHasColorMatrix,
  parseCompositeCode,
  reconcileColors,
  swatchForColorCode,
} from "./product-colors";

describe("colorCodeFromLabel", () => {
  it("normaliza acentos, mayúsculas, espacios y quita el separador reservado", () => {
    expect(colorCodeFromLabel("Café")).toBe("CAFE");
    expect(colorCodeFromLabel("Rojo óxido")).toBe("ROJO_OXIDO");
    expect(colorCodeFromLabel("a|b")).toBe("AB");
  });
});

describe("parseCompositeCode", () => {
  it("parte TALLA|COLOR", () => {
    expect(parseCompositeCode("G|VERDE")).toEqual({ size: "G", color: "VERDE" });
  });
  it("devuelve null si no es compuesta o falta un lado", () => {
    expect(parseCompositeCode("G")).toBeNull();
    expect(parseCompositeCode("|VERDE")).toBeNull();
    expect(parseCompositeCode("G|")).toBeNull();
  });
});

describe("materialHasColorMatrix", () => {
  it("true sólo si alguna variante es compuesta", () => {
    expect(materialHasColorMatrix([{ code: "G|VERDE" }, { code: "CH" }])).toBe(
      true,
    );
    expect(materialHasColorMatrix([{ code: "G" }, { code: "CH" }])).toBe(false);
  });
});

describe("swatchForColorCode", () => {
  it("usa el hex conocido de la paleta", () => {
    expect(swatchForColorCode("NEGRO")).toBe("#1F2937");
  });
  it("da un color HSL determinista (no transparente) para los custom", () => {
    const c = swatchForColorCode("TURQUESA");
    expect(c).toMatch(/^hsl\(/);
    expect(swatchForColorCode("TURQUESA")).toBe(c); // estable entre llamadas
  });
});

describe("reconcileColors", () => {
  const variants = [
    { code: "G|NEGRO", stock: 10 },
    { code: "CH|NEGRO", stock: 0 },
    { code: "G|VERDE", stock: 4 }, // no declarado y con stock -> huérfano
    { code: "G|ROJO", stock: 0 }, // no declarado pero sin stock -> no huérfano
    { code: "CH", stock: 3 }, // no compuesta -> se ignora
  ];

  it("detecta stock huérfano en colores no declarados", () => {
    const r = reconcileColors(["NEGRO"], variants);
    expect(r.orphanColors).toEqual([{ color: "VERDE", stock: 4 }]);
  });

  it("detecta colores declarados sin ninguna combinación en el insumo", () => {
    const r = reconcileColors(["NEGRO", "AZUL"], variants);
    expect(r.declaredWithoutCombo).toEqual(["AZUL"]);
    // NEGRO tiene combinación (aunque una celda esté en 0) -> no es invendible.
    expect(r.declaredWithoutCombo).not.toContain("NEGRO");
  });

  it("sin matriz (ninguna variante compuesta) todo declarado queda sin combinación", () => {
    const r = reconcileColors(["NEGRO"], [{ code: "CH", stock: 5 }]);
    expect(r.orphanColors).toEqual([]);
    expect(r.declaredWithoutCombo).toEqual(["NEGRO"]);
  });
});
