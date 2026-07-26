// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ToPurchasePreview } from "./to-purchase-preview";
import type { ApiToPurchaseLine } from "@/lib/api/types";

afterEach(cleanup);

const line = (over: Partial<ApiToPurchaseLine>): ApiToPurchaseLine => ({
  materialId: "mat-1",
  materialName: "Insumo",
  unit: "pza",
  materialVariantId: null,
  materialVariantCode: null,
  qty: 5,
  supplierName: "Proveedor X",
  kind: "buy_to_order",
  requiredQty: 5,
  available: null,
  ...over,
});

describe("ToPurchasePreview", () => {
  it("vacío no renderiza ningún bloque", () => {
    const { container } = render(<ToPurchasePreview toPurchase={[]} />);
    expect(container.textContent).toBe("");
  });

  it("shortfall → bloque 'Faltante — se comprará'", () => {
    render(
      <ToPurchasePreview
        toPurchase={[
          line({
            materialId: "m-short",
            kind: "shortfall",
            qty: 7,
            requiredQty: 12,
            available: 5,
          }),
        ]}
      />,
    );
    expect(screen.getByText(/Faltante — se comprará/)).toBeTruthy();
    expect(screen.queryByText(/Se comprará \(bajo demanda\)/)).toBeNull();
  });

  it("buy_to_order → bloque 'Se comprará (bajo demanda)'", () => {
    render(<ToPurchasePreview toPurchase={[line({ kind: "buy_to_order" })]} />);
    expect(screen.getByText(/Se comprará \(bajo demanda\)/)).toBeTruthy();
    expect(screen.queryByText(/Faltante — se comprará/)).toBeNull();
  });

  it("mezcla → ambos bloques y separa por kind", () => {
    render(
      <ToPurchasePreview
        toPurchase={[
          line({ materialId: "m-short", kind: "shortfall", qty: 3 }),
          line({ materialId: "m-bto", kind: "buy_to_order" }),
        ]}
      />,
    );
    expect(screen.getByText(/Faltante — se comprará/)).toBeTruthy();
    expect(screen.getByText(/Se comprará \(bajo demanda\)/)).toBeTruthy();
  });
});
