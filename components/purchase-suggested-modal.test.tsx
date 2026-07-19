import { describe, expect, it } from "vitest";
import type { ApiMaterial, ApiMaterialVariant } from "@/lib/api/types";
import { suggestedLinesFor } from "./purchase-suggested-modal";

function material(over: Partial<ApiMaterial> = {}): ApiMaterial {
  return {
    id: "m1",
    sku: "SKU",
    name: "Insumo",
    category: "cat",
    unit: "pz",
    stock: 0,
    reorderPoint: 0,
    cost: 10,
    location: null,
    supplierName: "Proveedor",
    buyToOrder: false,
    isActive: true,
    variants: [],
    createdAt: "",
    updatedAt: "",
    ...over,
  };
}

function variant(over: Partial<ApiMaterialVariant> = {}): ApiMaterialVariant {
  return {
    id: "v1",
    code: "M|ROJO",
    label: "M / Rojo",
    stock: 0,
    reorderPoint: 0,
    sortOrder: 0,
    ...over,
  };
}

describe("suggestedLinesFor", () => {
  it("sugiere el material raíz cuando no tiene variantes y está bajo reorden", () => {
    const m = material({ stock: 2, reorderPoint: 5, cost: 4 });
    const lines = suggestedLinesFor(m);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      key: "m1:",
      variant: null,
      stock: 2,
      reorderPoint: 5,
      // max(round(5*2 - 2), 5) = max(8, 5) = 8
      qty: 8,
      lineCost: 32,
    });
  });

  it("ignora el material raíz sin variantes cuando el stock supera el reorden", () => {
    expect(suggestedLinesFor(material({ stock: 9, reorderPoint: 5 }))).toEqual([]);
  });

  it("con variantes, emite una línea por cada variante bajo su propio reorden", () => {
    const m = material({
      stock: 100, // stock raíz agregado: se ignora
      reorderPoint: 0,
      cost: 3,
      variants: [
        variant({ id: "va", code: "S", label: "S", stock: 1, reorderPoint: 4 }),
        variant({ id: "vb", code: "M", label: "M", stock: 10, reorderPoint: 4 }),
        variant({ id: "vc", code: "L", label: "L", stock: 0, reorderPoint: 6 }),
      ],
    });
    const lines = suggestedLinesFor(m);
    expect(lines.map((l) => l.key)).toEqual(["m1:va", "m1:vc"]);
    expect(lines[0]).toMatchObject({
      variant: { id: "va" },
      stock: 1,
      reorderPoint: 4,
      // max(round(4*2 - 1), 4) = 7
      qty: 7,
      lineCost: 21,
    });
    expect(lines[1]).toMatchObject({
      variant: { id: "vc" },
      // max(round(6*2 - 0), 6) = 12
      qty: 12,
      lineCost: 36,
    });
  });

  it("no emite líneas de material raíz cuando el material tiene variantes", () => {
    const m = material({
      stock: 0,
      reorderPoint: 5, // reorden raíz presente pero irrelevante con variantes
      variants: [variant({ stock: 9, reorderPoint: 3 })],
    });
    expect(suggestedLinesFor(m)).toEqual([]);
  });
});
