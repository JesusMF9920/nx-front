import { describe, expect, it } from "vitest";
import {
  isLegacyBreakdown,
  sizeCellLabel,
  sizeCellsSummary,
  toApiSizeBreakdown,
} from "./size-breakdown";

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

describe("toApiSizeBreakdown", () => {
  // El corazón del fix: si el colorCode no viaja, estas dos celdas colapsan en
  // una sola y el backend responde 400 `Duplicate (size,color) cell`.
  it("conserva el color de dos celdas de la misma talla", () => {
    expect(
      toApiSizeBreakdown([
        { sizeId: "CH", colorCode: "ROJO", qty: 2 },
        { sizeId: "CH", colorCode: "AZUL", qty: 3 },
      ]),
    ).toEqual([
      { sizeId: "CH", qty: 2, colorCode: "ROJO" },
      { sizeId: "CH", qty: 3, colorCode: "AZUL" },
    ]);
  });

  // Un producto sin colores RECHAZA el campo: hay que omitirlo, no mandarlo nulo.
  it("omite colorCode cuando la celda no tiene color", () => {
    expect(toApiSizeBreakdown([{ sizeId: "CH", qty: 1 }])).toEqual([
      { sizeId: "CH", qty: 1 },
    ]);
    expect(toApiSizeBreakdown([{ sizeId: "CH", qty: 1 }])[0]).not.toHaveProperty(
      "colorCode",
    );
  });

  it("descarta las celdas en cero", () => {
    expect(
      toApiSizeBreakdown([
        { sizeId: "CH", colorCode: "ROJO", qty: 0 },
        { sizeId: "CH", colorCode: "AZUL", qty: 3 },
      ]),
    ).toEqual([{ sizeId: "CH", qty: 3, colorCode: "AZUL" }]);
  });

  it("no arrastra sizeLabel ni colorLabel al payload", () => {
    expect(
      toApiSizeBreakdown([
        {
          sizeId: "CH",
          sizeLabel: "Chica",
          colorCode: "ROJO",
          colorLabel: "Rojo",
          qty: 1,
        },
      ]),
    ).toEqual([{ sizeId: "CH", qty: 1, colorCode: "ROJO" }]);
  });
});

describe("isLegacyBreakdown", () => {
  // Todo lo guardado antes del fix viene sin color: editarlo con la matriz lo
  // rehidrataría vacío y se perderían las cantidades.
  it("un desglose sin ningún color es legacy", () => {
    expect(
      isLegacyBreakdown([
        { sizeId: "CH" },
        { sizeId: "M" },
        { sizeId: "G" },
      ]),
    ).toBe(true);
  });

  it("basta una celda con color para NO serlo", () => {
    expect(
      isLegacyBreakdown([{ sizeId: "CH" }, { sizeId: "CH", colorCode: "ROJO" }]),
    ).toBe(false);
  });

  // Una línea nueva no es "legacy": ahí sí queremos la matriz.
  it("un desglose vacío o ausente no es legacy", () => {
    expect(isLegacyBreakdown([])).toBe(false);
    expect(isLegacyBreakdown(undefined)).toBe(false);
  });
});
