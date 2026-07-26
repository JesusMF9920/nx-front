import { describe, expect, it } from "vitest";
import { sizeCellLabel, sizeCellsSummary } from "./size-breakdown";

describe("sizeCellLabel", () => {
  it("prefiere las etiquetas legibles sobre los códigos", () => {
    expect(
      sizeCellLabel({
        sizeId: "CH",
        sizeLabel: "Chica",
        colorCode: "ROJO",
        colorLabel: "Rojo",
      }),
    ).toBe("Chica Rojo");
  });

  it("cae al código cuando no hay etiqueta (registros viejos)", () => {
    expect(sizeCellLabel({ sizeId: "CH", colorCode: "ROJO" })).toBe("CH ROJO");
  });

  it("omite el color cuando la celda no lo tiene", () => {
    expect(sizeCellLabel({ sizeId: "CH", sizeLabel: "Chica" })).toBe("Chica");
  });
});

describe("sizeCellsSummary", () => {
  // El caso que rompía el checkout: dos colores comparten talla, así que la
  // talla sola no distingue las celdas.
  it("distingue dos colores de la misma talla", () => {
    expect(
      sizeCellsSummary([
        { sizeId: "CH", sizeLabel: "Chica", colorLabel: "Rojo", qty: 2 },
        { sizeId: "CH", sizeLabel: "Chica", colorLabel: "Azul", qty: 3 },
      ]),
    ).toBe("Chica Rojo×2 · Chica Azul×3");
  });

  it("descarta las celdas en cero", () => {
    expect(
      sizeCellsSummary([
        { sizeId: "CH", qty: 0 },
        { sizeId: "EG", qty: 1 },
      ]),
    ).toBe("EG×1");
  });

  it("sin celdas devuelve cadena vacía", () => {
    expect(sizeCellsSummary([])).toBe("");
  });
});
